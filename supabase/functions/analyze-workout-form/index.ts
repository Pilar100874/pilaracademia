// Analyze a single workout frame: form quality + open-hand gesture detection
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, exerciseName, exerciseInstructions } = await req.json();
    if (!imageBase64 || !exerciseName) {
      return new Response(JSON.stringify({ error: "imageBase64 and exerciseName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip data URL prefix if present
    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const systemPrompt = `Você é um personal trainer analisando UM FRAME estático de alguém executando o exercício "${exerciseName}".${
      exerciseInstructions ? `\n\nInstruções do exercício: ${exerciseInstructions}` : ""
    }

Sua tarefa tem 2 partes:

1) AVALIAR EXECUÇÃO da postura/forma neste instante:
   - "correct" = postura claramente boa (alinhamento, amplitude, controle)
   - "partial" = postura aceitável mas com pontos a melhorar (pequenos desvios)
   - "wrong" = erro grave (risco de lesão, postura claramente errada)
   - "unknown" = pessoa não visível, fora do quadro, ou imagem ambígua demais para julgar

2) DETECTAR GESTO de controle hands-free:
   - "next" = pessoa com a MÃO ABERTA (palma virada para a câmera, 5 dedos visíveis e separados) PARADA na frente do PEITO/ROSTO. NÃO confundir com mãos levantadas como parte do exercício (elevação, desenvolvimento, etc.)
   - "prev" = mesma mão aberta, mas com o polegar apontando claramente para a ESQUERDA (gesto de "voltar")
   - null = nenhum gesto claro de controle

Seja CONSERVADOR no gesto: se houver QUALQUER dúvida (mão fechada, mão se movendo, mão como parte do exercício, várias pessoas), retorne null. É melhor não detectar do que detectar errado.

Forneça também um feedback CURTO em português (máx 60 caracteres) sobre a forma.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise este frame:" },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${cleanBase64}` },
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_form",
            description: "Reporta avaliação da forma e gesto detectado",
            parameters: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  enum: ["correct", "partial", "wrong", "unknown"],
                },
                feedback: { type: "string", description: "Feedback curto em PT-BR, máx 60 chars" },
                gesture: {
                  type: ["string", "null"],
                  enum: ["next", "prev", null],
                },
              },
              required: ["status", "feedback", "gesture"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_form" } },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido, tente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments
      ? JSON.parse(toolCall.function.arguments)
      : { status: "unknown", feedback: "", gesture: null };

    return new Response(JSON.stringify(args), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-workout-form error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
