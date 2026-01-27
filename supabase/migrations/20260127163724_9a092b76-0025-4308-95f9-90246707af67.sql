-- Add image_urls array column for multiple images per exercise
ALTER TABLE public.workout_exercises 
ADD COLUMN image_urls text[] DEFAULT '{}';

-- Migrate existing single image_url to the new array column
UPDATE public.workout_exercises 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND image_url != '';

-- Keep image_url for backward compatibility (will use first image from array)