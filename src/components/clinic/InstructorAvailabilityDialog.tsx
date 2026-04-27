import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Palette } from 'lucide-react';
import {
  useInstructorAvailability,
  useInstructorColors,
  colorForInstructor,
  INSTRUCTOR_PALETTE,
  type InstructorAvailability,
} from '@/hooks/useInstructorAvailability';

const DAYS = [
  { v: 1, l: 'Seg' }, { v: 2, l: 'Ter' }, { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' }, { v: 5, l: 'Sex' }, { v: 6, l: 'Sáb' }, { v: 0, l: 'Dom' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  userId: string;
  instructors: { user_id: string; name: string }[];
  rooms: { id: string; name: string }[];
}

export function InstructorAvailabilityDialog({ open, onClose, clinicId, userId, instructors, rooms }: Props) {
  const { data: shifts = [], create, remove } = useInstructorAvailability(clinicId);
  const { data: colors = [], upsert: upsertColor } = useInstructorColors(clinicId);

  const [form, setForm] = useState({
    instructor_id: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '12:00',
    room_id: 'none',
    notes: '',
  });

  const submit = () => {
    if (!form.instructor_id) return;
    if (form.end_time <= form.start_time) return;
    create.mutate({
      clinic_id: clinicId,
      instructor_id: form.instructor_id,
      day_of_week: form.day_of_week,
      start_time: form.start_time + ':00',
      end_time: form.end_time + ':00',
      room_id: form.room_id === 'none' ? null : form.room_id,
      color: null,
      notes: form.notes || null,
      created_by: userId,
    } as any);
    setForm({ ...form, notes: '' });
  };

  const grouped = instructors.map((i) => ({
    instructor: i,
    shifts: (shifts as InstructorAvailability[]).filter((s) => s.instructor_id === i.user_id),
    color: colorForInstructor(i.user_id, colors),
  }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Disponibilidade dos professores</DialogTitle>
        </DialogHeader>

        {/* Cores */}
        <Card className="p-3 space-y-2">
          <div className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
            <Palette className="h-3.5 w-3.5" /> Cor de cada professor
          </div>
          <div className="space-y-2">
            {instructors.map((i) => {
              const cur = colorForInstructor(i.user_id, colors);
              return (
                <div key={i.user_id} className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded border" style={{ background: cur }} />
                  <span className="text-sm flex-1">{i.name}</span>
                  <div className="flex gap-1">
                    {INSTRUCTOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        onClick={() => upsertColor.mutate({ clinic_id: clinicId, instructor_id: i.user_id, color: c })}
                        className="h-5 w-5 rounded border hover:scale-110 transition"
                        style={{ background: c, outline: cur === c ? '2px solid hsl(var(--foreground))' : undefined }}
                        aria-label={`Cor ${c}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Novo turno */}
        <Card className="p-3 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Adicionar turno de trabalho</div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground">Professor</label>
              <Select value={form.instructor_id} onValueChange={(v) => setForm({ ...form, instructor_id: v })}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {instructors.map((i) => <SelectItem key={i.user_id} value={i.user_id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Dia</label>
              <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: parseInt(v) })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d.v} value={String(d.v)}>{d.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Início</label>
              <Input type="time" className="h-8" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Fim</label>
              <Input type="time" className="h-8" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Sala</label>
              <Select value={form.room_id} onValueChange={(v) => setForm({ ...form, room_id: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Qualquer</SelectItem>
                  {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground">Observações</label>
              <Input className="h-8" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button size="sm" onClick={submit} disabled={!form.instructor_id}>
              <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
            </Button>
          </div>
        </Card>

        {/* Lista por professor */}
        <div className="space-y-2">
          {grouped.map((g) => (
            <Card key={g.instructor.user_id} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded" style={{ background: g.color }} />
                <div className="text-sm font-medium flex-1">{g.instructor.name}</div>
                <span className="text-[10px] text-muted-foreground">{g.shifts.length} turno{g.shifts.length !== 1 ? 's' : ''}</span>
              </div>
              {g.shifts.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Sem turnos cadastrados</p>
              ) : (
                <div className="space-y-1">
                  {g.shifts.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)).map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-muted/40">
                      <span className="font-medium w-10">{DAYS.find((d) => d.v === s.day_of_week)?.l}</span>
                      <span>{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</span>
                      {s.room_id && <span className="text-muted-foreground">· {rooms.find((r) => r.id === s.room_id)?.name || 'sala'}</span>}
                      {s.notes && <span className="text-muted-foreground italic truncate">· {s.notes}</span>}
                      <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => remove.mutate(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
