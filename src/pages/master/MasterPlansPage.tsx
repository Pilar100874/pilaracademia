import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ConfirmProvider';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  max_students: number | null;
  price_monthly_cents: number;
  price_yearly_cents: number;
  currency: string;
  paddle_price_id_monthly: string | null;
  paddle_price_id_yearly: string | null;
  sort_order: number;
  active: boolean;
}

const empty: Omit<Plan, 'id'> = {
  name: '',
  description: '',
  max_students: 50,
  price_monthly_cents: 7900,
  price_yearly_cents: 79000,
  currency: 'BRL',
  paddle_price_id_monthly: null,
  paddle_price_id_yearly: null,
  sort_order: 0,
  active: true,
};

export default function MasterPlansPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState<Plan | (Omit<Plan, 'id'> & { id?: string }) | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['master-plans'],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans' as any)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const upsertMut = useMutation({
    mutationFn: async (p: Omit<Plan, 'id'> & { id?: string }) => {
      if (!p.name.trim()) throw new Error('Nome obrigatório');
      const payload: any = {
        name: p.name.trim(),
        description: p.description?.trim() || null,
        max_students: p.max_students,
        price_monthly_cents: Math.round(p.price_monthly_cents),
        price_yearly_cents: Math.round(p.price_yearly_cents),
        currency: p.currency || 'BRL',
        paddle_price_id_monthly: p.paddle_price_id_monthly?.trim() || null,
        paddle_price_id_yearly: p.paddle_price_id_yearly?.trim() || null,
        sort_order: p.sort_order ?? 0,
        active: p.active,
      };
      if (p.id) {
        const { error } = await supabase.from('subscription_plans' as any).update(payload).eq('id', p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subscription_plans' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-plans'] });
      qc.invalidateQueries({ queryKey: ['subscription-plans'] });
      setEditing(null);
      toast.success('Plano salvo');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscription_plans' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-plans'] });
      toast.success('Plano removido');
    },
    onError: (e: any) => toast.error(e?.message),
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/master')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Painel master
        </Button>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Planos de assinatura
            </h1>
            <p className="text-sm text-muted-foreground">Defina faixas, preços e IDs do provedor de pagamento.</p>
          </div>
          <Button onClick={() => setEditing({ ...empty })}>
            <Plus className="h-4 w-4 mr-1" />Novo plano
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : plans.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            Nenhum plano cadastrado. Crie o primeiro plano.
          </Card>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => (
              <Card key={p.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{p.name}</h3>
                    {!p.active && <Badge variant="outline">Inativo</Badge>}
                    <Badge variant="secondary">
                      {p.max_students ? `${p.max_students} alunos` : 'Ilimitado'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {(p.price_monthly_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: p.currency })}/mês ·{' '}
                    {(p.price_yearly_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: p.currency })}/ano
                  </div>
                  {(!p.paddle_price_id_monthly || !p.paddle_price_id_yearly) && (
                    <p className="text-xs text-amber-700 mt-1">
                      ⚠️ Preço do provedor não configurado — checkout não funcionará.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={async () => { if (await confirm({ title: 'Excluir plano', description: `Excluir "${p.name}"?`, destructive: true })) removeMut.mutate(p.id); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && 'id' in editing && editing.id ? 'Editar plano' : 'Novo plano'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Pro 200" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Para clínicas em crescimento..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Máx. alunos (vazio = ilimitado)</Label>
                  <Input
                    type="number"
                    value={editing.max_students ?? ''}
                    onChange={(e) => setEditing({ ...editing, max_students: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço mensal (R$)</Label>
                  <Input
                    type="number" step="0.01"
                    value={editing.price_monthly_cents / 100}
                    onChange={(e) => setEditing({ ...editing, price_monthly_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  />
                </div>
                <div>
                  <Label>Preço anual (R$)</Label>
                  <Input
                    type="number" step="0.01"
                    value={editing.price_yearly_cents / 100}
                    onChange={(e) => setEditing({ ...editing, price_yearly_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  />
                </div>
              </div>
              <div className="border-t pt-3 space-y-3">
                <p className="text-sm font-semibold">IDs do provedor de pagamento</p>
                <p className="text-xs text-muted-foreground">
                  Crie os preços no painel de pagamentos (Open payments dashboard) e cole os IDs aqui.
                  Para teste use IDs do sandbox; em produção, use os IDs live correspondentes.
                </p>
                <div>
                  <Label>Price ID mensal</Label>
                  <Input
                    value={editing.paddle_price_id_monthly ?? ''}
                    onChange={(e) => setEditing({ ...editing, paddle_price_id_monthly: e.target.value })}
                    placeholder="pri_01..."
                  />
                </div>
                <div>
                  <Label>Price ID anual</Label>
                  <Input
                    value={editing.paddle_price_id_yearly ?? ''}
                    onChange={(e) => setEditing({ ...editing, paddle_price_id_yearly: e.target.value })}
                    placeholder="pri_01..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <Label>Plano ativo (visível para clientes)</Label>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && upsertMut.mutate(editing)} disabled={upsertMut.isPending}>
              {upsertMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
