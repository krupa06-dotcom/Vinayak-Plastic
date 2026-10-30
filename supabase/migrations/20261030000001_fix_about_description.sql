-- ============================================================
-- Replace the template copy in the About page "Who We Are" section
-- ============================================================
-- The seed/early admin content stored bracketed placeholders such as
-- "[Company Name]" and "[insert industry/products ...]", which the
-- public About page rendered verbatim.
--
-- This updates ONLY the `description` key of the `about` setting and
-- leaves mission / vision / why_choose_us untouched. Safe to re-run:
-- it only matches rows that still contain the template placeholder.
-- ============================================================

UPDATE site_settings
SET value = jsonb_set(
      value,
      '{description}',
      to_jsonb(
        'Vinayak Plastics is a Vadodara-based material handling and packaging supplier, working directly with procurement teams since 2020. We keep supply practical — the right product, the right specification, and a dispatch timeline you can plan around.'::text
      ),
      true
    ),
    updated_at = now()
WHERE key = 'about'
  AND value->>'description' LIKE '%[Company Name]%';
