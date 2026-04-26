import { useEffect, useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useStudents, useSequences, useEquipment, useSkillLevels } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Play, Square, ChevronRight, Sparkles, Plus, X, MessageCircle } from 'lucide-react';
import { ShareSequenceDialog } from '@/components/ShareSequenceDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function LiveSessionPage() {
  const { activeClinicId } = useUserRoles();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: students = [] } = useStudents(activeClinicId);
  const { data: sequences = [] } = useSequences(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: levels = [] } = useSkillLevels(activeClinicId);

  // Active session
  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ['active-live-session', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return null;
      const { data } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!activeClinicId,
  });

  // Session students (live)
  const { data: liveStudents = [], refetch: refetchLive } = useQuery({
    queryKey: ['live-session-students', session?.id],
    queryFn: async () => {
      if (!session) return [];
      const { data } = await supabase
        .from('live_session_students')
        .select('*, clinic_students(full_name, skill_level_id), exercise_sequences:prescription_id(id), clinic_equipment(name)')
        .eq('live_session_id', session.id);
      return data ?? [];
    },
    enabled: !!session,
  });

  // Realtime
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`live-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_session_students', filter: `live_session_id=eq.${session.id}` }, () => {
        refetchLive();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, refetchLive]);

  const [selectedLive, setSelectedLive] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const startSession = async () => {
    if (!user || !activeClinicId) return;
    const { error } = await supabase.from('live_sessions').insert({
      clinic_id: activeClinicId,
      instructor_id: user.id,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    });
    if (error) toast.error(error.message);
    else { toast.success('Aula iniciada'); refetchSession(); }
  };

  const finishSession = async () => {
    if (!session) return;
    await supabase.from('live_sessions').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', session.id);
    toast.success('Aula finalizada');
    refetchSession();
  };

  // Add student to session with equipment + sequence (auto-suggest)
  const [addOpen, setAddOpen] = useState(false);
  const [addStudent, setAddStudent] = useState('');
  const [addEquip, setAddEquip] = useState('');
  const [addSeq, setAddSeq] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const computeSuggestion = async (studentId: string, equipmentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const eq = equipment.find((e) => e.id === equipmentId);
    if (!student) return null;

    // Compatible: same level (or sequence has no level), prefer same equipment_id
    const compatible = sequences.filter((s) => {
      if (s.skill_level_id && student.skill_level_id && s.skill_level_id !== student.skill_level_id) return false;
      return true;
    });
    if (compatible.length === 0) return null;

    // Find recently done by student
    const { data: recent } = await supabase
      .from('execution_log')
      .select('sequence_id')
      .eq('student_id', studentId)
      .order('performed_at', { ascending: false })
      .limit(20);
    const recentIds = new Set((recent ?? []).map((r) => r.sequence_id).filter(Boolean));

    // Score: not recent + matches equipment > matches type > anything
    const scored = compatible.map((s) => {
      let score = 0;
      if (eq && s.equipment_id === eq.id) score += 10;
      if (eq && s.equipment_type === eq.equipment_type) score += 5;
      if (!recentIds.has(s.id)) score += 3;
      return { s, score };
    }).sort((a, b) => b.score - a.score);

    return scored[0]?.s.id ?? null;
  };

  useEffect(() => {
    if (addStudent && addEquip) {
      computeSuggestion(addStudent, addEquip).then((id) => {
        setSuggestion(id);
        if (id && !addSeq) setAddSeq(id);
      });
    }
  }, [addStudent, addEquip]);

  const handleAddStudent = async () => {
    if (!session || !addStudent || !addSeq) return;
    // Get sequence items
    const { data: items } = await supabase
      .from('exercise_sequence_items')
      .select('id')
      .eq('sequence_id', addSeq)
      .order('order_index')
      .limit(1);
    const firstItem = items?.[0]?.id ?? null;
    const { count } = await supabase
      .from('exercise_sequence_items')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_id', addSeq);

    // Create prescription too (in_class)
    const { data: presc } = await supabase.from('prescriptions').insert({
      clinic_id: activeClinicId!,
      student_id: addStudent,
      sequence_id: addSeq,
      context: 'in_class',
      status: 'in_progress',
      created_by: user!.id,
    }).select().single();

    const { error } = await supabase.from('live_session_students').insert({
      live_session_id: session.id,
      student_id: addStudent,
      prescription_id: presc?.id ?? null,
      equipment_id: addEquip || null,
      current_item_id: firstItem,
      current_item_index: 0,
      total_items: count ?? 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Aluno adicionado à aula');
      setAddStudent(''); setAddEquip(''); setAddSeq(''); setSuggestion(null); setAddOpen(false);
      refetchLive();
    }
  };

  const removeFromSession = async (id: string) => {
    await supabase.from('live_session_students').delete().eq('id', id);
    refetchLive();
  };

  const selectedLiveStudent = liveStudents.find((l: any) => l.id === selectedLive);

  // Sequence items for focused student
  const { data: focusItems = [] } = useQuery({
    queryKey: ['focus-items', selectedLiveStudent?.prescription_id],
    queryFn: async () => {
      const seqId = selectedLiveStudent?.prescription_id
        ? (await supabase.from('prescriptions').select('sequence_id').eq('id', selectedLiveStudent.prescription_id).single()).data?.sequence_id
        : null;
      if (!seqId) return [];
      const { data } = await supabase.from('exercise_sequence_items').select('*').eq('sequence_id', seqId).order('order_index');
      return data ?? [];
    },
    enabled: !!selectedLiveStudent?.prescription_id,
  });

  const advanceStudent = async (lssId: string, direction: 1 | -1) => {
    const lss = liveStudents.find((l: any) => l.id === lssId);
    if (!lss) return;
    const newIdx = Math.max(0, Math.min((focusItems.length || lss.total_items) - 1, lss.current_item_index + direction));
    const newItem = focusItems[newIdx]?.id ?? lss.current_item_id;

    if (direction === 1 && focusItems[lss.current_item_index]) {
      // log execution
      const it = focusItems[lss.current_item_index];
      await supabase.from('execution_log').insert({
        clinic_id: activeClinicId!,
        student_id: lss.student_id,
        prescription_id: lss.prescription_id,
        sequence_id: focusItems[0]?.sequence_id,
        sequence_item_id: it.id,
        exercise_name: it.name,
        context: 'in_class',
      });
    }

    await supabase.from('live_session_students').update({
      current_item_index: newIdx,
      current_item_id: newItem,
    }).eq('id', lssId);
    refetchLive();
  };

  if (!session) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-10 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Nenhuma aula em andamento</h2>
          <p className="text-muted-foreground mb-4">Inicie uma aula para começar a acompanhar alunos em tempo real.</p>
          <Button size="lg" onClick={startSession}><Play className="h-4 w-4 mr-2" />Iniciar aula</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Aula em andamento
          </h1>
          <p className="text-sm text-muted-foreground">{liveStudents.length} aluno(s) ativos</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Adicionar aluno</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar aluno à aula</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm">Aluno</label>
                  <Select value={addStudent} onValueChange={setAddStudent}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm">Equipamento livre</label>
                  <Select value={addEquip} onValueChange={setAddEquip}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {equipment.filter((e) => !liveStudents.some((l: any) => l.equipment_id === e.id)).map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm flex items-center gap-1">
                    Sequência
                    {suggestion && <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Sugerida</Badge>}
                  </label>
                  <Select value={addSeq} onValueChange={setAddSeq}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{sequences.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}{s.id === suggestion ? ' ⭐' : ''}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Sugestão considera nível do aluno, equipamento e sequências não feitas recentemente.</p>
                </div>
                <Button onClick={handleAddStudent} disabled={!addStudent || !addSeq} className="w-full">Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="destructive" onClick={finishSession}><Square className="h-4 w-4 mr-1" />Finalizar</Button>
        </div>
      </div>

      {/* Híbrido: lista + foco */}
      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <Card className="p-2 max-h-[70vh] overflow-y-auto">
          {liveStudents.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Adicione alunos à aula.</div>
          ) : liveStudents.map((l: any) => {
            const progress = l.total_items > 0 ? (l.current_item_index / l.total_items) * 100 : 0;
            return (
              <button
                key={l.id}
                onClick={() => setSelectedLive(l.id)}
                className={`w-full text-left p-3 rounded-lg mb-1 ${selectedLive === l.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm truncate">{l.clinic_students?.full_name}</div>
                  <span className="text-xs opacity-70">{l.current_item_index + 1}/{l.total_items}</span>
                </div>
                <div className="text-xs opacity-80 truncate">{l.clinic_equipment?.name || 'Sem equipamento'}</div>
                <div className="h-1 mt-1.5 rounded-full bg-black/10 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${progress}%` }} />
                </div>
              </button>
            );
          })}
        </Card>

        <div>
          {!selectedLiveStudent ? (
            <Card className="p-8 text-center text-muted-foreground">Selecione um aluno para focar.</Card>
          ) : (
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground uppercase">{(selectedLiveStudent as any).clinic_equipment?.name}</div>
                  <h2 className="text-2xl font-bold truncate">{(selectedLiveStudent as any).clinic_students?.full_name}</h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {focusItems.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShareOpen(true)}
                      className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/40 dark:hover:bg-emerald-950/30"
                      title="Enviar sequência por WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeFromSession(selectedLiveStudent.id)} title="Remover da aula"><X className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                {focusItems.map((it: any, idx: number) => {
                  const done = idx < selectedLiveStudent.current_item_index;
                  const current = idx === selectedLiveStudent.current_item_index;
                  return (
                    <div key={it.id} className={`aspect-square rounded p-2 text-xs flex flex-col justify-between ${current ? 'bg-emerald-500 text-white font-bold' : done ? 'bg-muted line-through opacity-60' : 'bg-muted'}`}>
                      <span>{idx + 1}.</span>
                      <span className="truncate">{it.name}</span>
                    </div>
                  );
                })}
              </div>

              {focusItems[selectedLiveStudent.current_item_index] && (
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 mb-4">
                  <div className="text-xs text-muted-foreground uppercase">Atual</div>
                  <h3 className="text-2xl font-bold">{focusItems[selectedLiveStudent.current_item_index].name}</h3>
                  <div className="text-sm mt-1">{focusItems[selectedLiveStudent.current_item_index].sets} séries × {focusItems[selectedLiveStudent.current_item_index].reps} reps</div>
                  {focusItems[selectedLiveStudent.current_item_index].notes && <p className="text-sm mt-2 text-muted-foreground">{focusItems[selectedLiveStudent.current_item_index].notes}</p>}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => advanceStudent(selectedLiveStudent.id, -1)}>← Anterior</Button>
                <Button className="flex-1" onClick={() => advanceStudent(selectedLiveStudent.id, 1)}>Próximo <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Enviar sequência por WhatsApp */}
      {activeClinicId && selectedLiveStudent && focusItems.length > 0 && (() => {
        const seqId = (focusItems[0] as any).sequence_id as string;
        const seqName = sequences.find((s: any) => s.id === seqId)?.name || 'Sequência';
        return (
          <ShareSequenceDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            clinicId={activeClinicId}
            sequenceId={seqId}
            sequenceName={seqName}
            initialStudentId={(selectedLiveStudent as any).student_id}
          />
        );
      })()}
    </div>
  );
}
