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
  mode?: 'single' | 'groups' | 'explain';
  /** mode 'explain': exercícios já escolhidos (em ordem) para gerar os motivos. */
  items?: { name: string; group?: string | null }[];
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
    if (body.mode === 'explain') return await explain(LOVABLE_API_KEY, prompt, body);
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

- Para cada exercício informe "group" (bloco/foco, ex: Aquecimento, Glúteos, Alongamento) e "reason": 1 frase curta em pt-BR explicando por que ele está NESSA posição da sequência.

Responda CHAMANDO a função build_workout com a lista ordenada e uma breve justificativa geral.`;

    const groupsMode = body.mode === 'groups';
    const moreHint = exclude.size > 0
      ? `\n- IMPORTANTE: o usuário já recebeu sugestões anteriores e pediu MAIS opções. Sugira APENAS exercícios diferentes dos já sugeridos antes, mantendo o mesmo critério/grupos.\n- Reaproveite os MESMOS NOMES de grupos anteriores quando eles continuarem existindo (o cliente agrupa pelo nome).`
      : '';
    const groupsPrompt = `Você é um personal trainer experiente. O usuário vai ESCOLHER manualmente os exercícios, então você deve sugerir opções organizadas em GRUPOS.

Tarefas:
- Identifique no objetivo os diferentes focos pedidos (ex: "alongamento e glúteos" => grupo "Alongamento" e grupo "Glúteos"). Se houver só um foco, crie 1 grupo (ou divida em subfocos úteis).
- Para CADA grupo, sugira até ${count} exercícios da biblioteca adequados, ordenados do mais para o menos indicado.
- Use APENAS IDs da lista. Não repita o mesmo ID em grupos diferentes.
- Em cada exercício preencha "reason": 1 frase curta explicando por que ele foi escolhido e sua posição.
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
        model: 'google/gemini-3.8-flash',
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
                        exercises: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, reason: { type: 'string' }, sets: { type: 'integer', description: 'Séries sugeridas para ESTE exercício (1-6)' }, reps: { type: 'integer', description: 'Repetições sugeridas para ESTE exercício (1-30), adequadas ao tipo de movimento' }, rest_seconds: { type: 'integer', description: 'Descanso em segundos DEPOIS deste exercício antes do próximo (10-180), conforme intensidade' } }, required: ['id', 'reason', 'sets', 'reps', 'rest_seconds'], additionalProperties: false } },
                      },
                      required: ['name', 'reason', 'exercises'],
                      additionalProperties: false,
                    },
                  },
                  rationale: { type: 'string' },
                  sets: { type: 'integer', description: 'Séries padrão do treino (1-6); cada exercício tem as suas próprias' },
                  reps: { type: 'integer', description: 'Repetições padrão do treino (4-30)' },
                  
                },
                required: ['groups', 'rationale', 'sets', 'reps'],
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
                  exercises: {
                    type: 'array',
                    description: 'Exercícios na ordem de execução.',
                    items: { type: 'object', properties: { id: { type: 'string' }, group: { type: 'string' }, reason: { type: 'string' }, sets: { type: 'integer', description: 'Séries sugeridas para ESTE exercício (1-6)' }, reps: { type: 'integer', description: 'Repetições sugeridas para ESTE exercício (1-30), adequadas ao tipo de movimento' }, rest_seconds: { type: 'integer', description: 'Descanso em segundos DEPOIS deste exercício antes do próximo (10-180), conforme intensidade' } }, required: ['id', 'group', 'reason', 'sets', 'reps', 'rest_seconds'], additionalProperties: false },
                  },
                  sets: { type: 'integer', description: 'Séries padrão do treino (1-6); cada exercício tem as suas próprias' },
                  reps: { type: 'integer', description: 'Repetições padrão do treino (4-30)' },
                  rationale: {
                    type: 'string',
                    description: 'Breve justificativa (1-2 frases) da escolha e ordem.',
                  },
                },
                required: ['exercises', 'rationale', 'sets', 'reps'],
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

    let parsed: { sets?: unknown; reps?: unknown; exercise_ids?: unknown; exercises?: unknown; rationale?: unknown; groups?: unknown };
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
      return shortToId.get(k) ?? (validIds.has(k) && !exclude.has(k) ? k : null);
    };

    const clampN = (v: unknown, max: number): number | null => Number.isFinite(Number(v)) ? Math.min(max, Math.max(1, Math.round(Number(v)))) : null;
    const exerciseSets: Record<string, { sets: number | null; reps: number | null; rest_seconds: number | null }> = {};
    if (groupsMode) {
      const used = new Set<string>();
      const reasons: Record<string, string> = {};
      const rawGroups = Array.isArray(parsed.groups) ? (parsed.groups as { name?: unknown; reason?: unknown; exercises?: { id?: unknown; reason?: unknown }[]; exercise_ids?: unknown }[]) : [];
      const groups = rawGroups.map((g) => {
        const ids: string[] = [];
        const list = Array.isArray(g.exercises) ? g.exercises : (Array.isArray(g.exercise_ids) ? (g.exercise_ids as unknown[]).map((id) => ({ id })) : []);
        for (const it of list as { id?: unknown; reason?: unknown }[]) {
          const id = mapId(it?.id);
          if (id && typeof it.reason === 'string') reasons[id] = it.reason.trim();
          if (id) exerciseSets[id] = { sets: clampN((it as { sets?: unknown }).sets, 6), reps: clampN((it as { reps?: unknown }).reps, 30), rest_seconds: clampN((it as { rest_seconds?: unknown }).rest_seconds, 180) };
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
      return new Response(JSON.stringify({ groups, reasons, exerciseSets, sets: Number.isFinite(Number(parsed.sets)) ? Math.min(6, Math.max(1, Math.round(Number(parsed.sets)))) : null, reps: Number.isFinite(Number(parsed.reps)) ? Math.min(30, Math.max(1, Math.round(Number(parsed.reps)))) : null, rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const rawItems = Array.isArray(parsed.exercises)
      ? (parsed.exercises as { id?: unknown; group?: unknown; reason?: unknown }[])
      : (Array.isArray(parsed.exercise_ids) ? (parsed.exercise_ids as unknown[]).map((id) => ({ id })) : []);
    const seen = new Set<string>();
    const exercise_ids: string[] = [];
    const items: { id: string; group: string; reason: string; sets: number | null; reps: number | null; rest_seconds: number | null }[] = [];
    for (const raw of rawItems as { id?: unknown; group?: unknown; reason?: unknown }[]) {
      const id = mapId(raw?.id);
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      exercise_ids.push(id);
      items.push({ id, group: typeof raw.group === 'string' ? raw.group.trim() : '', reason: typeof raw.reason === 'string' ? raw.reason.trim() : '', sets: clampN((raw as { sets?: unknown }).sets, 6), reps: clampN((raw as { reps?: unknown }).reps, 30), rest_seconds: clampN((raw as { rest_seconds?: unknown }).rest_seconds, 180) });
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
        items,
        sets: Number.isFinite(Number(parsed.sets)) ? Math.min(6, Math.max(1, Math.round(Number(parsed.sets)))) : null, reps: Number.isFinite(Number(parsed.reps)) ? Math.min(30, Math.max(1, Math.round(Number(parsed.reps)))) : null, 
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

async function explain(key: string, prompt: string, body: RequestBody): Promise<Response> {
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 80);
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (!items.length) return json({ error: 'Nenhum exercício informado' }, 400);
  const list = items.map((it, i) => `${i + 1}. ${String(it.name).slice(0, 120)}${it.group ? ` [grupo: ${String(it.group).slice(0, 60)}]` : ''}`).join('\n');
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3.8-flash',
      messages: [
        { role: 'system', content: 'Você é um personal trainer. Para a sequência de exercícios dada (na ordem), escreva para CADA exercício 1 frase curta em pt-BR explicando por que ele está nessa posição da sequência, e uma justificativa geral (2-3 frases) do treino. Responda chamando explain_workout.' },
        { role: 'user', content: `Objetivo: ${prompt}\n${body.health_context ? body.health_context + '\n' : ''}Sequência:\n${list}` },
      ],
      tools: [{ type: 'function', function: { name: 'explain_workout', description: 'Motivos por exercício', parameters: { type: 'object', properties: { reasons: { type: 'array', items: { type: 'string' }, description: 'Um motivo por exercício, na mesma ordem' }, rationale: { type: 'string' } }, required: ['reasons', 'rationale'], additionalProperties: false } } }],
      tool_choice: { type: 'function', function: { name: 'explain_workout' } },
    }),
  });
  if (!res.ok) {
    const status = res.status;
    console.error('explain error', status, await res.text());
    return json({ error: status === 429 ? 'Limite de uso temporário atingido. Tente novamente em instantes.' : status === 402 ? 'Créditos de IA esgotados. Adicione créditos no workspace.' : `Erro da IA: ${status}` }, status === 429 || status === 402 ? status : 500);
  }
  const data = await res.json();
  try {
    const p = JSON.parse(data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || '{}');
    const reasons = (Array.isArray(p.reasons) ? p.reasons : []).map((r: unknown) => String(r ?? '').trim());
    return json({ reasons, rationale: typeof p.rationale === 'string' ? p.rationale : '' });
  } catch {
    return json({ error: 'Resposta da IA inválida.' }, 500);
  }
}
