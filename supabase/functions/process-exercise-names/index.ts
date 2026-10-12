import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const db = createClient(url, key);
  const { data: control, error: controlError } = await db.from('exercise_naming_control').select('*').eq('id', 1).single();
  if (controlError || !control) return json({ error: 'Fila não configurada.' }, 503);
  if (req.headers.get('x-naming-worker-token') !== control.worker_token) {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await db.auth.getUser(token);
    if (!auth.user) return json({ error: 'Não autenticado.' }, 401);
    const { data: master } = await db.from('user_roles').select('id').eq('user_id', auth.user.id).eq('role', 'master_admin').is('clinic_id', null).limit(1);
    if (!master?.length) return json({ error: 'Acesso exclusivo do administrador.' }, 403);
  }
  if (control.status !== 'running') return json({ paused: true, reason: control.pause_reason });
  const lease = crypto.randomUUID();
  const { data: claimed, error: claimError } = await db.rpc('claim_exercise_naming', { _lease: lease });
  if (claimError) return json({ error: claimError.message }, 500);
  if (!claimed) return json({ busy: true });
  let done = 0;
  try {
    // Two sequential items at most; no chained invocations or browser fan-out.
    for (let i = 0; i < 2; i++) {
      const { data: current } = await db.from('exercise_naming_control').select('status').eq('id', 1).single();
      if (current?.status !== 'running') break;
      const { data: job, error: jobError } = await db.from('exercise_naming_jobs').select('*').eq('status', 'pending').lte('next_attempt_at', new Date().toISOString()).order('updated_at').limit(1).maybeSingle();
      if (jobError) throw jobError;
      if (!job) break;
      const { data: exercise } = await db.from('exercise_library').select('user_id,is_global,video_url').eq('id', job.exercise_id).maybeSingle();
      if (!exercise || exercise.video_url !== job.video_url) {
        await db.from('exercise_naming_jobs').update({ status: 'skipped', last_error: 'Vídeo removido ou substituído.' }).eq('exercise_id', job.exercise_id).eq('video_url', job.video_url);
        continue;
      }
      const response = await fetch(`${url}/functions/v1/analyze-exercise-video`, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${control.worker_token}`, 'x-naming-worker-token': control.worker_token },
        body: JSON.stringify({ videoUrl: job.video_url, mode: exercise.is_global ? 'library' : 'user', nameOnly: true }),
      });
      const result = await response.json().catch(() => ({ error: 'Resposta inválida da análise.' }));
      if (response.status === 402 || response.status === 403 || result.error === 'AI_REFUSAL') {
        const reason = result.message || result.error || 'A análise foi bloqueada.';
        await db.from('exercise_naming_control').update({ status: 'paused', pause_reason: reason }).eq('id', 1);
        await db.from('exercise_naming_jobs').update({ last_error: reason }).eq('exercise_id', job.exercise_id);
        break;
      }
      if (!response.ok || result.error || result.fallback) {
        const attempts = job.attempts + 1;
        const retryable = response.status === 429 || response.status >= 500 || result.fallback;
        const retryAfter = Number(response.headers.get('Retry-After')) || 60 * 2 ** attempts;
        await db.from('exercise_naming_jobs').update({ attempts, status: retryable && attempts < 3 ? 'pending' : 'failed', last_error: result.message || result.error || 'Falha ao identificar vídeo.', next_attempt_at: new Date(Date.now() + retryAfter * 1000).toISOString(), updated_at: new Date().toISOString() }).eq('exercise_id', job.exercise_id).eq('video_url', job.video_url);
        if (response.status === 429) break;
        continue;
      }
      const name = typeof result.exercise_name === 'string' ? result.exercise_name.replace(/\s+/g, ' ').trim() : '';
      if (!name) {
        await db.from('exercise_naming_jobs').update({ status: 'inconclusive', last_error: 'Movimento não identificado com segurança; nome original preservado.' }).eq('exercise_id', job.exercise_id).eq('video_url', job.video_url);
        continue;
      }
      const { error: saveError } = await db.rpc('complete_exercise_name', { _id: job.exercise_id, _url: job.video_url, _name: name });
      if (saveError) throw saveError;
      done++;
    }
    return json({ done });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Falha na fila de identificação.';
    await db.from('exercise_naming_control').update({ status: 'paused', pause_reason: reason }).eq('id', 1);
    return json({ error: reason }, 500);
  } finally {
    await db.from('exercise_naming_control').update({ lease_until: null, lease_id: null }).eq('id', 1).eq('lease_id', lease);
  }
});