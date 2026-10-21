import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  formatHeightLabel,
  friendlyDbError,
  healHeight,
  healModelCode,
  parseHeight,
  planSizeWrites,
  planVersionWrites,
  resolveSeriesId,
  validateSeriesHasVariant,
  validateSizes,
  validateVersions,
  type SizeDraft,
  type VersionDraft
} from '../src/lib/seriesPlan.ts';

// ---------------------------------------------------------------------------
// A tiny stand-in for the parts of Postgres the editor depends on: the two
// unique indexes that made the save fail.
//
//   idx_size_variants_series_height     ON size_variants(series_id, height)
//   idx_product_variants_size_model_code ON product_variants(size_variant_id, model_code)
// ---------------------------------------------------------------------------

class FakeDb {
  series = new Map<string, { id: string; categoryId: string; slug: string; baseLength: number | null; baseWidth: number | null }>();
  sizes = new Map<string, { id: string; seriesId: string; height: number; label: string }>();
  versions = new Map<string, { id: string; sizeId: string; modelCode: string }>();

  insertSeries(row: { id: string; categoryId: string; slug: string; baseLength: number | null; baseWidth: number | null }) {
    for (const other of this.series.values()) {
      if (other.id === row.id) continue;
      if (other.categoryId === row.categoryId && other.slug === row.slug) {
        throw new Error('duplicate key value violates unique constraint "idx_series_category_slug"');
      }
      if (
        other.categoryId === row.categoryId &&
        other.baseLength !== null && other.baseWidth !== null &&
        row.baseLength !== null && row.baseWidth !== null &&
        other.baseLength === row.baseLength && other.baseWidth === row.baseWidth
      ) {
        throw new Error('duplicate key value violates unique constraint "idx_series_category_footprint"');
      }
    }
    this.series.set(row.id, { ...row });
  }

  insertSize(row: { id: string; seriesId: string; height: number; label: string }) {
    for (const other of this.sizes.values()) {
      if (other.id === row.id) continue;
      if (other.seriesId === row.seriesId && other.height === row.height) {
        throw new Error('duplicate key value violates unique constraint "idx_size_variants_series_height"');
      }
    }
    this.sizes.set(row.id, { ...row });
  }

  insertVersion(row: { id: string; sizeId: string; modelCode: string }) {
    for (const other of this.versions.values()) {
      if (other.id === row.id) continue;
      if (other.sizeId === row.sizeId && other.modelCode === row.modelCode) {
        throw new Error('duplicate key value violates unique constraint "idx_product_variants_size_model_code"');
      }
    }
    this.versions.set(row.id, { ...row });
  }
}

function sizeDraft(id: string, height: string, order: number, isActive = true): SizeDraft {
  return { id, height, isActive, order };
}

function versionDraft(id: string, modelCode: string, order: number, isActive = true): VersionDraft {
  return { id, modelCode, isActive, order };
}

/** Applies a plan the way the editor does: park first, then write. */
function applySizePlan(db: FakeDb, seriesId: string, plan: ReturnType<typeof planSizeWrites>) {
  for (const p of plan.park) {
    db.insertSize({ id: p.id, seriesId, height: p.height, label: p.label });
  }
  for (const w of plan.writes) {
    db.insertSize({ id: w.id, seriesId: w.seriesId, height: w.height, label: w.label });
  }
}

/** Applies a plan the way the editor does: park first, then write. */
function applyVersionPlan(db: FakeDb, plan: ReturnType<typeof planVersionWrites>) {
  for (const p of plan.park) {
    db.insertVersion({ id: p.id, sizeId: plan.writes[0]?.sizeVariantId ?? '', modelCode: p.modelCode });
  }
  for (const w of plan.writes) {
    db.insertVersion({ id: w.id, sizeId: w.sizeVariantId, modelCode: w.modelCode });
  }
}

// ---------------------------------------------------------------------------
// Heights
// ---------------------------------------------------------------------------

test('heights are read as numbers, not as text', () => {
  assert.equal(parseHeight('220'), 220);
  assert.equal(parseHeight('220.0'), 220);
  assert.equal(parseHeight('220.00'), 220);
  assert.equal(parseHeight(' 220 '), 220);
  assert.equal(parseHeight('220 mm'), 220);
  assert.equal(parseHeight('220mm'), 220);
  assert.equal(parseHeight('220.5'), 220.5);
  assert.equal(parseHeight(220), 220);
  assert.equal(parseHeight(''), null);
  assert.equal(parseHeight('abc'), null);
  assert.equal(parseHeight('-5'), null);
  assert.equal(parseHeight('0'), null);
  assert.equal(parseHeight(null), null);
});

test('the stored label is built from the normalised number', () => {
  assert.equal(formatHeightLabel(220), '220 mm');
  assert.equal(formatHeightLabel(220.5), '220.5 mm');
  assert.equal(formatHeightLabel(parseHeight('220.0')!), '220 mm');
});

// ---------------------------------------------------------------------------
// Scenario 1 - create a series with two sizes and two versions
// ---------------------------------------------------------------------------

test('scenario 1: a new series with two sizes and two versions is saved', () => {
  const db = new FakeDb();
  const seriesId = resolveSeriesId(null);
  db.insertSeries({ id: seriesId, categoryId: 'cat-a', slug: '600-400-series', baseLength: 600, baseWidth: 400 });

  const drafts = [sizeDraft('size-1', '220', 0), sizeDraft('size-2', '325', 1)];
  assert.deepEqual(validateSizes(drafts, true), []);

  const versions = [versionDraft('ver-1', '302015', 0), versionDraft('ver-2', '302018', 0)];
  assert.deepEqual(validateVersions(versions, { sizeLabel: '220 mm', sizeActive: true, seriesActive: true }), []);
  assert.deepEqual(validateSeriesHasVariant([{ versions }], true), []);

  const plan = planSizeWrites(drafts, [], seriesId);
  assert.equal(plan.park.length, 0);
  assert.deepEqual(plan.writes.map((w) => w.height), [220, 325]);
  applySizePlan(db, seriesId, plan);

  assert.equal(db.sizes.size, 2);
  assert.deepEqual([...db.sizes.values()].map((s) => s.label), ['220 mm', '325 mm']);
});

// ---------------------------------------------------------------------------
// Scenario 2 - add a third size to an existing series
// ---------------------------------------------------------------------------

test('scenario 2: adding a third size keeps the existing ones untouched', () => {
  const db = new FakeDb();
  const seriesId = 'series-1';
  db.insertSeries({ id: seriesId, categoryId: 'cat-a', slug: '600-400-series', baseLength: 600, baseWidth: 400 });
  db.insertSize({ id: 'size-1', seriesId, height: 220, label: '220 mm' });
  db.insertSize({ id: 'size-2', seriesId, height: 325, label: '325 mm' });

  const drafts = [sizeDraft('size-1', '220', 0), sizeDraft('size-2', '325', 1), sizeDraft('size-3', '400', 2)];
  assert.deepEqual(validateSizes(drafts, true), []);

  const persisted = [...db.sizes.values()].map((s) => ({ id: s.id, height: s.height, label: s.label }));
  const plan = planSizeWrites(drafts, persisted, seriesId);
  assert.equal(plan.park.length, 0);
  applySizePlan(db, seriesId, plan);

  assert.equal(db.sizes.size, 3);
  assert.deepEqual([...db.sizes.values()].map((s) => s.height).sort((a, b) => a - b), [220, 325, 400]);
});

// ---------------------------------------------------------------------------
// Scenario 3 - change the height of one size
// ---------------------------------------------------------------------------

test('scenario 3: changing one height does not disturb the other sizes', () => {
  const db = new FakeDb();
  const seriesId = 'series-1';
  db.insertSeries({ id: seriesId, categoryId: 'cat-a', slug: '600-400-series', baseLength: 600, baseWidth: 400 });
  db.insertSize({ id: 'size-1', seriesId, height: 220, label: '220 mm' });
  db.insertSize({ id: 'size-2', seriesId, height: 325, label: '325 mm' });

  const drafts = [sizeDraft('size-1', '400', 0), sizeDraft('size-2', '325', 1)];
  assert.deepEqual(validateSizes(drafts, true), []);

  const persisted = [...db.sizes.values()].map((s) => ({ id: s.id, height: s.height, label: s.label }));
  const plan = planSizeWrites(drafts, persisted, seriesId);
  assert.equal(plan.park.length, 0);
  applySizePlan(db, seriesId, plan);

  assert.deepEqual([...db.sizes.values()].map((s) => s.height).sort((a, b) => a - b), [325, 400]);
});

// ---------------------------------------------------------------------------
// Scenario 4 - swap the heights of two sizes (the reported failure)
// ---------------------------------------------------------------------------

test('scenario 4: swapping two heights saves instead of hitting the unique index', () => {
  const db = new FakeDb();
  const seriesId = 'series-1';
  db.insertSeries({ id: seriesId, categoryId: 'cat-a', slug: '600-400-series', baseLength: 600, baseWidth: 400 });
  db.insertSize({ id: 'size-1', seriesId, height: 220, label: '220 mm' });
  db.insertSize({ id: 'size-2', seriesId, height: 325, label: '325 mm' });

  const drafts = [sizeDraft('size-1', '325', 0), sizeDraft('size-2', '220', 1)];
  assert.deepEqual(validateSizes(drafts, true), []);

  const persisted = [...db.sizes.values()].map((s) => ({ id: s.id, height: s.height, label: s.label }));
  const plan = planSizeWrites(drafts, persisted, seriesId);

  // Both rows have to be parked, they both hold a height the other one wants.
  assert.equal(plan.park.length, 2);
  applySizePlan(db, seriesId, plan);

  assert.deepEqual([...db.sizes.values()].map((s) => s.height).sort((a, b) => a - b), [220, 325]);
  assert.equal(db.sizes.get('size-1')!.height, 325);
  assert.equal(db.sizes.get('size-2')!.height, 220);
});

test('scenario 4: without the parking the swap breaks the unique index', () => {
  const db = new FakeDb();
  const seriesId = 'series-1';
  db.insertSeries({ id: seriesId, categoryId: 'cat-a', slug: '600-400-series', baseLength: 600, baseWidth: 400 });
  db.insertSize({ id: 'size-1', seriesId, height: 220, label: '220 mm' });
  db.insertSize({ id: 'size-2', seriesId, height: 325, label: '325 mm' });

  // The old behaviour: one upsert per row, in the order of the form.
  assert.throws(
    () => db.insertSize({ id: 'size-1', seriesId, height: 325, label: '325 mm' }),
    /idx_size_variants_series_height/
  );
});

// ---------------------------------------------------------------------------
// Scenario 5 - two sizes with the same height
// ---------------------------------------------------------------------------

test('scenario 5: two sizes with the same height are rejected before anything is written', () => {
  const drafts = [sizeDraft('size-1', '220', 0), sizeDraft('size-2', '220.0', 1)];
  const errors = validateSizes(drafts, true);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /both use 220 mm/);
});

test('scenario 5: 220 and "220 mm" count as the same height', () => {
  const drafts = [sizeDraft('size-1', '220', 0), sizeDraft('size-2', '220 mm', 1)];
  assert.equal(validateSizes(drafts, true).length, 1);
});

test('scenario 5: a height that is not a number is rejected', () => {
  const drafts = [sizeDraft('size-1', 'tall', 0)];
  const errors = validateSizes(drafts, true);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /enter a height in millimetres/);
});

// ---------------------------------------------------------------------------
// Scenario 6 - swap the model codes of two versions
// ---------------------------------------------------------------------------

test('scenario 6: swapping two model codes inside a size saves', () => {
  const db = new FakeDb();
  const sizeId = 'size-1';
  db.insertVersion({ id: 'ver-1', sizeId, modelCode: '302015' });
  db.insertVersion({ id: 'ver-2', sizeId, modelCode: '302018' });

  const drafts = [versionDraft('ver-1', '302018', 0), versionDraft('ver-2', '302015', 1)];
  assert.deepEqual(validateVersions(drafts, { sizeLabel: '220 mm', sizeActive: true, seriesActive: true }), []);

  const persisted = [...db.versions.values()].map((v) => ({ id: v.id, modelCode: v.modelCode }));
  const plan = planVersionWrites(drafts, persisted, sizeId);
  assert.equal(plan.park.length, 2);
  applyVersionPlan(db, plan);

  assert.equal(db.versions.get('ver-1')!.modelCode, '302018');
  assert.equal(db.versions.get('ver-2')!.modelCode, '302015');
});

test('scenario 6: renaming one model code frees the old value', () => {
  const db = new FakeDb();
  const sizeId = 'size-1';
  db.insertVersion({ id: 'ver-1', sizeId, modelCode: '302015' });
  db.insertVersion({ id: 'ver-2', sizeId, modelCode: '302018' });

  const drafts = [versionDraft('ver-1', '302015', 0), versionDraft('ver-2', '302019', 1)];
  const persisted = [...db.versions.values()].map((v) => ({ id: v.id, modelCode: v.modelCode }));
  const plan = planVersionWrites(drafts, persisted, sizeId);
  assert.equal(plan.park.length, 0);
  applyVersionPlan(db, plan);

  assert.equal(db.versions.get('ver-2')!.modelCode, '302019');
});

test('scenario 6: the same model code twice in one size is rejected', () => {
  const drafts = [versionDraft('ver-1', 'VPC-600', 0), versionDraft('ver-2', 'vpc-600', 1)];
  const errors = validateVersions(drafts, { sizeLabel: '220 mm', sizeActive: true, seriesActive: true });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /both use the model code/);
});

// ---------------------------------------------------------------------------
// Scenario 7 - the same dimensions in two categories
// ---------------------------------------------------------------------------

test('scenario 7: the same footprint can be used in two categories', () => {
  const db = new FakeDb();
  db.insertSeries({ id: 'series-a', categoryId: 'cat-a', slug: '600-400-series', baseLength: 600, baseWidth: 400 });
  // Same footprint, same slug, but a different category.
  db.insertSeries({ id: 'series-b', categoryId: 'cat-b', slug: '600-400-series', baseLength: 600, baseWidth: 400 });
  assert.equal(db.series.size, 2);
});

test('scenario 7: the same footprint twice in one category is rejected', () => {
  const db = new FakeDb();
  db.insertSeries({ id: 'series-a', categoryId: 'cat-a', slug: '600-400-series', baseLength: 600, baseWidth: 400 });
  assert.throws(
    () => db.insertSeries({ id: 'series-b', categoryId: 'cat-a', slug: 'other-slug', baseLength: 600, baseWidth: 400 }),
    /idx_series_category_footprint/
  );
});

test('scenario 7: the migration scopes the slug to its category', () => {
  const sql = readFileSync(
    fileURLToPath(new URL('../supabase/migrations/20261021000000_series_slug_per_category.sql', import.meta.url)),
    'utf8'
  );
  assert.match(sql, /DROP CONSTRAINT IF EXISTS series_slug_key/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_series_category_slug ON series\(category_id, slug\)/);
});

// ---------------------------------------------------------------------------
// Scenario 8 - an empty or invalid version
// ---------------------------------------------------------------------------

test('scenario 8: a version without a model code fails with a helpful message', () => {
  const drafts = [versionDraft('ver-1', '', 0)];
  const errors = validateVersions(drafts, { sizeLabel: '220 mm', sizeActive: true, seriesActive: true });
  assert.ok(errors.length >= 1);
  assert.match(errors[0], /Version #1 in size "220 mm" needs a model code/);
});

test('scenario 8: an active size without a version is reported', () => {
  const errors = validateVersions([], { sizeLabel: '220 mm', sizeActive: true, seriesActive: true });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /needs at least one version/);
});

test('scenario 8: an inactive size may stay empty', () => {
  const errors = validateVersions([], { sizeLabel: '220 mm', sizeActive: false, seriesActive: true });
  assert.deepEqual(errors, []);
});

test('scenario 8: an inactive series may have no sizes at all', () => {
  assert.deepEqual(validateSizes([], false), []);
  assert.deepEqual(validateSeriesHasVariant([], false), []);
});

test('scenario 8: an active series needs at least one size and one version', () => {
  assert.equal(validateSizes([], true).length, 1);
  assert.equal(validateSeriesHasVariant([{ versions: [] }], true).length, 1);
});

// ---------------------------------------------------------------------------
// Scenario 9 - a repeated submit
// ---------------------------------------------------------------------------

test('scenario 9: a second submit reuses the series of the first one', () => {
  const first = resolveSeriesId(null);
  const second = resolveSeriesId(first);
  assert.equal(second, first);
});

test('scenario 9: two submits create one series, not two', () => {
  const db = new FakeDb();
  let seriesId: string | null = null;

  const submit = () => {
    seriesId = resolveSeriesId(seriesId);
    db.insertSeries({ id: seriesId!, categoryId: 'cat-a', slug: '600-400-series', baseLength: 600, baseWidth: 400 });
    const drafts = [sizeDraft('size-1', '220', 0)];
    const persisted = [...db.sizes.values()]
      .filter((s) => s.seriesId === seriesId)
      .map((s) => ({ id: s.id, height: s.height, label: s.label }));
    applySizePlan(db, seriesId!, planSizeWrites(drafts, persisted, seriesId!));
  };

  submit();
  submit();

  assert.equal(db.series.size, 1);
  assert.equal(db.sizes.size, 1);
});

// ---------------------------------------------------------------------------
// Error messages
// ---------------------------------------------------------------------------

test('database errors are translated into something the admin understands', () => {
  assert.match(
    friendlyDbError('duplicate key value violates unique constraint "idx_size_variants_series_height"'),
    /same height/
  );
  assert.match(
    friendlyDbError('duplicate key value violates unique constraint "idx_product_variants_size_model_code"'),
    /same model code/
  );
  assert.match(
    friendlyDbError('duplicate key value violates unique constraint "series_slug_key"'),
    /slug/
  );
  assert.equal(friendlyDbError('something else went wrong'), 'something else went wrong');
});

// ---------------------------------------------------------------------------
// An interrupted save leaves a placeholder behind, the editor repairs it
// ---------------------------------------------------------------------------

test('a parked size keeps its original height recoverable', () => {
  const plan = planSizeWrites(
    [sizeDraft('size-1', '325', 0), sizeDraft('size-2', '220', 1)],
    [
      { id: 'size-1', height: 220, label: '220 mm' },
      { id: 'size-2', height: 325, label: '325 mm' }
    ],
    'series-1'
  );
  assert.equal(plan.park.length, 2);
  for (const p of plan.park) {
    assert.ok(p.height < 0, 'a parked height is negative');
    assert.equal(healHeight(p.height), p.originalHeight);
  }
});

test('a parked version keeps its original model code recoverable', () => {
  const plan = planVersionWrites(
    [versionDraft('ver-1', '302018', 0), versionDraft('ver-2', '302015', 1)],
    [
      { id: 'ver-1', modelCode: '302015' },
      { id: 'ver-2', modelCode: '302018' }
    ],
    'size-1'
  );
  assert.equal(plan.park.length, 2);
  for (const p of plan.park) {
    assert.equal(healModelCode(p.modelCode), p.originalModelCode);
  }
});

test('healing leaves untouched rows alone', () => {
  assert.equal(healHeight(220), 220);
  assert.equal(healModelCode('302015'), '302015');
});
