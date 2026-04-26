// Paddle.js loader (carrega dinamicamente). Token vem de import.meta.env.
import { initializePaddle, type Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;
let initPromise: Promise<Paddle | undefined> | null = null;

export type PaddleEnv = 'sandbox' | 'production';

export function getPaddleEnvFromToken(): PaddleEnv {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
  if (token?.startsWith('live_')) return 'production';
  return 'sandbox';
}

export async function getPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;
  if (initPromise) {
    const p = await initPromise;
    return p ?? null;
  }
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
  if (!token) {
    console.warn('VITE_PAYMENTS_CLIENT_TOKEN ausente.');
    return null;
  }
  initPromise = initializePaddle({
    environment: getPaddleEnvFromToken(),
    token,
  });
  const p = await initPromise;
  paddleInstance = p ?? null;
  return paddleInstance;
}

export async function openCheckout(opts: {
  priceId: string;
  customerEmail?: string;
  customData: { clinic_id: string; plan_id: string; cycle: 'monthly' | 'yearly' };
  successUrl?: string;
}) {
  const p = await getPaddle();
  if (!p) throw new Error('Paddle não inicializado');
  p.Checkout.open({
    items: [{ priceId: opts.priceId, quantity: 1 }],
    customer: opts.customerEmail ? { email: opts.customerEmail } : undefined,
    customData: opts.customData,
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      successUrl: opts.successUrl ?? `${window.location.origin}/clinica/billing?success=1`,
    },
  });
}
