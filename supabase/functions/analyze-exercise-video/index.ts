// Edge Function: analyze-exercise-video
// Recebe a URL de um vídeo de exercício e retorna três classificações em %:
//  - body_analysis: áreas trabalhadas (tronco/core, membros inferiores, membros superiores)
//  - aesthetic_analysis: análise estética complementar (flacidez, retenção, etc.)
//  - mobility_analysis: mobilidade e flexibilidade trabalhadas pelo movimento
// Usa Lovable AI Gateway com Gemini 2.5 Flash + tool calling para output estruturado.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // ---- Permission gate ----------------------------------------------------
    // Movement analysis is costly. Each user must be explicitly enabled by the
    // master admin via profiles.movement_analysis_enabled. We trust the JWT
    // (verify_jwt = true) and read the flag with a service role client.
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const workerToken = req.headers.get('x-naming-worker-token');
    let workerOwner: string | undefined;
    if (workerToken) {
      const controlRes = await fetch(`${SUPABASE_URL}/rest/v1/exercise_naming_control?id=eq.1&select=worker_token,owner_id,status`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const controls = controlRes.ok ? await controlRes.json() : [];
      if (controls[0]?.worker_token === workerToken && controls[0]?.status === 'running') workerOwner = controls[0]?.owner_id;
      if (!workerOwner) return new Response(JSON.stringify({ error: 'Worker não autorizado.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userRes = workerOwner ? null : await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
    });
    if (!workerOwner && !userRes?.ok) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userJson = userRes ? await userRes.json() : null;
    const userId: string | undefined = workerOwner || userJson?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const [profRes, roleRes, settingsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=movement_analysis_enabled,is_active,approval_status,video_analysis_model`,
      {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.master_admin&clinic_id=is.null&select=role&limit=1`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/master_settings?id=eq.1&select=library_analysis_model,user_video_analysis_model`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      }),
    ]);
    const profRows = profRes.ok ? await profRes.json() : [];
    const roleRows = roleRes.ok ? await roleRes.json() : [];
    const settingsRows = settingsRes.ok ? await settingsRes.json() : [];
    const isMaster = Array.isArray(roleRows) && roleRows.length > 0;
    const profile = (Array.isArray(profRows) && profRows[0]) || {};

    // Gate de aprovação / ativação (master sempre passa)
    if (!isMaster) {
      if (profile?.is_active === false) {
        return new Response(
          JSON.stringify({ error: 'USER_DISABLED', message: 'Sua conta está desativada.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (profile?.approval_status && profile.approval_status !== 'approved') {
        return new Response(
          JSON.stringify({ error: 'USER_NOT_APPROVED', message: 'Sua conta ainda não foi aprovada.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const enabled = isMaster || profile?.movement_analysis_enabled === true;
    if (!enabled) {
      return new Response(
        JSON.stringify({
          error: 'MOVEMENT_ANALYSIS_DISABLED',
          message: 'A análise de movimento por IA está desativada para este usuário. Solicite acesso ao administrador.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { videoUrl, model: requestedModel, mode, nameOnly } = await req.json();
    const settings = settingsRows[0] || {};
    // Resolução do modelo:
    //  - se cliente passar `model`, usa diretamente (admin re-analyze)
    //  - se `mode === 'library'`, usa master_settings.library_analysis_model
    //  - caso contrário usa profile.video_analysis_model ?? master_settings.user_video_analysis_model
    const resolvedModel =
      (typeof requestedModel === 'string' && requestedModel) ||
      (mode === 'library'
        ? settings.library_analysis_model
        : profile?.video_analysis_model || settings.user_video_analysis_model) ||
      'google/gemini-2.5-flash';
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

    const namingPrompt = 'Identifique o exercício exclusivamente pelo movimento visível no vídeo, nunca pela URL ou nome do arquivo. Retorne exercise_name: um nome convencional, curto, em português brasileiro, de 2 a 6 palavras, sem números de arquivo, quebras de linha, gênero ou explicações. Preserve a variação importante do movimento. Se não conseguir identificar com segurança, retorne exercise_name como null; não invente.';
    const systemPrompt = nameOnly ? namingPrompt : `${namingPrompt}\nVocê é um especialista em fisiologia do exercício, biomecânica e estética corporal. Sua tarefa é analisar um vídeo de exercício e classificar em TRÊS dimensões:

1) "body_analysis": para CADA grupo muscular/área da lista, atribua uma intensidade de trabalho de 0 a 100 (em %). 0 = não trabalha aquela área. 100 = trabalho muito intenso/principal. As áreas NÃO precisam somar 100 — cada uma é independente.

2) "aesthetic_analysis": para CADA item estético da lista, atribua uma porcentagem (0-100) representando o quanto este exercício contribui POSITIVAMENTE para melhorar aquele aspecto estético. 0 = sem benefício. 100 = altamente benéfico.

3) "mobility_analysis": para CADA item de mobilidade/flexibilidade da lista, atribua uma porcentagem (0-100) representando o quanto este exercício DEMANDA ou DESENVOLVE aquela qualidade. 0 = não envolve aquela mobilidade/flexibilidade. 100 = altamente focado naquele tipo de mobilidade/flexibilidade. Considere amplitude articular, alongamento ativo, controle motor e equilíbrio.

Seja conservador: só atribua valores altos (>60) para aspectos que são claramente o foco principal do movimento. Sempre retorne TODAS as chaves de TODAS as dimensões (use 0 quando não se aplica).`;

    const userText = nameOnly ? 'Qual exercício é demonstrado neste vídeo?' : 'Identifique o movimento demonstrado e retorne o nome e as classificações em porcentagem.';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolvedModel,
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
                  exercise_name: { type: ['string', 'null'], description: 'Nome curto do movimento visível, em português brasileiro; null se inconclusivo.' },
                  ...(!nameOnly ? {
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
                  } : {}),
                },
                required: nameOnly ? ['exercise_name'] : ['exercise_name', 'body_analysis', 'aesthetic_analysis', 'mobility_analysis'],
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
    if (response.status === 403) {
      const denied = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: 'AI_ACCESS_DENIED', message: denied.message || denied.error?.message || 'Acesso à IA negado.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!response.ok) {
      const text = await response.text();
      console.error('AI gateway error', response.status, text);
      // 5xx from the gateway are transient — surface as a soft failure so the
      // client can retry/fallback instead of triggering a blank-screen crash.
      if (response.status >= 500) {
        return new Response(
          JSON.stringify({
            error: 'AI_SERVICE_UNAVAILABLE',
            message: 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.',
            fallback: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `AI gateway error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    if (data?.choices?.[0]?.message?.refusal) return new Response(JSON.stringify({ error: 'AI_REFUSAL', message: data.choices[0].message.refusal }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response', JSON.stringify(data).slice(0, 500));
      throw new Error('Modelo não retornou classificação estruturada.');
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        exercise_name: typeof parsed.exercise_name === 'string' ? parsed.exercise_name.replace(/\s+/g, ' ').trim() : null,
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
