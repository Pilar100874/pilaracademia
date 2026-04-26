import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useStudents, useSkillLevels, usePrescriptions, useSequences, useEquipment } from '@/hooks/useClinicData';
import { useMyClinicPermissions } from '@/hooks/useClinicPermissions';
import { useRecurringSchedules } from '@/hooks/useRecurringSchedules';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, User, Trash2, ChevronRight, Activity, Calendar, KeyRound, Copy, Camera, HeartPulse, Save, Repeat, FileText, LogIn, Settings, Search, Users as UsersIcon } from 'lucide-react';
import { impersonate } from '@/lib/impersonation';
import { StudentInstructorsManager } from '@/components/StudentInstructorsManager';
import { useMyStudentIds } from '@/hooks/useStaff';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { materializeStudentRecurring } from '@/lib/materializeRecurring';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function StudentsPage() {
  const { activeClinicId, isAdmin, isInstructor } = useUserRoles();
  const { data: myPerms } = useMyClinicPermissions();
  const canPrescribe = myPerms?.can_prescribe_workouts ?? false;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: students = [], create, remove, update } = useStudents(activeClinicId);
  const { data: levels = [] } = useSkillLevels(activeClinicId);
  const { data: sequences = [] } = useSequences(activeClinicId);
  const { create: createPresc } = usePrescriptions({ clinicId: activeClinicId });
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: recurring = [], create: createRec, remove: removeRec } = useRecurringSchedules(activeClinicId);

  // Setting: allow_login_as_student (clinic admin only can toggle)
  const { data: clinicSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['clinic-settings', activeClinicId],
    enabled: !!activeClinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_settings')
        .select('clinic_id, allow_login_as_student')
        .eq('clinic_id', activeClinicId!)
        .maybeSingle();
      if (error) throw error;
      return data as { clinic_id: string; allow_login_as_student: boolean } | null;
    },
  });
  const allowLoginAsStudent = clinicSettings?.allow_login_as_student === true;

  const toggleAllowLoginAsStudent = async (next: boolean) => {
    if (!activeClinicId || !user) return;
    const { error } = await supabase
      .from('clinic_settings')
      .upsert({ clinic_id: activeClinicId, allow_login_as_student: next }, { onConflict: 'clinic_id' });
    if (error) { toast.error(error.message); return; }
    toast.success(next ? 'Recurso ativado' : 'Recurso desativado');
    refetchSettings();
  };

  const handleImpersonateStudent = async (studentId: string, name: string) => {
    try {
      toast.loading('Entrando como aluno...', { id: 'imp-st' });
      await impersonate(
        { mode: 'clinic_to_student', studentId },
        `Você está logado como ${name}`,
      );
      toast.success('Logado como aluno', { id: 'imp-st' });
      navigate('/');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao entrar como aluno', { id: 'imp-st' });
    }
  };

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', skill_level_id: '', notes: '' });
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const { data: myStudentIds } = useMyStudentIds(activeClinicId, user?.id);

  // Prescriptions for selected
  const { data: studentPrescs = [] } = useQuery({
    queryKey: ['prescriptions', activeClinicId, selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*, exercise_sequences(name)')
        .eq('student_id', selectedStudent)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedStudent,
  });

  // Execution log
  const { data: log = [] } = useQuery({
    queryKey: ['execution-log', selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const { data, error } = await supabase
        .from('execution_log')
        .select('*')
        .eq('student_id', selectedStudent)
        .order('performed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedStudent,
  });

  const [prescOpen, setPrescOpen] = useState(false);
  const [prescSeq, setPrescSeq] = useState('');
  const [prescContext, setPrescContext] = useState<'in_class' | 'at_home'>('in_class');

  const handleCreate = async () => {
    await create.mutateAsync({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      skill_level_id: form.skill_level_id || null,
      notes: form.notes,
    });
    setForm({ full_name: '', email: '', phone: '', skill_level_id: '', notes: '' });
    setOpen(false);
  };

  const handlePrescribe = async () => {
    if (!selectedStudent || !prescSeq || !user || !activeClinicId) return;
    await createPresc.mutateAsync({
      clinic_id: activeClinicId,
      student_id: selectedStudent,
      sequence_id: prescSeq,
      context: prescContext,
      created_by: user.id,
    });
    setPrescSeq('');
    setPrescOpen(false);
  };

  const current = students.find((s) => s.id === selectedStudent);
  const currentLevel = levels.find((l) => l.id === current?.skill_level_id);

  const compatibleSequences = sequences.filter((s) => !current?.skill_level_id || !s.skill_level_id || s.skill_level_id === current.skill_level_id);

  const [inviteResult, setInviteResult] = useState<{ email: string; password: string } | null>(null);
  const [inviting, setInviting] = useState(false);

  const handleGenerateAccess = async () => {
    if (!current || !activeClinicId) return;
    if (!current.email) { toast.error('Aluno não tem e-mail cadastrado'); return; }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-student', {
        body: { student_id: current.id, clinic_id: activeClinicId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setInviteResult({ email: (data as any).email, password: (data as any).password });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar acesso');
    } finally {
      setInviting(false);
    }
  };

  // Upload de foto
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !current) return;
    const ext = file.name.split('.').pop();
    const path = `${current.clinic_id}/${current.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('student-avatars').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from('student-avatars').getPublicUrl(path);
    update.mutate({ id: current.id, avatar_url: data.publicUrl } as any);
    toast.success('Foto atualizada');
  };

  // Anamnese form
  const [anamneseOpen, setAnamneseOpen] = useState(false);
  const [anamnese, setAnamnese] = useState<any>({});
  const openAnamnese = () => {
    setAnamnese({
      birth_date: current?.birth_date || '',
      weight_kg: (current as any)?.weight_kg || '',
      height_cm: (current as any)?.height_cm || '',
      injuries: (current as any)?.injuries || '',
      restrictions: (current as any)?.restrictions || '',
      medical_conditions: (current as any)?.medical_conditions || '',
      medications: (current as any)?.medications || '',
      goals: (current as any)?.goals || '',
      emergency_contact_name: (current as any)?.emergency_contact_name || '',
      emergency_contact_phone: (current as any)?.emergency_contact_phone || '',
      notes: current?.notes || '',
    });
    setAnamneseOpen(true);
  };
  const saveAnamnese = async () => {
    if (!current) return;
    const payload: any = { id: current.id, ...anamnese };
    // Converter strings vazias em null para campos numéricos/data
    payload.weight_kg = payload.weight_kg === '' ? null : Number(payload.weight_kg);
    payload.height_cm = payload.height_cm === '' ? null : Number(payload.height_cm);
    payload.birth_date = payload.birth_date || null;
    await update.mutateAsync(payload);
    setAnamneseOpen(false);
    toast.success('Ficha atualizada');
  };

  // Horários fixos
  const [recOpen, setRecOpen] = useState(false);
  const [recForm, setRecForm] = useState({ day_of_week: 1, start_time: '08:00', duration_minutes: 50, equipment_id: '' });
  const studentRecs = recurring.filter((r) => r.student_id === selectedStudent);
  const addRecurring = async () => {
    if (!current || !activeClinicId || !user) return;
    await createRec.mutateAsync({
      clinic_id: activeClinicId,
      student_id: current.id,
      instructor_id: user.id,
      equipment_id: recForm.equipment_id || null,
      day_of_week: recForm.day_of_week,
      start_time: recForm.start_time + ':00',
      duration_minutes: recForm.duration_minutes,
      created_by: user.id,
    } as any);
    setRecForm({ day_of_week: 1, start_time: '08:00', duration_minutes: 50, equipment_id: '' });

    // Materializa este horário fixo dentro do período do contrato
    try {
      const created = await materializeStudentRecurring({
        clinic_id: activeClinicId,
        student: {
          id: current.id,
          contract_type: (current as any).contract_type,
          contract_start_date: (current as any).contract_start_date,
          contract_end_date: (current as any).contract_end_date,
        },
        recurring: [{
          id: '', // será preenchido pelo banco; aqui só importa para o filtro de duplicatas
          day_of_week: recForm.day_of_week,
          start_time: recForm.start_time + ':00',
          duration_minutes: recForm.duration_minutes,
          equipment_id: recForm.equipment_id || null,
          instructor_id: user.id,
          notes: null,
        }],
        created_by: user.id,
      });
      if (created > 0) toast.success(`${created} aula(s) reservada(s) na agenda`);
    } catch (e: any) {
      console.error(e);
    }
  };

  // Contrato
  const [contractOpen, setContractOpen] = useState(false);
  const [contract, setContract] = useState<any>({});
  const openContract = () => {
    setContract({
      contract_type: (current as any)?.contract_type || 'open',
      contract_classes_total: (current as any)?.contract_classes_total ?? '',
      contract_classes_used: (current as any)?.contract_classes_used ?? 0,
      contract_start_date: (current as any)?.contract_start_date || '',
      contract_end_date: (current as any)?.contract_end_date || '',
    });
    setContractOpen(true);
  };
  const saveContract = async () => {
    if (!current) return;
    const payload: any = { id: current.id, contract_type: contract.contract_type };
    if (contract.contract_type === 'classes') {
      payload.contract_classes_total = contract.contract_classes_total === '' ? null : Number(contract.contract_classes_total);
      payload.contract_classes_used = Number(contract.contract_classes_used) || 0;
      payload.contract_start_date = null;
      payload.contract_end_date = null;
    } else if (contract.contract_type === 'period') {
      payload.contract_start_date = contract.contract_start_date || null;
      payload.contract_end_date = contract.contract_end_date || null;
      payload.contract_classes_total = null;
    } else {
      payload.contract_classes_total = null;
      payload.contract_start_date = null;
      payload.contract_end_date = null;
    }
    await update.mutateAsync(payload);
    setContractOpen(false);
    toast.success('Contrato atualizado');

    // Reserva automaticamente os horários fixos no período do contrato
    if (activeClinicId && user && studentRecs.length > 0) {
      try {
        const merged = { ...current, ...payload };
        const created = await materializeStudentRecurring({
          clinic_id: activeClinicId,
          student: {
            id: current.id,
            contract_type: merged.contract_type,
            contract_start_date: merged.contract_start_date,
            contract_end_date: merged.contract_end_date,
          },
          recurring: studentRecs.map((r) => ({
            id: r.id,
            day_of_week: r.day_of_week,
            start_time: r.start_time,
            duration_minutes: r.duration_minutes,
            equipment_id: r.equipment_id,
            instructor_id: r.instructor_id,
            notes: r.notes,
          })),
          created_by: user.id,
        });
        if (created > 0) toast.success(`${created} aula(s) reservada(s) na agenda`);
      } catch (e: any) {
        console.error(e);
      }
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full overflow-x-hidden pb-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-sm text-muted-foreground">Cadastre alunos e acompanhe sua evolução.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Cadastrar aluno</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo aluno</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="text-sm">Nome completo</label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><label className="text-sm">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="aluno@email.com" /></div>
              <div><label className="text-sm">Telefone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <label className="text-sm">Nível inicial</label>
                <Select value={form.skill_level_id} onValueChange={(v) => setForm({ ...form, skill_level_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm">Observações</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">O aluno se cadastra no app com este e-mail e fica vinculado automaticamente.</p>
              <Button onClick={handleCreate} disabled={!form.full_name.trim() || create.isPending} className="w-full">Cadastrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isAdmin && (
        <Card className="p-3 flex items-center justify-between gap-3 flex-wrap bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Permitir entrar como aluno</div>
              <div className="text-xs text-muted-foreground">
                Quando ativo, equipe (admin/instrutor/recepcionista) pode visualizar a tela do aluno entrando na conta dele temporariamente.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant={allowLoginAsStudent ? 'default' : 'outline'}
            onClick={() => toggleAllowLoginAsStudent(!allowLoginAsStudent)}
          >
            {allowLoginAsStudent ? 'Ativado' : 'Ativar'}
          </Button>
        </Card>
      )}

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        {/* Lista */}
        <Card className="p-2 max-h-[70vh] overflow-y-auto">
          <div className="p-2 space-y-2 sticky top-0 bg-card z-10">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar aluno..."
                className="pl-8 h-9"
              />
            </div>
            {(isInstructor || isAdmin) && (myStudentIds?.size ?? 0) > 0 && (
              <Button
                size="sm"
                variant={onlyMine ? 'default' : 'outline'}
                className="w-full h-8"
                onClick={() => setOnlyMine((v) => !v)}
              >
                <UsersIcon className="h-3.5 w-3.5 mr-1" />
                {onlyMine ? `Meus alunos (${myStudentIds?.size ?? 0})` : 'Mostrar só meus alunos'}
              </Button>
            )}
          </div>
          {(() => {
            const term = search.trim().toLowerCase();
            const filtered = students.filter((s) => {
              if (onlyMine && myStudentIds && !myStudentIds.has(s.id)) return false;
              if (!term) return true;
              return (
                s.full_name.toLowerCase().includes(term) ||
                (s.email || '').toLowerCase().includes(term)
              );
            });
            if (filtered.length === 0) {
              return (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  {students.length === 0 ? 'Nenhum aluno.' : 'Nenhum aluno encontrado.'}
                </div>
              );
            }
            return filtered.map((s) => {
              const lv = levels.find((l) => l.id === s.skill_level_id);
              const isMine = myStudentIds?.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s.id)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-2 hover:bg-muted ${selectedStudent === s.id ? 'bg-muted' : ''}`}
                >
                  {(s as any).avatar_url ? (
                    <img src={(s as any).avatar_url} alt={s.full_name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-1">
                      {s.full_name}
                      {isMine && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">meu</Badge>}
                    </div>
                    {lv && <div className="text-xs text-muted-foreground">{lv.name}</div>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            });
          })()}
        </Card>

        {/* Detalhe */}
        <div className="space-y-4">
          {!current ? (
            <Card className="p-8 text-center text-muted-foreground">Selecione um aluno para ver detalhes.</Card>
          ) : (
            <>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <label className="relative cursor-pointer group">
                      {(current as any).avatar_url ? (
                        <img src={(current as any).avatar_url} alt={current.full_name} className="h-20 w-20 rounded-full object-cover" />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
                          {current.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                    <div>
                      <h2 className="text-xl font-bold">{current.full_name}</h2>
                      <p className="text-sm text-muted-foreground">{current.email || 'Sem email'} {current.phone ? `· ${current.phone}` : ''}</p>
                      {currentLevel && <Badge className="mt-2" style={{ backgroundColor: currentLevel.color || undefined }}>{currentLevel.name}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="outline" size="sm" onClick={openAnamnese}>
                      <HeartPulse className="h-3.5 w-3.5 mr-1" />Ficha clínica
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRecOpen(true)}>
                      <Repeat className="h-3.5 w-3.5 mr-1" />Horários fixos {studentRecs.length > 0 && `(${studentRecs.length})`}
                    </Button>
                    <Button variant="outline" size="sm" onClick={openContract}>
                      <FileText className="h-3.5 w-3.5 mr-1" />Contrato
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerateAccess} disabled={inviting || !current.email}>
                      <KeyRound className="h-3.5 w-3.5 mr-1" />{current.user_id ? 'Resetar senha' : 'Gerar acesso'}
                    </Button>
                    {allowLoginAsStudent && current.user_id && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleImpersonateStudent(current.id, current.full_name)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <LogIn className="h-3.5 w-3.5 mr-1" />Entrar como aluno
                      </Button>
                    )}
                    <Select value={current.skill_level_id || ''} onValueChange={(v) => update.mutate({ id: current.id, skill_level_id: v })}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Nível" /></SelectTrigger>
                      <SelectContent>{levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => { remove.mutate(current.id); setSelectedStudent(null); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                {/* Professores fixos */}
                {activeClinicId && (
                  <div className="mt-4 p-3 rounded-lg border bg-muted/30">
                    <StudentInstructorsManager clinicId={activeClinicId} studentId={current.id} />
                  </div>
                )}

                {(current as any).contract_type && (current as any).contract_type !== 'open' && (
                  <div className="mt-4 p-3 rounded-lg border bg-muted/40 text-sm flex items-center justify-between flex-wrap gap-2">
                    {(current as any).contract_type === 'classes' ? (
                      <span><b>Pacote:</b> {(current as any).contract_classes_used || 0} / {(current as any).contract_classes_total || 0} aulas usadas</span>
                    ) : (
                      <span><b>Período:</b> {(current as any).contract_start_date || '—'} → {(current as any).contract_end_date || '—'}</span>
                    )}
                  </div>
                )}

                {/* Resumo da ficha */}
                {((current as any).injuries || (current as any).restrictions || (current as any).medical_conditions) && (
                  <div className="mt-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm space-y-1">
                    {(current as any).injuries && <div><b>Lesões:</b> {(current as any).injuries}</div>}
                    {(current as any).restrictions && <div><b>Restrições:</b> {(current as any).restrictions}</div>}
                    {(current as any).medical_conditions && <div><b>Condições:</b> {(current as any).medical_conditions}</div>}
                    {(current as any).medications && <div><b>Medicações:</b> {(current as any).medications}</div>}
                  </div>
                )}

                <Dialog open={!!inviteResult} onOpenChange={(o) => !o && setInviteResult(null)}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Acesso gerado ✓</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Entregue estas credenciais ao aluno. Ele será obrigado a trocar a senha no primeiro acesso.</p>
                      <div className="p-3 rounded bg-muted font-mono text-sm space-y-1">
                        <div className="flex items-center justify-between gap-2"><span className="opacity-70">Email:</span><span className="font-bold">{inviteResult?.email}</span></div>
                        <div className="flex items-center justify-between gap-2"><span className="opacity-70">Senha:</span><span className="font-bold">{inviteResult?.password}</span></div>
                      </div>
                      <Button className="w-full" onClick={() => { navigator.clipboard.writeText(`Email: ${inviteResult?.email}\nSenha: ${inviteResult?.password}`); toast.success('Copiado!'); }}>
                        <Copy className="h-4 w-4 mr-1" />Copiar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Dialog Anamnese */}
                <Dialog open={anamneseOpen} onOpenChange={setAnamneseOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Ficha clínica · {current.full_name}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="text-xs">Nascimento</label><Input type="date" value={anamnese.birth_date || ''} onChange={(e) => setAnamnese({ ...anamnese, birth_date: e.target.value })} /></div>
                        <div><label className="text-xs">Peso (kg)</label><Input type="number" step="0.1" value={anamnese.weight_kg ?? ''} onChange={(e) => setAnamnese({ ...anamnese, weight_kg: e.target.value })} /></div>
                        <div><label className="text-xs">Altura (cm)</label><Input type="number" value={anamnese.height_cm ?? ''} onChange={(e) => setAnamnese({ ...anamnese, height_cm: e.target.value })} /></div>
                      </div>
                      <div><label className="text-xs">Lesões / cirurgias</label><Textarea rows={2} value={anamnese.injuries || ''} onChange={(e) => setAnamnese({ ...anamnese, injuries: e.target.value })} placeholder="Hérnia de disco L4-L5, cirurgia de joelho 2022..." /></div>
                      <div><label className="text-xs">Restrições / contraindicações</label><Textarea rows={2} value={anamnese.restrictions || ''} onChange={(e) => setAnamnese({ ...anamnese, restrictions: e.target.value })} placeholder="Não fazer flexão de coluna, evitar carga axial..." /></div>
                      <div><label className="text-xs">Condições médicas</label><Textarea rows={2} value={anamnese.medical_conditions || ''} onChange={(e) => setAnamnese({ ...anamnese, medical_conditions: e.target.value })} placeholder="Hipertensão, diabetes tipo 2..." /></div>
                      <div><label className="text-xs">Medicações em uso</label><Textarea rows={2} value={anamnese.medications || ''} onChange={(e) => setAnamnese({ ...anamnese, medications: e.target.value })} /></div>
                      <div><label className="text-xs">Objetivos</label><Textarea rows={2} value={anamnese.goals || ''} onChange={(e) => setAnamnese({ ...anamnese, goals: e.target.value })} placeholder="Aliviar dor lombar, ganhar mobilidade..." /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs">Contato emergência</label><Input value={anamnese.emergency_contact_name || ''} onChange={(e) => setAnamnese({ ...anamnese, emergency_contact_name: e.target.value })} /></div>
                        <div><label className="text-xs">Telefone emergência</label><Input value={anamnese.emergency_contact_phone || ''} onChange={(e) => setAnamnese({ ...anamnese, emergency_contact_phone: e.target.value })} /></div>
                      </div>
                      <div><label className="text-xs">Observações gerais</label><Textarea rows={2} value={anamnese.notes || ''} onChange={(e) => setAnamnese({ ...anamnese, notes: e.target.value })} /></div>
                      <Button onClick={saveAnamnese} className="w-full"><Save className="h-4 w-4 mr-1" />Salvar ficha</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Dialog Horários fixos */}
                <Dialog open={recOpen} onOpenChange={setRecOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Horários fixos · {current.full_name}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {studentRecs.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhum horário fixo. Esse aluno é avulso.</p>
                        ) : studentRecs.map((r) => {
                          const eq = equipment.find((e) => e.id === r.equipment_id);
                          return (
                            <div key={r.id} className="flex items-center justify-between p-2 rounded border text-sm">
                              <div>
                                <span className="font-medium">{DAY_NAMES[r.day_of_week]}</span> · {r.start_time.slice(0, 5)} · {r.duration_minutes}min
                                {eq && <span className="text-muted-foreground"> · {eq.name}</span>}
                              </div>
                              <Button size="icon" variant="ghost" onClick={() => removeRec.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Adicionar horário</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs">Dia</label>
                            <Select value={String(recForm.day_of_week)} onValueChange={(v) => setRecForm({ ...recForm, day_of_week: parseInt(v) })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div><label className="text-xs">Hora</label><Input type="time" value={recForm.start_time} onChange={(e) => setRecForm({ ...recForm, start_time: e.target.value })} /></div>
                          <div><label className="text-xs">Min</label><Input type="number" value={recForm.duration_minutes} onChange={(e) => setRecForm({ ...recForm, duration_minutes: parseInt(e.target.value) || 50 })} /></div>
                        </div>
                        <div>
                          <label className="text-xs">Equipamento (opcional)</label>
                          <Select value={recForm.equipment_id} onValueChange={(v) => setRecForm({ ...recForm, equipment_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                            <SelectContent>{equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <Button onClick={addRecurring} className="w-full"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Dialog Contrato */}
                <Dialog open={contractOpen} onOpenChange={setContractOpen}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Contrato · {current.full_name}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm">Tipo de contrato</label>
                        <Select value={contract.contract_type} onValueChange={(v) => setContract({ ...contract, contract_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto (sem limite)</SelectItem>
                            <SelectItem value="classes">Pacote de aulas</SelectItem>
                            <SelectItem value="period">Por período (mensal/trimestral)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {contract.contract_type === 'classes' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs">Total de aulas</label>
                            <Input type="number" min={0} value={contract.contract_classes_total ?? ''} onChange={(e) => setContract({ ...contract, contract_classes_total: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs">Já usadas</label>
                            <Input type="number" min={0} value={contract.contract_classes_used ?? 0} onChange={(e) => setContract({ ...contract, contract_classes_used: e.target.value })} />
                          </div>
                          <p className="col-span-2 text-xs text-muted-foreground">O sistema desconta automaticamente a cada agendamento e devolve no cancelamento.</p>
                        </div>
                      )}

                      {contract.contract_type === 'period' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs">Início</label><Input type="date" value={contract.contract_start_date || ''} onChange={(e) => setContract({ ...contract, contract_start_date: e.target.value })} /></div>
                          <div><label className="text-xs">Fim</label><Input type="date" value={contract.contract_end_date || ''} onChange={(e) => setContract({ ...contract, contract_end_date: e.target.value })} /></div>
                          <p className="col-span-2 text-xs text-muted-foreground">Bloqueia agendamentos fora do intervalo.</p>
                        </div>
                      )}

                      <Button onClick={saveContract} className="w-full"><Save className="h-4 w-4 mr-1" />Salvar contrato</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4" />Prescrições</h3>
                  {canPrescribe && (
                  <Dialog open={prescOpen} onOpenChange={setPrescOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Prescrever</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nova prescrição para {current.full_name}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm">Sequência ({compatibleSequences.length} compatíveis com o nível)</label>
                          <Select value={prescSeq} onValueChange={setPrescSeq}>
                            <SelectTrigger><SelectValue placeholder="Escolher sequência" /></SelectTrigger>
                            <SelectContent>{compatibleSequences.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm">Contexto</label>
                          <Select value={prescContext} onValueChange={(v: any) => setPrescContext(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in_class">Aula presencial</SelectItem>
                              <SelectItem value="at_home">Para casa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handlePrescribe} disabled={!prescSeq} className="w-full">Prescrever</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  )}
                </div>
                {studentPrescs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma prescrição.</p>
                ) : (
                  <div className="space-y-2">
                    {studentPrescs.slice(0, 8).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted">
                        <div>
                          <div className="font-medium">{p.exercise_sequences?.name || 'Sequência'}</div>
                          <div className="text-xs text-muted-foreground">{p.context === 'in_class' ? 'Presencial' : 'Para casa'} · {format(new Date(p.created_at), 'dd/MM/yyyy')}</div>
                        </div>
                        <Badge variant={p.status === 'completed' ? 'default' : 'secondary'}>{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" />Evolução (últimas execuções)</h3>
                {log.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum exercício executado ainda.</p>
                ) : (
                  <div className="space-y-1">
                    {log.slice(0, 20).map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                        <span>{l.exercise_name}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(l.performed_at), 'dd/MM HH:mm')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
