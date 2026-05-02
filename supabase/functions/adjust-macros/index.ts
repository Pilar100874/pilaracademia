// Recalculates macro targets based on real weight progress vs the projection.
// Returns suggested new calories/protein/carbs/fat. Client decides whether to apply.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Body {
  current_goals: { calories: number; protein: number; carbs: number; fat: number };
  plan_goal?: string; // cutting / hipertrofia / etc
  start_weight_kg: number;
  current_weight_kg: number;
  expected_weight_kg: number;
  days_elapsed: number;
}

const SYSTEM = `Você é um nutricionista esportivo. Avalie a divergência entre peso esperado e peso real
e proponha ajuste de calorias e macros para a próxima fase.
Regras:
- Em fase de perda de gordura, se o peso caiu MENOS que o esperado, reduzir 100-250 kcal (sem cortar mais que 20% do total).
- Em fase de perda de gordura, se caiu DEMAIS (>1.5kg/semana), aumentar 100-200 kcal.
- Em qualquer texto livre (rationale, etc.) use SEMPRE termos em português. NUNCA use "cutting", "bulking", "recomp", "maintenance". Use "perda de gordura", "hipertrofia", "recomposição", "manutenção".
- Em hipertrofia, se o peso subiu MENOS, aumentar 150-300 kcal; se subiu rápido demais (>0.5kg/semana), reduzir 100-150 kcal.
- Manter proteína em pelo menos 1.8g/kg de peso corporal.
- Devolver via tool call. Justificar em 1 frase.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body.current_goals || !body.current_weight_kg) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY ausente');

    const userPrompt = `Objetivo: ${body.plan_goal || 'manutencao'}
Metas atuais: ${body.current_goals.calories} kcal, ${body.current_goals.protein}g P, ${body.current_goals.carbs}g C, ${body.current_goals.fat}g G
Peso inicial: ${body.start_weight_kg} kg
Peso esperado hoje (projeção): ${body.expected_weight_kg} kg
Peso real hoje: ${body.current_weight_kg} kg
Dias desde início do plano: ${body.days_elapsed}
Divergência: ${(body.current_weight_kg - body.expected_weight_kg).toFixed(2)} kg`;

    const tool = {
      type: 'function',
      function: {
        name: 'return_macro_adjustment',
        parameters: {
          type: 'object',
          properties: {
            new_calories: { type: 'number' },
            new_protein: { type: 'number' },
            new_carbs: { type: 'number' },
            new_fat: { type: 'number' },
            delta_kcal: { type: 'number' },
            reasoning: { type: 'string' },
            severity: { type: 'string', enum: ['none', 'minor', 'major'] },
          },
          required: ['new_calories', 'new_protein', 'new_carbs', 'new_fat', 'delta_kcal', 'reasoning', 'severity'],
          additionalProperties: false,
        },
      },
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: 'return_macro_adjustment' } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429)
        return new Response(JSON.stringify({ error: 'Limite de IA atingido' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      if (aiRes.status === 402)
        return new Response(JSON.stringify({ error: 'Créditos da IA esgotados' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      const t = await aiRes.text();
      console.error('AI', aiRes.status, t);
      return new Response(JSON.stringify({ error: 'Erro na IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const j = await aiRes.json();
    const call = j.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: 'Resposta inválida' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify({ adjustment: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
