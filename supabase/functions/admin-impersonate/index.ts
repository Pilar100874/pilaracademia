// Edge Function: admin-impersonate
// Gera um token de login para o master_admin entrar na conta de outro usuário.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, key, { auth: { persistSession: false } });

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: caller } = await admin.auth.getUser(token);
    const callerId = caller?.user?.id;
    if (!callerId) return json({ error: 'Sessão inválida.' }, 401);

    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') return json({ error: 'Usuário inválido.' }, 400);
    if (userId === callerId) return json({ error: 'Você já está nesta conta.' }, 400);

    const { data: roles } = await admin
      .from('user_roles').select('role')
      .eq('user_id', callerId).eq('role', 'master_admin').limit(1);
    let mode = 'login_as';
    if (!roles?.length) {
      // Gestor pode entrar apenas nas contas vinculadas a ele.
      const { data: link } = await admin.from('managed_users').select('id')
        .eq('manager_id', callerId).eq('member_id', userId).maybeSingle();
      if (!link) return json({ error: 'Acesso negado.' }, 403);
      mode = 'manager_login_as';
    }

    const { data: target, error: tErr } = await admin.auth.admin.getUserById(userId);
    const email = target?.user?.email;
    if (tErr || !email) return json({ error: 'Usuário sem e-mail.' }, 404);

    const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (lErr || !link?.properties?.hashed_token) return json({ error: 'Falha ao gerar acesso.' }, 500);

    await admin.from('impersonation_log').insert({
      actor_user_id: callerId, target_user_id: userId, mode,
    });

    return json({ token_hash: link.properties.hashed_token, email });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
