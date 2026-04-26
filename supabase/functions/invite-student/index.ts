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

    // Validate caller
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { student_id, clinic_id } = await req.json();
    if (!student_id || !clinic_id) {
      return new Response(JSON.stringify({ error: 'student_id and clinic_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Confirm caller is staff of clinic
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('clinic_id', clinic_id)
      .in('role', ['clinic_admin', 'instructor', 'receptionist'])
      .maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Get student
    const { data: student, error: stErr } = await admin
      .from('clinic_students')
      .select('*')
      .eq('id', student_id)
      .eq('clinic_id', clinic_id)
      .single();
    if (stErr || !student) return new Response(JSON.stringify({ error: 'student not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!student.email) return new Response(JSON.stringify({ error: 'student has no email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const password = generatePassword(10);

    // Try to create user; if exists, just link
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: student.email,
      password,
      email_confirm: true,
      user_metadata: { name: student.full_name },
    });

    let userId: string | null = created?.user?.id ?? null;
    let alreadyExisted = false;

    if (createErr) {
      // already exists -> find and reset password
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === student.email.toLowerCase());
      if (existing) {
        userId = existing.id;
        alreadyExisted = true;
        await admin.auth.admin.updateUserById(existing.id, { password });
      } else {
        return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (userId) {
      // link student
      await admin.from('clinic_students').update({ user_id: userId }).eq('id', student_id);
      // ensure student role
      await admin.from('user_roles').insert({ user_id: userId, clinic_id, role: 'student' });
    }

    // record invite
    await admin.from('clinic_invites').insert({
      clinic_id,
      email: student.email,
      full_name: student.full_name,
      role: 'student',
      created_by: userData.user.id,
      temp_password: password,
      status: alreadyExisted ? 'accepted' : 'pending',
      accepted_user_id: userId,
    });

    return new Response(JSON.stringify({
      ok: true,
      email: student.email,
      password,
      already_existed: alreadyExisted,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'internal' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
