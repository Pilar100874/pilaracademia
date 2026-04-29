// Edge Function: analyze-exercise-video
// Recebe a URL de um vídeo de exercício e retorna três classificações em %:
//  - body_analysis: áreas trabalhadas (tronco/core, membros inferiores, membros superiores)
//  - aesthetic_analysis: análise estética complementar (flacidez, retenção, etc.)
//  - mobility_analysis: mobilidade e flexibilidade trabalhadas pelo movimento
// Usa Lovable AI Gateway com Gemini 2.5 Flash + tool calling para output estruturado.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BODY_KEYS = [
  // Tronco / Core
  'abdomen_superior',
  'abdomen_inferior',
  'cintura_flancos',
  'lombar',
  'postura_pelvica',
  'core_geral',
  // Membros inferiores
  'gluteos',
  'coxa_anterior',
  'coxa_posterior',
  'adutores',
  'panturrilhas',
  'joelhos_alinhamento',
  // Membros superiores
  'biceps_triceps',
  'ombros',
  'peitoral',
  'costas_superiores',
  'escapulas_postura_ombros',
] as const;

const AESTHETIC_KEYS = [
  'flacidez',
  'retencao_edema',
  'assimetria_corporal',
  'postura',
  'gordura_localizada',
  'definicao_muscular',
] as const;

const MOBILITY_KEYS = [
  'mobilidade_quadril',
  'mobilidade_ombro',
  'mobilidade_coluna',
  'mobilidade_tornozelo',
  'flexibilidade_posterior',
  'flexibilidade_anterior_coxa',
  'flexibilidade_adutores',
  'flexibilidade_peitoral_ombro',
  'amplitude_articular_geral',
  'equilibrio_coordenacao',
] as const;

const buildProps = (keys: readonly string[], desc: (k: string) => string) => {
  const props: Record<string, { type: string; minimum: number; maximum: number; description: string }> = {};
  keys.forEach((k) => {
    props[k] = { type: 'integer', minimum: 0, maximum: 100, description: desc(k) };
  });
  return props;
};

const bodyProperties = buildProps(BODY_KEYS, (k) => `Intensidade de trabalho em ${k} (0-100)`);
const aestheticProperties = buildProps(AESTHETIC_KEYS, (k) => `Benefício/contribuição em ${k} (0-100)`);
const mobilityProperties = buildProps(MOBILITY_KEYS, (k) => `Demanda/benefício de ${k} (0-100)`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { videoUrl, exerciseName, categories } = await req.json();
    if (!videoUrl || typeof videoUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'videoUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Baixa o vídeo e converte para base64 (Gemini aceita inline_data)
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`);
    const contentType = videoRes.headers.get('content-type') || 'video/mp4';
    const buffer = new Uint8Array(await videoRes.arrayBuffer());

    if (buffer.byteLength > 30 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Vídeo muito grande para análise (>30MB)' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(buffer.subarray(i, i + chunkSize)));
    }
    const base64 = btoa(binary);

    const systemPrompt = `Você é um especialista em fisiologia do exercício, biomecânica e estética corporal. Sua tarefa é analisar um vídeo de exercício e classificar em TRÊS dimensões:

1) "body_analysis": para CADA grupo muscular/área da lista, atribua uma intensidade de trabalho de 0 a 100 (em %). 0 = não trabalha aquela área. 100 = trabalho muito intenso/principal. As áreas NÃO precisam somar 100 — cada uma é independente.

2) "aesthetic_analysis": para CADA item estético da lista, atribua uma porcentagem (0-100) representando o quanto este exercício contribui POSITIVAMENTE para melhorar aquele aspecto estético. 0 = sem benefício. 100 = altamente benéfico.

3) "mobility_analysis": para CADA item de mobilidade/flexibilidade da lista, atribua uma porcentagem (0-100) representando o quanto este exercício DEMANDA ou DESENVOLVE aquela qualidade. 0 = não envolve aquela mobilidade/flexibilidade. 100 = altamente focado naquele tipo de mobilidade/flexibilidade. Considere amplitude articular, alongamento ativo, controle motor e equilíbrio.

Seja conservador: só atribua valores altos (>60) para aspectos que são claramente o foco principal do movimento. Sempre retorne TODAS as chaves de TODAS as dimensões (use 0 quando não se aplica).`;

    const userText = `Analise este vídeo de exercício${exerciseName ? ` chamado "${exerciseName}"` : ''}${
      Array.isArray(categories) && categories.length ? ` (categorias: ${categories.join(', ')})` : ''
    } e retorne as classificações em porcentagem.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: `data:${contentType};base64,${base64}` } },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_exercise',
              description: 'Retorna as classificações corporal, estética e de mobilidade/flexibilidade do exercício analisado.',
              parameters: {
                type: 'object',
                properties: {
                  body_analysis: {
                    type: 'object',
                    description: 'Áreas trabalhadas pelo exercício (0-100 em cada uma).',
                    properties: bodyProperties,
                    required: BODY_KEYS as unknown as string[],
                    additionalProperties: false,
                  },
                  aesthetic_analysis: {
                    type: 'object',
                    description: 'Análise estética complementar (0-100 em cada item).',
                    properties: aestheticProperties,
                    required: AESTHETIC_KEYS as unknown as string[],
                    additionalProperties: false,
                  },
                  mobility_analysis: {
                    type: 'object',
                    description: 'Mobilidade e flexibilidade trabalhadas pelo movimento (0-100 em cada item).',
                    properties: mobilityProperties,
                    required: MOBILITY_KEYS as unknown as string[],
                    additionalProperties: false,
                  },
                },
                required: ['body_analysis', 'aesthetic_analysis', 'mobility_analysis'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'classify_exercise' } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns minutos.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      const text = await response.text();
      console.error('AI gateway error', response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response', JSON.stringify(data).slice(0, 500));
      throw new Error('Modelo não retornou classificação estruturada.');
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        body_analysis: parsed.body_analysis,
        aesthetic_analysis: parsed.aesthetic_analysis,
        mobility_analysis: parsed.mobility_analysis,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('analyze-exercise-video error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
