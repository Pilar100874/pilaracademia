import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays, Clock, MapPin, User, Search, Loader2 } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Room { id: string; name: string }
interface Instructor { user_id: string; name: string | null }

export interface AvailableSlotPick {
  date: Date;
  time: string; // HH:mm
  roomId: string | null;
  instructorId: string | null;
  durationMinutes: number;
  bookableSlotId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  rooms: Room[];
  instructors: Instructor[];
  daysAhead?: number;
  onPick: (pick: AvailableSlotPick) => void;
}

interface AvailableSlot {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  room_id: string | null;
  instructor_id: string;
  capacity: number;
  bookedCount: number;
}

function timeStrToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function AvailableSlotsPickerDialog({
  open, onClose, clinicId, rooms, instructors, daysAhead = 30, onPick,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [filterInstructor, setFilterInstructor] = useState<string>('');

  useEffect(() => {
    if (!open || !clinicId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        const to = addDays(from, daysAhead);
        to.setHours(23, 59, 59, 999);

        // 1) bookable_slots ativos com instrutor
        const { data: bs } = await supabase
          .from('bookable_slots' as any)
          .select('id, scheduled_at, duration_minutes, room_id, instructor_id, capacity, active, blocked')
          .eq('clinic_id', clinicId)
          .gte('scheduled_at', from.toISOString())
          .lte('scheduled_at', to.toISOString())
          .order('scheduled_at');

        const candidates = ((bs ?? []) as any[]).filter(
          (s) => s.active !== false && s.blocked !== true && !!s.instructor_id
        );

        // 2) bloqueios recorrentes da clínica
        const { data: blocks } = await supabase
          .from('clinic_blocked_periods' as any)
          .select('day_of_week, start_time, end_time, room_id, active')
          .eq('clinic_id', clinicId)
          .eq('active', true);

        const { data: exceptions } = await supabase
          .from('clinic_blocked_period_exceptions' as any)
          .select('blocked_period_id, exception_date');
        const exMap = new Map<string, Set<string>>();
        ((exceptions ?? []) as any[]).forEach((e) => {
          if (!exMap.has(e.blocked_period_id)) exMap.set(e.blocked_period_id, new Set());
          exMap.get(e.blocked_period_id)!.add(e.exception_date);
        });

        const isBlocked = (s: any) => {
          const start = new Date(s.scheduled_at);
          const end = new Date(start.getTime() + (s.duration_minutes || 50) * 60 * 1000);
          const dow = start.getDay();
          const sMin = start.getHours() * 60 + start.getMinutes();
          const eMin = end.getHours() * 60 + end.getMinutes();
          const dateStr = format(start, 'yyyy-MM-dd');
          return ((blocks ?? []) as any[]).some((b: any) => {
            if (b.day_of_week !== dow) return false;
            if (b.room_id && s.room_id && b.room_id !== s.room_id) return false;
            const bs = timeStrToMin(b.start_time);
            const be = timeStrToMin(b.end_time);
            const overlaps = sMin < be && eMin > bs;
            if (!overlaps) return false;
            const exSet = exMap.get(b.id);
            if (exSet && exSet.has(dateStr)) return false;
            return true;
          });
        };

        const notBlocked = candidates.filter((s) => !isBlocked(s));

        // 3) appointments para contar lotação
        const { data: appts } = await supabase
          .from('class_appointments')
          .select('bookable_slot_id, scheduled_at, duration_minutes, status')
          .eq('clinic_id', clinicId)
          .gte('scheduled_at', from.toISOString())
          .lte('scheduled_at', to.toISOString())
          .neq('status', 'cancelled');

        const countBySlot = new Map<string, number>();
        ((appts ?? []) as any[]).forEach((a) => {
          if (a.bookable_slot_id) {
            countBySlot.set(a.bookable_slot_id, (countBySlot.get(a.bookable_slot_id) || 0) + 1);
          }
        });

        const result: AvailableSlot[] = notBlocked
          .map((s) => ({
            id: s.id,
            scheduled_at: s.scheduled_at,
            duration_minutes: s.duration_minutes || 50,
            room_id: s.room_id,
            instructor_id: s.instructor_id,
            capacity: s.capacity || 1,
            bookedCount: countBySlot.get(s.id) || 0,
          }))
          .filter((s) => s.bookedCount < s.capacity);

        if (alive) setSlots(result);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, clinicId, daysAhead]);

  const filtered = useMemo(() => {
    return slots.filter((s) => {
      if (filterRoom && s.room_id !== filterRoom) return false;
      if (filterInstructor && s.instructor_id !== filterInstructor) return false;
      if (filterDate) {
        const d = format(new Date(s.scheduled_at), 'yyyy-MM-dd');
        if (d !== filterDate) return false;
      }
      return true;
    });
  }, [slots, filterRoom, filterInstructor, filterDate]);

  // Agrupa por dia
  const grouped = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    filtered.forEach((s) => {
      const key = format(new Date(s.scheduled_at), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const roomName = (id: string | null) => rooms.find((r) => r.id === id)?.name ?? '—';
  const instructorName = (id: string) => instructors.find((i) => i.user_id === id)?.name ?? id.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Horários disponíveis
          </DialogTitle>
          <DialogDescription>
            Apenas horários com professor alocado, sala com vaga e fora dos bloqueios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Dia</Label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Sala</Label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Todas</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Professor</Label>
            <select
              value={filterInstructor}
              onChange={(e) => setFilterInstructor(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Todos</option>
              {instructors.map((i) => <option key={i.user_id} value={i.user_id}>{i.name || i.user_id.slice(0, 6)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando horários...
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhum horário disponível nos próximos {daysAhead} dias com os filtros atuais.
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {grouped.map(([day, daySlots]) => (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-serif text-base capitalize">
                    {format(new Date(day + 'T00:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">{daySlots.length} vagas</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {daySlots
                    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
                    .map((s) => {
                      const start = new Date(s.scheduled_at);
                      const time = format(start, 'HH:mm');
                      const remaining = s.capacity - s.bookedCount;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            onPick({
                              date: start,
                              time,
                              roomId: s.room_id,
                              instructorId: s.instructor_id,
                              durationMinutes: s.duration_minutes,
                              bookableSlotId: s.id,
                            });
                            onClose();
                          }}
                          className={cn(
                            'text-left p-3 rounded-md border border-border bg-card',
                            'hover:bg-muted/50 transition group'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-semibold text-sm">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              {time}
                              <span className="text-xs text-muted-foreground font-normal">
                                · {s.duration_minutes}min
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {remaining}/{s.capacity} vaga{remaining > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {instructorName(s.instructor_id)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {roomName(s.room_id)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
