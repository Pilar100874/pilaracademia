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
    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Items array is required" }),
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

    console.log("Analyzing food items:", items);

    // Build the prompt with all items
    const itemsList = items.map((item: { food: string; quantity: string }, i: number) => 
      `${i + 1}. ${item.food} - ${item.quantity}`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em nutrição brasileira. Analise os alimentos listados e calcule os valores nutricionais TOTAIS somados.

IMPORTANTE: Responda APENAS com um JSON válido no seguinte formato, sem texto adicional:
{
  "items": [
    {
      "name": "nome do alimento",
      "quantity": "quantidade informada",
      "quantityGrams": número em gramas (converta colheres, xícaras, etc para gramas),
      "calories": calorias deste item,
      "protein": proteína em gramas,
      "carbs": carboidratos em gramas,
      "fat": gordura em gramas
    }
  ],
  "total": {
    "calories": total de calorias,
    "protein": total de proteína em gramas,
    "carbs": total de carboidratos em gramas,
    "fat": total de gordura em gramas,
    "saturatedFat": total de gordura saturada em gramas,
    "transFat": total de gordura trans em gramas (geralmente 0),
    "fiber": total de fibra em gramas,
    "sodium": total de sódio em miligramas
  }
}

Referências de conversão:
- 1 colher de sopa = 15g (para líquidos/pastas) ou 10-15g (para sólidos)
- 1 colher de chá = 5g
- 1 xícara = 240ml ou ~150-200g dependendo do alimento
- 1 copo = 250ml
- 1 unidade média de fruta = 100-150g
- 1 fatia de pão = 25-30g
- 1 bife médio = 100-120g
- 1 filé de frango = 100-150g

Use a tabela nutricional brasileira (TACO) como referência para os valores nutricionais.`
          },
          {
            role: "user",
            content: `Analise estes alimentos e calcule os valores nutricionais totais:\n\n${itemsList}`
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao analisar alimentos" }),
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
      return new Response(
        JSON.stringify({ error: "Erro ao processar resposta da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analysis complete:", nutritionData);

    return new Response(
      JSON.stringify({ success: true, data: nutritionData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-food-text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
