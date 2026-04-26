import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useStudents, useSkillLevels, usePrescriptions, useSequences } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, User, Trash2, ChevronRight, Activity, Calendar, KeyRound, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function StudentsPage() {
  const { activeClinicId } = useUserRoles();
  const { user } = useAuth();
  const { data: students = [], create, remove, update } = useStudents(activeClinicId);
  const { data: levels = [] } = useSkillLevels(activeClinicId);
  const { data: sequences = [] } = useSequences(activeClinicId);
  const { create: createPresc } = usePrescriptions({ clinicId: activeClinicId });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', skill_level_id: '', notes: '' });
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

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

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
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

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        {/* Lista */}
        <Card className="p-2 max-h-[70vh] overflow-y-auto">
          {students.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm"><User className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum aluno.</div>
          ) : (
            students.map((s) => {
              const lv = levels.find((l) => l.id === s.skill_level_id);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s.id)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-2 hover:bg-muted ${selectedStudent === s.id ? 'bg-muted' : ''}`}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {s.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.full_name}</div>
                    {lv && <div className="text-xs text-muted-foreground">{lv.name}</div>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })
          )}
        </Card>

        {/* Detalhe */}
        <div className="space-y-4">
          {!current ? (
            <Card className="p-8 text-center text-muted-foreground">Selecione um aluno para ver detalhes.</Card>
          ) : (
            <>
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{current.full_name}</h2>
                    <p className="text-sm text-muted-foreground">{current.email || 'Sem email'} {current.phone ? `· ${current.phone}` : ''}</p>
                    {currentLevel && <Badge className="mt-2" style={{ backgroundColor: currentLevel.color || undefined }}>{currentLevel.name}</Badge>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={handleGenerateAccess} disabled={inviting || !current.email}>
                      <KeyRound className="h-3.5 w-3.5 mr-1" />{current.user_id ? 'Resetar senha' : 'Gerar acesso'}
                    </Button>
                    <Select value={current.skill_level_id || ''} onValueChange={(v) => update.mutate({ id: current.id, skill_level_id: v })}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Nível" /></SelectTrigger>
                      <SelectContent>{levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => { remove.mutate(current.id); setSelectedStudent(null); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <Dialog open={!!inviteResult} onOpenChange={(o) => !o && setInviteResult(null)}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Acesso gerado ✓</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Entregue estas credenciais ao aluno. Ele pode trocar a senha depois.</p>
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
                {current.notes && <p className="text-sm mt-3 p-3 bg-muted/50 rounded">{current.notes}</p>}
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4" />Prescrições</h3>
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
