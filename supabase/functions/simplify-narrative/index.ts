import { chargeAiCredits } from "../_shared/aiCredits.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  { const denied = await chargeAiCredits(req, "simplify-narrative", corsHeaders); if (denied) return denied; }
  try {
    const { situation, plan, next_steps } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY ausente');

    const prompt = `Reescreva em linguagem MUITO simples (como se fosse explicar para uma criança de 12 anos).
Use frases curtas. Sem jargões. Sem números técnicos quando der para evitar.

Situação atual: ${situation}
O plano: ${plan}
Próximos passos: ${(next_steps || []).join(' / ')}`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.8-flash',
        messages: [
          { role: 'system', content: 'Você simplifica explicações de saúde. Tom carinhoso. Português do Brasil.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_simple',
            parameters: {
              type: 'object',
              properties: {
                situation: { type: 'string' },
                plan: { type: 'string' },
                next_steps: { type: 'array', items: { type: 'string' } },
              },
              required: ['situation', 'plan', 'next_steps'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'return_simple' } },
      }),
    });
    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: 'Limite de IA atingido' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (r.status === 402) return new Response(JSON.stringify({ error: 'Créditos esgotados' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'Erro na IA' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const j = await r.json();
    const parsed = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || '{}');
    return new Response(JSON.stringify({ narrative: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
