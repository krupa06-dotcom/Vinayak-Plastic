-- ============================================================
-- Series slugs become unique per category
-- ============================================================
-- The admin form allows the same footprint (length x width) in different
-- categories. The auto generated slug ("600-400-series") was unique for the
-- whole table though, so the same footprint could not be created in a second
-- category and the save failed with:
--
--   duplicate key value violates unique constraint "series_slug_key"
--
-- The public site never resolves a series by its slug alone (the catalogue is
-- built per category and the URL is built from the category + the footprint),
-- so the slug only has to be unique inside its category.
--
-- The rule stays "one footprint per category"
-- (idx_series_category_footprint) - this migration only relaxes the slug.

-- 1. Refuse to continue when the data would break the new rule.
DO $$
DECLARE
  dupes TEXT;
BEGIN
  SELECT string_agg(d.category_id::text || '/' || d.slug, ', ') INTO dupes
  FROM (
    SELECT category_id, slug
    FROM series
    GROUP BY category_id, slug
    HAVING count(*) > 1
  ) d;
  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot scope series.slug per category, duplicates found: %', dupes;
  END IF;
END $$;

-- 2. Drop the global unique constraint on series.slug.
ALTER TABLE series DROP CONSTRAINT IF EXISTS series_slug_key;

-- 3. Drop a leftover unique index on series(slug) that is not a constraint.
DO $$
DECLARE
  idx TEXT;
BEGIN
  FOR idx IN
    SELECT i.indexrelid::regclass::text
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    WHERE t.relname = 'series'
      AND i.indisunique
      AND i.indpred IS NULL
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname)
        FROM unnest(i.indkey) AS k(attnum)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      ) = ARRAY['slug']
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %s', idx);
  END LOOP;
END $$;

-- 4. The slug has to be unique inside its category.
CREATE UNIQUE INDEX IF NOT EXISTS idx_series_category_slug ON series(category_id, slug);
