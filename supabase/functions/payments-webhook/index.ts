// Paddle webhook handler. Recebe eventos do Paddle e atualiza clinic_subscriptions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paddle-signature',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function getWebhookSecret(env: string): string | undefined {
  return env === 'live'
    ? Deno.env.get('PAYMENTS_LIVE_WEBHOOK_SECRET')
    : Deno.env.get('PAYMENTS_SANDBOX_WEBHOOK_SECRET');
}

// Verifica HMAC do Paddle (formato: ts=...;h1=...)
async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(';').map((p) => p.split('=')),
  );
  const ts = parts['ts'];
  const h1 = parts['h1'];
  if (!ts || !h1) return false;
  const payload = `${ts}:${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === h1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const env = url.searchParams.get('env') ?? 'sandbox';
  const rawBody = await req.text();
  const secret = getWebhookSecret(env);

  if (!secret) {
    return new Response(JSON.stringify({ error: 'webhook secret missing' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ok = await verifyPaddleSignature(rawBody, req.headers.get('paddle-signature'), secret);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'invalid signature' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const event = JSON.parse(rawBody);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const eventType: string = event.event_type;
  const data = event.data ?? {};
  const customData = data.custom_data ?? data.checkout?.custom_data ?? {};
  const clinicId: string | undefined = customData.clinic_id;
  const planId: string | undefined = customData.plan_id;
  const cycle: string | undefined = customData.cycle; // monthly | yearly

  console.log('[payments-webhook]', env, eventType, { clinicId, planId, cycle });

  if (!clinicId) {
    // Pode ser um evento sem nosso custom_data (ignoramos com 200)
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const patch: Record<string, unknown> = {
    last_event_at: new Date().toISOString(),
  };

  switch (eventType) {
    case 'subscription.created':
    case 'subscription.updated': {
      patch.paddle_subscription_id = data.id;
      patch.paddle_customer_id = data.customer_id;
      if (planId) patch.plan_id = planId;
      if (cycle === 'monthly' || cycle === 'yearly') patch.cycle = cycle;
      const status = String(data.status ?? '').toLowerCase();
      if (status === 'active') patch.status = 'active';
      else if (status === 'trialing') patch.status = 'trialing';
      else if (status === 'past_due') patch.status = 'past_due';
      else if (status === 'canceled' || status === 'cancelled') patch.status = 'cancelled';
      const cp = data.current_billing_period;
      if (cp?.starts_at) patch.current_period_start = cp.starts_at;
      if (cp?.ends_at) patch.current_period_end = cp.ends_at;
      patch.cancel_at_period_end = !!data.scheduled_change && data.scheduled_change.action === 'cancel';
      break;
    }
    case 'subscription.canceled': {
      patch.status = 'cancelled';
      patch.cancel_at_period_end = true;
      break;
    }
    case 'transaction.completed': {
      patch.status = 'active';
      patch.last_payment_at = new Date().toISOString();
      if (planId) patch.plan_id = planId;
      if (cycle === 'monthly' || cycle === 'yearly') patch.cycle = cycle;
      break;
    }
    case 'transaction.payment_failed': {
      patch.status = 'past_due';
      break;
    }
    default:
      return new Response(JSON.stringify({ ok: true, skipped: eventType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }

  // upsert por clinic_id
  const { data: existing } = await supabase
    .from('clinic_subscriptions')
    .select('id')
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (existing) {
    await supabase.from('clinic_subscriptions').update(patch).eq('clinic_id', clinicId);
  } else {
    await supabase.from('clinic_subscriptions').insert({ clinic_id: clinicId, ...patch });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
