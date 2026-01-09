-- Add package information fields to custom_products table
ALTER TABLE public.custom_products 
ADD COLUMN IF NOT EXISTS package_total_weight numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS package_total_units integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS package_volume_ml numeric DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.custom_products.package_total_weight IS 'Total weight of the package in grams (for solids)';
COMMENT ON COLUMN public.custom_products.package_total_units IS 'Total number of units in the package';
COMMENT ON COLUMN public.custom_products.package_volume_ml IS 'Total volume of the package in ml (for liquids)';