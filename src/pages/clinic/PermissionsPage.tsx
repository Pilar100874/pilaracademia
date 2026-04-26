import { useMemo, useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useClinicStaff } from '@/hooks/useStaff';
import { useClinicPermissions } from '@/hooks/useClinicPermissions';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, GraduationCap, Headphones, Dumbbell, ListOrdered, ClipboardList, Search, Lock } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_META: Record<string, { label: string; icon: any; color: string }> = {
  clinic_admin: { label: 'Administrador', icon: ShieldCheck, color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  instructor: { label: 'Professor', icon: GraduationCap, color: 'bg-primary/15 text-primary' },
  receptionist: { label: 'Recepção', icon: Headphones, color: 'bg-muted-foreground/15 text-foreground' },
};

const PERMS = [
  { key: 'can_create_exercises' as const, label: 'Criar exercícios', icon: Dumbbell, desc: 'Adicionar e editar exercícios na biblioteca da clínica' },
  { key: 'can_create_sequences' as const, label: 'Criar sequências', icon: ListOrdered, desc: 'Montar e editar sequências de treino' },
  { key: 'can_prescribe_workouts' as const, label: 'Prescrever ao aluno', icon: ClipboardList, desc: 'Atribuir treinos a alunos específicos' },
];

export default function PermissionsPage() {
  const { activeClinicId, isAdmin } = useUserRoles();
  const { data: staff = [], isLoading: loadingStaff } = useClinicStaff(activeClinicId);
  const { data: perms = [], isLoading: loadingPerms, upsert } = useClinicPermissions(activeClinicId);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return staff
      .filter((s) => s.role !== 'clinic_admin') // admin tem tudo, não precisa configurar
      .filter((s) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (s.name ?? '').toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q);
      })
      .map((s) => {
        const p = perms.find((pp) => pp.user_id === s.user_id);
        const isInstructor = s.role === 'instructor';
        return {
          ...s,
          can_create_exercises: p?.can_create_exercises ?? isInstructor,
          can_create_sequences: p?.can_create_sequences ?? isInstructor,
          can_prescribe_workouts: p?.can_prescribe_workouts ?? isInstructor,
        };
      });
  }, [staff, perms, search]);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center space-y-3">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Acesso restrito</h2>
          <p className="text-muted-foreground">Apenas administradores da clínica podem gerenciar permissões.</p>
        </Card>
      </div>
    );
  }

  const handleToggle = async (
    user_id: string,
    current: { can_create_exercises: boolean; can_create_sequences: boolean; can_prescribe_workouts: boolean },
    key: 'can_create_exercises' | 'can_create_sequences' | 'can_prescribe_workouts',
    value: boolean
  ) => {
    try {
      await upsert.mutateAsync({ user_id, ...current, [key]: value });
      toast.success('Permissão atualizada');
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao atualizar');
    }
  };

  if (loadingStaff || loadingPerms) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permissões da equipe</h1>
        <p className="text-muted-foreground mt-1">
          Controle quem pode criar exercícios, montar sequências e prescrever treinos aos alunos.
          <span className="block text-xs mt-1">Administradores sempre têm acesso total.</span>
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum membro da equipe além do administrador.
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => {
            const meta = ROLE_META[r.role] ?? ROLE_META.instructor;
            const Icon = meta.icon;
            return (
              <Card key={r.user_id} className="p-5 hover:shadow-lg transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                  <div className="flex items-center gap-3 lg:min-w-[260px]">
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${meta.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.name ?? 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.email ?? '—'}</div>
                      <Badge variant="secondary" className="mt-1 text-[10px]">{meta.label}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    {PERMS.map((p) => {
                      const PIcon = p.icon;
                      const enabled = r[p.key];
                      return (
                        <label
                          key={p.key}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                            enabled ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border'
                          }`}
                        >
                          <PIcon className={`h-4 w-4 mt-0.5 shrink-0 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{p.label}</div>
                            <div className="text-[11px] text-muted-foreground leading-tight">{p.desc}</div>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(v) =>
                              handleToggle(
                                r.user_id,
                                {
                                  can_create_exercises: r.can_create_exercises,
                                  can_create_sequences: r.can_create_sequences,
                                  can_prescribe_workouts: r.can_prescribe_workouts,
                                },
                                p.key,
                                v
                              )
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
