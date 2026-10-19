import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const PACKS: Record<string, number> = {
  ai_credits_20_once: 2000,
  ai_credits_50_once: 5000,
  ai_credits_100_once: 10000,
};

async function grantCredits(session: any, env: StripeEnv) {
  const userId = session.metadata?.userId;
  const credits = PACKS[session.metadata?.priceId];
  if (!userId || !credits) {
    console.error("Missing userId/priceId in session metadata", session.id);
    return;
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.rpc("add_ai_credits", {
    _user: userId, _env: env, _amount: credits, _session: session.id,
  });
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200 });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    const session = event.data.object;
    if (event.type === "checkout.session.completed" && session.payment_status !== "unpaid") {
      await grantCredits(session, env);
    } else if (event.type === "checkout.session.async_payment_succeeded") {
      await grantCredits(session, env);
    } else {
      console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
