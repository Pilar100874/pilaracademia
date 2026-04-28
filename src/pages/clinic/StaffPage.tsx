// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useClinicStaff } from '@/hooks/useStaff';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, UserCog, Trash2, KeyRound, Copy, ShieldCheck, GraduationCap, Headphones, Search, Users, Mail } from 'lucide-react';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ConfirmProvider';

const ROLE_META: Record<string, { label: string; plural: string; icon: any; chip: string; ring: string; gradient: string }> = {
  clinic_admin: {
    label: 'Administrador',
    plural: 'Administradores',
    icon: ShieldCheck,
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    ring: 'ring-amber-500/30',
    gradient: 'from-amber-500/20 to-amber-500/0',
  },
  instructor: {
    label: 'Professor',
    plural: 'Professores',
    icon: GraduationCap,
    chip: 'bg-primary/15 text-primary border-primary/30',
    ring: 'ring-primary/30',
    gradient: 'from-primary/20 to-primary/0',
  },
  receptionist: {
    label: 'Recepção',
    plural: 'Recepção',
    icon: Headphones,
    chip: 'bg-muted-foreground/15 text-foreground border-border',
    ring: 'ring-muted-foreground/20',
    gradient: 'from-muted-foreground/15 to-muted-foreground/0',
  },
};

const ROLE_ORDER = ['clinic_admin', 'instructor', 'receptionist'] as const;

export default function StaffPage() {
  const { activeClinicId, isAdmin } = useUserRoles();
  const { data: staff = [], isLoading, removeStaff } = useClinicStaff(activeClinicId);
  const { confirm } = useConfirm();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [form, setForm] = useState({ full_name: '', email: '', role: 'instructor' as 'instructor' | 'receptionist' | 'clinic_admin' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string; already_existed: boolean } | null>(null);
  const qc = useQueryClient();

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
      const created = data as any;
      setResult({
        email: created.email,
        password: created.password,
        already_existed: !!created.already_existed,
      });

      // Atualização otimista: insere o novo membro no cache imediatamente,
      // sem esperar pela replicação do Postgres (que às vezes atrasa o read-after-write).
      const newMember = {
        user_id: created.user_id as string,
        role: form.role,
        name: form.full_name.trim(),
        email: form.email.trim(),
      };
      qc.setQueryData(['clinic-staff', activeClinicId], (prev: any[] | undefined) => {
        const list = prev ?? [];
        if (list.some((m) => m.user_id === newMember.user_id && m.role === newMember.role)) return list;
        return [...list, newMember];
      });

      setForm({ full_name: '', email: '', role: 'instructor' });
      setOpen(false);

      // Refetch com pequeno atraso para reconciliar com o servidor
      // (cobre eventual lag de replica do banco).
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['clinic-staff', activeClinicId] });
      }, 800);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao cadastrar');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (!q) return true;
      return (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
    });
  }, [staff, search, roleFilter]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, typeof staff>>((acc, m) => {
      (acc[m.role] ||= []).push(m);
      return acc;
    }, {} as any);
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: staff.length };
    ROLE_ORDER.forEach((r) => (c[r] = staff.filter((m) => m.role === r).length));
    return c;
  }, [staff]);

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Card className="p-8 text-center text-muted-foreground">
          Apenas administradores da clínica podem gerenciar a equipe.
        </Card>
      </div>
    );
  }

  return (
    <>
    <ClinicPageHeader icon={Users} title="Equipe" subtitle="Professores, recepção e administradores" />
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-7">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start sm:items-center justify-end gap-3 flex-wrap">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg shadow-primary/20 w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1" />Novo usuário
              </Button>
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

        {/* Stats */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
          <StatCard label="Total" value={counts.all} icon={Users} active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} />
          {ROLE_ORDER.map((r) => (
            <StatCard
              key={r}
              label={ROLE_META[r].plural}
              value={counts[r] || 0}
              icon={ROLE_META[r].icon}
              active={roleFilter === r}
              onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}
            />
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="pl-9 h-11 rounded-xl"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4 h-24 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <UserCog className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
          <p className="font-medium">
            {staff.length === 0 ? 'Nenhum membro cadastrado ainda' : 'Nenhum resultado para sua busca'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {staff.length === 0 ? 'Comece adicionando seus professores.' : 'Tente outro termo ou limpe o filtro.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {ROLE_ORDER.map((role) => {
            const list = grouped[role] || [];
            if (!list.length) return null;
            const meta = ROLE_META[role];
            const Icon = meta.icon;
            return (
              <section key={role} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${meta.gradient} border`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="font-semibold tracking-tight">{meta.plural}</h2>
                  <Badge variant="secondary" className="text-[10px] h-5">{list.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((m) => (
                    <Card
                      key={`${m.user_id}-${m.role}`}
                      className="group relative overflow-hidden p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${meta.gradient}`} />
                      <div className="flex items-start gap-3">
                        <div className={`h-12 w-12 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg ring-2 ${meta.ring}`}>
                          {(m.name || m.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{m.name || '(sem nome)'}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate mt-0.5">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{m.email || '—'}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <Badge variant="outline" className={`text-[10px] ${meta.chip}`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {meta.label}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100"
                              title="Remover desta clínica"
                              onClick={async () => {
                                if (await confirm({ title: 'Remover da clínica', description: `Remover ${m.name || m.email} da clínica?`, destructive: true })) {
                                  removeStaff.mutate({ user_id: m.user_id, role: m.role });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
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
            <div className="p-3 rounded-lg bg-muted font-mono text-sm space-y-1">
              <div className="flex items-center justify-between gap-2"><span className="opacity-70">Email:</span><span className="font-bold break-all text-right">{result?.email}</span></div>
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
    </>
  );
}

function StatCard({
  label, value, icon: Icon, active, onClick,
}: { label: string; value: number; icon: any; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-xl border p-3 transition-all ${
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
          : 'bg-card hover:bg-muted/50 hover:border-primary/30'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide opacity-80 truncate">{label}</span>
        <Icon className="h-3.5 w-3.5 opacity-70 shrink-0" />
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </button>
  );
}
