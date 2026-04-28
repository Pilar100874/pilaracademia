-- AI Studio workflows
CREATE TABLE IF NOT EXISTS public.ai_studio_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  nodes_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_studio_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view ai studio workflows"
ON public.ai_studio_workflows FOR SELECT
USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff manage ai studio workflows"
ON public.ai_studio_workflows FOR ALL
USING (public.is_clinic_staff(auth.uid(), clinic_id))
WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE TRIGGER update_ai_studio_workflows_updated_at
BEFORE UPDATE ON public.ai_studio_workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Video projects
CREATE TABLE IF NOT EXISTS public.video_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL DEFAULT 'Projeto sem título',
  thumbnail TEXT,
  timeline_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  video_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view video projects"
ON public.video_projects FOR SELECT
USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff manage video projects"
ON public.video_projects FOR ALL
USING (public.is_clinic_staff(auth.uid(), clinic_id))
WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE TRIGGER update_video_projects_updated_at
BEFORE UPDATE ON public.video_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();