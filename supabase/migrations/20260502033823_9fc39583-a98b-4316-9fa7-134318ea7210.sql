CREATE TABLE IF NOT EXISTS public.share_summary_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES public.share_summaries(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_summary_views_share_ip_time
  ON public.share_summary_views(share_id, ip_hash, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_share_summary_views_ip_time
  ON public.share_summary_views(ip_hash, viewed_at DESC);

ALTER TABLE public.share_summary_views ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy: apenas service role acessa (bypassa RLS).
