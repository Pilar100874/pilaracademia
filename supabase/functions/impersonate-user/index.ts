import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';

interface Body {
  // Either targetUserId OR studentId (when impersonating an aluno) OR clinicId (when master entering clinic owner)
  targetUserId?: string;
  studentId?: string;
  clinicId?: string;
  mode: 'master_to_clinic_owner' | 'clinic_to_student';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'missing auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Caller-scoped client (RLS) to identify who is calling.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = userData.user.id;

    const body = (await req.json()) as Body;

    // Admin client used for permission checks (bypasses RLS) and password reset.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    let targetUserId: string | null = null;

    if (body.mode === 'master_to_clinic_owner') {
      // 1. Caller must be master_admin
      const { data: roleRow } = await admin
        .from('user_roles')
        .select('id')
        .eq('user_id', callerId)
        .eq('role', 'master_admin')
        .is('clinic_id', null)
        .maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: 'forbidden: not master' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!body.clinicId) {
        return new Response(JSON.stringify({ error: 'clinicId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: clinic, error: cErr } = await admin
        .from('clinics')
        .select('owner_user_id')
        .eq('id', body.clinicId)
        .maybeSingle();
      if (cErr || !clinic) {
        return new Response(JSON.stringify({ error: 'clinic not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetUserId = clinic.owner_user_id;
    } else if (body.mode === 'clinic_to_student') {
      if (!body.studentId) {
        return new Response(JSON.stringify({ error: 'studentId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Look up the student
      const { data: student, error: sErr } = await admin
        .from('clinic_students')
        .select('user_id, clinic_id')
        .eq('id', body.studentId)
        .maybeSingle();
      if (sErr || !student) {
        return new Response(JSON.stringify({ error: 'student not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!student.user_id) {
        return new Response(JSON.stringify({ error: 'aluno ainda não criou login' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check setting allow_login_as_student
      const { data: settings } = await admin
        .from('clinic_settings')
        .select('allow_login_as_student')
        .eq('clinic_id', student.clinic_id)
        .maybeSingle();
      if (!settings?.allow_login_as_student) {
        return new Response(JSON.stringify({ error: 'recurso desativado pelo dono da clínica' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Caller must be staff of that clinic
      const { data: staffRows } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', callerId)
        .eq('clinic_id', student.clinic_id);
      const isStaff = (staffRows || []).some(r =>
        r.role === 'clinic_admin' || r.role === 'instructor' || r.role === 'receptionist'
      );
      if (!isStaff) {
        return new Response(JSON.stringify({ error: 'forbidden: not staff' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetUserId = student.user_id;
    } else {
      return new Response(JSON.stringify({ error: 'invalid mode' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'no target' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (targetUserId === callerId) {
      return new Response(JSON.stringify({ error: 'já está logado como o destino' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch target user email
    const { data: targetUser, error: tErr } = await admin.auth.admin.getUserById(targetUserId);
    if (tErr || !targetUser?.user?.email) {
      return new Response(JSON.stringify({ error: 'target user has no email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate strong temporary password and update target
    const tempPassword =
      'Tmp-' + crypto.randomUUID().replace(/-/g, '').slice(0, 18) + '-X1!';
    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: tempPassword,
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: 'falha ao gerar credenciais', detail: updErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Audit log (best effort)
    try {
      await admin.from('impersonation_log').insert({
        actor_user_id: callerId,
        target_user_id: targetUserId,
        mode: body.mode,
        clinic_id: body.clinicId ?? null,
        student_id: body.studentId ?? null,
      });
    } catch {/* table may not exist */}

    return new Response(
      JSON.stringify({
        email: targetUser.user.email,
        password: tempPassword,
        targetUserId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
