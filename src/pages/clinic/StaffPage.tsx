import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useClinicStaff } from '@/hooks/useStaff';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, UserCog, Trash2, KeyRound, Copy, ShieldCheck, GraduationCap, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ROLE_META: Record<string, { label: string; icon: any; color: string }> = {
  clinic_admin: { label: 'Administrador', icon: ShieldCheck, color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  instructor: { label: 'Professor', icon: GraduationCap, color: 'bg-primary/15 text-primary' },
  receptionist: { label: 'Recepção', icon: Headphones, color: 'bg-muted-foreground/15 text-foreground' },
};

export default function StaffPage() {
  const { activeClinicId, isAdmin } = useUserRoles();
  const { data: staff = [], isLoading, removeStaff } = useClinicStaff(activeClinicId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'instructor' as 'instructor' | 'receptionist' | 'clinic_admin' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string; already_existed: boolean } | null>(null);

  const handleCreate = async () => {
    if (!activeClinicId || !form.full_name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-staff', {
        body: {
          clinic_id: activeClinicId,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          role: form.role,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult({
        email: (data as any).email,
        password: (data as any).password,
        already_existed: !!(data as any).already_existed,
      });
      setForm({ full_name: '', email: '', role: 'instructor' });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao cadastrar');
    } finally {
      setSubmitting(false);
    }
  };

  const grouped = staff.reduce<Record<string, typeof staff>>((acc, m) => {
    (acc[m.role] ||= []).push(m);
    return acc;
  }, {} as any);

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-8 text-center text-muted-foreground">
          Apenas administradores da clínica podem gerenciar a equipe.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-sm text-muted-foreground">Cadastre professores, recepção e administradores da clínica.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Cadastrar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo membro da equipe</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Função</label>
                <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instructor">Professor</SelectItem>
                    <SelectItem value="receptionist">Recepção</SelectItem>
                    <SelectItem value="clinic_admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm">Nome completo</label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><label className="text-sm">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="professor@email.com" /></div>
              <p className="text-xs text-muted-foreground">Uma senha temporária será gerada. O membro será obrigado a trocar no primeiro acesso.</p>
              <Button onClick={handleCreate} disabled={!form.full_name.trim() || !form.email.trim() || submitting} className="w-full">
                {submitting ? 'Cadastrando...' : 'Cadastrar e gerar senha'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando equipe...</Card>
      ) : staff.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <UserCog className="h-10 w-10 mx-auto mb-3 opacity-50" />
          Nenhum membro cadastrado ainda. Comece adicionando seus professores.
        </Card>
      ) : (
        ['clinic_admin', 'instructor', 'receptionist'].map((role) => {
          const list = grouped[role] || [];
          if (!list.length) return null;
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          return (
            <div key={role} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{meta.label}{list.length > 1 ? 'es' : ''}</h2>
                <span className="text-xs text-muted-foreground">({list.length})</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {list.map((m) => (
                  <Card key={`${m.user_id}-${m.role}`} className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {(m.name || m.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{m.name || '(sem nome)'}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.email || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className={meta.color}>{meta.label}</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Remover desta clínica"
                        onClick={() => {
                          if (confirm(`Remover ${m.name || m.email} da clínica?`)) {
                            removeStaff.mutate({ user_id: m.user_id, role: m.role });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle><KeyRound className="h-4 w-4 inline mr-1" />Acesso gerado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {result?.already_existed
                ? 'O e-mail já existia. A senha foi redefinida.'
                : 'Entregue estas credenciais ao membro. Ele será obrigado a trocar a senha no primeiro acesso.'}
            </p>
            <div className="p-3 rounded bg-muted font-mono text-sm space-y-1">
              <div className="flex items-center justify-between gap-2"><span className="opacity-70">Email:</span><span className="font-bold">{result?.email}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="opacity-70">Senha:</span><span className="font-bold">{result?.password}</span></div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${result?.email}\nSenha: ${result?.password}`);
                toast.success('Copiado!');
              }}
            >
              <Copy className="h-4 w-4 mr-1" />Copiar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
