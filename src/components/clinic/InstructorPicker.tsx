import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { UserCog, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Instructor { user_id: string; name: string }

interface Props {
  /** Aula real (class_appointments.id) — atualiza appointment */
  appointmentId?: string | null;
  /** Slot livre (bookable_slots.id) — atualiza bookable_slot */
  bookableSlotId?: string | null;
  /** Recorrente — atualiza recurring_schedules */
  recurringId?: string | null;
  currentInstructorId: string | null | undefined;
  instructors: Instructor[];
  colorOf: (id: string | null | undefined) => string;
  clinicId: string;
  /** Trigger custom; se omitido usa botão padrão */
  children?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

export function InstructorPicker({
  appointmentId, bookableSlotId, recurringId,
  currentInstructorId, instructors, colorOf, clinicId, children, align = 'end',
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const assign = async (instructorId: string | null) => {
    setBusy(true);
    let error: any = null;
    if (appointmentId) {
      const r = await supabase.from('class_appointments').update({ instructor_id: instructorId }).eq('id', appointmentId);
      error = r.error;
    } else if (bookableSlotId) {
      const r = await supabase.from('bookable_slots').update({ instructor_id: instructorId }).eq('id', bookableSlotId);
      error = r.error;
    } else if (recurringId) {
      const r = await supabase.from('recurring_schedules').update({ instructor_id: instructorId }).eq('id', recurringId);
      error = r.error;
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(instructorId ? 'Professor atribuído' : 'Professor removido');
    qc.invalidateQueries({ queryKey: ['appointments'] });
    qc.invalidateQueries({ queryKey: ['bookable-slots'] });
    qc.invalidateQueries({ queryKey: ['recurring-schedules'] });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children ?? (
          <button
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border bg-card hover:bg-muted/60"
            title="Atribuir professor"
          >
            <UserCog className="h-3 w-3" />
            {currentInstructorId ? 'Trocar prof.' : 'Definir prof.'}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-60 p-2" onClick={(e) => e.stopPropagation()}>
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 px-1">Atribuir professor</div>
        {instructors.length === 0 && (
          <div className="text-xs text-muted-foreground italic px-1 py-2">Nenhum professor cadastrado.</div>
        )}
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {instructors.map((i) => {
            const active = i.user_id === currentInstructorId;
            return (
              <button
                key={i.user_id}
                disabled={busy}
                onClick={() => assign(i.user_id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted text-left',
                  active && 'bg-primary/10',
                )}
              >
                <span className="h-3 w-3 rounded shrink-0" style={{ background: colorOf(i.user_id) }} />
                <span className="flex-1 truncate">{i.name}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
        {currentInstructorId && (
          <button
            disabled={busy}
            onClick={() => assign(null)}
            className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 border-t pt-2 text-xs text-destructive hover:bg-destructive/5"
          >
            <X className="h-3.5 w-3.5" /> Remover professor
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
