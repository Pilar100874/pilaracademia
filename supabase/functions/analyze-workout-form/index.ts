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

2) DETECTAR GESTO de controle hands-free para AVANÇAR exercício:
   - "next" = pessoa com UMA MÃO ABERTA visível na frente do PEITO, ROSTO ou na altura da cabeça, com a palma virada para a câmera (dedos visíveis, mão claramente NÃO segurando peso e NÃO em movimento de exercício). Pode ser qualquer das duas mãos. Seja GENEROSO: se a pessoa parece estar mostrando a palma intencionalmente para a câmera (parada, sem peso, dedos abertos ou semi-abertos), retorne "next".
   - null = pessoa claramente executando o exercício, mãos ocupadas com pesos, mãos abaixadas, ou nenhuma mão claramente visível mostrando palma.

NÃO existe gesto "prev" — só detectamos "next" ou null.

Regra: se a pessoa está parada com a palma da mão visível para a câmera (mesmo que não totalmente esticada), retorne "next". Só retorne null se a mão estiver claramente fazendo parte do exercício, segurando equipamento, ou não visível.

3) DETECTAR ENQUADRAMENTO da pessoa (auto-zoom):
   - Retorne "person_bbox" como uma caixa que envolve TODO o corpo visível da pessoa (cabeça aos pés, incluindo braços estendidos), com 4 valores normalizados de 0 a 1: { x, y, w, h } onde (x,y) é o canto superior-esquerdo da caixa em proporção ao frame, e (w,h) é a largura/altura também em proporção. Adicione ~5% de margem em volta do corpo.
   - Se a pessoa NÃO estiver claramente visível ou estiver muito cortada, retorne null em person_bbox.

Forneça também um feedback CURTO em português (máx 60 caracteres) sobre a forma.`;

    const body = {
      model: "google/gemini-2.5-flash-lite",
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
                  enum: ["next", null],
                },
                person_bbox: {
                  type: ["object", "null"],
                  description: "Bounding box normalizada (0-1) da pessoa, com margem ~5%. null se não for possível detectar.",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    w: { type: "number" },
                    h: { type: "number" },
                  },
                  required: ["x", "y", "w", "h"],
                  additionalProperties: false,
                },
              },
              required: ["status", "feedback", "gesture", "person_bbox"],
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
      : { status: "unknown", feedback: "", gesture: null, person_bbox: null };

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
