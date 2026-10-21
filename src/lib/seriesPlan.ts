// Pure planning helpers for the admin "Series -> Sizes -> Versions" editor.
//
// The database enforces two unique rules that the admin form has to respect:
//
//   * size_variants    (series_id, height)           -> idx_size_variants_series_height
//   * product_variants (size_variant_id, model_code) -> idx_product_variants_size_model_code
//
// Both rules are checked per row, so upserting the rows one at a time breaks as
// soon as a value moves from one row to another (the user swaps the heights of
// two sizes, or types "150" where "150.0" is already stored): the write of the
// moved value collides with the row that still holds the old value and the whole
// save aborts half way through.
//
// The planners below detect those "steals" and produce a two phase plan:
//
//   1. park   - the rows that still hold a wanted value are temporarily moved to
//               a free placeholder value so the slot is released,
//   2. write  - every row is written with its final value in one batch.
//
// Nothing here touches the database, so the logic can be unit tested.

export const HEIGHT_SUFFIX = /\s*mm\s*$/i;

/** Marker used while a row is parked, see planSizeWrites / planVersionWrites. */
export const PARK_MARKER = '__swap__';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** "220", "220.0", "220 mm" and 220 all mean the same height. */
export function parseHeight(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().replace(HEIGHT_SUFFIX, '').trim();
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return null;
  return round2(value);
}

export function trimNumber(value: number): string {
  return String(round2(value));
}

export function formatHeightLabel(height: number): string {
  return `${trimNumber(height)} mm`;
}

/**
 * The placeholder a size is parked on: the negative of its own height plus one.
 *
 * Heights are always positive, so the placeholder can never collide with a
 * real height and it stays unique inside the series. It also carries the
 * original value, so an interrupted save can be undone (see healHeight).
 */
export function parkHeight(height: number): number {
  return -(height + 1);
}

/** Undoes parkHeight, used when a save was interrupted. */
export function healHeight(height: number): number {
  return height < 0 ? -height - 1 : height;
}

/** Undoes the parking marker of a model code, used when a save was interrupted. */
export function healModelCode(modelCode: string): string {
  return modelCode.startsWith(PARK_MARKER) ? modelCode.slice(PARK_MARKER.length) : modelCode;
}

export interface SizeDraft {
  id: string;
  height: string;
  isActive: boolean;
  order: number;
}

export interface VersionDraft {
  id: string;
  modelCode: string;
  isActive: boolean;
  order: number;
}

export interface PersistedSize {
  id: string;
  height: number;
  label: string;
}

export interface PersistedVersion {
  id: string;
  modelCode: string;
}

export interface SizeWrite {
  id: string;
  seriesId: string;
  height: number;
  label: string;
  isActive: boolean;
  displayOrder: number;
}

export interface SizePark {
  id: string;
  height: number;
  label: string;
  originalHeight: number;
  originalLabel: string;
}

export interface VersionWrite {
  id: string;
  sizeVariantId: string;
  modelCode: string;
  isActive: boolean;
  displayOrder: number;
}

export interface VersionPark {
  id: string;
  modelCode: string;
  originalModelCode: string;
}

export function validateSizes(drafts: SizeDraft[], seriesActive: boolean): string[] {
  const errors: string[] = [];

  if (seriesActive && drafts.length === 0) {
    errors.push('Add at least one size (height) so the series has something to sell.');
    return errors;
  }

  const seen = new Map<number, number>();
  drafts.forEach((draft, index) => {
    const height = parseHeight(draft.height);
    if (height === null) {
      errors.push(`Size #${index + 1}: enter a height in millimetres (for example 220).`);
      return;
    }
    const first = seen.get(height);
    if (first !== undefined) {
      errors.push(
        `Sizes #${first + 1} and #${index + 1} both use ${trimNumber(height)} mm. Every size in a series needs its own height.`
      );
      return;
    }
    seen.set(height, index);
  });

  return errors;
}

export function validateVersions(
  drafts: VersionDraft[],
  opts: { sizeLabel: string; sizeActive: boolean; seriesActive: boolean }
): string[] {
  const errors: string[] = [];
  const seen = new Map<string, number>();
  let withModelCode = 0;

  drafts.forEach((draft, index) => {
    const code = draft.modelCode.trim();
    if (!code) {
      errors.push(
        `Version #${index + 1} in size "${opts.sizeLabel}" needs a model code (for example VPC-600).`
      );
      return;
    }
    withModelCode += 1;
    const key = code.toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      errors.push(
        `Versions #${first + 1} and #${index + 1} in size "${opts.sizeLabel}" both use the model code "${code}". Model codes must be unique inside a size.`
      );
      return;
    }
    seen.set(key, index);
  });

  if (opts.sizeActive && opts.seriesActive && withModelCode === 0) {
    errors.push(
      `Size "${opts.sizeLabel}" needs at least one version (model code) so the series has something to sell.`
    );
  }

  return errors;
}

/** A series needs at least one sellable version while it is active. */
export function validateSeriesHasVariant(
  sizes: { versions: VersionDraft[] }[],
  seriesActive: boolean
): string[] {
  if (!seriesActive) return [];
  const total = sizes.reduce(
    (sum, size) => sum + size.versions.filter((v) => v.modelCode.trim().length > 0).length,
    0
  );
  if (total === 0) {
    return ['Add at least one version (model code) so the series has something to sell.'];
  }
  return [];
}

/**
 * Builds the write plan for the sizes of one series.
 *
 * `persisted` holds the rows that still exist after the deletions have run, so
 * only those can block a write.
 */
export function planSizeWrites(
  drafts: SizeDraft[],
  persisted: PersistedSize[],
  seriesId: string
): { writes: SizeWrite[]; park: SizePark[] } {
  const wanted = new Map<number, SizeDraft>();
  for (const draft of drafts) {
    const height = parseHeight(draft.height);
    if (height === null) continue;
    wanted.set(height, draft);
  }

  const park: SizePark[] = [];
  for (const row of persisted) {
    const claimer = wanted.get(row.height);
    if (!claimer || claimer.id === row.id) continue;
    const placeholder = parkHeight(row.height);
    park.push({
      id: row.id,
      height: placeholder,
      label: formatHeightLabel(placeholder),
      originalHeight: row.height,
      originalLabel: row.label
    });
  }

  const writes: SizeWrite[] = [];
  for (const draft of drafts) {
    const height = parseHeight(draft.height);
    if (height === null) continue;
    writes.push({
      id: draft.id,
      seriesId,
      height,
      label: formatHeightLabel(height),
      isActive: draft.isActive,
      displayOrder: draft.order
    });
  }

  return { writes, park };
}

/**
 * Builds the write plan for the versions of one size.
 *
 * Model codes are compared case sensitively because the database index is
 * case sensitive, the duplicate check of the form stays case insensitive.
 */
export function planVersionWrites(
  drafts: VersionDraft[],
  persisted: PersistedVersion[],
  sizeVariantId: string
): { writes: VersionWrite[]; park: VersionPark[] } {
  const wanted = new Map<string, VersionDraft>();
  for (const draft of drafts) {
    const code = draft.modelCode.trim();
    if (!code) continue;
    wanted.set(code, draft);
  }

  const park: VersionPark[] = [];
  const taken = new Set<string>(persisted.map((p) => p.modelCode));
  for (const row of persisted) {
    const claimer = wanted.get(row.modelCode);
    if (!claimer || claimer.id === row.id) continue;
    // The placeholder carries the original model code so an interrupted save
    // can be undone (see healModelCode). It has to fit into the column and it
    // may not collide with a model code that is in use.
    const recoverable = `${PARK_MARKER}${row.modelCode}`;
    const modelCode =
      recoverable.length <= 255 && !taken.has(recoverable) && !wanted.has(recoverable)
        ? recoverable
        : `${PARK_MARKER}${row.id}`;
    park.push({
      id: row.id,
      modelCode,
      originalModelCode: row.modelCode
    });
  }

  const writes: VersionWrite[] = [];
  for (const draft of drafts) {
    const code = draft.modelCode.trim();
    if (!code) continue;
    writes.push({
      id: draft.id,
      sizeVariantId,
      modelCode: code,
      isActive: draft.isActive,
      displayOrder: draft.order
    });
  }

  return { writes, park };
}

/** Turns a database error into a message the admin can act on. */
export function friendlyDbError(message: string): string {
  if (/idx_size_variants_series_height/i.test(message)) {
    return 'Two sizes in this series would end up with the same height. Give every size its own height (for example 220 mm).';
  }
  if (/idx_product_variants_size_model_code/i.test(message)) {
    return 'Two versions in the same size would end up with the same model code. Model codes have to be unique inside a size.';
  }
  if (/idx_series_category_footprint/i.test(message)) {
    return 'Another series in this category already uses this footprint (length x width in mm).';
  }
  if (/series_slug_key|idx_series_category_slug/i.test(message)) {
    return 'Another series already uses this slug. Pick a different slug.';
  }
  return message;
}

/**
 * The id of the series a form session writes to.
 *
 * It is resolved once and then reused, so a second click on "Save" (or a retry
 * after a failed save) updates the same series instead of creating a second
 * one.
 */
export function resolveSeriesId(memoised: string | null): string {
  return memoised ?? crypto.randomUUID();
}
