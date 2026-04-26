// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePassword(len = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const { clinic_id, email, full_name } = body;
    const role = body.role as 'instructor' | 'receptionist' | 'clinic_admin';
    if (!clinic_id || !email || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!['instructor', 'receptionist', 'clinic_admin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'invalid role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Confirm caller is clinic_admin of clinic (only admins can add staff)
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('clinic_id', clinic_id)
      .eq('role', 'clinic_admin')
      .maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const password = generatePassword(10);
    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: full_name },
    });

    let userId: string | null = created?.user?.id ?? null;
    let alreadyExisted = false;

    if (createErr) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
      if (existing) {
        userId = existing.id;
        alreadyExisted = true;
        await admin.auth.admin.updateUserById(existing.id, { password });
      } else {
        return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (userId) {
      // ensure profile
      await admin.from('profiles').upsert({ user_id: userId, name: full_name, email: normalizedEmail }, { onConflict: 'user_id' });
      // ensure role for clinic
      await admin.from('user_roles').insert({ user_id: userId, clinic_id, role }).then(() => {}, () => {});
      await admin.from('user_security_flags').upsert({
        user_id: userId,
        must_change_password: true,
        password_changed_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    await admin.from('clinic_invites').insert({
      clinic_id,
      email: normalizedEmail,
      full_name,
      role,
      created_by: userData.user.id,
      temp_password: password,
      status: alreadyExisted ? 'accepted' : 'pending',
      accepted_user_id: userId,
    });

    return new Response(JSON.stringify({
      ok: true,
      email: normalizedEmail,
      password,
      already_existed: alreadyExisted,
      user_id: userId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'internal' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
