-- Phase 3 / Sprint 3: structured property location fields
-- Keeps legacy "address" while adding structured columns for cleaner UX and reporting.

ALTER TABLE IF EXISTS public.properties
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS town_city TEXT,
  ADD COLUMN IF NOT EXISTS county TEXT,
  ADD COLUMN IF NOT EXISTS landmark TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Best-effort backfill from legacy "address" format:
-- "street_address, neighborhood, town_city, county"
UPDATE public.properties
SET
  street_address = COALESCE(
    street_address,
    NULLIF(TRIM(SPLIT_PART(address, ',', 1)), '')
  ),
  neighborhood = COALESCE(
    neighborhood,
    NULLIF(TRIM(SPLIT_PART(address, ',', 2)), '')
  ),
  town_city = COALESCE(
    town_city,
    NULLIF(TRIM(SPLIT_PART(address, ',', 3)), '')
  ),
  county = COALESCE(
    county,
    NULLIF(TRIM(SPLIT_PART(address, ',', 4)), '')
  )
WHERE address IS NOT NULL
  AND (
    street_address IS NULL
    OR neighborhood IS NULL
    OR town_city IS NULL
    OR county IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_properties_county ON public.properties(county);
CREATE INDEX IF NOT EXISTS idx_properties_town_city ON public.properties(town_city);
