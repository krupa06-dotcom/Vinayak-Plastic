// ============================================================
// Vinayak Plastics — Product Gallery & Colour Selection Helpers
// ============================================================

export const MAX_GALLERY_IMAGES = 5;

export const COLOUR_SWATCHES: Record<string, string> = {
  blue: '#1f5fae',
  grey: '#7a828c',
  gray: '#7a828c',
  green: '#1f7a4d',
  red: '#c0392b',
  yellow: '#e8b81c',
  black: '#23272c',
  white: '#f1f1ec',
  orange: '#e8630c',
  turquoise: '#1aa6a6',
  'green/turquoise': '#179679',
  'turquoise/green': '#179679',
  brown: '#6e473b',
  silver: '#a6adb5',
  natural: '#e9e6df'
};

/**
 * Returns hex color code for a color name, falling back to a neutral slate.
 */
export function colourSwatch(name: string): string {
  if (!name) return '#9aa1a9';
  const clean = name.toLowerCase().trim();
  if (COLOUR_SWATCHES[clean]) return COLOUR_SWATCHES[clean];

  // Handle slash combinations like "Green/Turquoise"
  const firstPart = clean.split('/')[0].trim();
  if (COLOUR_SWATCHES[firstPart]) return COLOUR_SWATCHES[firstPart];

  // Substring matching for compound names
  for (const [k, hex] of Object.entries(COLOUR_SWATCHES)) {
    if (clean.includes(k)) return hex;
  }
  return '#9aa1a9';
}

/**
 * Parses comma-separated colours string into a deduplicated list of clean colour names.
 * Deduplication is case-insensitive so "Blue, blue" only appears once.
 */
export function parseColoursList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const part of raw.split(',')) {
    const colour = part.trim();
    if (!colour) continue;
    const key = colour.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(colour);
  }
  return list;
}

/** Case-insensitive colour comparison used to keep swatches and images in sync. */
export function isSameColour(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Formats color and alt text into a single string for storage in product_images.alt_text.
 * Maintains backwards compatibility with plain text alt attributes while preserving
 * explicit color tagging.
 */
export function formatImageAltText(color: string | null | undefined, alt: string | null | undefined): string {
  const c = color ? color.trim() : '';
  const a = alt ? alt.trim() : '';
  if (c && a) {
    if (c.toLowerCase() === a.toLowerCase()) return c;
    return `[color: ${c}] ${a}`;
  }
  if (c) return c;
  return a;
}

/**
 * Parses product_images.alt_text into an associated color and human-readable alt description.
 *
 * Supported formats:
 * - "[color: Red] Alt description"
 * - "[colour: Red] Alt description"
 * - "Red | Alt description"
 * - "Red - Alt description"
 * - "Red" (matches available colours or recognized palette)
 */
export function parseImageColorAndAlt(
  altText: string | null | undefined,
  availableColours?: string | string[] | null
): { color: string | null; alt: string } {
  if (!altText) return { color: null, alt: '' };
  const raw = altText.trim();
  if (!raw) return { color: null, alt: '' };

  const coloursList = Array.isArray(availableColours)
    ? availableColours
    : parseColoursList(availableColours);

  // 1. Tag format: [color: Red] or [colour: Red]
  const tagMatch = raw.match(/^\[colou?r:\s*([^\]]+)\]\s*(.*)$/i);
  if (tagMatch) {
    const parsedColor = tagMatch[1].trim();
    const cleanAlt = tagMatch[2].trim();
    const matched = coloursList.find((c) => c.toLowerCase() === parsedColor.toLowerCase());
    return { color: matched || parsedColor, alt: cleanAlt || matched || parsedColor };
  }

  // 2. Pipe separator: "Red | Alt description"
  if (raw.includes('|')) {
    const parts = raw.split('|');
    const firstPart = parts[0].trim();
    const matched = coloursList.find((c) => c.toLowerCase() === firstPart.toLowerCase());
    if (matched) {
      const rest = parts.slice(1).join('|').trim();
      return { color: matched, alt: rest || matched };
    }
  }

  // 3. Exact match with an available colour
  const exactMatch = coloursList.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (exactMatch) {
    return { color: exactMatch, alt: exactMatch };
  }

  // 4. Dash separator: "Red - Front view"
  if (raw.includes(' - ')) {
    const parts = raw.split(' - ');
    const firstPart = parts[0].trim();
    const matched = coloursList.find((c) => c.toLowerCase() === firstPart.toLowerCase());
    if (matched) {
      const rest = parts.slice(1).join(' - ').trim();
      return { color: matched, alt: rest || matched };
    }
  }

  // 5. Match with known palette if single word
  const single = raw.toLowerCase();
  if (COLOUR_SWATCHES[single]) {
    const matched = coloursList.find((c) => c.toLowerCase() === single);
    if (matched) return { color: matched, alt: raw };
  }

  return { color: null, alt: raw };
}
