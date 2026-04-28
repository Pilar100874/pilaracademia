// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function MasterSettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [trialDays, setTrialDays] = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ['master-settings-edit'],
    queryFn: async () => {
      const { data } = await supabase.from('master_settings' as any).select('*').eq('id', 1).maybeSingle();
      return (data ?? { payments_mode: 'test', trial_days: 7 }) as any;
    },
  });

  useEffect(() => {
    if (data) {
      setMode(data.payments_mode);
      setTrialDays(data.trial_days);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('master_settings' as any)
        .update({ payments_mode: mode, trial_days: trialDays, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-settings'] });
      qc.invalidateQueries({ queryKey: ['master-settings-edit'] });
      toast.success('Configurações salvas');
    },
    onError: (e: any) => toast.error(e?.message),
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/master')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Painel master
        </Button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configurações da plataforma
          </h1>
          <p className="text-sm text-muted-foreground">Modo de pagamento e período de trial.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Card className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base font-semibold">Modo de pagamento</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Em <strong>teste</strong>, checkouts usam o sandbox e não cobram valores reais.
                    Em <strong>produção</strong>, pagamentos são reais.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={mode === 'test' ? 'outline' : 'secondary'}>Teste</Badge>
                  <Switch
                    checked={mode === 'live'}
                    onCheckedChange={(v) => setMode(v ? 'live' : 'test')}
                  />
                  <Badge variant={mode === 'live' ? 'default' : 'outline'}>Produção</Badge>
                </div>
              </div>
              {mode === 'live' && (
                <Card className="p-3 mt-3 bg-amber-500/10 border-amber-500/40">
                  <p className="text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    Antes de ativar produção, garanta que: (1) sua conta está verificada no provedor,
                    (2) os planos têm os Price IDs <strong>live</strong> preenchidos.
                  </p>
                </Card>
              )}
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Período de trial (dias)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quantos dias cada nova clínica recebe de acesso gratuito.
              </p>
              <Input
                type="number"
                min={0}
                max={90}
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                className="mt-2 max-w-[120px]"
              />
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
