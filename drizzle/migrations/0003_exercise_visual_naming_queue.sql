-- lovable-cron-fallback-reviewed: bounded queue wakes on enqueue and unschedules after drain; minute retries only while work remains
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
ALTER TABLE public.exercise_library ADD COLUMN IF NOT EXISTS video_named_url text;
CREATE TABLE public.exercise_naming_control (id integer PRIMARY KEY DEFAULT 1 CHECK (id=1), worker_token uuid NOT NULL DEFAULT gen_random_uuid(), owner_id uuid, status text NOT NULL DEFAULT 'running', pause_reason text, lease_until timestamptz, lease_id uuid, function_url text);
GRANT ALL ON public.exercise_naming_control TO service_role;
ALTER TABLE public.exercise_naming_control ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.exercise_naming_jobs (exercise_id uuid PRIMARY KEY REFERENCES public.exercise_library(id) ON DELETE CASCADE, video_url text NOT NULL, status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(), last_error text, original_name text, identified_name text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.exercise_naming_jobs TO authenticated;
GRANT ALL ON public.exercise_naming_jobs TO service_role;
ALTER TABLE public.exercise_naming_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY naming_jobs_read ON public.exercise_naming_jobs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exercise_library e WHERE e.id=exercise_id AND (e.user_id=auth.uid() OR e.is_global)));
CREATE OR REPLACE FUNCTION public.dispatch_exercise_naming() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_catalog AS $$
DECLARE c public.exercise_naming_control; j bigint;
BEGIN
 SELECT * INTO c FROM public.exercise_naming_control WHERE id=1;
 IF c.status <> 'running' OR NOT EXISTS(SELECT 1 FROM public.exercise_naming_jobs WHERE status='pending') THEN
 FOR j IN SELECT jobid FROM cron.job WHERE jobname='exercise-visual-naming' LOOP PERFORM cron.unschedule(j); END LOOP; RETURN;
 END IF;
 IF c.lease_until > now() OR c.function_url IS NULL THEN RETURN; END IF;
 PERFORM net.http_post(url:=c.function_url, headers:=jsonb_build_object('Content-Type','application/json','x-naming-worker-token',c.worker_token::text), body:='{}'::jsonb,timeout_milliseconds:=150000);
END $$;
CREATE OR REPLACE FUNCTION public.wake_exercise_naming() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_catalog AS $$
DECLARE c public.exercise_naming_control;
BEGIN
 SELECT * INTO c FROM public.exercise_naming_control WHERE id=1;
 IF c.status <> 'running' OR c.function_url IS NULL OR NOT EXISTS (SELECT 1 FROM public.exercise_naming_jobs WHERE status='pending') THEN RETURN; END IF;
 IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='exercise-visual-naming') THEN
 PERFORM cron.schedule('exercise-visual-naming','* * * * *','SELECT public.dispatch_exercise_naming()');
 END IF;
 PERFORM public.dispatch_exercise_naming();
END $$;
CREATE OR REPLACE FUNCTION public.enqueue_exercise_naming() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.video_url IS NOT NULL AND NEW.video_type='upload' AND NEW.video_url IS DISTINCT FROM NEW.video_named_url THEN
 INSERT INTO public.exercise_naming_jobs(exercise_id,video_url,original_name) VALUES(NEW.id,NEW.video_url,NEW.name) ON CONFLICT(exercise_id) DO UPDATE SET video_url=EXCLUDED.video_url,status='pending',attempts=0,next_attempt_at=now(),last_error=NULL,original_name=EXCLUDED.original_name WHERE exercise_naming_jobs.video_url IS DISTINCT FROM EXCLUDED.video_url;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER enqueue_visual_name AFTER INSERT OR UPDATE OF video_url ON public.exercise_library FOR EACH ROW EXECUTE FUNCTION public.enqueue_exercise_naming();
CREATE OR REPLACE FUNCTION public.wake_naming_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.wake_exercise_naming(); RETURN NULL; END $$;
CREATE TRIGGER wake_visual_names AFTER INSERT ON public.exercise_naming_jobs FOR EACH STATEMENT EXECUTE FUNCTION public.wake_naming_trigger();
CREATE OR REPLACE FUNCTION public.claim_exercise_naming(_lease uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH claimed AS (UPDATE public.exercise_naming_control SET lease_until=now()+interval '4 minutes',lease_id=_lease WHERE id=1 AND status='running' AND (lease_until IS NULL OR lease_until<now()) RETURNING id) SELECT EXISTS(SELECT 1 FROM claimed);
$$;
CREATE OR REPLACE FUNCTION public.complete_exercise_name(_id uuid,_url text,_name text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.exercise_library SET name=_name,video_named_url=_url WHERE id=_id AND video_url=_url;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.workout_exercises SET name=_name WHERE exercise_library_id=_id OR (exercise_library_id IS NULL AND video_url=_url);
 UPDATE public.exercise_naming_jobs SET status='done',identified_name=_name,last_error=NULL,updated_at=now() WHERE exercise_id=_id AND video_url=_url;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.wake_exercise_naming(),public.dispatch_exercise_naming(),public.claim_exercise_naming(uuid),public.complete_exercise_name(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wake_exercise_naming(),public.dispatch_exercise_naming(),public.claim_exercise_naming(uuid),public.complete_exercise_name(uuid,text,text) TO service_role;