import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing food image with Gemini...");

    // Extract pure base64 data and mime type from data URL
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;
    
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        // Fallback: just strip the prefix
        base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em nutrição. Analise a imagem do prato de comida e estime os valores nutricionais completos.
            
IMPORTANTE: Responda APENAS com um JSON válido no seguinte formato, sem texto adicional:
{
  "name": "Nome do prato identificado",
  "estimatedGrams": peso estimado total do prato em gramas (baseado no tamanho visual - prato cheio ~400-500g, metade ~200-250g, porção pequena ~100-150g),
  "calories": número estimado de calorias (kcal),
  "protein": gramas de proteína,
  "carbs": gramas de carboidratos,
  "fat": gramas de gordura total,
  "saturatedFat": gramas de gordura saturada,
  "transFat": gramas de gordura trans (geralmente 0 para comida caseira),
  "fiber": gramas de fibra alimentar,
  "sodium": miligramas de sódio,
  "confidence": "alta" | "média" | "baixa",
  "items": ["lista", "de", "ingredientes", "identificados"],
  "isLiquid": true/false se for uma bebida (suco, refrigerante, água, café, chá, leite, vitamina, shake, etc),
  "volumeMl": volume estimado em ml se for líquido (copo padrão = 250ml, lata = 350ml, garrafa pequena = 500ml),
  "isIndustrialized": true/false se for um produto industrializado (embalado, com código de barras, fabricado em indústria - não comida caseira),
  "brand": "marca do produto se identificável (ex: Nestlé, Bauducco, etc)",
  "packageWeight": peso da embalagem em gramas se visível (ex: 100g),
  "referenceQuantity": quantidade de referência nutricional se visível (geralmente por 100g ou 100ml)
}

Diretrizes para estimativa:
- estimatedGrams: estime o peso total baseado no tamanho do prato/recipiente (prato raso cheio ~400g, fundo ~500g, tigela ~300g, lanche ~200g)
- Gordura saturada: geralmente 30-40% da gordura total para carnes, menos para vegetais
- Gordura trans: 0 para comida caseira, pode haver em frituras industriais
- Fibra: alta em vegetais, grãos integrais, legumes
- Sódio: comida caseira ~500-800mg, fast food ~1000-2000mg
- isLiquid: marque como true para qualquer bebida, suco, vitamina, shake, café, chá, água, refrigerante, leite, etc

Faça uma estimativa realista baseada no tamanho aparente da porção.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem de comida e forneça os valores nutricionais estimados completos."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Configurações." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao analisar imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Resposta vazia da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let nutritionData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        nutritionData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      nutritionData = {
        name: "Prato não identificado",
        calories: 300,
        protein: 15,
        carbs: 40,
        fat: 10,
        saturatedFat: 3,
        transFat: 0,
        fiber: 3,
        sodium: 600,
        confidence: "baixa",
        items: [],
        isLiquid: false,
        volumeMl: 0
      };
    }

    console.log("Analysis complete:", nutritionData.name);

    return new Response(
      JSON.stringify({ success: true, data: nutritionData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-food error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
