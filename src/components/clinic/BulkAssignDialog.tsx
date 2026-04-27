import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, DoorOpen, UserCog, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkAssignValues {
  instructorId: string | null;
  roomId: string | null;
  durationMinutes: number;
}

interface Room { id: string; name: string; color?: string | null; capacity?: number | null }
interface Instructor { user_id: string; name: string | null }

interface Props {
  open: boolean;
  onClose: () => void;
  /** Quantidade de horários a serem afetados (mostrado no header). */
  count: number;
  /** Modo de uso: criar novos slots ou reatribuir os existentes. */
  mode: 'create' | 'reassign';
  rooms: Room[];
  instructors: Instructor[];
  /** Cor por professor (mesmo helper do GradeMaster). */
  colorOf: (id: string | null | undefined) => string;
  /** Cor por sala. */
  roomColorOf: (id: string | null | undefined) => string | null;
  /** Defaults iniciais (ex.: sala da primeira célula). */
  initial?: Partial<BulkAssignValues>;
  onConfirm: (values: BulkAssignValues) => Promise<void> | void;
}

export function BulkAssignDialog({
  open, onClose, count, mode, rooms, instructors, colorOf, roomColorOf, initial, onConfirm,
}: Props) {
  const [instructorId, setInstructorId] = useState<string | null>(initial?.instructorId ?? null);
  const [roomId, setRoomId] = useState<string | null>(initial?.roomId ?? null);
  const [duration, setDuration] = useState<number>(initial?.durationMinutes ?? 50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setInstructorId(initial?.instructorId ?? null);
      setRoomId(initial?.roomId ?? null);
      setDuration(initial?.durationMinutes ?? 50);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm({ instructorId, roomId, durationMinutes: duration });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isCreate = mode === 'create';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
            {isCreate ? `Criar ${count} horário${count !== 1 ? 's' : ''}` : `Atribuir em ${count} horário${count !== 1 ? 's' : ''}`}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Defina o professor e a sala que serão aplicados a todos os horários selecionados.'
              : 'Atualiza professor e sala dos horários marcados de uma só vez.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Professor */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <UserCog className="h-3.5 w-3.5" /> Professor
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInstructorId(null)}
                className={cn(
                  'px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition',
                  instructorId === null ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                Sem professor
              </button>
              {instructors.map((i) => {
                const active = instructorId === i.user_id;
                const color = colorOf(i.user_id);
                return (
                  <button
                    key={i.user_id}
                    type="button"
                    onClick={() => setInstructorId(i.user_id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition',
                      active ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'hover:bg-muted/50',
                    )}
                    style={active ? { borderColor: color } : undefined}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    {i.name || `Prof. ${i.user_id.slice(0, 4)}`}
                  </button>
                );
              })}
              {instructors.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhum professor cadastrado.</span>
              )}
            </div>
          </div>

          {/* Sala */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <DoorOpen className="h-3.5 w-3.5" /> Sala
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRoomId(null)}
                className={cn(
                  'px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition',
                  roomId === null ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                Sem sala
              </button>
              {rooms.map((r) => {
                const active = roomId === r.id;
                const color = roomColorOf(r.id) || 'hsl(var(--muted))';
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoomId(r.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition',
                      active ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'hover:bg-muted/50',
                    )}
                    style={active ? { borderColor: color } : undefined}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    {r.name}
                    {r.capacity ? <span className="text-[10px] text-muted-foreground">({r.capacity})</span> : null}
                  </button>
                );
              })}
              {rooms.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhuma sala cadastrada.</span>
              )}
            </div>
          </div>

          {/* Duração — só faz sentido na criação */}
          {isCreate && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Duração (min)
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1">
                  {[30, 45, 50, 60, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m)}
                      className={cn(
                        'px-2.5 py-1 rounded-md border text-xs',
                        duration === m ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <Input
                  inputMode="numeric"
                  value={String(duration)}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setDuration(parseInt(v || '50', 10));
                  }}
                  className="h-8 w-20"
                />
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="rounded-md border bg-muted/30 p-3 text-xs flex flex-wrap items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Aplicar em</span>
            <Badge variant="secondary">{count} horário{count !== 1 ? 's' : ''}</Badge>
            {instructorId && (
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: colorOf(instructorId) }} />
                {instructors.find((i) => i.user_id === instructorId)?.name || 'Prof.'}
              </Badge>
            )}
            {roomId && (
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: roomColorOf(roomId) || '' }} />
                {rooms.find((r) => r.id === roomId)?.name}
              </Badge>
            )}
            {isCreate && <Badge variant="outline">{duration} min</Badge>}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>Cancelar</Button>
            <Button onClick={handleConfirm} className="flex-1" disabled={saving}>
              {saving ? 'Salvando...' : isCreate ? 'Criar horários' : 'Atribuir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
