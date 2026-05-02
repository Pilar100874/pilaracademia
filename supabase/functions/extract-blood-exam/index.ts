// Edge function: extrai marcadores de exame de sangue a partir do texto extraído do PDF
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  rawText: z.string().trim().min(20, 'Texto muito curto').max(200_000, 'Texto muito longo'),
});

const SYSTEM_PROMPT = `Você é um especialista em interpretar exames laboratoriais brasileiros para uso em um app de nutrição e treino.
Receberá o texto bruto de um exame de sangue (em português). Extraia os marcadores principais e devolva via tool call.

REGRAS:
- Extraia TODOS os marcadores numéricos relevantes que encontrar (hemograma, glicose, insulina, HOMA-IR, hemoglobina glicada, perfil lipídico (colesterol total, HDL, LDL, VLDL, triglicérides, não-HDL), TSH, T4/T3, testosterona total/livre, SHBG, estradiol, cortisol, vitamina D, B12, ácido fólico, ferro, ferritina, transferrina, creatinina, ureia, TGO/AST, TGP/ALT, GGT, ácido úrico, PCR, PSA).
- "value" é número (use ponto decimal). "unit" é a unidade do laudo. "ref_min"/"ref_max" são os limites de referência (números). Use null se algum não estiver disponível.
- "status": "low" (abaixo da faixa), "normal" (dentro), "high" (acima), "borderline" (limítrofe). Se não tiver referência, use "unknown".
- "category": uma de "hemograma", "glicemia", "lipidios", "hormonios", "vitaminas_minerais", "rim_figado", "outros".
- "summary": resumo didático em português simples (3-6 frases) destacando o que está bem, o que merece atenção e o impacto geral. Sem jargão. NUNCA use termos em inglês como cutting, bulking.
- "alerts": lista de avisos curtos para marcadores fora da faixa que afetam dieta/treino (ex.: "Glicemia de jejum elevada — reduzir carboidratos refinados").
- "diet_recommendations": lista de orientações alimentares específicas baseadas nos resultados (ex.: "Aumentar consumo de carnes vermelhas magras", "Evitar gorduras trans e saturadas", "Priorizar vegetais ricos em ferro"). Cada item curto e acionável.
- "collected_at": data da coleta no formato YYYY-MM-DD (procure por "Data da Ficha", "Coletado em", "Recebido em"). Se não achar, null.
- "lab_name": nome do laboratório se identificável.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Entrada inválida', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { rawText } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const tools = [{
      type: 'function',
      function: {
        name: 'register_blood_exam',
        description: 'Registra os marcadores extraídos do exame de sangue.',
        parameters: {
          type: 'object',
          properties: {
            collected_at: { type: ['string', 'null'] },
            lab_name: { type: ['string', 'null'] },
            summary: { type: 'string' },
            markers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  label: { type: 'string' },
                  value: { type: ['number', 'null'] },
                  unit: { type: ['string', 'null'] },
                  ref_min: { type: ['number', 'null'] },
                  ref_max: { type: ['number', 'null'] },
                  status: { type: 'string', enum: ['low', 'normal', 'high', 'borderline', 'unknown'] },
                  category: { type: 'string' },
                  note: { type: ['string', 'null'] },
                },
                required: ['key', 'label', 'value', 'unit', 'status', 'category'],
                additionalProperties: false,
              },
            },
            alerts: { type: 'array', items: { type: 'string' } },
            diet_recommendations: { type: 'array', items: { type: 'string' } },
          },
          required: ['summary', 'markers', 'alerts', 'diet_recommendations'],
          additionalProperties: false,
        },
      },
    }];

    const truncated = rawText.length > 60000 ? rawText.slice(0, 60000) : rawText;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Texto do exame:\n\n${truncated}` },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: 'register_blood_exam' } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de uso da IA atingido. Tente novamente em alguns instantes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos da IA esgotados.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, t);
      return new Response(JSON.stringify({ error: 'Falha ao analisar exame' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error('IA não retornou os marcadores');

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('extract-blood-exam error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
