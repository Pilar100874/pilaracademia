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
}

interface RequestBody {
  prompt: string;
  count: number;
  library: LibraryItem[];
  health_context?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const body = (await req.json()) as RequestBody;
    const prompt = (body.prompt ?? '').toString().trim();
    const count = Math.max(1, Math.min(50, Number(body.count) || 0));
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

    const libSummary = library.map((ex) => {
      const b = top(ex.body).map((t) => `${t.k}:${t.v}`).join(',');
      const a = top(ex.aesthetic).map((t) => `${t.k}:${t.v}`).join(',');
      const m = top(ex.mobility).map((t) => `${t.k}:${t.v}`).join(',');
      const tags = [b && `corpo[${b}]`, a && `estetica[${a}]`, m && `mobilidade[${m}]`]
        .filter(Boolean)
        .join(' ');
      return `- ${ex.id} | ${ex.name}${tags ? ` | ${tags}` : ''}`;
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

    const userPrompt = `Objetivo: ${prompt}
${body.health_context ? `\n${body.health_context}\n` : ''}
Biblioteca disponível (${library.length} exercícios):
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
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
        tool_choice: { type: 'function', function: { name: 'build_workout' } },
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

    let parsed: { exercise_ids?: unknown; rationale?: unknown };
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
    const rawIds = Array.isArray(parsed.exercise_ids) ? (parsed.exercise_ids as unknown[]) : [];
    const seen = new Set<string>();
    const exercise_ids: string[] = [];
    for (const id of rawIds) {
      if (typeof id !== 'string') continue;
      if (!validIds.has(id)) continue;
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
});
