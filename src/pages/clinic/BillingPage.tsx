import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import {
  useSubscriptionPlans,
  useClinicSubscription,
  useMasterSettings,
  hasActiveAccess,
  type SubscriptionPlan,
} from '@/hooks/useSubscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertTriangle, Sparkles, ArrowLeft, Clock, CreditCard } from 'lucide-react';
import { openCheckout } from '@/lib/paddle';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });
}

interface Props {
  /** Quando true, esconde botão de voltar (modo gate). */
  fullscreen?: boolean;
}

export default function BillingPage({ fullscreen = false }: Props) {
  const { activeClinicId, activeClinic, isAdmin } = useUserRoles();
  const { user } = useAuth();
  const { data: plans = [] } = useSubscriptionPlans();
  const { data: sub, refetch } = useClinicSubscription(activeClinicId);
  const { data: master } = useMasterSettings();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [params] = useSearchParams();

  useEffect(() => {
    if (params.get('success')) {
      toast.success('Pagamento confirmado! Atualizando...');
      const t = setInterval(() => refetch(), 3000);
      setTimeout(() => clearInterval(t), 30_000);
    }
  }, [params, refetch]);

  const active = hasActiveAccess(sub);
  const trialDaysLeft =
    sub?.status === 'trialing' && sub.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
      : null;

  const currentPlan = plans.find((p) => p.id === sub?.plan_id);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!activeClinicId) return;
    const priceId = cycle === 'monthly' ? plan.paddle_price_id_monthly : plan.paddle_price_id_yearly;
    if (!priceId) {
      toast.error('Plano sem preço configurado. O administrador precisa criar o preço no provedor.');
      return;
    }
    try {
      await openCheckout({
        priceId,
        customerEmail: user?.email,
        customData: { clinic_id: activeClinicId, plan_id: plan.id, cycle },
      });
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao abrir pagamento');
    }
  };

  return (
    <div className={fullscreen ? 'min-h-screen bg-background p-4 sm:p-8' : 'p-4 sm:p-6'}>
      <div className="max-w-5xl mx-auto space-y-6">
        {!fullscreen && (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/clinica"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link>
          </Button>
        )}

        {/* Estado atual */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-bold">Sua assinatura</p>
              <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
                {activeClinic?.name}
                {master?.payments_mode === 'test' && (
                  <Badge variant="outline" className="border-amber-500 text-amber-700">Modo teste</Badge>
                )}
              </h1>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {active ? (
                  <Badge className="bg-green-500/15 text-green-700 border-green-500/30 border">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {sub?.status === 'trialing' ? 'Trial ativo' : 'Ativo'}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Acesso expirado
                  </Badge>
                )}
                {currentPlan && <span className="text-sm text-muted-foreground">Plano: <strong>{currentPlan.name}</strong></span>}
                {sub?.cycle && <Badge variant="secondary">{sub.cycle === 'monthly' ? 'Mensal' : 'Anual'}</Badge>}
              </div>
              {trialDaysLeft !== null && (
                <p className="mt-3 text-sm flex items-center gap-1.5 text-amber-700">
                  <Clock className="h-4 w-4" />
                  {trialDaysLeft === 0
                    ? 'Trial encerra hoje'
                    : `${trialDaysLeft} dia(s) restantes no trial`}
                  {sub?.trial_ends_at && (
                    <span className="text-muted-foreground">
                      (até {format(new Date(sub.trial_ends_at), "dd/MM 'às' HH:mm", { locale: ptBR })})
                    </span>
                  )}
                </p>
              )}
              {sub?.current_period_end && active && sub.status === 'active' && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Próxima cobrança em {formatDistanceToNow(new Date(sub.current_period_end), { addSuffix: true, locale: ptBR })}.
                </p>
              )}
            </div>
            <CreditCard className="h-12 w-12 text-primary/40" />
          </div>
        </Card>

        {!isAdmin && !active && (
          <Card className="p-6 bg-amber-500/10 border-amber-500/40">
            <p className="text-sm">
              A assinatura desta clínica está suspensa. Entre em contato com o administrador para regularizar o pagamento.
            </p>
          </Card>
        )}

        {/* Catálogo */}
        {isAdmin && (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Escolha seu plano
                </h2>
                <p className="text-sm text-muted-foreground">Pague mensalmente ou economize com o anual.</p>
              </div>
              <Tabs value={cycle} onValueChange={(v) => setCycle(v as any)}>
                <TabsList>
                  <TabsTrigger value="monthly">Mensal</TabsTrigger>
                  <TabsTrigger value="yearly">Anual</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {plans.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">
                Nenhum plano disponível no momento. O administrador da plataforma precisa cadastrar planos.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const price = cycle === 'monthly' ? p.price_monthly_cents : p.price_yearly_cents;
                  const isCurrent = p.id === sub?.plan_id && sub?.cycle === cycle;
                  return (
                    <Card key={p.id} className={`p-5 flex flex-col gap-3 ${isCurrent ? 'border-primary border-2' : ''}`}>
                      <div>
                        <h3 className="text-lg font-bold">{p.name}</h3>
                        {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{formatPrice(price, p.currency)}</span>
                        <span className="text-sm text-muted-foreground">/{cycle === 'monthly' ? 'mês' : 'ano'}</span>
                      </div>
                      <ul className="text-sm space-y-1 flex-1">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          {p.max_students ? `Até ${p.max_students} alunos` : 'Alunos ilimitados'}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Todas as funcionalidades
                        </li>
                      </ul>
                      <Button
                        onClick={() => handleSubscribe(p)}
                        disabled={isCurrent}
                        className="w-full"
                      >
                        {isCurrent ? 'Plano atual' : 'Assinar'}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}

            {master?.payments_mode === 'test' && (
              <Card className="p-4 mt-4 bg-amber-500/10 border-amber-500/30">
                <p className="text-sm">
                  ⚠️ <strong>Modo teste ativo.</strong> Os pagamentos não cobrarão valores reais. Use cartões de teste para simular.
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
