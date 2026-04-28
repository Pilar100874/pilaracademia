import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Pencil, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserClinicRole } from '@/hooks/useUserClinicRole';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  channel: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  goal: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'completed', label: 'Concluída' },
  { value: 'archived', label: 'Arquivada' },
];

const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'sms', label: 'SMS' },
  { value: 'other', label: 'Outro' },
];

const statusVariant = (s: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (s === 'active') return 'default';
  if (s === 'paused') return 'secondary';
  if (s === 'archived') return 'outline';
  return 'secondary';
};

const MarketingCampanhas: React.FC = () => {
  const { user } = useAuth();
  const { data: roleInfo } = useUserClinicRole();
  const clinicId = roleInfo?.clinicId;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', status: 'draft', channel: '',
    start_date: '', end_date: '', budget: '', goal: '', notes: '',
  });

  useEffect(() => { if (clinicId) fetchCampaigns(); }, [clinicId]);

  const fetchCampaigns = async () => {
    if (!clinicId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCampaigns(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', status: 'draft', channel: '', start_date: '', end_date: '', budget: '', goal: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || '',
      status: c.status,
      channel: c.channel || '',
      start_date: c.start_date || '',
      end_date: c.end_date || '',
      budget: c.budget != null ? String(c.budget) : '',
      goal: c.goal || '',
      notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !clinicId) return;
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        clinic_id: clinicId,
        name: form.name.trim(),
        description: form.description || null,
        status: form.status,
        channel: form.channel || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: form.budget ? Number(form.budget.replace(',', '.')) : null,
        goal: form.goal || null,
        notes: form.notes || null,
        created_by: user.id,
      };
      const { error } = editing
        ? await supabase.from('marketing_campaigns').update(payload).eq('id', editing.id)
        : await supabase.from('marketing_campaigns').insert(payload);
      if (error) throw error;
      toast.success(editing ? 'Campanha atualizada' : 'Campanha criada');
      setDialogOpen(false);
      fetchCampaigns();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
      if (error) throw error;
      toast.success('Campanha removida');
      setDeleteConfirm(null);
      fetchCampaigns();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao remover');
    }
  };

  const fmtDate = (d: string | null) => d ? format(new Date(d + 'T00:00:00'), 'dd MMM yyyy', { locale: ptBR }) : '—';
  const channelLabel = (c: string | null) => CHANNEL_OPTIONS.find(o => o.value === c)?.label || '—';
  const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;

  if (!clinicId) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Você precisa estar vinculado a uma clínica.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Crie e acompanhe suas campanhas de marketing.</p>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" />Nova campanha</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma campanha cadastrada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map(c => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-serif">{c.name}</CardTitle>
                  <Badge variant={statusVariant(c.status)}>{statusLabel(c.status)}</Badge>
                </div>
                {c.description && <CardDescription className="text-xs">{c.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Canal</span><span>{channelLabel(c.channel)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span>{fmtDate(c.start_date)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fim</span><span>{fmtDate(c.end_date)}</span></div>
                {c.budget != null && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Orçamento</span>
                    <span>R$ {Number(c.budget).toFixed(2)}</span></div>
                )}
                <div className="flex gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(c)}>
                    <Pencil className="h-3 w-3 mr-1" />Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? 'Editar campanha' : 'Nova campanha'}</DialogTitle>
            <DialogDescription>Defina os detalhes da sua campanha.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Canal</Label>
                <Select value={form.channel} onValueChange={(v) => setForm(p => ({ ...p, channel: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Início</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fim</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Orçamento (R$)</Label>
              <Input
                inputMode="decimal"
                value={form.budget}
                onChange={(e) => setForm(p => ({ ...p, budget: e.target.value.replace(/[^0-9.,]/g, '') }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Objetivo</Label>
              <Input value={form.goal} onChange={(e) => setForm(p => ({ ...p, goal: e.target.value }))} placeholder="Ex: 30 novos alunos" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover campanha?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarketingCampanhas;
