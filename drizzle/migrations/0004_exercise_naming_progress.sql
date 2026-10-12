CREATE OR REPLACE FUNCTION public.exercise_naming_progress() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_master_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT jsonb_build_object('status',c.status,'reason',c.pause_reason,'done',(SELECT count(*) FROM public.exercise_naming_jobs WHERE status='done'),'pending',(SELECT count(*) FROM public.exercise_naming_jobs WHERE status='pending'),'failed',(SELECT count(*) FROM public.exercise_naming_jobs WHERE status IN ('failed','inconclusive','skipped'))) INTO result FROM public.exercise_naming_control c WHERE c.id=1;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.exercise_naming_progress() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.exercise_naming_progress() TO authenticated,service_role;