// Edge function: monta um treino a partir de um prompt em linguagem natural
// usando Gemini (Lovable AI Gateway) com tool-calling para retornar IDs da
// biblioteca de exercícios fornecida pelo cliente.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LibraryItem {
  id: string;
  name: string;
  body?: Record<string, number> | null;
  aesthetic?: Record<string, number> | null;
  mobility?: Record<string, number> | null;
  /** Exercício da biblioteca global (vs. biblioteca própria do usuário). */
  is_global?: boolean;
}

interface RequestBody {
  prompt: string;
  count: number;
  library: LibraryItem[];
  health_context?: string;
  body_plan_context?: string;
  mode?: 'single' | 'groups';
  /** Exercícios já sugeridos anteriormente — devem ser ignorados (pedido de MAIS sugestões). */
  exclude_ids?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // Lê o corpo inteiro ANTES de iniciar a resposta em stream.
  let raw = '';
  try {
    raw = await req.text();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Falha ao ler requisição' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const bufferedReq = new Request(req.url, { method: 'POST', headers: req.headers, body: raw });
  // Envia espaços periodicamente para evitar o idle timeout (150s) enquanto a IA pensa.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const ping = setInterval(() => controller.enqueue(enc.encode(' ')), 10000);
      try {
        const res = await handle(bufferedReq);
        controller.enqueue(enc.encode(await res.text()));
      } catch (e) {
        controller.enqueue(enc.encode(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' })));
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

async function handle(req: Request): Promise<Response> {

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const body = (await req.json()) as RequestBody;
    const prompt = (body.prompt ?? '').toString().trim();
    let count = Math.max(1, Math.min(50, Number(body.count) || 0));
    const library = Array.isArray(body.library) ? body.library : [];

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt vazio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (library.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Sua biblioteca está vazia. Adicione exercícios antes.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Compacta a biblioteca para o prompt: para cada exercício, top 3 áreas com %.
    const top = (rec?: Record<string, number> | null, n = 3) => {
      if (!rec) return [] as { k: string; v: number }[];
      return Object.entries(rec)
        .filter(([, v]) => typeof v === 'number' && v > 0)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, n)
        .map(([k, v]) => ({ k, v: v as number }));
    };

    // Pré-filtro: envia só os exercícios mais relevantes ao objetivo (acelera muito).
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const words = norm(String(prompt)).split(/[^a-z0-9]+/).filter((w) => w.length > 3)
      .map((w) => w.slice(0, Math.max(4, w.length - 2)));
    // Manda ~40 de cada biblioteca (a do usuário e a global): os que mais combinam com o pedido.
    const MAX_PER_SOURCE = 40;
    const takeTop = (arr: LibraryItem[]) => {
      if (arr.length <= MAX_PER_SOURCE) return arr;
      const scored = arr.map((ex, i) => {
        const hay = norm(`${ex.name} ${Object.keys(ex.body || {}).join(' ')} ${Object.keys(ex.aesthetic || {}).join(' ')} ${Object.keys(ex.mobility || {}).join(' ')}`);
        const s = words.length
          ? words.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0)
          : 0;
        return { ex, s, i };
      });
      scored.sort((a, b) => b.s - a.s || a.i - b.i);
      return scored.slice(0, MAX_PER_SOURCE).map((x) => x.ex);
    };
    const exclude = new Set((Array.isArray(body.exclude_ids) ? body.exclude_ids : []).map(String));
    const mine = library.filter((ex) => !ex.is_global && !exclude.has(ex.id));
    const globals = library.filter((ex) => ex.is_global && !exclude.has(ex.id));
    const pool = [...takeTop(mine), ...takeTop(globals)];
    count = Math.max(1, Math.min(count, pool.length));

    // IDs curtos (índices) reduzem muito o tamanho do prompt e da resposta.
    const shortToId = new Map<string, string>();
    pool.forEach((ex, i) => shortToId.set(String(i + 1), ex.id));
    const libSummary = pool.map((ex, i) => {
      const b = top(ex.body).map((t) => `${t.k}:${t.v}`).join(',');
      const a = top(ex.aesthetic).map((t) => `${t.k}:${t.v}`).join(',');
      const m = top(ex.mobility).map((t) => `${t.k}:${t.v}`).join(',');
      const tags = [b && `corpo[${b}]`, a && `estetica[${a}]`, m && `mobilidade[${m}]`]
        .filter(Boolean)
        .join(' ');
      return `- ${i + 1} | ${ex.name}${tags ? ` | ${tags}` : ''}`;
    }).join('\n');

    const systemPrompt = `Você é um personal trainer experiente que monta sequências de treino personalizadas e SEGURAS.

Você receberá:
1) Uma descrição do objetivo do usuário (em português).
2) Uma biblioteca de exercícios disponível, cada um com ID, nome e tags percentuais (0-100) de áreas trabalhadas (corpo, estética, mobilidade).
3) Opcionalmente, um CONTEXTO DE SAÚDE (exames de sangue) que pode indicar restrições.

Tarefas:
- Selecione EXATAMENTE ${count} exercícios da biblioteca que melhor atendam ao objetivo.
- Ordene-os em uma sequência lógica (aquecimento/mobilidade primeiro, principais no meio, finalização/alongamento no fim).
- Use APENAS IDs da lista. Não invente nem repita IDs.
- Se a biblioteca tiver menos de ${count} exercícios adequados, devolva quantos forem possíveis.
- Se o usuário citar dor/lesão (ex: "lombar"), evite exercícios de alto impacto na região afetada.
- Se houver CONTEXTO DE SAÚDE: ajuste cargas/intensidade e priorize segurança. Cite na justificativa se algum marcador influenciou suas escolhas.

Responda CHAMANDO a função build_workout com a lista ordenada de IDs e uma breve justificativa.`;

    const groupsMode = body.mode === 'groups';
    const moreHint = exclude.size > 0
      ? `\n- IMPORTANTE: o usuário já recebeu sugestões anteriores e pediu MAIS opções. Sugira APENAS exercícios diferentes dos já sugeridos antes, mantendo o mesmo critério/grupos.\n- Reaproveite os MESMOS NOMES de grupos anteriores quando eles continuarem existindo (o cliente agrupa pelo nome).`
      : '';
    const groupsPrompt = `Você é um personal trainer experiente. O usuário vai ESCOLHER manualmente os exercícios, então você deve sugerir opções organizadas em GRUPOS.

Tarefas:
- Identifique no objetivo os diferentes focos pedidos (ex: "alongamento e glúteos" => grupo "Alongamento" e grupo "Glúteos"). Se houver só um foco, crie 1 grupo (ou divida em subfocos úteis).
- Para CADA grupo, sugira até ${count} exercícios da biblioteca adequados, ordenados do mais para o menos indicado.
- Use APENAS IDs da lista. Não repita o mesmo ID em grupos diferentes.
- Em cada grupo, preencha "reason" explicando em 1-2 frases por que esse grupo e esses exercícios foram escolhidos.
- Se o usuário citar dor/lesão, evite exercícios de alto impacto na região.
- Se houver CONTEXTO DE SAÚDE, priorize segurança.${moreHint}

Responda CHAMANDO a função build_groups.`;

    const userPrompt = `Objetivo: ${prompt}
${body.body_plan_context ? `\n${body.body_plan_context}\n` : ''}${body.health_context ? `\n${body.health_context}\n` : ''}
Biblioteca disponível (${pool.length} exercícios):
${libSummary}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: groupsMode ? groupsPrompt : systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: groupsMode ? [
          {
            type: 'function',
            function: {
              name: 'build_groups',
              description: 'Retorna grupos de exercícios sugeridos.',
              parameters: {
                type: 'object',
                properties: {
                  groups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Nome curto do grupo, ex: Alongamento' },
                        reason: { type: 'string', description: 'Motivo da seleção deste grupo e de seus exercícios (1-2 frases, pt-BR)' },
                        exercise_ids: { type: 'array', items: { type: 'string' } },
                      },
                      required: ['name', 'reason', 'exercise_ids'],
                      additionalProperties: false,
                    },
                  },
                  rationale: { type: 'string' },
                },
                required: ['groups', 'rationale'],
                additionalProperties: false,
              },
            },
          },
        ] : [
          {
            type: 'function',
            function: {
              name: 'build_workout',
              description: 'Retorna a lista ordenada de IDs de exercícios escolhidos.',
              parameters: {
                type: 'object',
                properties: {
                  exercise_ids: {
                    type: 'array',
                    description: 'IDs dos exercícios na ordem de execução.',
                    items: { type: 'string' },
                  },
                  rationale: {
                    type: 'string',
                    description: 'Breve justificativa (1-2 frases) da escolha e ordem.',
                  },
                },
                required: ['exercise_ids', 'rationale'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: groupsMode ? 'build_groups' : 'build_workout' } },
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error('AI gateway error', aiResponse.status, text);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de uso temporário atingido. Tente novamente em instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos no workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ error: `AI gateway error: ${aiResponse.status}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool_call in response', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'IA não retornou seleção válida.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed: { exercise_ids?: unknown; rationale?: unknown; groups?: unknown };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Failed to parse tool args', e);
      return new Response(JSON.stringify({ error: 'Resposta da IA inválida.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validIds = new Set(library.map((l) => l.id));
    const mapId = (v: unknown): string | null => {
      const k = String(v ?? '').trim();
      return shortToId.get(k) ?? (validIds.has(k) ? k : null);
    };

    if (groupsMode) {
      const used = new Set<string>();
      const rawGroups = Array.isArray(parsed.groups) ? (parsed.groups as { name?: unknown; reason?: unknown; exercise_ids?: unknown }[]) : [];
      const groups = rawGroups.map((g) => {
        const ids: string[] = [];
        for (const raw of Array.isArray(g.exercise_ids) ? g.exercise_ids : []) {
          const id = mapId(raw);
          if (!id || used.has(id)) continue;
          used.add(id); ids.push(id);
          if (ids.length >= count) break;
        }
        return {
          name: typeof g.name === 'string' && g.name.trim() ? g.name.trim() : 'Grupo',
          reason: typeof g.reason === 'string' ? g.reason.trim() : '',
          exercise_ids: ids,
        };
      }).filter((g) => g.exercise_ids.length > 0);
      if (groups.length === 0) {
        return new Response(JSON.stringify({ error: 'A IA não conseguiu sugerir exercícios da sua biblioteca.' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ groups, rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const rawIds = Array.isArray(parsed.exercise_ids) ? (parsed.exercise_ids as unknown[]) : [];
    const seen = new Set<string>();
    const exercise_ids: string[] = [];
    for (const raw of rawIds) {
      const id = mapId(raw);
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      exercise_ids.push(id);
      if (exercise_ids.length >= count) break;
    }

    if (exercise_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'A IA não conseguiu mapear exercícios da sua biblioteca.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        exercise_ids,
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('compose-workout error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
