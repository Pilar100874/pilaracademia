import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useClinicRooms } from '@/hooks/useClinicRooms';
import { useEquipment, useSkillLevels } from '@/hooks/useClinicData';
import { useClinicStaff } from '@/hooks/useStaff';
import { useClinicPermissions } from '@/hooks/useClinicPermissions';
import { useBookableSlots, useClinicSettings } from '@/hooks/useBookableSlots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ClinicLogoUploader } from '@/components/ClinicLogoUploader';
import { toast } from 'sonner';
import {
  Building2, DoorOpen, Dumbbell, GraduationCap, ShieldCheck, Layers,
  CalendarDays, Settings2, ArrowRight, ArrowLeft, Check, X, Loader2,
  Sparkles, Plus, Trash2, KeyRound, Search,
} from 'lucide-react';

const WIZARD_STORAGE_PREFIX = 'pilar.setupWizard.completed.';

export function setupWizardCompleted(clinicId: string) {
  return localStorage.getItem(WIZARD_STORAGE_PREFIX + clinicId) === '1';
}

export function markWizardCompleted(clinicId: string) {
  localStorage.setItem(WIZARD_STORAGE_PREFIX + clinicId, '1');
}

type StepKey =
  | 'clinic' | 'rooms' | 'equipment' | 'staff' | 'permissions'
  | 'levels' | 'grade' | 'rules';

interface Props {
  clinicId: string;
  onClose: () => void;
  onCompleted: () => void;
}

const STEPS: { key: StepKey; title: string; subtitle: string; icon: any }[] = [
  { key: 'clinic',      title: 'Dados da clínica',  subtitle: 'Nome e logo',                             icon: Building2 },
  { key: 'rooms',       title: 'Salas',             subtitle: 'Onde as aulas acontecem',                 icon: DoorOpen },
  { key: 'equipment',   title: 'Equipamentos',      subtitle: 'Reformer, Cadillac, Chair…',              icon: Dumbbell },
  { key: 'staff',       title: 'Equipe',            subtitle: 'Convide professores e recepção',          icon: GraduationCap },
  { key: 'permissions', title: 'Permissões',        subtitle: 'O que cada papel pode fazer',             icon: ShieldCheck },
  { key: 'levels',      title: 'Níveis',            subtitle: 'Iniciante, intermediário, avançado…',     icon: Layers },
  { key: 'grade',       title: 'Grade master',      subtitle: 'Horários fixos da semana',                icon: CalendarDays },
  { key: 'rules',       title: 'Regras de agenda',  subtitle: 'Cancelamento e janela de booking',        icon: Settings2 },
];

export function SetupWizard({ clinicId, onClose, onCompleted }: Props) {
  const { activeClinic } = useUserRoles();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  // Data hooks
  const rooms = useClinicRooms(clinicId);
  const equipment = useEquipment(clinicId);
  const staff = useClinicStaff(clinicId);
  const perms = useClinicPermissions(clinicId);
  const levels = useSkillLevels(clinicId);
  const slots = useBookableSlots(clinicId);
  const settings = useClinicSettings(clinicId);

  // Per-step "is satisfied" rules (all required)
  const status: Record<StepKey, boolean> = {
    clinic: !!(activeClinic?.name && activeClinic.name.trim().length > 1),
    rooms: (rooms.data?.length ?? 0) >= 1,
    equipment: (equipment.data?.length ?? 0) >= 1,
    staff: (staff.data?.filter((s) => s.role === 'instructor').length ?? 0) >= 1,
    permissions: true, // visited counts; defaults already work
    levels: (levels.data?.length ?? 0) >= 1,
    grade: (slots.data?.length ?? 0) >= 1,
    rules: !!settings.data,
  };

  const completedCount = STEPS.filter((s) => status[s.key]).reduce((a) => a + 1, 0);
  const allDone = completedCount === STEPS.length;

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleFinish = () => {
    markWizardCompleted(clinicId);
    toast.success('Configuração inicial concluída!');
    onCompleted();
  };

  const content = (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Assistente de configuração
            </div>
            <div className="font-bold truncate">{activeClinic?.name ?? 'Sua clínica'}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} title="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-3 space-y-2">
          <Progress value={(completedCount / STEPS.length) * 100} className="h-1.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Passo {stepIndex + 1} de {STEPS.length} — <strong className="text-foreground">{step.title}</strong></span>
            <span>{completedCount}/{STEPS.length} concluídos</span>
          </div>
          {/* Step pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {STEPS.map((s, i) => {
              const done = status[s.key];
              const active = i === stepIndex;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setStepIndex(i)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : done
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <div className="mb-6 flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/0 border border-primary/20 flex items-center justify-center shrink-0">
              <step.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{step.title}</h1>
              <p className="text-muted-foreground text-sm">{step.subtitle}</p>
            </div>
            {status[step.key] && (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 ml-auto">
                <Check className="h-3 w-3 mr-1" /> ok
              </Badge>
            )}
          </div>

          {step.key === 'clinic' && <StepClinic clinicId={clinicId} />}
          {step.key === 'rooms' && <StepRooms hook={rooms} />}
          {step.key === 'equipment' && <StepEquipment hook={equipment} />}
          {step.key === 'staff' && <StepStaff clinicId={clinicId} hook={staff} />}
          {step.key === 'permissions' && <StepPermissions hook={perms} staff={staff.data ?? []} />}
          {step.key === 'levels' && <StepLevels hook={levels} />}
          {step.key === 'grade' && <StepGrade clinicId={clinicId} hook={slots} rooms={rooms.data ?? []} equipment={equipment.data ?? []} />}
          {step.key === 'rules' && <StepRules hook={settings} />}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-card/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={goPrev} disabled={stepIndex === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="hidden sm:inline-flex">
              Fechar
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button onClick={goNext} disabled={!status[step.key]} title={!status[step.key] ? 'Conclua este passo para avançar' : ''}>
                Avançar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={!allDone} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {allDone ? (<><Check className="h-4 w-4 mr-1" /> Concluir</>) : `Faltam ${STEPS.length - completedCount}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* ====================== STEPS ====================== */

function StepClinic({ clinicId }: { clinicId: string }) {
  const { activeClinic } = useUserRoles();
  const [name, setName] = useState(activeClinic?.name ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(activeClinic?.name ?? ''); }, [activeClinic?.name]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('clinics').update({ name: name.trim() }).eq('id', clinicId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Nome atualizado');
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Nome da clínica</Label>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pilar Pilates Centro" />
          <Button onClick={handleSave} disabled={!name.trim() || saving || name === activeClinic?.name}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Logo</Label>
        <ClinicLogoUploader
          value={activeClinic?.logo_url ?? null}
          onChange={async (url) => {
            const { error } = await supabase.from('clinics').update({ logo_url: url }).eq('id', clinicId);
            if (error) toast.error(error.message);
          }}
        />
        <p className="text-xs text-muted-foreground">Opcional. Aparece no painel e em links públicos.</p>
      </div>
    </div>
  );
}

function StepRooms({ hook }: { hook: ReturnType<typeof useClinicRooms> }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await hook.create.mutateAsync({ name: name.trim(), capacity: capacity ? Number(capacity) : null });
    setName(''); setCapacity('');
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Cadastre as salas onde as aulas acontecem (mínimo 1).</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2">
        <Input placeholder="Nome da sala (ex: Sala 1)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Capacidade" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        <Button onClick={handleAdd} disabled={!name.trim() || hook.create.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
      <ItemList
        items={hook.data ?? []}
        empty="Nenhuma sala cadastrada"
        render={(r) => (
          <>
            <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{r.name}</span>
            {r.capacity ? <Badge variant="secondary" className="ml-auto">{r.capacity} pess.</Badge> : null}
          </>
        )}
        onRemove={(r) => hook.remove.mutate(r.id)}
      />
    </div>
  );
}

function StepEquipment({ hook }: { hook: ReturnType<typeof useEquipment> }) {
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await hook.create.mutateAsync({ name: name.trim(), equipment_type: 'other' });
    setName('');
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Cadastre os equipamentos da clínica (mínimo 1).</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <Input placeholder="Nome (ex: Reformer 1)" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={handleAdd} disabled={!name.trim() || hook.create.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
      <ItemList
        items={hook.data ?? []}
        empty="Nenhum equipamento cadastrado"
        render={(e) => (
          <>
            <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{e.name}</span>
          </>
        )}
        onRemove={(e) => hook.remove.mutate(e.id)}
      />
    </div>
  );
}

function StepStaff({ clinicId, hook }: { clinicId: string; hook: ReturnType<typeof useClinicStaff> }) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'instructor' as 'instructor' | 'receptionist' | 'clinic_admin' });
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const handleInvite = async () => {
    if (!form.full_name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-staff', {
        body: { clinic_id: clinicId, full_name: form.full_name.trim(), email: form.email.trim(), role: form.role },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setCredentials({ email: (data as any).email, password: (data as any).password });
      setForm({ full_name: '', email: '', role: 'instructor' });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao convidar');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Convide pelo menos 1 professor. Recepcionistas e admins são opcionais.</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_180px_auto] gap-2">
        <Input placeholder="Nome completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <Input placeholder="email@exemplo.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="z-[300]">
            <SelectItem value="instructor">Professor</SelectItem>
            <SelectItem value="receptionist">Recepção</SelectItem>
            <SelectItem value="clinic_admin">Administrador</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleInvite} disabled={submitting || !form.full_name.trim() || !form.email.trim()}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Convidar</>}
        </Button>
      </div>

      {credentials && (
        <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4" /> Credenciais geradas
          </div>
          <div className="font-mono text-xs space-y-1">
            <div><span className="opacity-70">Email:</span> <strong>{credentials.email}</strong></div>
            <div><span className="opacity-70">Senha:</span> <strong>{credentials.password}</strong></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`Email: ${credentials.email}\nSenha: ${credentials.password}`); toast.success('Copiado'); }}>
              Copiar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCredentials(null)}>Fechar</Button>
          </div>
        </div>
      )}

      <ItemList
        items={(hook.data ?? []).map((m) => ({ ...m, id: `${m.user_id}-${m.role}` }))}
        empty="Nenhum membro convidado ainda"
        render={(m) => (
          <>
            <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="font-medium truncate">{m.name || m.email || '—'}</div>
              <div className="text-xs text-muted-foreground truncate">{m.email}</div>
            </div>
            <Badge variant="secondary" className="ml-auto capitalize text-[10px]">
              {m.role === 'clinic_admin' ? 'admin' : m.role === 'instructor' ? 'professor' : 'recepção'}
            </Badge>
          </>
        )}
      />
    </div>
  );
}

function StepPermissions({ hook, staff }: { hook: ReturnType<typeof useClinicPermissions>; staff: { user_id: string; role: string; name: string | null; email: string | null }[] }) {
  const rows = useMemo(() => staff.filter((s) => s.role !== 'clinic_admin'), [staff]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
        Cadastre professores ou recepção no passo anterior para configurar permissões.
        <br /><span className="text-xs">Administradores já têm acesso total automaticamente.</span>
      </div>
    );
  }

  const perms = hook.data ?? [];
  const PERMS = [
    { key: 'can_create_exercises' as const, label: 'Criar exercícios' },
    { key: 'can_create_sequences' as const, label: 'Criar sequências' },
    { key: 'can_prescribe_workouts' as const, label: 'Prescrever treinos' },
  ];

  const toggle = async (user_id: string, key: typeof PERMS[number]['key'], value: boolean, current: any) => {
    await hook.upsert.mutateAsync({
      user_id,
      can_create_exercises: current.can_create_exercises,
      can_create_sequences: current.can_create_sequences,
      can_prescribe_workouts: current.can_prescribe_workouts,
      [key]: value,
    } as any);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Para cada professor/recepção, escolha o que pode fazer. Padrão: professor tem tudo, recepção nenhum.</p>
      {rows.map((s) => {
        const p = perms.find((pp) => pp.user_id === s.user_id);
        const isInstructor = s.role === 'instructor';
        const current = {
          can_create_exercises: p?.can_create_exercises ?? isInstructor,
          can_create_sequences: p?.can_create_sequences ?? isInstructor,
          can_prescribe_workouts: p?.can_prescribe_workouts ?? isInstructor,
        };
        return (
          <div key={s.user_id} className="rounded-xl border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                {(s.name || s.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{s.name || s.email}</div>
                <div className="text-xs text-muted-foreground capitalize">{s.role === 'instructor' ? 'professor' : 'recepção'}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PERMS.map((perm) => (
                <label key={perm.key} className={`flex items-center justify-between gap-2 rounded-lg border p-2 cursor-pointer ${current[perm.key] ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}`}>
                  <span className="text-xs font-medium">{perm.label}</span>
                  <Switch checked={current[perm.key]} onCheckedChange={(v) => toggle(s.user_id, perm.key, v, current)} />
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepLevels({ hook }: { hook: ReturnType<typeof useSkillLevels> }) {
  const [name, setName] = useState('');
  const presets = ['Iniciante', 'Intermediário', 'Avançado', 'Reabilitação'];

  const handleAdd = async (label?: string) => {
    const final = (label ?? name).trim();
    if (!final) return;
    const rank = (hook.data?.length ?? 0) + 1;
    await hook.create.mutateAsync({ name: final, rank });
    if (!label) setName('');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Cadastre os níveis de habilidade dos alunos (mínimo 1).</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const exists = hook.data?.some((l) => l.name.toLowerCase() === p.toLowerCase());
          return (
            <Button
              key={p}
              variant="outline"
              size="sm"
              disabled={exists || hook.create.isPending}
              onClick={() => handleAdd(p)}
            >
              {exists ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Plus className="h-3 w-3 mr-1" />}
              {p}
            </Button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <Input placeholder="Nome do nível personalizado" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => handleAdd()} disabled={!name.trim() || hook.create.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
      <ItemList
        items={hook.data ?? []}
        empty="Nenhum nível cadastrado"
        render={(l) => (
          <>
            <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{l.name}</span>
            <Badge variant="secondary" className="ml-auto">#{l.rank}</Badge>
          </>
        )}
        onRemove={(l) => hook.remove.mutate(l.id)}
      />
    </div>
  );
}

const DAYS = [
  { idx: 1, label: 'Seg' },
  { idx: 2, label: 'Ter' },
  { idx: 3, label: 'Qua' },
  { idx: 4, label: 'Qui' },
  { idx: 5, label: 'Sex' },
  { idx: 6, label: 'Sáb' },
  { idx: 0, label: 'Dom' },
];

function StepGrade({
  clinicId, hook, rooms, equipment,
}: {
  clinicId: string;
  hook: ReturnType<typeof useBookableSlots>;
  rooms: { id: string; name: string }[];
  equipment: { id: string; name: string }[];
}) {
  const { user } = useAuth();
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState('07');
  const [endHour, setEndHour] = useState('20');
  const [duration, setDuration] = useState('50');
  const [breakMinutes, setBreakMinutes] = useState('10');
  const [roomId, setRoomId] = useState<string>(rooms[0]?.id ?? '');
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [creating, setCreating] = useState(false);
  // Período da grade
  const [noEndDate, setNoEndDate] = useState(false);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28); // default 4 semanas
    return d.toISOString().slice(0, 10);
  });
  // Lista de séries existentes
  const [series, setSeries] = useState<Array<{
    series_id: string;
    count: number;
    active_count: number;
    first: string;
    last: string;
    active: boolean;
  }>>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const loadSeries = async () => {
    setLoadingSeries(true);
    const { data } = await supabase
      .from('bookable_slots' as any)
      .select('series_id, scheduled_at, active')
      .eq('clinic_id', clinicId)
      .not('series_id', 'is', null)
      .order('scheduled_at', { ascending: true });
    const map = new Map<string, { count: number; active_count: number; first: string; last: string }>();
    (data ?? []).forEach((r: any) => {
      const k = r.series_id as string;
      const cur = map.get(k) ?? { count: 0, active_count: 0, first: r.scheduled_at, last: r.scheduled_at };
      cur.count += 1;
      if (r.active) cur.active_count += 1;
      if (r.scheduled_at < cur.first) cur.first = r.scheduled_at;
      if (r.scheduled_at > cur.last) cur.last = r.scheduled_at;
      map.set(k, cur);
    });
    setSeries(
      Array.from(map.entries()).map(([series_id, v]) => ({
        series_id, ...v, active: v.active_count > 0,
      })).sort((a, b) => b.last.localeCompare(a.last))
    );
    setLoadingSeries(false);
  };

  useEffect(() => { loadSeries(); }, [clinicId, hook.data?.length]);

  const suspendSeries = async (sid: string) => {
    const todayISO = new Date().toISOString();
    const { error } = await supabase
      .from('bookable_slots' as any)
      .update({ active: false })
      .eq('series_id', sid)
      .gte('scheduled_at', todayISO);
    if (error) { toast.error(error.message); return; }
    toast.success('Grade suspensa (futuras desativadas)');
    hook.refetch?.();
    loadSeries();
  };

  const reactivateSeries = async (sid: string) => {
    const todayISO = new Date().toISOString();
    const { error } = await supabase
      .from('bookable_slots' as any)
      .update({ active: true })
      .eq('series_id', sid)
      .gte('scheduled_at', todayISO);
    if (error) { toast.error(error.message); return; }
    toast.success('Grade reativada');
    hook.refetch?.();
    loadSeries();
  };

  const deleteSeries = async (sid: string) => {
    if (!confirm('Excluir todos os horários FUTUROS desta série? Os passados serão mantidos.')) return;
    const todayISO = new Date().toISOString();
    const { error } = await supabase
      .from('bookable_slots' as any)
      .delete()
      .eq('series_id', sid)
      .gte('scheduled_at', todayISO);
    if (error) { toast.error(error.message); return; }
    toast.success('Horários futuros excluídos');
    hook.refetch?.();
    loadSeries();
  };

  const extendSeries = async (sid: string) => {
    const ans = prompt('Estender até qual data? (YYYY-MM-DD)');
    if (!ans || !/^\d{4}-\d{2}-\d{2}$/.test(ans)) return;
    // Pega o template a partir do último slot da série
    const { data: lastSlots } = await supabase
      .from('bookable_slots' as any)
      .select('*')
      .eq('series_id', sid)
      .order('scheduled_at', { ascending: false })
      .limit(50);
    if (!lastSlots?.length || !user) return;
    // Reconstroi o padrão dia/hora a partir dos slots existentes da série
    const { data: allSlots } = await supabase
      .from('bookable_slots' as any)
      .select('scheduled_at, duration_minutes, room_id, equipment_id')
      .eq('series_id', sid)
      .order('scheduled_at', { ascending: true });
    if (!allSlots?.length) return;
    const lastDate = new Date((allSlots as any[])[allSlots.length - 1].scheduled_at);
    const targetEnd = new Date(ans + 'T23:59:59');
    if (targetEnd <= lastDate) { toast.error('Data deve ser depois do último slot atual'); return; }
    // Identifica o "padrão semanal": (dow, hh:mm, duration, room, equipment)
    const patterns = new Map<string, any>();
    (allSlots as any[]).slice(-50).forEach((s) => {
      const d = new Date(s.scheduled_at);
      const k = `${d.getDay()}|${d.getHours()}:${d.getMinutes()}`;
      if (!patterns.has(k)) patterns.set(k, { dow: d.getDay(), hh: d.getHours(), mm: d.getMinutes(), duration_minutes: s.duration_minutes, room_id: s.room_id, equipment_id: s.equipment_id });
    });
    const rows: any[] = [];
    const cursor = new Date(lastDate); cursor.setDate(cursor.getDate() + 1); cursor.setHours(0,0,0,0);
    while (cursor <= targetEnd) {
      patterns.forEach((p) => {
        if (p.dow === cursor.getDay()) {
          const sched = new Date(cursor);
          sched.setHours(p.hh, p.mm, 0, 0);
          rows.push({
            clinic_id: clinicId,
            scheduled_at: sched.toISOString(),
            duration_minutes: p.duration_minutes,
            room_id: p.room_id,
            equipment_id: p.equipment_id,
            instructor_id: null,
            capacity: 1,
            notes: null,
            created_by: user.id,
            series_id: sid,
            active: true,
          });
        }
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    if (rows.length === 0) { toast.error('Nada a estender'); return; }
    const { error } = await supabase.from('bookable_slots' as any).insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} horários adicionados`);
    hook.refetch?.();
    loadSeries();
  };

  const toggleEquipment = (id: string) =>
    setEquipmentIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  const filteredEquipment = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    if (!q) return equipment;
    return equipment.filter((e: any) =>
      e.name?.toLowerCase().includes(q) || e.equipment_type?.toLowerCase().includes(q)
    );
  }, [equipment, equipmentSearch]);

  useEffect(() => { if (!roomId && rooms[0]) setRoomId(rooms[0].id); }, [rooms, roomId]);

  const toggleDay = (d: number) => setDays((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);

  const handleGenerate = async () => {
    if (!user) return;
    if (days.length === 0) { toast.error('Escolha pelo menos um dia'); return; }
    const sh = Number(startHour), eh = Number(endHour), dur = Number(duration);
    const brk = Math.max(0, Number(breakMinutes) || 0);
    if (eh <= sh) { toast.error('Hora final deve ser maior que a inicial'); return; }
    if (dur <= 0) { toast.error('Duração inválida'); return; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let lastDate: Date;
    if (noEndDate) {
      lastDate = new Date(today);
      lastDate.setDate(lastDate.getDate() + 7 * 12); // 12 semanas, estende depois
    } else {
      if (!endDate) { toast.error('Defina a data final ou marque "sem data final"'); return; }
      lastDate = new Date(endDate + 'T23:59:59');
      if (lastDate < today) { toast.error('Data final deve ser hoje ou no futuro'); return; }
    }

    setCreating(true);
    try {
      const rows: any[] = [];
      const primaryEquipmentId = equipmentIds[0] ?? null;
      const stepMinutes = dur + brk;
      const dayMinutes = (eh - sh) * 60;
      const seriesId = (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

      const cursor = new Date(today);
      while (cursor <= lastDate) {
        if (days.includes(cursor.getDay())) {
          for (let offset = 0; offset + dur <= dayMinutes; offset += stepMinutes) {
            const sched = new Date(cursor);
            sched.setHours(sh, 0, 0, 0);
            sched.setMinutes(sched.getMinutes() + offset);
            rows.push({
              clinic_id: clinicId,
              scheduled_at: sched.toISOString(),
              duration_minutes: dur,
              equipment_id: primaryEquipmentId,
              instructor_id: null,
              room_id: roomId || null,
              capacity: Math.max(1, equipmentIds.length || 1),
              notes: null,
              created_by: user.id,
              series_id: seriesId,
              active: true,
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      if (rows.length === 0) { toast.error('Nenhum horário para este período'); setCreating(false); return; }

      const { data: insertedSlots, error } = await supabase
        .from('bookable_slots' as any)
        .insert(rows)
        .select('id');
      if (error) throw error;

      if (equipmentIds.length > 1 && insertedSlots?.length) {
        const links = (insertedSlots as any[]).flatMap((s) =>
          equipmentIds.map((eid) => ({
            clinic_id: clinicId,
            bookable_slot_id: s.id,
            equipment_id: eid,
            created_by: user.id,
          }))
        );
        const { error: linkErr } = await supabase.from('bookable_slot_equipment' as any).insert(links);
        if (linkErr) throw linkErr;
      }

      toast.success(`${rows.length} horários criados${noEndDate ? ' (12 semanas — estenda depois)' : ''}`);
      hook.refetch?.();
      loadSeries();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar grade');
    } finally { setCreating(false); }
  };

  const totalSlots = hook.data?.length ?? 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Defina os horários fixos da semana e até quando devem ser gerados. Você pode suspender, estender ou excluir uma grade depois.</p>

      <div className="rounded-xl border p-4 space-y-4 bg-muted/20">
        <div>
          <Label className="text-xs uppercase tracking-wide">Dias da semana</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DAYS.map((d) => {
              const active = days.includes(d.idx);
              return (
                <button
                  key={d.idx}
                  type="button"
                  onClick={() => toggleDay(d.idx)}
                  className={`h-10 w-12 rounded-xl border text-sm font-semibold transition ${
                    active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="number" min={5} max={22} value={startHour} onChange={(e) => setStartHour(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="number" min={6} max={23} value={endHour} onChange={(e) => setEndHour(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Duração (min)</Label>
            <Input type="number" min={20} max={120} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Intervalo (min)</Label>
            <Input type="number" min={0} max={60} value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
          </div>
        </div>

        {/* Período da grade */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs uppercase tracking-wide">Período</Label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Switch checked={noEndDate} onCheckedChange={setNoEndDate} />
              <span>Sem data de término</span>
            </label>
          </div>
          {!noEndDate ? (
            <div>
              <Label className="text-xs text-muted-foreground">Gerar até</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">A grade será criada de hoje até esta data.</p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Serão gerados horários para as próximas <strong>12 semanas</strong>. Use "Estender" abaixo quando precisar de mais.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Sala</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="z-[300]">
                {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Equipamentos</Label>
              {equipment.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-[11px] font-medium text-primary hover:underline"
                    onClick={() => setEquipmentIds(equipment.map((e: any) => e.id))}
                  >
                    Selecionar todos
                  </button>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-muted-foreground hover:underline"
                    onClick={() => setEquipmentIds([])}
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            {equipment.length === 0 ? (
              <div className="text-xs text-muted-foreground mt-2">Nenhum equipamento cadastrado. Será "qualquer".</div>
            ) : (
              <>
                <div className="relative mt-2">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    placeholder={`Buscar entre ${equipment.length} equipamentos…`}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                {equipmentIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {equipmentIds.map((id) => {
                      const e = equipment.find((x: any) => x.id === id);
                      if (!e) return null;
                      return (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                          {e.name}
                          <button
                            type="button"
                            onClick={() => toggleEquipment(id)}
                            className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border divide-y">
                  {filteredEquipment.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground p-3 text-center">
                      Nenhum equipamento encontrado.
                    </div>
                  ) : (
                    filteredEquipment.map((e: any) => {
                      const active = equipmentIds.includes(e.id);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => toggleEquipment(e.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition ${
                            active ? 'bg-primary/10' : 'hover:bg-muted/50'
                          }`}
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            active ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                          }`}>
                            {active && <Check className="h-3 w-3" />}
                          </span>
                          <span className="font-medium truncate flex-1">{e.name}</span>
                          {e.equipment_type && (
                            <span className="text-[10px] text-muted-foreground uppercase">{e.equipment_type}</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}

            <div className="text-[11px] text-muted-foreground mt-1">
              {equipmentIds.length === 0
                ? 'Nenhum selecionado → "qualquer" (definir depois)'
                : `${equipmentIds.length} equipamento(s) por horário · capacidade = ${equipmentIds.length}`}
            </div>
          </div>

        </div>

        <Button onClick={handleGenerate} disabled={creating} className="w-full">
          {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-1" />}
          Gerar grade
        </Button>
      </div>

      <div className="rounded-xl border p-3 flex items-center gap-3 bg-card">
        <CalendarDays className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{totalSlots} horários ativos</div>
          <div className="text-xs text-muted-foreground">na grade master atual</div>
        </div>
        {totalSlots > 0 && <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"><Check className="h-3 w-3" /></Badge>}
      </div>

      {/* Séries existentes */}
      {series.length > 0 && (
        <div className="rounded-xl border p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Grades geradas</div>
            <span className="text-[11px] text-muted-foreground">{series.length} série(s)</span>
          </div>
          <div className="space-y-1.5">
            {series.map((s) => {
              const first = new Date(s.first);
              const last = new Date(s.last);
              return (
                <div key={s.series_id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {first.toLocaleDateString('pt-BR')} → {last.toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.active_count} de {s.count} ativos
                    </div>
                  </div>
                  {s.active ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Ativa</Badge>
                  ) : (
                    <Badge variant="secondary">Suspensa</Badge>
                  )}
                  <div className="flex gap-1 ml-auto">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => extendSeries(s.series_id)}>
                      Estender
                    </Button>
                    {s.active ? (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => suspendSeries(s.series_id)}>
                        Suspender
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => reactivateSeries(s.series_id)}>
                        Reativar
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSeries(s.series_id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {loadingSeries && <div className="text-[11px] text-muted-foreground">Carregando…</div>}
        </div>
      )}
    </div>
  );
}

function StepRules({ hook }: { hook: ReturnType<typeof useClinicSettings> }) {
  const [cancelHours, setCancelHours] = useState<string>('');
  const [openDays, setOpenDays] = useState<string>('');

  useEffect(() => {
    if (hook.data) {
      setCancelHours(String(hook.data.cancellation_min_hours ?? 6));
      setOpenDays(String(hook.data.booking_open_days_ahead ?? 30));
    } else {
      setCancelHours('6'); setOpenDays('30');
    }
  }, [hook.data]);

  const handleSave = async () => {
    await hook.upsert.mutateAsync({
      cancellation_min_hours: Number(cancelHours) || 6,
      booking_open_days_ahead: Number(openDays) || 30,
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Defina regras de cancelamento e visibilidade do agendamento.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Cancelamento mínimo (horas antes)</Label>
          <Input type="number" min={0} value={cancelHours} onChange={(e) => setCancelHours(e.target.value)} />
          <p className="text-[11px] text-muted-foreground mt-1">Aluno só pode cancelar se faltar mais que isso para a aula.</p>
        </div>
        <div>
          <Label>Booking aberto (dias à frente)</Label>
          <Input type="number" min={1} value={openDays} onChange={(e) => setOpenDays(e.target.value)} />
          <p className="text-[11px] text-muted-foreground mt-1">Quantos dias o aluno pode ver e marcar à frente.</p>
        </div>
      </div>
      <Button onClick={handleSave} disabled={hook.upsert.isPending}>
        {hook.upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar regras'}
      </Button>
    </div>
  );
}

/* ====================== Helpers ====================== */

function ItemList<T extends { id: string }>({
  items, empty, render, onRemove,
}: {
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
  onRemove?: (item: T) => void;
}) {
  if (!items.length) {
    return <div className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          {render(item)}
          {onRemove && (
            <Button size="icon" variant="ghost" className="h-7 w-7 ml-1 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemove(item)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
