import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { ArrowLeft, Sparkles, Table2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMaster } from '@/hooks/useIsMaster';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { Button } from '@/components/ui/button';

const PACKS = [
  { priceId: 'ai_credits_20_once', label: 'R$ 20' },
  { priceId: 'ai_credits_50_once', label: 'R$ 50' },
  { priceId: 'ai_credits_100_once', label: 'R$ 100' },
];

const FEATURE_LABELS: Record<string, string> = {
  'analyze-food': 'Foto de alimento',
  'analyze-food-text': 'Alimento digitado',
  'read-barcode': 'Código de barras',
  'simplify-narrative': 'Texto simplificado',
  'adjust-macros': 'Ajuste de macros',
  'analyze-workout-form': 'Análise de execução',
  'analyze-bioimpedance': 'Bioimpedância',
  'extract-blood-exam': 'Exame de sangue',
  'analyze-exercise-video': 'Análise de vídeo',
  'compose-workout-from-text': 'Treino por IA',
  'generate-daily-menu': 'Cardápio do dia',
  'generate-weekly-menu': 'Cardápio semanal',
};

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Preço médio por uso (centavos estimados × margem configurada), espelhando AI_FEATURE_COSTS.
const FEATURE_PRICES: Record<string, number> = {
  'simplify-narrative': 1,
  'analyze-food-text': 2,
  'read-barcode': 2,
  'adjust-macros': 2,
  'analyze-food': 3,
  'generate-daily-menu': 5,
  'analyze-workout-form': 5,
  'analyze-bioimpedance': 8,
  'extract-blood-exam': 8,
  'compose-workout-from-text': 10,
  'generate-weekly-menu': 10,
  'analyze-exercise-video': 15,
};

function TestBanner() {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  if (token?.startsWith('pk_live_')) return null;
  return (
    <div className="w-full border-b border-border bg-muted px-4 py-2 text-center text-xs text-muted-foreground">
      {token ? 'Pagamentos na prévia estão em modo de teste (cartão 4242 4242 4242 4242).' : 'Pagamentos ainda não estão ativos nesta versão.'}
    </div>
  );
}

export default function AiCreditsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMaster } = useIsMaster();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [priceId, setPriceId] = useState<string | null>(null);
  const env = (() => { try { return getStripeEnvironment(); } catch { return null; } })();
  // Usage is charged against the live wallet once live payments exist; until then, test.
  const returned = params.get('session_id');

  const { data: balance = 0 } = useQuery({
    queryKey: ['ai-credits', 'balance', user?.id],
    enabled: !!user,
    refetchInterval: returned ? 3000 : false,
    queryFn: async () => {
      const { data } = await supabase.from('ai_credit_balances').select('balance_cents,environment').eq('user_id', user!.id);
      const rows = data ?? [];
      const live = rows.find((r) => r.environment === 'live');
      const row = live ?? rows.find((r) => r.environment === 'sandbox');
      return Number(row?.balance_cents ?? 0);
    },
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ['ai-credits', 'ledger', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_credit_ledger')
        .select('id,kind,feature,amount_cents,created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (returned) qc.invalidateQueries({ queryKey: ['ai-credits'] });
  }, [returned, balance, qc]);

  const fetchClientSecret = async () => {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        priceId,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/creditos?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if (error || !data?.clientSecret) throw new Error(error?.message || 'Falha ao iniciar pagamento');
    return data.clientSecret as string;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <TestBanner />
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-4 backdrop-blur-xl">
        <button onClick={() => (priceId ? setPriceId(null) : navigate(-1))} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-primary" />Créditos de IA</h1>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-4">
        <section className="rounded-md border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Seu saldo</p>
          <p className="font-serif text-4xl">{isMaster ? 'Ilimitado' : brl(balance)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Cada uso da IA (fotos de alimento, treinos, exames, cardápios…) desconta do saldo.</p>
          {returned && <p className="mt-2 text-sm text-primary">Pagamento recebido! O saldo atualiza em alguns segundos.</p>}
        </section>

        {priceId ? (
          <section className="rounded-md border border-border bg-card p-2">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </section>
        ) : (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Comprar créditos</h2>
            <div className="grid grid-cols-3 gap-2">
              {PACKS.map((p) => (
                <Button key={p.priceId} variant="outline" className="h-16 text-lg" disabled={!env} onClick={() => setPriceId(p.priceId)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Histórico</h2>
          {ledger.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border bg-card">
              {ledger.map((l) => (
                <li key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p>{l.kind === 'purchase' ? 'Compra de créditos' : FEATURE_LABELS[l.feature ?? ''] ?? 'Uso de IA'}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <span className={l.amount_cents >= 0 ? 'text-primary' : 'text-muted-foreground'}>
                    {l.amount_cents >= 0 ? '+' : '−'}{brl(Math.abs(Number(l.amount_cents)))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
