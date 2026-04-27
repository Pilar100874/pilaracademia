import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Repeat, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
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

interface Equipment {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  userId: string;
  initialDate: Date;
  initialTime?: string;
  students: Student[];
  equipment: Equipment[];
  onSaved?: () => void;
}

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function NewClassDialog({
  open, onClose, clinicId, userId, initialDate, initialTime, students, equipment, onSaved,
}: Props) {
  const [mode, setMode] = useState<'avulsa' | 'fixa'>('avulsa');
  const [studentId, setStudentId] = useState('');
  const [time, setTime] = useState(initialTime ?? '08:00');
  const [duration, setDuration] = useState(50);
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [notes, setNotes] = useState('');
  // Para fixa: dias da semana selecionados (0=dom..6=sab)
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setTime(initialTime ?? '08:00');
      setMode('avulsa');
      setStudentId('');
      setDuration(50);
      setEquipmentId('');
      setNotes('');
      // pré-seleciona o dia da semana da data clicada
      setWeekDays([initialDate.getDay()]);
    }
  }, [open, initialDate, initialTime]);

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
        label: `Pacote de aulas: ${used}/${total} usadas (${Math.max(total - used, 0)} restantes)`,
      };
    }
    return { type, label: 'Contrato em aberto (sem data de término)' };
  }, [student]);

  const toggleDay = (d: number) => {
    setWeekDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  const handleSave = async () => {
    if (!studentId) {
      toast.error('Selecione um aluno');
      return;
    }
    setSaving(true);
    try {
      const [h, m] = time.split(':').map(Number);

      if (mode === 'avulsa') {
        const sched = new Date(initialDate);
        sched.setHours(h, m, 0, 0);
        const { error } = await supabase.from('class_appointments').insert({
          clinic_id: clinicId,
          student_id: studentId,
          equipment_id: equipmentId || null,
          instructor_id: userId,
          scheduled_at: sched.toISOString(),
          duration_minutes: duration,
          notes: notes || null,
          created_by: userId,
        });
        if (error) throw error;
        toast.success('Aula avulsa adicionada');
      } else {
        // Fixa: cria 1 recurring_schedule por dia da semana selecionado.
        // Define start_date = hoje (ou data clicada se for futura) e end_date = fim do contrato (se houver).
        if (weekDays.length === 0) {
          toast.error('Selecione ao menos um dia da semana');
          setSaving(false);
          return;
        }
        const startDate = format(initialDate, 'yyyy-MM-dd');
        let endDate: string | null = null;
        if (student?.contract_type === 'period' && student.contract_end_date) {
          endDate = student.contract_end_date;
        }

        const rows = weekDays.map((dow) => ({
          clinic_id: clinicId,
          student_id: studentId,
          instructor_id: userId,
          equipment_id: equipmentId || null,
          day_of_week: dow,
          start_time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
          duration_minutes: duration,
          notes: notes || null,
          created_by: userId,
          start_date: startDate,
          end_date: endDate,
        }));

        const { error } = await supabase.from('recurring_schedules' as any).insert(rows as any);
        if (error) throw error;

        toast.success(
          endDate
            ? `Horário fixo criado em ${weekDays.length} dia(s) — repetirá até ${format(new Date(endDate), 'dd/MM/yyyy')}`
            : `Horário fixo criado em ${weekDays.length} dia(s) — sem data de término`
        );
      }

      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Nova aula em {format(initialDate, "dd 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
          <DialogDescription>
            Defina se é uma aula única ou um horário fixo recorrente.
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
                  <div className="font-medium text-sm flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" />Horário fixo</div>
                  <div className="text-[11px] text-muted-foreground">Repete toda semana até o fim do contrato</div>
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
            {mode === 'fixa' && contractInfo?.type === 'classes' && (
              <div className="mt-2 flex items-start gap-2 p-2 rounded-md border border-amber-500/40 bg-amber-500/5 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Atenção: este aluno tem contrato por pacote de aulas. Horário fixo continuará até o pacote esgotar.</span>
              </div>
            )}
          </div>

          {/* Dias da semana (somente fixa) */}
          {mode === 'fixa' && (
            <div>
              <Label>Dias da semana</Label>
              <p className="text-[11px] text-muted-foreground mb-2">Selecione um ou mais dias. Cada dia pode ter um horário diferente — para isso, crie horários separados.</p>
              <div className="grid grid-cols-7 gap-1">
                {WEEK_LABELS.map((lbl, i) => {
                  const sel = weekDays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        'py-2 rounded-md border text-xs font-medium transition',
                        sel ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                      )}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
              {weekDays.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {weekDays.map((d) => (
                    <Badge key={d} variant="secondary" className="text-[10px]">
                      Toda {WEEK_LABELS[d]}-feira às {time}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hora + duração */}
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

          {/* Equipamento */}
          <div>
            <Label>Equipamento (opcional)</Label>
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !studentId} className="flex-1">
              {saving ? 'Salvando...' : mode === 'avulsa' ? 'Adicionar aula' : `Criar horário fixo${weekDays.length > 1 ? ` (${weekDays.length} dias)` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
