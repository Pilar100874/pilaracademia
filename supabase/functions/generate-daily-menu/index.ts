// Generates a daily meal plan that matches the user's macro targets.
// Uses Lovable AI Gateway. No DB access, no auth required.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Body {
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  profile?: {
    goal?: string | null;
    body_profile?: string | null;
    diet_rules?: string[];
  };
  preferences?: {
    style?: string; // e.g. "brasileiro", "low-carb", "vegetariano"
    avoid?: string[];
    meal_count?: number; // default 4
  };
  blood_exam_context?: string; // resumo dos marcadores fora da faixa + recomendações alimentares
}

const SYSTEM = `Você é um nutricionista que monta cardápios diários práticos para brasileiros.
Sempre devolva JSON via tool call. Use ingredientes simples e baratos. Os totais do dia DEVEM ficar dentro de ±5% das metas.
Quantidades sempre em gramas (g) ou ml. Nada de "a gosto" — números reais.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const goals = body.goals;
    if (!goals?.calories || !goals?.protein) {
      return new Response(JSON.stringify({ error: 'goals.calories e goals.protein são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY ausente');

    const mealCount = body.preferences?.meal_count || 4;
    const userPrompt = `Monte um cardápio para HOJE com ${mealCount} refeições.

METAS DIÁRIAS (somar ≈ totais):
- Calorias: ${goals.calories} kcal
- Proteína: ${goals.protein} g
- Carboidratos: ${goals.carbs} g
- Gordura: ${goals.fat} g
${goals.fiber ? `- Fibra: ${goals.fiber} g` : ''}

${body.profile?.goal ? `Objetivo: ${body.profile.goal}` : ''}
${body.profile?.body_profile ? `Perfil corporal: ${body.profile.body_profile}` : ''}
${body.profile?.diet_rules?.length ? `Regras: ${body.profile.diet_rules.join('; ')}` : ''}
${body.preferences?.style ? `Estilo: ${body.preferences.style}` : ''}
${body.preferences?.avoid?.length ? `Evitar: ${body.preferences.avoid.join(', ')}` : ''}
${body.blood_exam_context ? `\nEXAMES DE SANGUE RECENTES (priorizar estas orientações no cardápio):\n${body.blood_exam_context}` : ''}

Use nomes de refeição: Café da manhã, Lanche da manhã, Almoço, Lanche da tarde, Jantar, Ceia (escolha ${mealCount}).
Cada item DEVE ter calorias/proteína/carbs/gordura calculados para a quantidade indicada.`;

    const tool = {
      type: 'function',
      function: {
        name: 'return_daily_menu',
        description: 'Retorna o cardápio diário estruturado',
        parameters: {
          type: 'object',
          properties: {
            meals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  time_hint: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        quantity: { type: 'number' },
                        unit: { type: 'string', enum: ['g', 'ml', 'unidade'] },
                        calories: { type: 'number' },
                        protein: { type: 'number' },
                        carbs: { type: 'number' },
                        fat: { type: 'number' },
                      },
                      required: ['name', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fat'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['name', 'items'],
                additionalProperties: false,
              },
            },
            totals: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbs: { type: 'number' },
                fat: { type: 'number' },
              },
              required: ['calories', 'protein', 'carbs', 'fat'],
              additionalProperties: false,
            },
            tips: { type: 'array', items: { type: 'string' } },
          },
          required: ['meals', 'totals'],
          additionalProperties: false,
        },
      },
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: 'return_daily_menu' } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error('AI error', aiRes.status, txt);
      if (aiRes.status === 429)
        return new Response(JSON.stringify({ error: 'Limite de IA atingido. Tente novamente em instantes.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      if (aiRes.status === 402)
        return new Response(
          JSON.stringify({ error: 'Créditos da IA esgotados. Adicione fundos em Configurações.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      return new Response(JSON.stringify({ error: 'Erro na IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await aiRes.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: 'Resposta da IA sem cardápio' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    const parsed = JSON.parse(call.function.arguments);
    // Fix mojibake (UTF-8 bytes interpreted as Latin-1) if it appears in any string field
    const fixMojibake = (s: string): string => {
      if (typeof s !== 'string' || !/[ÃÂ][\x80-\xBF]/.test(s)) return s;
      try {
        const bytes = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
        return new TextDecoder('utf-8').decode(bytes);
      } catch { return s; }
    };
    const walk = (v: any): any => {
      if (typeof v === 'string') return fixMojibake(v);
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        const out: any = {};
        for (const k of Object.keys(v)) out[k] = walk(v[k]);
        return out;
      }
      return v;
    };
    const fixed = walk(parsed);
    return new Response(JSON.stringify({ menu: fixed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('generate-daily-menu', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
