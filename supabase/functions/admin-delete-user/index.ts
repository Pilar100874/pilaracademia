// Edge Function: admin-delete-user
// Apaga um usuário do auth + dados associados. Apenas master_admin pode chamar.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Identifica o chamador
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerJson = await userRes.json();
    const callerId: string | undefined = callerJson?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Confere se chamador é master_admin
    const roleRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${callerId}&role=eq.master_admin&clinic_id=is.null&select=role&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const roleRows = roleRes.ok ? await roleRes.json() : [];
    if (!Array.isArray(roleRows) || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: 'Acesso negado.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3) Lê userId do body
    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'userId é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (userId === callerId) {
      return new Response(JSON.stringify({ error: 'Você não pode excluir a si mesmo.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4) Deleta usuário via Admin API (cascade nas tabelas com FK → auth.users)
    const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!delRes.ok) {
      const text = await delRes.text();
      console.error('admin delete failed', delRes.status, text);
      return new Response(
        JSON.stringify({ error: `Falha ao excluir usuário: ${delRes.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('admin-delete-user error', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
