import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  daily_calories?: number;
  daily_protein?: number;
  daily_carbs?: number;
  daily_fat?: number;
  goal?: string;
  weight_kg?: number;
  height_cm?: number;
  gender?: string;
  food_preferences?: string;
  food_restrictions?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profile, notes, food_preferences_context, blood_exam_context } = (await req.json()) as {
      profile: Profile;
      notes?: string;
      food_preferences_context?: string;
      blood_exam_context?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um nutricionista brasileiro. Crie um cardápio semanal de 7 dias (segunda a domingo) em português, com 4 refeições por dia (Café da manhã, Almoço, Lanche, Jantar). Use comidas brasileiras simples e acessíveis. Considere as metas e preferências do usuário. RESPEITE RIGOROSAMENTE as restrições alimentares e a lista de alimentos a evitar — NUNCA inclua itens proibidos. Se houver EXAMES DE SANGUE, priorize as orientações alimentares correspondentes (ex.: colesterol/LDL/triglicérides altos → menos gordura saturada e frituras, mais fibras e ômega-3; HOMA-IR/glicemia/HbA1c altos → reduzir carboidratos simples e açúcares, preferir integrais; ácido úrico alto → menos vísceras e carnes vermelhas; ferritina/B12/vit. D baixas → incluir fontes específicas). Inclua também uma lista de compras consolidada agrupada por categoria (Proteínas, Carboidratos, Frutas, Vegetais, Laticínios, Outros).`;

    const userPrompt = `Perfil do usuário:
- Meta calórica diária: ${profile.daily_calories ?? "n/a"} kcal
- Proteína: ${profile.daily_protein ?? "n/a"} g | Carbs: ${profile.daily_carbs ?? "n/a"} g | Gordura: ${profile.daily_fat ?? "n/a"} g
- Objetivo: ${profile.goal ?? "n/a"}
- Peso: ${profile.weight_kg ?? "n/a"} kg
- Preferências (legado): ${profile.food_preferences ?? "nenhuma específica"}
- Restrições (legado): ${profile.food_restrictions ?? "nenhuma"}
${food_preferences_context ? `\n${food_preferences_context}` : ""}
${blood_exam_context ? `\nEXAMES DE SANGUE RECENTES (priorizar estas orientações no cardápio):\n${blood_exam_context}` : ""}
${notes ? `\nObservações adicionais do usuário: ${notes}` : ""}

Gere o cardápio semanal completo respeitando todas as restrições e ajustando as escolhas conforme os exames de sangue, quando disponíveis.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "weekly_menu",
                description: "Cardápio semanal estruturado",
                parameters: {
                  type: "object",
                  properties: {
                    days: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          day: {
                            type: "string",
                            enum: [
                              "Segunda",
                              "Terça",
                              "Quarta",
                              "Quinta",
                              "Sexta",
                              "Sábado",
                              "Domingo",
                            ],
                          },
                          meals: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                description: { type: "string" },
                                approx_calories: { type: "number" },
                              },
                              required: ["name", "description"],
                            },
                          },
                        },
                        required: ["day", "meals"],
                      },
                    },
                    shopping_list: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: { type: "string" },
                          items: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["category", "items"],
                      },
                    },
                    summary: { type: "string" },
                  },
                  required: ["days", "shopping_list"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "weekly_menu" },
          },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta sem tool call");
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-weekly-menu error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
