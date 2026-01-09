-- Add is_natural column to custom_products table
ALTER TABLE public.custom_products 
ADD COLUMN is_natural boolean NOT NULL DEFAULT false;