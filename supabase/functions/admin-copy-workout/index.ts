// Edge Function: admin-copy-workout
// Copia um treino do master_admin para outro usuário. Apenas master_admin.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const isUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: caller } = await admin.auth.getUser(token);
    const callerId = caller?.user?.id;
    if (!callerId) return json({ error: 'Sessão inválida.' }, 401);

    const { planId, targetUserId } = await req.json();
    if (!isUuid(planId) || !isUuid(targetUserId)) return json({ error: 'Dados inválidos.' }, 400);

    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', callerId);
    const set = new Set((roles ?? []).map((r: { role: string }) => r.role));
    const isMaster = set.has('master_admin');
    if (!isMaster && !set.has('gestor')) return json({ error: 'Acesso negado.' }, 403);

    const { data: plan } = await admin.from('workout_plans').select('*').eq('id', planId).maybeSingle();
    if (!plan) return json({ error: 'Treino não encontrado.' }, 404);

    if (isMaster) {
      if (plan.user_id !== callerId) return json({ error: 'Treino não encontrado.' }, 404);
    } else {
      // Gestor: origem = ele mesmo ou um usuário dele; destino = usuário dele.
      const { data: links } = await admin.from('managed_users').select('member_id').eq('manager_id', callerId);
      const members = new Set((links ?? []).map((l: { member_id: string }) => l.member_id));
      if (plan.user_id !== callerId && !members.has(plan.user_id)) return json({ error: 'Treino não encontrado.' }, 404);
      if (!members.has(targetUserId)) return json({ error: 'Usuário não vinculado a você.' }, 403);
      if (plan.user_id === targetUserId) return json({ error: 'Escolha outro usuário de destino.' }, 400);
    }

    const { data: target } = await admin.from('profiles').select('user_id').eq('user_id', targetUserId).maybeSingle();
    if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

    const { id: _i, created_at: _c, updated_at: _u, user_id: _o, ...rest } = plan;
    const { data: newPlan, error: pErr } = await admin.from('workout_plans')
      .insert({ ...rest, user_id: targetUserId }).select('id').single();
    if (pErr || !newPlan) return json({ error: pErr?.message ?? 'Falha ao copiar.' }, 500);

    const { data: exs } = await admin.from('workout_exercises').select('*').eq('workout_plan_id', planId);
    if (exs?.length) {
      const rows = exs.map(({ id: _x, created_at: _y, updated_at: _z, ...e }) => ({ ...e, workout_plan_id: newPlan.id }));
      const { error: eErr } = await admin.from('workout_exercises').insert(rows);
      if (eErr) {
        await admin.from('workout_plans').delete().eq('id', newPlan.id);
        return json({ error: eErr.message }, 500);
      }
    }
    return json({ ok: true, count: exs?.length ?? 0 });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
