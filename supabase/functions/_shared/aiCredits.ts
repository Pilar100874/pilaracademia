// Charges the caller's AI credit wallet before an AI call.
// Price = estimated provider cost (BRL centavos) × (1 + admin markup %).
import { createClient } from "npm:@supabase/supabase-js@2";

// Estimated provider cost per call, in BRL centavos.
export const AI_FEATURE_COSTS: Record<string, number> = {
  "analyze-food": 3,
  "analyze-food-text": 2,
  "read-barcode": 2,
  "simplify-narrative": 1,
  "adjust-macros": 2,
  "analyze-workout-form": 5,
  "analyze-bioimpedance": 8,
  "extract-blood-exam": 8,
  "analyze-exercise-video": 15,
  "compose-workout-from-text": 10,
  "generate-daily-menu": 5,
  "generate-weekly-menu": 10,
};

export function creditsEnvironment(): "sandbox" | "live" {
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

export async function chargeAiCredits(
  req: Request,
  feature: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!user) return json(401, { error: "Faça login para usar a IA." });

  const { data: isMaster } = await admin.rpc("is_master_admin", { _user_id: user.id });
  if (isMaster) return null; // owner account is not charged

  const cost = AI_FEATURE_COSTS[feature] ?? 5;
  const { data, error } = await admin.rpc("consume_ai_credits", {
    _user: user.id,
    _env: creditsEnvironment(),
    _feature: feature,
    _cost: cost,
  });
  if (error) {
    console.error("consume_ai_credits failed", error);
    return json(500, { error: "Não foi possível verificar seus créditos de IA." });
  }
  if (!(data as { ok: boolean })?.ok) {
    return json(402, {
      error: "Créditos de IA insuficientes. Compre créditos em Perfil → Créditos de IA.",
      code: "insufficient_credits",
    });
  }
  return null;
}
