import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_GALLERY_IMAGES,
  parseColoursList,
  parseImageColorAndAlt,
  formatImageAltText,
  colourSwatch,
  isSameColour
} from '../src/lib/colorGallery.ts';

test('the gallery allows five photos per product', () => {
  assert.equal(MAX_GALLERY_IMAGES, 5);
});

test('parseColoursList handles comma-separated colors and trims/deduplicates', () => {
  assert.deepEqual(parseColoursList('Red, Yellow, Blue, Red'), ['Red', 'Yellow', 'Blue']);
  assert.deepEqual(parseColoursList('Blue,  Grey , '), ['Blue', 'Grey']);
  assert.deepEqual(parseColoursList('Blue, blue, BLUE'), ['Blue']);
  assert.deepEqual(parseColoursList(null), []);
  assert.deepEqual(parseColoursList(''), []);
});

test('isSameColour ignores case and surrounding whitespace', () => {
  assert.equal(isSameColour(' Blue ', 'blue'), true);
  assert.equal(isSameColour('Green/Turquoise', 'green/turquoise'), true);
  assert.equal(isSameColour('Blue', 'Red'), false);
  assert.equal(isSameColour(null, 'Blue'), false);
  assert.equal(isSameColour('Blue', undefined), false);
});

test('formatImageAltText formats properly', () => {
  assert.equal(formatImageAltText('Blue', 'Front view'), '[color: Blue] Front view');
  assert.equal(formatImageAltText('Blue', ''), 'Blue');
  assert.equal(formatImageAltText('Blue', 'Blue'), 'Blue');
  assert.equal(formatImageAltText(null, 'Side view'), 'Side view');
  assert.equal(formatImageAltText(null, null), '');
});

test('parseImageColorAndAlt extracts color from tag format', () => {
  const res1 = parseImageColorAndAlt('[color: Blue] Front view', ['Blue', 'Red']);
  assert.equal(res1.color, 'Blue');
  assert.equal(res1.alt, 'Front view');

  const res2 = parseImageColorAndAlt('[colour: red] Red crate', ['Blue', 'Red']);
  assert.equal(res2.color, 'Red');
  assert.equal(res2.alt, 'Red crate');
});

test('parseImageColorAndAlt extracts color from pipe format', () => {
  const res = parseImageColorAndAlt('Blue | Detailed view of ribbing', ['Blue', 'Red']);
  assert.equal(res.color, 'Blue');
  assert.equal(res.alt, 'Detailed view of ribbing');
});

test('parseImageColorAndAlt extracts color when alt is plain color name', () => {
  const res = parseImageColorAndAlt('Red', ['Blue', 'Red']);
  assert.equal(res.color, 'Red');
  assert.equal(res.alt, 'Red');
});

test('parseImageColorAndAlt preserves general alt text when no color is mentioned', () => {
  const res = parseImageColorAndAlt('Warehouse stack of crates', ['Blue', 'Red']);
  assert.equal(res.color, null);
  assert.equal(res.alt, 'Warehouse stack of crates');
});

test('colourSwatch returns expected hex colors', () => {
  assert.equal(colourSwatch('blue'), '#1f5fae');
  assert.equal(colourSwatch('Red'), '#c0392b');
  assert.equal(colourSwatch('Green/Turquoise'), '#179679');
  assert.equal(colourSwatch('UnknownXYZ'), '#9aa1a9');
});
