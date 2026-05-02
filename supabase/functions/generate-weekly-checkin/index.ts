import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return j({ error: 'Não autenticado' }, 401);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return j({ error: 'Não autenticado' }, 401);

    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);

    const [foods, exercises, liquids, weights, plan] = await Promise.all([
      supabase.from('food_entries').select('calories,protein,carbs,fat,consumed_at').eq('user_id', user.id).gte('consumed_at', start.toISOString()),
      supabase.from('exercise_entries').select('calories_burned,duration_minutes,performed_at').eq('user_id', user.id).gte('performed_at', start.toISOString()),
      supabase.from('liquid_entries').select('amount_ml,consumed_at').eq('user_id', user.id).gte('consumed_at', start.toISOString()),
      supabase.from('weight_history').select('weight_kg,recorded_at').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(20),
      supabase.from('body_analyses').select('plan').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const days = 7;
    const totalCal = (foods.data || []).reduce((s, e: any) => s + Number(e.calories || 0), 0);
    const totalProt = (foods.data || []).reduce((s, e: any) => s + Number(e.protein || 0), 0);
    const totalBurn = (exercises.data || []).reduce((s, e: any) => s + Number(e.calories_burned || 0), 0);
    const totalLiq = (liquids.data || []).reduce((s, e: any) => s + Number(e.amount_ml || 0), 0);
    const workoutDays = new Set((exercises.data || []).map((e: any) => e.performed_at.slice(0, 10))).size;

    const weightStart = (weights.data || [])[weights.data!.length - 1]?.weight_kg;
    const weightEnd = (weights.data || [])[0]?.weight_kg;
    const weightDelta = weightStart != null && weightEnd != null ? Number(weightEnd) - Number(weightStart) : null;

    const planData: any = plan.data?.plan || {};
    const goalCal = planData.calories?.target;
    const goalProt = planData.macros?.protein_g;

    const metrics = {
      avg_calories: Math.round(totalCal / days),
      avg_protein: Math.round(totalProt / days),
      avg_burn: Math.round(totalBurn / days),
      avg_liquid_ml: Math.round(totalLiq / days),
      workout_days: workoutDays,
      weight_delta_kg: weightDelta,
      goal_calories: goalCal,
      goal_protein: goalProt,
      protein_pct: goalProt ? Math.round((totalProt / days / goalProt) * 100) : null,
      calorie_pct: goalCal ? Math.round((totalCal / days / goalCal) * 100) : null,
    };

    // Ask AI for narrative
    const userPrompt = `Faça um relatório semanal curto, motivador e direto.
Métricas (média/dia, exceto onde indicado):
- Calorias: ${metrics.avg_calories} kcal (meta ${goalCal || '—'})
- Proteína: ${metrics.avg_protein} g (meta ${goalProt || '—'})
- Calorias queimadas: ${metrics.avg_burn} kcal
- Hidratação: ${metrics.avg_liquid_ml} ml
- Treinos na semana: ${workoutDays}/7
- Variação de peso: ${weightDelta != null ? weightDelta.toFixed(2) + ' kg' : 'sem dado'}
Objetivo do plano: ${planData.goal?.primary || '—'}

Responda em português, tom amigável, máximo 2 parágrafos curtos.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é coach de saúde. Seja específico com números, sem encheção.' },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_checkin',
            parameters: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                highlights: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
                adherence_score: { type: 'number' },
              },
              required: ['summary', 'highlights', 'recommendations', 'adherence_score'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'return_checkin' } },
      }),
    });
    if (!aiRes.ok) {
      if (aiRes.status === 429) return j({ error: 'Limite de IA atingido' }, 429);
      if (aiRes.status === 402) return j({ error: 'Créditos da IA esgotados' }, 402);
      return j({ error: 'Erro na IA' }, 500);
    }
    const aj = await aiRes.json();
    const args = JSON.parse(aj.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || '{}');

    const periodStart = start.toISOString().slice(0, 10);
    const periodEnd = now.toISOString().slice(0, 10);

    const { data: saved, error: saveErr } = await supabase
      .from('weekly_checkins')
      .upsert({
        user_id: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        metrics,
        summary: args.summary,
        highlights: args.highlights || [],
        recommendations: args.recommendations || [],
        adherence_score: Math.round(args.adherence_score || 0),
      }, { onConflict: 'user_id,period_start' })
      .select()
      .single();
    if (saveErr) throw saveErr;
    return j({ checkin: saved }, 200);
  } catch (e) {
    console.error(e);
    return j({ error: e instanceof Error ? e.message : 'Erro' }, 500);
  }
});

function j(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
