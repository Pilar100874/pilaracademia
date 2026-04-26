// Popula uma clínica com dados fictícios (alunos, salas, equipamentos, professores e grade).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clinic_id } = await req.json();
    if (!clinic_id) {
      return new Response(JSON.stringify({ error: 'clinic_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica se é admin da clínica
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('clinic_id', clinic_id).eq('role', 'clinic_admin').maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Salas
    const { data: rooms } = await admin.from('clinic_rooms').insert([
      { clinic_id, name: 'Sala Principal', color: '#8b5cf6', capacity: 4 },
      { clinic_id, name: 'Sala VIP', color: '#06b6d4', capacity: 2 },
    ]).select();

    // Equipamentos
    const eqRows = [
      { clinic_id, name: 'Reformer 1', equipment_type: 'reformer' },
      { clinic_id, name: 'Reformer 2', equipment_type: 'reformer' },
      { clinic_id, name: 'Cadillac', equipment_type: 'cadillac' },
      { clinic_id, name: 'Chair', equipment_type: 'chair' },
      { clinic_id, name: 'Barrel', equipment_type: 'barrel' },
    ];
    await admin.from('clinic_equipment').insert(eqRows);

    // Skill levels
    await admin.from('clinic_skill_levels').insert([
      { clinic_id, name: 'Iniciante', color: '#22c55e', rank: 1 },
      { clinic_id, name: 'Intermediário', color: '#f59e0b', rank: 2 },
      { clinic_id, name: 'Avançado', color: '#ef4444', rank: 3 },
    ]);

    // Alunos fictícios
    const studentRows = [
      { clinic_id, full_name: 'Ana Souza (Demo)', email: 'ana.demo@example.com', phone: '11999990001', contract_type: 'period' },
      { clinic_id, full_name: 'Beatriz Lima (Demo)', email: 'beatriz.demo@example.com', phone: '11999990002', contract_type: 'classes', contract_classes_total: 12 },
      { clinic_id, full_name: 'Carlos Mendes (Demo)', email: 'carlos.demo@example.com', phone: '11999990003', contract_type: 'open' },
      { clinic_id, full_name: 'Diana Rocha (Demo)', email: 'diana.demo@example.com', phone: '11999990004', contract_type: 'period' },
      { clinic_id, full_name: 'Eduardo Pires (Demo)', email: 'eduardo.demo@example.com', phone: '11999990005', contract_type: 'open' },
    ];
    await admin.from('clinic_students').insert(studentRows);

    // Bookable slots (7 dias x 4 horários)
    const room = rooms?.[0];
    const now = new Date();
    const slots: any[] = [];
    for (let d = 0; d < 7; d++) {
      for (const h of [8, 10, 14, 16]) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() + d);
        dt.setHours(h, 0, 0, 0);
        slots.push({
          clinic_id,
          scheduled_at: dt.toISOString(),
          duration_minutes: 50,
          capacity: 4,
          room_id: room?.id ?? null,
          instructor_id: user.id,
          created_by: user.id,
        });
      }
    }
    await admin.from('bookable_slots').insert(slots);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
