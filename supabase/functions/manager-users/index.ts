// Edge Function: manager-users
// - set_gestor: master_admin liga/desliga o papel "gestor" de um usuário.
// - create: gestor cria um usuário vinculado a ele (e-mail + senha inicial).
// - delete: gestor exclui um usuário vinculado a ele.
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

    const { data: roleRows } = await admin.from('user_roles').select('role').eq('user_id', callerId);
    const roles = new Set((roleRows ?? []).map((r: { role: string }) => r.role));
    const body = await req.json();

    if (body.action === 'set_gestor') {
      if (!roles.has('master_admin')) return json({ error: 'Acesso negado.' }, 403);
      if (!isUuid(body.userId)) return json({ error: 'Usuário inválido.' }, 400);
      if (body.enabled) {
        const { data: ex } = await admin.from('user_roles').select('id')
          .eq('user_id', body.userId).eq('role', 'gestor').is('clinic_id', null).limit(1);
        if (!ex?.length) {
          const { error } = await admin.from('user_roles').insert({ user_id: body.userId, role: 'gestor' });
          if (error) return json({ error: error.message }, 500);
        }
      } else {
        await admin.from('user_roles').delete().eq('user_id', body.userId).eq('role', 'gestor');
      }
      return json({ ok: true });
    }

    if (!roles.has('gestor')) return json({ error: 'Apenas gestores podem fazer isso.' }, 403);

    if (body.action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');
      const name = String(body.name ?? '').trim().slice(0, 120);
      if (!name) return json({ error: 'Informe o nome.' }, 400);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'E-mail inválido.' }, 400);
      if (password.length < 8) return json({ error: 'A senha precisa ter ao menos 8 caracteres.' }, 400);

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { name },
      });
      if (cErr || !created?.user) {
        const msg = /already|registered|exists/i.test(cErr?.message ?? '')
          ? 'Já existe uma conta com este e-mail.'
          : cErr?.message ?? 'Falha ao criar usuário.';
        return json({ error: msg }, 400);
      }
      const memberId = created.user.id;
      await admin.from('profiles').update({
        approval_status: 'approved', is_active: true, name,
        approval_decided_at: new Date().toISOString(), approval_decided_by: callerId,
      }).eq('user_id', memberId);
      const { error: lErr } = await admin.from('managed_users').insert({ manager_id: callerId, member_id: memberId });
      if (lErr) {
        await admin.auth.admin.deleteUser(memberId);
        return json({ error: lErr.message }, 500);
      }
      return json({ ok: true, userId: memberId });
    }

    if (body.action === 'delete') {
      if (!isUuid(body.userId)) return json({ error: 'Usuário inválido.' }, 400);
      const { data: link } = await admin.from('managed_users').select('id')
        .eq('manager_id', callerId).eq('member_id', body.userId).maybeSingle();
      if (!link) return json({ error: 'Usuário não vinculado a você.' }, 403);
      await admin.from('managed_users').delete().eq('member_id', body.userId);
      const { error } = await admin.auth.admin.deleteUser(body.userId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
