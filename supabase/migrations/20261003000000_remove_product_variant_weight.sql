-- Vinayak Plastics — Remove product variant weight
--
-- Weight is no longer captured, stored or displayed for product versions or
-- series. Drop the weight column from product_variants (the leaf model row of
-- the series hierarchy) so the field cannot be re-populated by the admin UI.

ALTER TABLE product_variants DROP COLUMN IF EXISTS weight;