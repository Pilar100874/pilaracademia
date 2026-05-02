import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um motor de inteligência em saúde, nutrição e treinamento físico.
Recebe um relatório de bioimpedância (imagem) e retorna análise + plano completo.

Regras:
- Extraia TODOS os campos visíveis. Se um campo faltar, use null e marque "estimated:true" quando você inferir.
- NÃO faça recomendações médicas; foque em estilo de vida, treino e nutrição.
- Idioma: português (Brasil).
- Calorias e macros realistas. Proteína 1.6–2.2 g/kg massa magra; em cutting prefira 2.0–2.4 g/kg de massa magra.
- TDEE: BMR × fator de atividade (sedentary 1.2, light 1.375, moderate 1.55, active 1.725).
- Score 0–100 ponderado: gordura (-), músculo (+), visceral (-), equilíbrio (+).
- Periodização 12 semanas em 3 fases (Adaptação 4sem, Intensificação 4sem, Consolidação 4sem).
- Projeção 30/60/90 dias coerente com déficit/superávit (~0.5–0.8 kg gordura/sem é o teto saudável).
- Treino: você NÃO cria exercícios; gera apenas a INTENÇÃO (foco, divisão, frequência, volume, grupos prioritários).

Use a tool 'return_body_plan' para devolver o resultado.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "return_body_plan",
    description: "Retorna a análise corporal completa e o plano integrado.",
    parameters: {
      type: "object",
      properties: {
        extracted: {
          type: "object",
          description: "Dados extraídos do relatório.",
          properties: {
            measured_at: { type: "string", description: "ISO date/datetime do teste, ou null." },
            sex: { type: "string", enum: ["male", "female", "unknown"] },
            age: { type: "number" },
            height_cm: { type: "number" },
            weight_kg: { type: "number" },
            bmi: { type: "number" },
            body_fat_pct: { type: "number" },
            fat_mass_kg: { type: "number" },
            lean_mass_kg: { type: "number" },
            muscle_mass_kg: { type: "number" },
            skeletal_muscle_kg: { type: "number" },
            bone_mass_kg: { type: "number" },
            body_water_kg: { type: "number" },
            protein_mass_kg: { type: "number" },
            visceral_fat: { type: "number" },
            bmr_kcal: { type: "number" },
            whr: { type: "number" },
            body_age: { type: "number" },
            score: { type: "number", description: "Pontuação corporal do aparelho (0–100+)" },
            segmental_fat: {
              type: "object",
              properties: {
                trunk_kg: { type: "number" },
                left_arm_kg: { type: "number" },
                right_arm_kg: { type: "number" },
                left_leg_kg: { type: "number" },
                right_leg_kg: { type: "number" },
              },
            },
            segmental_muscle: {
              type: "object",
              properties: {
                trunk_kg: { type: "number" },
                left_arm_kg: { type: "number" },
                right_arm_kg: { type: "number" },
                left_leg_kg: { type: "number" },
                right_leg_kg: { type: "number" },
              },
            },
          },
        },
        profile_label: {
          type: "string",
          description:
            "Rótulo metabólico curto, ex: 'Sobrepeso com massa muscular alta', 'Falso magro', 'Atlético', 'Perfil em risco metabólico'.",
        },
        classification: {
          type: "object",
          properties: {
            body_profile: {
              type: "string",
              enum: ["obeso", "sobrepeso_muscular", "falso_magro", "atletico", "baixa_massa_muscular", "saudavel"],
            },
            metabolic_state: { type: "string", enum: ["saudavel", "risco_moderado", "risco_elevado"] },
            muscle_level: { type: "string", enum: ["baixo", "medio", "alto"] },
          },
          required: ["body_profile", "metabolic_state", "muscle_level"],
        },
        goal: {
          type: "object",
          properties: {
            primary: { type: "string", enum: ["cutting", "recomposicao", "hipertrofia", "manutencao"] },
            target_weight_kg: { type: "number" },
            target_body_fat_pct: { type: "number" },
            timeframe_weeks: { type: "number" },
          },
          required: ["primary"],
        },
        calories: {
          type: "object",
          properties: {
            tdee: { type: "number" },
            target: { type: "number" },
            delta: { type: "number", description: "Déficit (negativo) ou superávit (positivo)." },
            activity_factor: { type: "number" },
          },
          required: ["tdee", "target"],
        },
        macros: {
          type: "object",
          properties: {
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
            fiber_g: { type: "number" },
            water_ml: { type: "number" },
          },
          required: ["protein_g", "carbs_g", "fat_g"],
        },
        training_intent: {
          type: "object",
          properties: {
            focus: { type: "string", description: "Ex: 'força + perda de gordura'." },
            split: { type: "string", description: "Ex: 'full body 3x', 'push/pull/legs', 'upper/lower'." },
            frequency_per_week: { type: "number" },
            session_minutes: { type: "number" },
            intensity: { type: "string", enum: ["leve", "moderada", "alta"] },
            priority_muscle_groups: { type: "array", items: { type: "string" } },
            volume_note: { type: "string" },
          },
          required: ["focus", "split", "frequency_per_week"],
        },
        cardio: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["LISS", "HIIT", "MISTO"] },
            sessions_per_week: { type: "number" },
            minutes_per_session: { type: "number" },
            daily_steps: { type: "number" },
          },
        },
        diet_rules: {
          type: "array",
          items: { type: "string" },
          description: "Regras claras para o sistema de visão (ex: 'reduzir frituras', 'priorizar proteína magra').",
        },
        periodization: {
          type: "array",
          description: "Fases do plano (ideal 3 fases × 4 semanas).",
          items: {
            type: "object",
            properties: {
              phase: { type: "string" },
              weeks: { type: "string", description: "Ex: '1-4'." },
              calories: { type: "number" },
              training: { type: "string" },
              cardio: { type: "string" },
              focus: { type: "string" },
            },
            required: ["phase", "weeks", "focus"],
          },
        },
        projection: {
          type: "object",
          properties: {
            day_30: {
              type: "object",
              properties: {
                weight_kg: { type: "number" },
                body_fat_pct: { type: "number" },
                muscle_mass_kg: { type: "number" },
              },
            },
            day_60: {
              type: "object",
              properties: {
                weight_kg: { type: "number" },
                body_fat_pct: { type: "number" },
                muscle_mass_kg: { type: "number" },
              },
            },
            day_90: {
              type: "object",
              properties: {
                weight_kg: { type: "number" },
                body_fat_pct: { type: "number" },
                muscle_mass_kg: { type: "number" },
              },
            },
          },
        },
        alerts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              level: { type: "string", enum: ["info", "warning", "critical"] },
              message: { type: "string" },
            },
            required: ["level", "message"],
          },
        },
        score: { type: "number", description: "Score proprietário 0–100." },
        summary: {
          type: "string",
          description: "Resumo curto para o usuário (3–6 linhas) explicando situação, plano e próximos passos.",
        },
      },
      required: [
        "extracted",
        "profile_label",
        "classification",
        "goal",
        "calories",
        "macros",
        "training_intent",
        "summary",
        "score",
      ],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, notes } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mimeType = "image/jpeg";
    let base64Data = imageBase64 as string;
    if (base64Data.startsWith("data:")) {
      const m = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        mimeType = m[1];
        base64Data = m[2];
      } else {
        base64Data = base64Data.replace(/^data:[^;]+;base64,/, "");
      }
    }

    const userText = `Analise este relatório de bioimpedância e gere o plano completo.${
      notes ? `\nNotas do usuário: ${notes}` : ""
    }\nRetorne usando a tool return_body_plan.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "return_body_plan" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA insuficientes. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro ao analisar relatório" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "IA não retornou estrutura esperada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Tool args parse error", e, toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Falha ao interpretar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-bioimpedance error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
