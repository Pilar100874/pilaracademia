-- Add new nutrition columns to food_entries
ALTER TABLE public.food_entries
ADD COLUMN saturated_fat NUMERIC(6,1) DEFAULT 0,
ADD COLUMN trans_fat NUMERIC(6,1) DEFAULT 0,
ADD COLUMN fiber NUMERIC(6,1) DEFAULT 0,
ADD COLUMN sodium NUMERIC(8,1) DEFAULT 0;

-- Add daily goals for new nutrients to profiles
ALTER TABLE public.profiles
ADD COLUMN daily_saturated_fat INTEGER,
ADD COLUMN daily_trans_fat INTEGER,
ADD COLUMN daily_fiber INTEGER,
ADD COLUMN daily_sodium INTEGER;