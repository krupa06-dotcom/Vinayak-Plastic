-- Vinayak Plastics — Remove size/model weight
--
-- Weight is no longer captured or displayed for product sizes. Drop the
-- weight columns from both variant tables and clean up any "Weight" spec
-- rows carried over from the old products data.

ALTER TABLE sub_category_variants DROP COLUMN IF EXISTS weight;
ALTER TABLE category_variants DROP COLUMN IF EXISTS weight;

DELETE FROM sub_category_specifications WHERE LOWER(specification_name) = 'weight';