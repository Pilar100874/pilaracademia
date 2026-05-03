CREATE TABLE public.weekly_menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  menu JSONB NOT NULL,
  shopping_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_menus_user_week ON public.weekly_menus(user_id, week_start DESC);

ALTER TABLE public.weekly_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly menus"
  ON public.weekly_menus FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly menus"
  ON public.weekly_menus FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly menus"
  ON public.weekly_menus FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly menus"
  ON public.weekly_menus FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_weekly_menus_updated_at
  BEFORE UPDATE ON public.weekly_menus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();