import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Repeat, AlertTriangle, Info, Plus, Trash2, Sparkles } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  full_name: string;
  contract_type?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  contract_classes_total?: number | null;
  contract_classes_used?: number | null;
}

interface Equipment { id: string; name: string }
interface Room { id: string; name: string }
interface Instructor { user_id: string; name: string | null }

interface Props {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  userId: string;
  initialDate: Date;
  initialTime?: string;
  initialRoomId?: string | null;
  students: Student[];
  equipment: Equipment[];
  rooms?: Room[];
  instructors?: Instructor[];
  onSaved?: () => void;
}

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEK_OF_MONTH_LABELS: Record<number, string> = {
  1: '1ª semana',
  2: '2ª semana',
  3: '3ª semana',
  4: '4ª semana',
  5: 'Última semana',
};

interface WeekRule {
  id: string; // local
  week_of_month: number; // 1-4 ou 5 (última)
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  room_id: string | null;
  instructor_id: string | null;
  equipment_id: string | null;
}

/** Retorna quantas vezes o `dow` já apareceu no mês até a data dada (1-based). */
function weekOfMonthForDate(d: Date): number {
  const day = d.getDate();
  const ordinal = Math.floor((day - 1) / 7) + 1; // 1..5
  // Verifica se é a "última" ocorrência do dow no mês
  const next = new Date(d);
  next.setDate(d.getDate() + 7);
  if (next.getMonth() !== d.getMonth()) return 5;
  return Math.min(ordinal, 4);
}

/** Gera todas as datas (Date com hora) entre from e to que casam com a regra. */
function expandRule(rule: WeekRule, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to) {
    if (cursor.getDay() === rule.day_of_week) {
      const wom = weekOfMonthForDate(cursor);
      const matches = rule.week_of_month === 5 ? wom === 5 : wom === rule.week_of_month;
      if (matches) {
        const [h, m] = rule.start_time.split(':').map(Number);
        const sched = new Date(cursor);
        sched.setHours(h, m, 0, 0);
        if (sched >= new Date()) out.push(sched);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function NewClassDialog({
  open, onClose, clinicId, userId, initialDate, initialTime, initialRoomId, students, equipment, rooms = [], instructors = [], onSaved,
}: Props) {
  const [mode, setMode] = useState<'avulsa' | 'fixa'>('avulsa');
  const [studentId, setStudentId] = useState('');
  const [time, setTime] = useState(initialTime ?? '08:00');
  const [duration, setDuration] = useState(50);
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>(initialRoomId ?? '');
  const [instructorId, setInstructorId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Regras semanais (uma por semana-do-mês × dia da semana)
  const [rules, setRules] = useState<WeekRule[]>([]);

  // Conflitos detectados
  const [conflicts, setConflicts] = useState<{ when: Date; with: string }[] | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{ all: Date[]; rule: WeekRule }[] | null>(null);

  useEffect(() => {
    if (open) {
      setTime(initialTime ?? '08:00');
      setMode('avulsa');
      setStudentId('');
      setDuration(50);
      setEquipmentId('');
      setRoomId('');
      setInstructorId(userId);
      setNotes('');
      setConflicts(null);
      setPendingPlan(null);
      // pré-popula uma regra com o dia/horário clicado, semana = a do dia clicado
      const wom = weekOfMonthForDate(initialDate);
      const [h, m] = (initialTime ?? '08:00').split(':').map(Number);
      setRules([{
        id: crypto.randomUUID(),
        week_of_month: wom,
        day_of_week: initialDate.getDay(),
        start_time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        duration_minutes: 50,
        room_id: null,
        instructor_id: userId,
        equipment_id: null,
      }]);
    }
  }, [open, initialDate, initialTime, userId]);

  const student = useMemo(() => students.find((s) => s.id === studentId), [students, studentId]);
  const contractInfo = useMemo(() => {
    if (!student) return null;
    const type = student.contract_type || 'open';
    if (type === 'period') {
      return {
        type,
        end: student.contract_end_date,
        label: student.contract_end_date
          ? `Contrato por período até ${format(new Date(student.contract_end_date), "dd 'de' MMM yyyy", { locale: ptBR })}`
          : 'Contrato por período (sem data de término)',
      };
    }
    if (type === 'classes') {
      const total = student.contract_classes_total ?? 0;
      const used = student.contract_classes_used ?? 0;
      return {
        type,
        remaining: Math.max(total - used, 0),
        label: `Pacote: ${used}/${total} usadas (${Math.max(total - used, 0)} restantes)`,
      };
    }
    return { type, label: 'Contrato em aberto (sem data de término)' };
  }, [student]);

  const addRule = () => {
    setRules((rs) => [
      ...rs,
      {
        id: crypto.randomUUID(),
        week_of_month: 1,
        day_of_week: 1,
        start_time: '08:00',
        duration_minutes: 50,
        room_id: roomId || null,
        instructor_id: instructorId || userId,
        equipment_id: equipmentId || null,
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<WeekRule>) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRule = (id: string) => setRules((rs) => rs.filter((r) => r.id !== id));

  /** Materializa fixa: cria recurring_schedule + recurring_schedule_weeks + class_appointments até fim do contrato. */
  const computeFixedPlan = (): { rules: WeekRule[]; from: Date; to: Date } | null => {
    if (rules.length === 0) {
      toast.error('Adicione ao menos uma regra de semana.');
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let to: Date;
    if (student?.contract_type === 'period' && student.contract_end_date) {
      to = new Date(student.contract_end_date + 'T23:59:59');
    } else if (student?.contract_type === 'classes') {
      to = addMonths(today, 3);
    } else {
      to = addMonths(today, 2);
    }
    return { rules, from: today, to };
  };

  const detectConflictsAndSave = async () => {
    if (!studentId) {
      toast.error('Selecione um aluno');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'avulsa') {
        const [h, m] = time.split(':').map(Number);
        const sched = new Date(initialDate);
        sched.setHours(h, m, 0, 0);
        // Conflito: mesma sala/equipamento no mesmo horário
        if (roomId || equipmentId) {
          const start = new Date(sched.getTime() - 60 * 60 * 1000);
          const end = new Date(sched.getTime() + 60 * 60 * 1000);
          const { data: existing } = await supabase
            .from('class_appointments')
            .select('id, scheduled_at, duration_minutes, equipment_id, student_id')
            .eq('clinic_id', clinicId)
            .gte('scheduled_at', start.toISOString())
            .lte('scheduled_at', end.toISOString())
            .neq('status', 'cancelled');
          const overlap = (existing ?? []).find((a) => {
            const aStart = new Date(a.scheduled_at).getTime();
            const aEnd = aStart + a.duration_minutes * 60 * 1000;
            const nStart = sched.getTime();
            const nEnd = nStart + duration * 60 * 1000;
            const overlaps = nStart < aEnd && nEnd > aStart;
            const sameResource = (equipmentId && a.equipment_id === equipmentId);
            return overlaps && sameResource;
          });
          if (overlap) {
            const sName = students.find((s) => s.id === overlap.student_id)?.full_name ?? 'outro aluno';
            const ok = confirm(`Conflito detectado: já existe uma aula com este equipamento às ${format(new Date(overlap.scheduled_at), 'HH:mm')} (${sName}).\n\nDeseja agendar mesmo assim?`);
            if (!ok) { setSaving(false); return; }
          }
        }
        const { error } = await supabase.from('class_appointments').insert({
          clinic_id: clinicId,
          student_id: studentId,
          equipment_id: equipmentId || null,
          instructor_id: instructorId || userId,
          scheduled_at: sched.toISOString(),
          duration_minutes: duration,
          notes: notes || null,
          created_by: userId,
        });
        if (error) throw error;
        toast.success('Aula avulsa adicionada');
        onSaved?.();
        onClose();
        return;
      }

      // Fixa
      const plan = computeFixedPlan();
      if (!plan) { setSaving(false); return; }
      // Calcula todas as datas geradas pelas regras
      const planned: { date: Date; rule: WeekRule }[] = [];
      for (const r of plan.rules) {
        const dates = expandRule(r, plan.from, plan.to);
        for (const d of dates) planned.push({ date: d, rule: r });
      }
      if (planned.length === 0) {
        toast.warning('Nenhuma data futura corresponde às regras escolhidas.');
        setSaving(false);
        return;
      }
      // Detecta conflitos por equipamento (heurística simples)
      const equipmentIds = Array.from(new Set(plan.rules.map((r) => r.equipment_id).filter(Boolean) as string[]));
      const detected: { when: Date; with: string }[] = [];
      if (equipmentIds.length > 0) {
        const { data: existing } = await supabase
          .from('class_appointments')
          .select('scheduled_at, duration_minutes, equipment_id, student_id')
          .eq('clinic_id', clinicId)
          .in('equipment_id', equipmentIds)
          .gte('scheduled_at', plan.from.toISOString())
          .lte('scheduled_at', plan.to.toISOString())
          .neq('status', 'cancelled');
        for (const p of planned) {
          if (!p.rule.equipment_id) continue;
          const overlap = (existing ?? []).find((a) => {
            if (a.equipment_id !== p.rule.equipment_id) return false;
            const aStart = new Date(a.scheduled_at).getTime();
            const aEnd = aStart + a.duration_minutes * 60 * 1000;
            const nStart = p.date.getTime();
            const nEnd = nStart + p.rule.duration_minutes * 60 * 1000;
            return nStart < aEnd && nEnd > aStart && a.student_id !== studentId;
          });
          if (overlap) {
            const sName = students.find((s) => s.id === overlap.student_id)?.full_name ?? 'outro aluno';
            detected.push({ when: p.date, with: sName });
          }
        }
      }

      if (detected.length > 0) {
        setConflicts(detected);
        setPendingPlan(planned.map((p) => ({ all: [p.date], rule: p.rule })));
        setSaving(false);
        return;
      }

      await persistFixed(planned, plan.from, plan.to);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const persistFixed = async (
    planned: { date: Date; rule: WeekRule }[],
    from: Date,
    to: Date,
    skipConflicts = false,
  ) => {
    setSaving(true);
    try {
      // 1. cria recurring_schedules "mãe" com a primeira regra (apenas para amarrar id)
      const head = rules[0];
      const { data: rec, error: recErr } = await supabase.from('recurring_schedules' as any).insert({
        clinic_id: clinicId,
        student_id: studentId,
        instructor_id: head.instructor_id || userId,
        equipment_id: head.equipment_id,
        room_id: head.room_id,
        day_of_week: head.day_of_week,
        start_time: `${head.start_time}:00`,
        duration_minutes: head.duration_minutes,
        start_date: format(from, 'yyyy-MM-dd'),
        end_date: format(to, 'yyyy-MM-dd'),
        notes: notes || null,
        title: 'Reserva fixa',
        created_by: userId,
      } as any).select('id').single();
      if (recErr) throw recErr;

      // 2. cria recurring_schedule_weeks (uma por regra)
      const weekRows = rules.map((r) => ({
        recurring_schedule_id: (rec as any).id,
        week_of_month: r.week_of_month,
        day_of_week: r.day_of_week,
        start_time: `${r.start_time}:00`,
        duration_minutes: r.duration_minutes,
        room_id: r.room_id,
        instructor_id: r.instructor_id,
        equipment_id: r.equipment_id,
      }));
      const { data: weeks, error: wErr } = await supabase.from('recurring_schedule_weeks' as any).insert(weekRows as any).select('id, week_of_month, day_of_week, start_time');
      if (wErr) throw wErr;
      const weekIdByKey = new Map<string, string>();
      (weeks as any[]).forEach((w) => weekIdByKey.set(`${w.week_of_month}-${w.day_of_week}-${w.start_time}`, w.id));

      // 3. materializa appointments
      let created = 0, skipped = 0;
      for (const p of planned) {
        const key = `${p.rule.week_of_month}-${p.rule.day_of_week}-${p.rule.start_time}:00`;
        const wid = weekIdByKey.get(key);
        const { error } = await supabase.from('class_appointments').insert({
          clinic_id: clinicId,
          student_id: studentId,
          equipment_id: p.rule.equipment_id,
          instructor_id: p.rule.instructor_id || userId,
          scheduled_at: p.date.toISOString(),
          duration_minutes: p.rule.duration_minutes,
          notes: notes || null,
          created_by: userId,
          recurring_schedule_id: (rec as any).id,
          recurring_week_id: wid ?? null,
        });
        if (error) skipped++;
        else created++;
      }
      toast.success(`Horário fixo criado: ${created} aulas geradas${skipped ? ` (${skipped} ignoradas por conflito/contrato)` : ''}.`);
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar plano fixo');
    } finally {
      setSaving(false);
    }
  };

  // ===== Render =====
  if (conflicts && pendingPlan) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {conflicts.length} conflito(s) encontrados
            </DialogTitle>
            <DialogDescription>
              Algumas datas têm o mesmo equipamento já em uso por outro aluno. O que fazer?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[40vh] overflow-y-auto space-y-1 text-xs">
            {conflicts.slice(0, 30).map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border bg-amber-500/5">
                <span>{format(c.when, "EEE dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                <span className="text-muted-foreground">conflito com {c.with}</span>
              </div>
            ))}
            {conflicts.length > 30 && (
              <div className="text-muted-foreground text-center py-2">+ {conflicts.length - 30} mais</div>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button
              onClick={async () => {
                const flat = pendingPlan.flatMap((p) => p.all.map((d) => ({ date: d, rule: p.rule })));
                const conflictTimes = new Set(conflicts.map((c) => c.when.getTime()));
                const filtered = flat.filter((p) => !conflictTimes.has(p.date.getTime()));
                setConflicts(null);
                setPendingPlan(null);
                if (filtered.length === 0) { toast.error('Nada a salvar após remover conflitos.'); return; }
                const today = new Date(); today.setHours(0, 0, 0, 0);
                await persistFixed(filtered, today, addMonths(today, 12));
              }}
            >
              Pular datas em conflito e criar o resto
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const flat = pendingPlan.flatMap((p) => p.all.map((d) => ({ date: d, rule: p.rule })));
                setConflicts(null);
                setPendingPlan(null);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                await persistFixed(flat, today, addMonths(today, 12), true);
              }}
            >
              Criar mesmo assim (manter conflitos)
            </Button>
            <Button variant="ghost" onClick={() => { setConflicts(null); setPendingPlan(null); }}>
              Voltar e ajustar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Nova aula em {format(initialDate, "dd 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
          <DialogDescription>
            Defina se é uma aula única ou uma reserva fixa com regras por semana do mês.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tipo de aula</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="grid grid-cols-2 gap-2 mt-2">
              <label className={cn(
                'flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition',
                mode === 'avulsa' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              )}>
                <RadioGroupItem value="avulsa" className="mt-0.5" />
                <div>
                  <div className="font-medium text-sm flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Avulsa</div>
                  <div className="text-[11px] text-muted-foreground">Aula única nesta data</div>
                </div>
              </label>
              <label className={cn(
                'flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition',
                mode === 'fixa' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              )}>
                <RadioGroupItem value="fixa" className="mt-0.5" />
                <div>
                  <div className="font-medium text-sm flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" />Reserva fixa</div>
                  <div className="text-[11px] text-muted-foreground">Regras por semana do mês até fim do contrato</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Aluno */}
          <div>
            <Label>Aluno</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {contractInfo && (
              <div className="mt-2 flex items-start gap-2 p-2 rounded-md bg-muted/40 text-[11px]">
                <Info className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{contractInfo.label}</span>
              </div>
            )}
          </div>

          {mode === 'avulsa' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hora</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                <div>
                  <Label>Duração (min)</Label>
                  <Input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 50)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Sala</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Professor</Label>
                  <Select value={instructorId} onValueChange={setInstructorId}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {instructors.map((i) => <SelectItem key={i.user_id} value={i.user_id}>{i.name || i.user_id.slice(0, 6)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Equipamento</Label>
                  <Select value={equipmentId} onValueChange={setEquipmentId}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Regras por semana do mês</Label>
                <Button type="button" size="sm" variant="outline" onClick={addRule}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Adicionar regra
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Ex.: 1ª e 3ª semana → 2ª e 4ª às 18h. 2ª e 4ª semana → 3ª e 5ª às 19h.
              </p>

              {rules.map((r) => (
                <div key={r.id} className="rounded-lg border p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Regra
                    </div>
                    {rules.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeRule(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[10px]">Semana</Label>
                      <Select value={String(r.week_of_month)} onValueChange={(v) => updateRule(r.id, { week_of_month: parseInt(v) })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((w) => <SelectItem key={w} value={String(w)}>{WEEK_OF_MONTH_LABELS[w]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Dia</Label>
                      <Select value={String(r.day_of_week)} onValueChange={(v) => updateRule(r.id, { day_of_week: parseInt(v) })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WEEK_LABELS.map((l, i) => <SelectItem key={i} value={String(i)}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Hora</Label>
                      <Input className="h-9" type="time" value={r.start_time} onChange={(e) => updateRule(r.id, { start_time: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Duração</Label>
                      <Input className="h-9" type="number" min={5} step={5} value={r.duration_minutes} onChange={(e) => updateRule(r.id, { duration_minutes: parseInt(e.target.value) || 50 })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Sala</Label>
                      <Select value={r.room_id ?? ''} onValueChange={(v) => updateRule(r.id, { room_id: v || null })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {rooms.map((rm) => <SelectItem key={rm.id} value={rm.id}>{rm.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Professor</Label>
                      <Select value={r.instructor_id ?? ''} onValueChange={(v) => updateRule(r.id, { instructor_id: v || null })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {instructors.map((i) => <SelectItem key={i.user_id} value={i.user_id}>{i.name || i.user_id.slice(0, 6)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Equipamento</Label>
                      <Select value={r.equipment_id ?? ''} onValueChange={(v) => updateRule(r.id, { equipment_id: v || null })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {WEEK_OF_MONTH_LABELS[r.week_of_month]} · {WEEK_LABELS[r.day_of_week]}-feira às {r.start_time}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={detectConflictsAndSave} disabled={saving || !studentId} className="flex-1">
              {saving ? 'Salvando...' : mode === 'avulsa' ? 'Adicionar aula' : 'Criar reserva fixa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
