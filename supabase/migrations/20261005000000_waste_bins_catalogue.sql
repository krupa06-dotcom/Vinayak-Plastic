-- Vinayak Plastics — Waste Bins catalogue data
--
-- Adds the Waste Bins product types (product sub-categories) together with their
-- models, using the same hierarchy the live site already reads:
--
--   categories ("Waste Bins")
--     └── sub_categories   product type, e.g. "Waste Bins With Swing Lid"
--           └── series
--                 └── size_variants      one height step per model, label "<H> mm"
--                       └── product_variants   model_code + outer dimensions + capacity + colours
--
-- Series structure — why it is mixed
-- -----------------------------------
-- The rest of the catalogue follows "series = one unique base footprint"
-- (20260923000000_series_hierarchy.sql: "Every unique (length x width) found in
-- existing variants becomes a series"), e.g. "600 x 400 Series". Waste bins only
-- half-fit that rule, so this file uses both forms:
--
--   * Rectangular bins get real footprint series, exactly like the rest of the
--     catalogue. Each of these models has its own footprint AND its own height,
--     so each becomes one series with one size:
--         Trolley   710 x 850 / 560 x 730 / 470 x 550
--         Lid       680 x 500 / 680 x 420
--         Large     1360 x 1060 / 1220 x 785
--
--   * Round bins cannot. idx_series_category_footprint is UNIQUE on
--     (category_id, base_length, base_width), and the swing-lid / dome-lid /
--     storage bodies repeat across those product types — 4080 is top O510 /
--     bottom O370 in both the swing-lid and the storage bin, and 4120 is top
--     O600 / bottom O440 in both the dome-lid and the storage bin. Giving those
--     a footprint would collide inside one category, and collapsing them into
--     shared series would drop the product types. So Swing Lid, Dome Lid and
--     Storage Bin each keep ONE footprint-free series and carry their dimensions
--     per model. All footprint-free read paths already handle this:
--     makeSeriesKey / makeSizeKey fall back to the slug, formatFootprint returns
--     '', and the admin series table prints a "-" chip instead of a footprint.
--
-- Everything is stored as structured specifications:
--   * size_variants.height  = overall height in mm (the size step)
--   * series.base_length / base_width = footprint in mm, where the model has one
--   * product_variants.outer_length / outer_width / outer_height = external
--     dimensions in mm (L x W x H)
--   * product_variants.load_capacity = nominal capacity in litres
--     (the field the catalogue already uses for bin capacity, e.g. VWB-120 -> "120 L")
--   * product_variants.colours = the confirmed colour list for the product type
--   * product_variants.description = the remaining per-model figures (bottom O,
--     height without lid, window size)
--
-- Nothing else is filled in: no price, stock, warranty, GST, material or image is
-- invented. product_images is left empty and series.image_url / sub_category image
-- stays NULL so the cards fall back to the existing Waste Bins category image.
--
-- Safety:
--   * Existing rows are never updated or deleted — only new rows are inserted, and
--     every insert is ON CONFLICT DO NOTHING, so re-running this file is a no-op.
--   * The same model number appearing in two product types (e.g. 4120 in dome-lid
--     and storage) is not a duplicate: each sits on its own size_variant, and the
--     product_variants uniqueness rule is (size_variant_id, model_code).
--   * Every insert resolves its parent by slug/height AFTER the parent insert, via
--     the temporary lookup tables, rather than assuming the fixed UUID below landed.
--     Without that, a pre-existing row on any of these slugs would make
--     ON CONFLICT DO NOTHING skip the parent and the child insert would then abort
--     the whole transaction on a foreign-key violation.
--   * Nothing is written under a slug that already belongs to a different category;
--     the block raises instead.
--   * The block ends by asserting the full 6 / 10 / 23 / 23 result and raises if any
--     of it is missing, so a partial load can never pass unnoticed.
--
-- One deliberate DELETE, at the very top of the series step: an earlier draft of
-- this file modelled Trolley, Lid and Large as three footprint-free series named
-- after the product type. Those are replaced here by the seven footprint series
-- below, so the draft rows are removed to avoid listing every model twice. The
-- DELETE is restricted to three exact UUIDs from this task, AND to rows that are
-- still slug-matched and still footprint-free, so it can never remove catalogue
-- data or a series an admin has since given a real footprint. Sizes and models
-- under those series go with them via ON DELETE CASCADE.
--
-- Run from the Supabase SQL Editor, or with `supabase db push`. The whole insert
-- lives in one DO block, so it runs as a single statement/transaction.

DO $$
DECLARE
  v_category_id UUID;
  n_types  INTEGER;
  n_series INTEGER;
  n_sizes  INTEGER;
  n_models INTEGER;
BEGIN
  -- 0. Resolve the existing Waste Bins category (never created or modified here).
  SELECT id INTO v_category_id
  FROM public.categories
  WHERE slug = 'waste-bins';

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Category "waste-bins" not found - apply the base schema and sample-data migrations first.';
  END IF;

  -- 1. Product types (sub-categories) under Waste Bins.
  INSERT INTO public.sub_categories (id, category_id, name, slug, description, image_url, is_active, display_order)
  VALUES
    ('8a32fe9f-be2a-5824-86d9-305dd8964104', v_category_id, 'Waste Bins With Trolley', 'waste-bins-with-trolley', 'Wheeled waste bins on a trolley frame with a lid — 120 L, 240 L and 360 L — portable and built for outdoor use.', NULL, true, 4),
    ('4351e719-8236-5f8e-8fdc-fe8a929bf578', v_category_id, 'Waste Bins With Lid', 'waste-bins-with-lid', 'Lidded waste bins — 80 L and 110 L — with a viewing window in the lid.', NULL, true, 5),
    ('48ebf10c-ddde-5b30-8b59-c0119d066e1b', v_category_id, 'Waste Bins With Swing Lid', 'waste-bins-with-swing-lid', 'Round swing-lid waste bins from 10 L to 80 L with a 360° swing lid.', NULL, true, 6),
    ('9067469c-c962-5792-8746-03fa34863ffb', v_category_id, 'Waste Bins With Dome Lid', 'waste-bins-with-dome-lid', 'Dome-lid waste bins in 100 L and 120 L for indoor and outdoor use.', NULL, true, 7),
    ('0bd8f714-06f0-5389-8354-40cecf7c656e', v_category_id, 'Storage Bin With Fix Lid', 'storage-bin-with-fix-lid', 'Storage bins with a fixed lid in 10 L to 120 L sizes.', NULL, true, 8),
    ('39aaa7b3-b340-58fe-8f7e-4f09235d2e3d', v_category_id, 'Large Waste Bins', 'large-waste-bins', 'Large wheeled waste bins in 660 L and 1100 L for industrial sites and public areas.', NULL, true, 9)
  ON CONFLICT DO NOTHING;

  -- 1b. Resolve the real product-type ids by slug, so the inserts below attach to
  -- the rows that actually exist rather than to the fixed UUIDs above.
  DROP TABLE IF EXISTS _wb_type;
  CREATE TEMP TABLE _wb_type (slug TEXT PRIMARY KEY, id UUID NOT NULL) ON COMMIT DROP;

  INSERT INTO _wb_type (slug, id)
  SELECT t.slug, sc.id
  FROM (VALUES
    ('waste-bins-with-trolley'),
    ('waste-bins-with-lid'),
    ('waste-bins-with-swing-lid'),
    ('waste-bins-with-dome-lid'),
    ('storage-bin-with-fix-lid'),
    ('large-waste-bins')
  ) AS t(slug)
  JOIN public.sub_categories sc ON sc.slug = t.slug;

  SELECT COUNT(*) INTO n_types FROM _wb_type;

  IF n_types <> 6 THEN
    RAISE EXCEPTION 'Expected 6 Waste Bins product types, resolved % - check the sub_categories insert.', n_types;
  END IF;

  IF EXISTS (
    SELECT 1 FROM _wb_type tt
    JOIN public.sub_categories sc ON sc.id = tt.id
    WHERE sc.category_id <> v_category_id
  ) THEN
    RAISE EXCEPTION 'One of the Waste Bins product-type slugs already belongs to a different category - resolve that before running this migration.';
  END IF;

  -- 2. Remove the superseded footprint-free draft series (see header note).
  DELETE FROM public.series s
  WHERE s.id IN (
    '2ff11e17-4956-5a32-82b0-fbd099820c96'::UUID,
    'afde277c-fbec-5381-80fe-effc99a1f425'::UUID,
    '00659da5-428e-5a65-8398-e3f962092dd4'::UUID
  )
    AND s.slug IN ('waste-bins-with-trolley', 'waste-bins-with-lid', 'large-waste-bins')
    AND s.base_length IS NULL
    AND s.base_width IS NULL;

  -- 3. Series.
  --    Seven footprint series for the rectangular bins, matching the catalogue-wide
  --    "series = one footprint" convention, plus the three footprint-free series the
  --    round bins need (their UUIDs are unchanged from the first load).
  INSERT INTO public.series (id, category_id, sub_category_id, name, slug,
                             base_length, base_width, description, product_code, short_description,
                             features, applications, image_url, is_featured, is_active, display_order)
  SELECT v.id, v_category_id, tt.id, v.name, v.slug,
         v.base_l, v.base_w, NULL, NULL, v.short_desc,
         v.features, NULL, NULL, false, true, v.display_order
  FROM (VALUES
    -- Waste Bins With Trolley (rectangular, one footprint per model)
    ('33f6d605-0bd9-45e2-9c38-5e648e391459'::UUID, 'waste-bins-with-trolley', '710 × 850 Series', 'waste-bins-trolley-710x850',
     710, 850,
     '360 L wheeled trolley waste bin with lid — 710 × 850 × 1120 mm.',
     ARRAY['Wheels', 'Lid / cover', 'Portable', 'Outdoor use']::TEXT[], 4),
    ('fa49c786-5f2a-4d31-b2d1-8f1d053fa954'::UUID, 'waste-bins-with-trolley', '560 × 730 Series', 'waste-bins-trolley-560x730',
     560, 730,
     '240 L wheeled trolley waste bin with lid — 560 × 730 × 1060 mm.',
     ARRAY['Wheels', 'Lid / cover', 'Portable', 'Outdoor use']::TEXT[], 5),
    ('15acd4fc-e977-401c-b820-7d9329a08cdc'::UUID, 'waste-bins-with-trolley', '470 × 550 Series', 'waste-bins-trolley-470x550',
     470, 550,
     '120 L wheeled trolley waste bin with lid — 470 × 550 × 920 mm.',
     ARRAY['Wheels', 'Lid / cover', 'Portable', 'Outdoor use']::TEXT[], 6),

    -- Waste Bins With Lid (rectangular, one footprint per model)
    ('3e918d7c-44f5-494c-a6bb-841fbe18838f'::UUID, 'waste-bins-with-lid', '680 × 500 Series', 'waste-bins-lid-680x500',
     680, 500,
     '110 L lidded waste bin — 680 × 500 × 945 mm.',
     NULL::TEXT[], 7),
    ('fddb7bcc-caf7-42a5-90da-14b2476fa172'::UUID, 'waste-bins-with-lid', '680 × 420 Series', 'waste-bins-lid-680x420',
     680, 420,
     '80 L lidded waste bin — 680 × 420 × 890 mm.',
     NULL::TEXT[], 8),

    -- Large Waste Bins (rectangular, one footprint per model)
    ('f38cb5e6-f515-4244-9990-95c86db81fcc'::UUID, 'large-waste-bins', '1360 × 1060 Series', 'waste-bins-large-1360x1060',
     1360, 1060,
     '1100 L large waste bin with wheels — 1360 × 1060 × 1370 mm.',
     ARRAY['Wheels', 'Weather-resistant', 'Portable', 'Industrial / public use']::TEXT[], 9),
    ('71b43e43-3e44-4798-bba3-372f7915f3d1'::UUID, 'large-waste-bins', '1220 × 785 Series', 'waste-bins-large-1220x785',
     1220, 785,
     '660 L large waste bin with wheels — 1220 × 785 × 1230 mm.',
     ARRAY['Wheels', 'Weather-resistant', 'Portable', 'Industrial / public use']::TEXT[], 10),

    -- Round bins: footprint-free, one series per product type (see header note)
    ('ea77e33f-0e6f-5e20-8cf8-5740578924f7'::UUID, 'waste-bins-with-swing-lid', 'Waste Bins With Swing Lid', 'waste-bins-with-swing-lid',
     NULL, NULL,
     'Swing-lid waste bins from 10 L to 80 L with a 360° swing lid.',
     ARRAY['360° swing lid']::TEXT[], 11),
    ('b251637a-eda5-5c73-88be-60e3e8aba9fb'::UUID, 'waste-bins-with-dome-lid', 'Waste Bins With Dome Lid', 'waste-bins-with-dome-lid',
     NULL, NULL,
     'Dome-lid waste bins — 100 L and 120 L — for indoor and outdoor use.',
     ARRAY['Dome lid', 'Indoor / outdoor use']::TEXT[], 12),
    ('a104715c-fc02-5079-8013-eda551f4689b'::UUID, 'storage-bin-with-fix-lid', 'Storage Bin With Fix Lid', 'storage-bin-with-fix-lid',
     NULL, NULL,
     'Storage bins with a fixed lid — 10 L to 120 L.',
     NULL::TEXT[], 13)
  ) AS v(id, type_slug, name, slug, base_l, base_w, short_desc, features, display_order)
  JOIN _wb_type tt ON tt.slug = v.type_slug
  -- WHERE true terminates the SELECT so "ON CONFLICT" can only bind to the
  -- INSERT, never to the JOIN above.
  WHERE true
  ON CONFLICT DO NOTHING;

  -- 3b. Resolve the real series ids by slug.
  DROP TABLE IF EXISTS _wb_series;
  CREATE TEMP TABLE _wb_series (slug TEXT PRIMARY KEY, id UUID NOT NULL) ON COMMIT DROP;

  INSERT INTO _wb_series (slug, id)
  SELECT t.slug, s.id
  FROM (VALUES
    ('waste-bins-trolley-710x850'),
    ('waste-bins-trolley-560x730'),
    ('waste-bins-trolley-470x550'),
    ('waste-bins-lid-680x500'),
    ('waste-bins-lid-680x420'),
    ('waste-bins-large-1360x1060'),
    ('waste-bins-large-1220x785'),
    ('waste-bins-with-swing-lid'),
    ('waste-bins-with-dome-lid'),
    ('storage-bin-with-fix-lid')
  ) AS t(slug)
  JOIN public.series s ON s.slug = t.slug AND s.category_id = v_category_id;

  SELECT COUNT(*) INTO n_series FROM _wb_series;

  IF n_series <> 10 THEN
    RAISE EXCEPTION 'Expected 10 Waste Bins series, resolved % - check the series insert.', n_series;
  END IF;

  -- 4. Sizes = the height step of each model (label follows the admin convention).
  INSERT INTO public.size_variants (id, series_id, label, height, is_active, display_order)
  SELECT v.id, ss.id, v.label, v.height, true, v.display_order
  FROM (VALUES
    -- Footprint series: one size each
    ('426c87a2-815c-4354-a172-00319c344f9a'::UUID, 'waste-bins-trolley-710x850',  '1120 mm', 1120, 0),
    ('cfa7551a-b232-43e0-969b-1fe56ef88ee2'::UUID, 'waste-bins-trolley-560x730',  '1060 mm', 1060, 0),
    ('6bed8b0f-7e4f-4b09-83ed-ef9c66b72e89'::UUID, 'waste-bins-trolley-470x550',   '920 mm',  920, 0),
    ('de1f7b76-8f30-4e0b-9068-0e18e14b182f'::UUID, 'waste-bins-lid-680x500',        '945 mm',  945, 0),
    ('254ce541-60e0-43e8-afcb-c13cd444bef5'::UUID, 'waste-bins-lid-680x420',        '890 mm',  890, 0),
    ('928bace7-6f40-454e-8328-2fc994f45e62'::UUID, 'waste-bins-large-1360x1060',   '1370 mm', 1370, 0),
    ('28c86476-08a4-49a3-be5e-6d80b890197b'::UUID, 'waste-bins-large-1220x785',    '1230 mm', 1230, 0),

    -- Swing Lid (footprint-free series, one size per height)
    ('c2200ea2-049d-5e0f-8d04-58a1f69ebdda'::UUID, 'waste-bins-with-swing-lid', '800 mm', 800, 0),
    ('13e64ed0-fed9-5262-8267-13ce80776c5b'::UUID, 'waste-bins-with-swing-lid', '710 mm', 710, 1),
    ('11f3905d-b800-5197-8ab2-4cb6b8861f7f'::UUID, 'waste-bins-with-swing-lid', '617 mm', 617, 2),
    ('087d1fbb-e9d3-5136-8ecd-cfadd1e41815'::UUID, 'waste-bins-with-swing-lid', '513 mm', 513, 3),
    ('38e12c08-b75d-5c68-89ac-320ebfdea089'::UUID, 'waste-bins-with-swing-lid', '487 mm', 487, 4),
    ('0101862f-8fa9-59db-8efd-00b756c30866'::UUID, 'waste-bins-with-swing-lid', '400 mm', 400, 5),

    -- Dome Lid (footprint-free series)
    ('281b1d4d-b730-5211-8306-1ef8f6f8e84c'::UUID, 'waste-bins-with-dome-lid', '900 mm', 900, 0),
    ('92a92954-e7d5-5f3a-8787-c10f9e0db194'::UUID, 'waste-bins-with-dome-lid', '870 mm', 870, 1),

    -- Storage Bin With Fix Lid (footprint-free series)
    ('36029827-963e-5ef6-8018-a8892123b04e'::UUID, 'storage-bin-with-fix-lid', '750 mm', 750, 0),
    ('9d294685-e59d-587a-8e07-00607bfe2aa2'::UUID, 'storage-bin-with-fix-lid', '710 mm', 710, 1),
    ('e746f7c7-130e-52d7-873d-0a320dab1bce'::UUID, 'storage-bin-with-fix-lid', '669 mm', 669, 2),
    ('5590b8e1-4c84-56b8-8b4d-030ade6ac8ef'::UUID, 'storage-bin-with-fix-lid', '622 mm', 622, 3),
    ('19607c65-e971-5a67-85c9-5559dd00a4da'::UUID, 'storage-bin-with-fix-lid', '529 mm', 529, 4),
    ('ce401ae7-7390-5402-82c4-6ae8a320be9f'::UUID, 'storage-bin-with-fix-lid', '425 mm', 425, 5),
    ('56f7a2cd-caa6-5711-88d2-83d236def628'::UUID, 'storage-bin-with-fix-lid', '385 mm', 385, 6),
    ('09b49ef6-4675-5f07-855a-c36cb3d31e55'::UUID, 'storage-bin-with-fix-lid', '320 mm', 320, 7)
  ) AS v(id, series_slug, label, height, display_order)
  JOIN _wb_series ss ON ss.slug = v.series_slug
  WHERE true
  ON CONFLICT DO NOTHING;

  -- 4b. Resolve the real size ids by (series slug, height).
  DROP TABLE IF EXISTS _wb_size;
  CREATE TEMP TABLE _wb_size (
    series_slug TEXT NOT NULL,
    height      NUMERIC(10,2) NOT NULL,
    id          UUID NOT NULL,
    PRIMARY KEY (series_slug, height)
  ) ON COMMIT DROP;

  INSERT INTO _wb_size (series_slug, height, id)
  SELECT v.series_slug, v.height, sz.id
  FROM (VALUES
    ('waste-bins-trolley-710x850', 1120),
    ('waste-bins-trolley-560x730', 1060),
    ('waste-bins-trolley-470x550',  920),
    ('waste-bins-lid-680x500',      945),
    ('waste-bins-lid-680x420',      890),
    ('waste-bins-large-1360x1060', 1370),
    ('waste-bins-large-1220x785',  1230),
    ('waste-bins-with-swing-lid',  800),
    ('waste-bins-with-swing-lid',  710),
    ('waste-bins-with-swing-lid',  617),
    ('waste-bins-with-swing-lid',  513),
    ('waste-bins-with-swing-lid',  487),
    ('waste-bins-with-swing-lid',  400),
    ('waste-bins-with-dome-lid',   900),
    ('waste-bins-with-dome-lid',   870),
    ('storage-bin-with-fix-lid',   750),
    ('storage-bin-with-fix-lid',   710),
    ('storage-bin-with-fix-lid',   669),
    ('storage-bin-with-fix-lid',   622),
    ('storage-bin-with-fix-lid',   529),
    ('storage-bin-with-fix-lid',   425),
    ('storage-bin-with-fix-lid',   385),
    ('storage-bin-with-fix-lid',   320)
  ) AS v(series_slug, height)
  JOIN _wb_series ss ON ss.slug = v.series_slug
  JOIN public.size_variants sz ON sz.series_id = ss.id AND sz.height = v.height;

  SELECT COUNT(*) INTO n_sizes FROM _wb_size;

  IF n_sizes <> 23 THEN
    RAISE EXCEPTION 'Expected 23 Waste Bins sizes, resolved % - check the size_variants insert.', n_sizes;
  END IF;

  -- 5. Products = the final model at each size.
  INSERT INTO public.product_variants (id, size_variant_id, version_name, version_code, model_code,
                                       description, material, load_capacity,
                                       outer_length, outer_width, outer_height,
                                       inner_length, inner_width, inner_height,
                                       colours, shape, price, is_active, display_order)
  SELECT v.id, szi.id, NULL, NULL, v.model_code,
         v.description, NULL, v.capacity,
         v.outer_l, v.outer_w, v.outer_h,
         NULL, NULL, NULL,
         v.colours, NULL, NULL, true, 0
  FROM (VALUES
    -- Waste Bins With Trolley (footprint series, one model each)
    ('8dee1b35-1e09-4e0e-b743-1d18799d7ce4'::UUID, 'waste-bins-trolley-710x850', 1120, '2360',
     '360 L trolley waste bin with lid and wheels.', '360 L', 710, 850, 1120,
     'Yellow, Blue, Red, Green, Black'::TEXT),
    ('1d20f32c-2780-49e3-8c28-a3d626fdd121'::UUID, 'waste-bins-trolley-560x730', 1060, '2240',
     '240 L trolley waste bin with lid and wheels.', '240 L', 560, 730, 1060,
     'Yellow, Blue, Red, Green, Black'::TEXT),
    ('08c9fb94-a54c-40c6-8109-7949847876f3'::UUID, 'waste-bins-trolley-470x550',  920, '2120',
     '120 L trolley waste bin with lid and wheels.', '120 L', 470, 550,  920,
     'Yellow, Blue, Red, Green, Black'::TEXT),

    -- Waste Bins With Lid (footprint series, one model each)
    ('a9a5624a-eec5-4f9d-b931-514cfac04e03'::UUID, 'waste-bins-lid-680x500', 945, '2110',
     '110 L lidded waste bin — H 945 mm × W 500 mm × D 680 mm; height without lid 700 mm; window 185 × 368 mm.', '110 L', 680, 500, 945,
     'Blue, Green'::TEXT),
    ('c8bb9494-4509-4b2b-8187-05dae43593d5'::UUID, 'waste-bins-lid-680x420', 890, '2080',
     '80 L lidded waste bin — H 890 mm × W 420 mm × D 680 mm; height without lid 700 mm; window 160 × 285 mm.', '80 L', 680, 420, 890,
     'Blue, Green'::TEXT),

    -- Waste Bins With Swing Lid
    ('d82d4467-d460-597f-8f07-cdd3e8f57779'::UUID, 'waste-bins-with-swing-lid', 800, '4080',
     '80 L swing-lid bin — top Ø 510 mm, bottom Ø 370 mm, height 800 mm.', '80 L', 510, 510, 800,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('0544d828-c8f9-5640-8a26-2d6cbe1f18a0'::UUID, 'waste-bins-with-swing-lid', 710, '4060',
     '60 L swing-lid bin — top Ø 465 mm, bottom Ø 335 mm, height 710 mm.', '60 L', 465, 465, 710,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('00883fc1-c288-5ec8-8773-3fbe349d2cf9'::UUID, 'waste-bins-with-swing-lid', 617, '4040',
     '40 L swing-lid bin — top Ø 410 mm, bottom Ø 310 mm, height 617 mm.', '40 L', 410, 410, 617,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('f47dc698-65e4-5af9-89cd-4c51c221921b'::UUID, 'waste-bins-with-swing-lid', 513, '4030',
     '30 L swing-lid bin — top Ø 350 mm, bottom Ø 285 mm, height 513 mm.', '30 L', 350, 350, 513,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('dd76c356-7cb7-58ee-83cc-d25e0bc5b199'::UUID, 'waste-bins-with-swing-lid', 487, '4025',
     '25 L swing-lid bin — top Ø 370 mm, bottom Ø 265 mm, height 487 mm.', '25 L', 370, 370, 487,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('2fb4c5a5-fb07-5383-8e75-ac604fea7317'::UUID, 'waste-bins-with-swing-lid', 400, '4010',
     '10 L swing-lid bin — top Ø 280 mm, bottom Ø 190 mm, height 400 mm.', '10 L', 280, 280, 400,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),

    -- Waste Bins With Dome Lid
    ('64c4f10a-f7bc-52f1-8c35-38de11290569'::UUID, 'waste-bins-with-dome-lid', 900, '4120',
     '120 L dome-lid bin — top Ø 600 mm, bottom Ø 440 mm, height 900 mm.', '120 L', 600, 600, 900,
     'Blue'::TEXT),
    ('6b34ce0c-c7fa-55d0-8210-4cb4c5556111'::UUID, 'waste-bins-with-dome-lid', 870, '4100',
     '100 L dome-lid bin — top Ø 555 mm, bottom Ø 420 mm, height 870 mm.', '100 L', 555, 555, 870,
     'Blue'::TEXT),

    -- Storage Bin With Fix Lid
    ('826961b2-f8d2-52a1-84c9-3731c71daece'::UUID, 'storage-bin-with-fix-lid', 750, '4120',
     '120 L storage bin with fixed lid — top Ø 600 mm, bottom Ø 440 mm, height 750 mm.', '120 L', 600, 600, 750,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('de70d210-ff32-55a1-810e-bf846ae2c174'::UUID, 'storage-bin-with-fix-lid', 710, '4100',
     '100 L storage bin with fixed lid — top Ø 555 mm, bottom Ø 420 mm, height 710 mm.', '100 L', 555, 555, 710,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('df12a4d1-cac5-5ae8-8098-04d451fea50a'::UUID, 'storage-bin-with-fix-lid', 669, '4080',
     '80 L storage bin with fixed lid — top Ø 510 mm, bottom Ø 370 mm, height 669 mm.', '80 L', 510, 510, 669,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('69b6ad8b-42ce-502f-86cd-351cd9a4ecb8'::UUID, 'storage-bin-with-fix-lid', 622, '4060',
     '60 L storage bin with fixed lid — top Ø 465 mm, bottom Ø 335 mm, height 622 mm.', '60 L', 465, 465, 622,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('7bfff143-8176-5e5c-8527-681ea98ef8f9'::UUID, 'storage-bin-with-fix-lid', 529, '4040',
     '40 L storage bin with fixed lid — top Ø 410 mm, bottom Ø 310 mm, height 529 mm.', '40 L', 410, 410, 529,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('22753fba-8b85-51a4-8e67-81a7aaa1567b'::UUID, 'storage-bin-with-fix-lid', 425, '4030',
     '30 L storage bin with fixed lid — top Ø 350 mm, bottom Ø 285 mm, height 425 mm.', '30 L', 350, 350, 425,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('02ccdcc8-b7cc-5363-8a52-f3a809920f2d'::UUID, 'storage-bin-with-fix-lid', 385, '4025',
     '25 L storage bin with fixed lid — top Ø 370 mm, bottom Ø 265 mm, height 385 mm.', '25 L', 370, 370, 385,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('b34db817-c071-58f5-83ad-b4fe5e0df0f5'::UUID, 'storage-bin-with-fix-lid', 320, '4010',
     '10 L storage bin with fixed lid — top Ø 280 mm, bottom Ø 190 mm, height 320 mm.', '10 L', 280, 280, 320,
     'Blue, Red, Turquoise/Green'::TEXT),

    -- Large Waste Bins (footprint series, one model each)
    ('32f677e7-db33-4325-bc31-8dd005dbe580'::UUID, 'waste-bins-large-1360x1060', 1370, '21100',
     '1100 L large waste bin with wheels — 1360 × 1060 × 1370 mm.', '1100 L', 1360, 1060, 1370,
     NULL::TEXT),
    ('8553aa45-b24e-49c9-a7ec-aa2aad985f29'::UUID, 'waste-bins-large-1220x785',  1230, '2660',
     '660 L large waste bin with wheels — 1220 × 785 × 1230 mm.', '660 L', 1220, 785, 1230,
     NULL::TEXT)
  ) AS v(id, series_slug, height, model_code, description, capacity, outer_l, outer_w, outer_h, colours)
  JOIN _wb_size szi ON szi.series_slug = v.series_slug AND szi.height = v.height
  WHERE true
  ON CONFLICT DO NOTHING;

  -- 6. Assert the whole catalogue landed, so a partial load can never pass silently.
  SELECT COUNT(*) INTO n_models
  FROM public.product_variants pv
  JOIN public.size_variants sz ON sz.id = pv.size_variant_id
  JOIN _wb_series ss ON ss.id = sz.series_id;

  IF n_models <> 23 THEN
    RAISE EXCEPTION 'Expected 23 Waste Bins models across the 10 Waste Bins series, found %.', n_models;
  END IF;

  RAISE NOTICE 'Waste Bins: % product types, % series, % sizes, % models now active under category %',
    n_types, n_series, n_sizes, n_models, v_category_id;
END $$;