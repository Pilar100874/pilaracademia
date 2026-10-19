import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit packs: price lookup key -> credits granted (BRL centavos)
const PACKS: Record<string, number> = {
  ai_credits_20_once: 2000,
  ai_credits_50_once: 5000,
  ai_credits_100_once: 10000,
};

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    if (!user) return json(401, { error: "Unauthorized" });

    const { priceId, returnUrl, environment } = await req.json();
    if (typeof priceId !== "string" || !(priceId in PACKS)) return json(400, { error: "Pacote inválido" });
    if (environment !== "sandbox" && environment !== "live") return json(400, { error: "Invalid environment" });
    if (typeof returnUrl !== "string" || !/^https?:\/\//.test(returnUrl)) return json(400, { error: "Invalid returnUrl" });
    const env = environment as StripeEnv;

    const stripe = createStripeClient(env);
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) return json(404, { error: "Price not found" });
    const stripePrice = prices.data[0];
    const productId = typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
    const product = await stripe.products.retrieve(productId);

    const customerId = await resolveOrCreateCustomer(stripe, { email: user.email ?? undefined, userId: user.id });

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer: customerId,
      automatic_tax: { enabled: true },
      payment_intent_data: { description: product.name },
      metadata: { userId: user.id, priceId, credits: String(PACKS[priceId]), managed_payments: "false" },
    });
    return json(200, { clientSecret: session.client_secret });
  } catch (e) {
    console.error("create-checkout error", e);
    return json(500, { error: e instanceof Error ? e.message : "Erro ao iniciar pagamento" });
  }
});
