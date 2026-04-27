import { useState } from 'react';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Plus, X, AlertTriangle, Repeat, Sparkles, Users, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { INSTRUCTOR_DRAG_TYPE } from './InstructorDragPalette';

export interface TimelineSlot {
  key: string;
  scheduled_at: string;
  duration_minutes: number;
  student_id: string | null;
  instructor_id: string | null;
  room_id: string | null;
  isOpen?: boolean;
  isVirtual?: boolean;
  isProjected?: boolean;
  hasGrade?: boolean;
  uncovered?: boolean;
  appointment_id?: string;
  bookable_slot_id?: string;
  recurring_id?: string;
}

interface Props {
  days: Date[];
  startHour: number;   // ex 6
  endHour: number;     // ex 22  (exclusivo)
  hourHeight?: number; // px por hora
  slotsForDay: (d: Date) => TimelineSlot[];
  studentName: (id: string | null) => string;
  instructorName: (id: string | null | undefined) => string | null;
  roomName: (id: string | null | undefined) => string | null;
  /** Cor associada à sala (usado para chip visual de sala). */
  roomColorOf?: (id: string | null | undefined) => string | null;
  colorOf: (id: string | null | undefined) => string;
  onCellClick: (d: Date, hour: number) => void;
  onSlotClick: (s: TimelineSlot) => void;
  onDelete?: (s: TimelineSlot) => void;
  renderInstructorPicker?: (s: TimelineSlot) => React.ReactNode;
  // Drag & drop de professor
  dragActive?: boolean;
  onDropInstructorOnCell?: (instructorId: string, day: Date, hour: number) => void;
  onDropInstructorOnSlot?: (instructorId: string, slot: TimelineSlot) => void;
}

export function CalendarTimeline({
  days, startHour, endHour, hourHeight = 56,
  slotsForDay, studentName, instructorName, roomName, roomColorOf, colorOf,
  onCellClick, onSlotClick, onDelete, renderInstructorPicker,
  dragActive = false, onDropInstructorOnCell, onDropInstructorOnSlot,
}: Props) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const readInstructor = (e: React.DragEvent) =>
    e.dataTransfer.getData(INSTRUCTOR_DRAG_TYPE) || e.dataTransfer.getData('text/plain') || '';

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const totalHeight = hours.length * hourHeight;
  const minutesToTop = (date: Date) => {
    const m = (date.getHours() - startHour) * 60 + date.getMinutes();
    return (m / 60) * hourHeight;
  };
  const now = new Date();

  return (
    <div className="border rounded-md overflow-hidden bg-card">
      {/* Header dos dias */}
      <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((d) => {
          const isToday = isSameDay(d, now);
          return (
            <div key={d.toISOString()} className={cn('px-2 py-2 text-center border-l', isToday && 'bg-primary/5')}>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">
                {format(d, 'EEE', { locale: ptBR })}
              </div>
              <div className={cn('text-base font-bold', isToday && 'text-primary')}>
                {format(d, 'd/MM')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid principal com timeline */}
      <div className="grid relative" style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))`, height: totalHeight }}>
        {/* Coluna de horas */}
        <div className="relative">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-border/60 text-[10px] text-muted-foreground text-right pr-2 pt-0.5"
              style={{ top: (h - startHour) * hourHeight, height: hourHeight }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Colunas de dias */}
        {days.map((d) => {
          const isToday = isSameDay(d, now);
          const slots = slotsForDay(d);
          // current time line
          const showNow = isToday && now.getHours() >= startHour && now.getHours() < endHour;
          return (
            <div key={d.toISOString()} className={cn('relative border-l', isToday && 'bg-primary/[0.02]')}>
              {/* linhas de hora clicáveis */}
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => onCellClick(d, h)}
                  title={`Adicionar aula às ${String(h).padStart(2, '0')}:00`}
                  className="absolute left-0 right-0 border-t border-border/40 hover:bg-primary/5 transition group"
                  style={{ top: (h - startHour) * hourHeight, height: hourHeight }}
                >
                  <Plus className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-70 absolute top-1 right-1" />
                </button>
              ))}

              {/* now indicator */}
              {showNow && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: minutesToTop(now) }}
                >
                  <div className="h-px bg-destructive" />
                  <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                </div>
              )}

              {/* eventos */}
              {slots.map((s) => {
                const t = parseISO(s.scheduled_at);
                const top = minutesToTop(t);
                const height = Math.max(22, (s.duration_minutes / 60) * hourHeight - 2);
                if (top < 0 || top >= totalHeight) return null;
                const color = colorOf(s.instructor_id);
                const instr = instructorName(s.instructor_id);
                const room = roomName(s.room_id);
                return (
                  <Popover key={s.key}>
                    <PopoverTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        style={{
                          top: top + 1,
                          height,
                          borderLeftColor: s.uncovered ? 'hsl(var(--destructive))' : (color || 'hsl(var(--primary))'),
                        }}
                        className={cn(
                          'absolute left-1 right-1 z-10 rounded border border-l-4 px-1.5 py-1 text-[10px] cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/30 transition shadow-sm',
                          s.isOpen
                            ? 'bg-emerald-500/10 border-emerald-500/30 border-dashed'
                            : s.isProjected
                              ? 'bg-amber-500/10 border-amber-500/40 border-dashed'
                              : s.isVirtual
                                ? 'bg-card border-dashed'
                                : 'bg-card',
                          s.uncovered && !s.isOpen && 'bg-destructive/5',
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 leading-tight">
                          <span className="font-bold">{format(t, 'HH:mm')}</span>
                          <div className="flex items-center gap-0.5">
                            {s.uncovered && <AlertTriangle className="h-2.5 w-2.5 text-destructive" />}
                            {s.isProjected && <RefreshCw className="h-2.5 w-2.5 text-amber-600" />}
                            {s.isVirtual && !s.isProjected && <Repeat className="h-2.5 w-2.5 text-muted-foreground" />}
                            {s.hasGrade && <Sparkles className="h-2.5 w-2.5 text-primary" />}
                          </div>
                        </div>
                        <div className="truncate font-medium">
                          {s.isOpen ? <span className="italic text-emerald-700 dark:text-emerald-400">Livre</span> : studentName(s.student_id)}
                        </div>
                        {room && (
                          <div className="flex items-center gap-1 truncate">
                            <span
                              className="h-2 w-2 rounded-sm shrink-0 border"
                              style={{ background: roomColorOf?.(s.room_id) || 'hsl(var(--muted))' }}
                            />
                            <span className="truncate text-[9px] font-semibold text-foreground/80">{room}</span>
                          </div>
                        )}
                        {instr && height > 48 && (
                          <div className="truncate text-muted-foreground">{instr}</div>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 text-xs space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <div className="font-semibold text-sm">
                          {s.isOpen ? 'Horário disponível' : studentName(s.student_id)}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {format(t, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })} · {s.duration_minutes}min
                        </div>
                        {room && <div className="text-[11px]">📍 {room}</div>}
                        {instr && (
                          <div className="text-[11px] flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                            {instr}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-wrap pt-1 border-t">
                        <button
                          onClick={() => onSlotClick(s)}
                          className="flex-1 px-2 py-1.5 rounded border text-[11px] hover:bg-muted text-center"
                        >
                          Abrir
                        </button>
                        {renderInstructorPicker?.(s)}
                        {onDelete && (s.appointment_id || s.bookable_slot_id) && (
                          <button
                            onClick={() => { if (confirm('Excluir este horário?')) onDelete(s); }}
                            className="px-2 py-1.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/5 inline-flex items-center gap-1"
                            title="Excluir"
                          >
                            <X className="h-3 w-3" />Excluir
                          </button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
