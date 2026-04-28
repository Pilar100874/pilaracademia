import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Zap, Pencil, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';

const TRIGGERS = [
  { value: 'manual', label: 'Manual' },
  { value: 'new_student', label: 'Novo aluno cadastrado' },
  { value: 'class_completed', label: 'Aula realizada' },
  { value: 'class_cancelled', label: 'Aula cancelada' },
  { value: 'birthday', label: 'Aniversário do aluno' },
  { value: 'inactive_student', label: 'Aluno inativo (30 dias)' },
];

const ACTIONS = [
  { value: 'webhook', label: 'Disparar webhook' },
  { value: 'whatsapp', label: 'Enviar WhatsApp' },
  { value: 'email', label: 'Enviar e-mail' },
];

interface Automation {
  id?: string;
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  webhook_url: string;
  active: boolean;
}

const empty: Automation = {
  name: '',
  description: '',
  trigger_type: 'manual',
  action_type: 'webhook',
  webhook_url: '',
  active: true,
};

const MarketingAutomacoes: React.FC = () => {
  const { activeClinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Automation>(empty);

  const { data: items = [] } = useQuery({
    queryKey: ['marketing-automations', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('marketing_automations')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeClinicId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Automation) => {
      if (!activeClinicId || !user) throw new Error('Sem clínica ativa');
      if (data.id) {
        const { error } = await supabase
          .from('marketing_automations')
          .update({
            name: data.name,
            description: data.description,
            trigger_type: data.trigger_type,
            action_type: data.action_type,
            webhook_url: data.webhook_url || null,
            active: data.active,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('marketing_automations').insert({
          clinic_id: activeClinicId,
          name: data.name,
          description: data.description,
          trigger_type: data.trigger_type,
          action_type: data.action_type,
          webhook_url: data.webhook_url || null,
          active: data.active,
          created_by: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Salvo!');
      queryClient.invalidateQueries({ queryKey: ['marketing-automations'] });
      setOpen(false);
      setEditing(empty);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('marketing_automations').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing-automations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_automations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido');
      queryClient.invalidateQueries({ queryKey: ['marketing-automations'] });
    },
  });

  const runMutation = useMutation({
    mutationFn: async (a: any) => {
      if (a.webhook_url) {
        await fetch(a.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            automation_id: a.id,
            automation_name: a.name,
            trigger: 'manual_run',
            timestamp: new Date().toISOString(),
          }),
        });
      }
      await supabase
        .from('marketing_automations')
        .update({ last_run_at: new Date().toISOString(), run_count: (a.run_count || 0) + 1 })
        .eq('id', a.id);
    },
    onSuccess: () => {
      toast.success('Executado!');
      queryClient.invalidateQueries({ queryKey: ['marketing-automations'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openNew = () => { setEditing(empty); setOpen(true); };
  const openEdit = (a: any) => { setEditing(a); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova Automação</Button>
      </div>

      <div className="space-y-2">
        {items.map((a: any) => (
          <Card key={a.id} className="p-3">
            <div className="flex items-start gap-3">
              <Zap className={`h-5 w-5 mt-1 ${a.active ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium">{a.name}</span>
                  <Badge variant="outline">{TRIGGERS.find(t => t.value === a.trigger_type)?.label || a.trigger_type}</Badge>
                  <Badge variant="secondary">{ACTIONS.find(t => t.value === a.action_type)?.label || a.action_type}</Badge>
                  {a.run_count > 0 && <Badge>{a.run_count} execuções</Badge>}
                </div>
                {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={a.active} onCheckedChange={(v) => toggleMutation.mutate({ id: a.id, active: v })} />
                <Button size="sm" variant="ghost" onClick={() => runMutation.mutate(a)} title="Executar agora">
                  <Play className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            Nenhuma automação. Crie uma para começar.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Editar' : 'Nova'} Automação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Gatilho</Label>
                <Select value={editing.trigger_type} onValueChange={(v) => setEditing({ ...editing, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ação</Label>
                <Select value={editing.action_type} onValueChange={(v) => setEditing({ ...editing, action_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Webhook URL</Label>
              <Input value={editing.webhook_url} onChange={(e) => setEditing({ ...editing, webhook_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(editing)} disabled={!editing.name.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingAutomacoes;
