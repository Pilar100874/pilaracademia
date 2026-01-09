-- Add is_liquid column to custom_products table
ALTER TABLE public.custom_products 
ADD COLUMN is_liquid boolean NOT NULL DEFAULT false;