import { useEffect, useRef, useState } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Plus, X, AlertTriangle, Repeat, Sparkles, RefreshCw, DoorOpen, Users, Check, Lock, Unlock, Trash2, Clock, MapPin, ExternalLink, Wand2, UserPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { TimelineSlot } from './CalendarTimeline';
import { INSTRUCTOR_DRAG_TYPE } from './InstructorDragPalette';
import { useMarqueeSelection, type MarqueeRect } from '@/hooks/useMarqueeSelection';
import { useConfirm } from '@/components/ConfirmProvider';

export interface Room {
  id: string;
  name: string;
  capacity?: number | null;
  color?: string | null;
}

/** Identificador único para uma célula vazia (horário/sala que ainda não existe). */
export type EmptyCellKey = string; // formato: `${ISODay}|${hour}|${roomId ?? 'none'}`

export const makeEmptyKey = (day: Date, hour: number, roomId: string | null) =>
  `${day.toISOString().slice(0, 10)}|${hour}|${roomId ?? 'none'}`;

export const parseEmptyKey = (k: EmptyCellKey) => {
  const [date, hourStr, roomStr] = k.split('|');
  return { date, hour: parseInt(hourStr, 10), roomId: roomStr === 'none' ? null : roomStr };
};

interface Props {
  day: Date;
  rooms: Room[];
  startHour: number;
  endHour: number;
  hourHeight?: number;
  slots: TimelineSlot[];
  studentName: (id: string | null) => string;
  instructorName: (id: string | null | undefined) => string | null;
  colorOf: (id: string | null | undefined) => string;
  onCellClick: (d: Date, hour: number, roomId: string | null) => void;
  onSlotClick: (s: TimelineSlot) => void;
  onDelete?: (s: TimelineSlot) => void;
  /** Exclusão definitiva de um horário livre (bookable_slot) — remove da grade. */
  onPermanentDelete?: (s: TimelineSlot) => void;
  onPlanClick?: (s: TimelineSlot) => void;
  onAddStudent?: (s: TimelineSlot) => void;
  renderInstructorPicker?: (s: TimelineSlot) => React.ReactNode;

  // ===== Seleção múltipla =====
  selectionMode?: boolean;
  selectedSlotKeys?: Set<string>;
  selectedEmptyKeys?: Set<EmptyCellKey>;
  onToggleSlot?: (s: TimelineSlot) => void;
  onToggleEmpty?: (key: EmptyCellKey) => void;
  /** Substituir totalmente a seleção (usado pelo marquee não-aditivo). */
  onReplaceSelection?: (slotKeys: Set<string>, emptyKeys: Set<EmptyCellKey>) => void;
  /** Adicionar à seleção (usado pelo marquee aditivo Shift/Ctrl). */
  onAddSelection?: (slotKeys: Set<string>, emptyKeys: Set<EmptyCellKey>) => void;
  /** Disparado quando um arrasto de seleção termina e selecionou pelo menos 1 célula. */
  onMarqueeEnd?: (info: { slotCount: number; emptyCount: number; additive: boolean }) => void;

  // ===== Drag & drop de professor =====
  /** Indica que há um professor sendo arrastado (para destacar drop targets). */
  dragActive?: boolean;
  /** Chamado ao soltar professor sobre uma célula vazia (cria novo slot). */
  onDropInstructorOnCell?: (instructorId: string, day: Date, hour: number, roomId: string | null) => void;
  /** Chamado ao soltar professor sobre um slot existente (atribui). */
  onDropInstructorOnSlot?: (instructorId: string, slot: TimelineSlot) => void;

  /** Clique no cabeçalho de uma sala — selecionar a coluna inteira. */
  onRoomHeaderClick?: (roomId: string | null) => void;

  /**
   * Fill handle estilo Excel — usuário arrasta a alça no canto de um slot
   * verticalmente para propagar o instructor_id daquele slot às horas
   * cobertas, na mesma sala.
   */
  onFillInstructorVertical?: (args: {
    instructorId: string | null;
    roomId: string | null;
    day: Date;
    fromHour: number;
    toHour: number;
  }) => void;
}

export function RoomsTimeline({
  day, rooms, startHour, endHour, hourHeight = 64,
  slots, studentName, instructorName, colorOf,
  onCellClick, onSlotClick, onDelete, onPermanentDelete, onPlanClick, onAddStudent, renderInstructorPicker,
  selectionMode = false,
  selectedSlotKeys,
  selectedEmptyKeys,
  onToggleSlot,
  onToggleEmpty,
  onReplaceSelection,
  onAddSelection,
  onMarqueeEnd,
  dragActive = false,
  onDropInstructorOnCell,
  onDropInstructorOnSlot,
  onRoomHeaderClick,
  onFillInstructorVertical,
}: Props) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const { confirm } = useConfirm();
  const readInstructor = (e: React.DragEvent) =>
    e.dataTransfer.getData(INSTRUCTOR_DRAG_TYPE) || e.dataTransfer.getData('text/plain') || '';

  // ===== Fill handle (Excel-style) =====
  // Pressionar a alça no canto de um slot e arrastar verticalmente destaca
  // as horas cobertas na MESMA sala. Ao soltar, propaga o instructor_id.
  const [fillDrag, setFillDrag] = useState<null | {
    instructorId: string | null;
    roomId: string | null;
    fromHour: number;
    currentHour: number;
    instructorColor: string;
  }>(null);
  const fillDragRef = useRef<typeof fillDrag>(null);
  fillDragRef.current = fillDrag;

  /** Inicia o fill drag a partir de um slot existente. */
  const startFillDrag = (
    e: React.PointerEvent,
    slot: TimelineSlot,
    instructorColor: string,
  ) => {
    if (!onFillInstructorVertical) return;
    e.preventDefault();
    e.stopPropagation();
    const slotHour = parseISO(slot.scheduled_at).getHours();
    setFillDrag({
      instructorId: slot.instructor_id ?? null,
      roomId: slot.room_id ?? null,
      fromHour: slotHour,
      currentHour: slotHour,
      instructorColor,
    });
  };

  // Pointer global para acompanhar o arrasto do fill handle e finalizar.
  useEffect(() => {
    if (!fillDrag) return;
    const handleMove = (ev: PointerEvent) => {
      // Encontra a célula sob o cursor (mesma sala apenas)
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      if (!el) return;
      const cell = el.closest<HTMLElement>('[data-cell-key],[data-slot-key]');
      if (!cell) return;
      const cellKey = cell.getAttribute('data-cell-key');
      const slotKey = cell.getAttribute('data-slot-key');
      let hour: number | null = null;
      let roomId: string | null | undefined = undefined;
      if (cellKey) {
        const parsed = parseEmptyKey(cellKey);
        hour = parsed.hour;
        roomId = parsed.roomId;
      } else if (slotKey) {
        const slot = slots.find((s) => s.key === slotKey);
        if (slot) {
          hour = parseISO(slot.scheduled_at).getHours();
          roomId = slot.room_id ?? null;
        }
      }
      if (hour === null) return;
      // Só atualiza se for na MESMA sala da origem
      if (roomId !== fillDragRef.current?.roomId) return;
      if (hour !== fillDragRef.current.currentHour) {
        setFillDrag((prev) => (prev ? { ...prev, currentHour: hour! } : prev));
      }
    };
    const handleUp = () => {
      const fd = fillDragRef.current;
      setFillDrag(null);
      if (!fd) return;
      const lo = Math.min(fd.fromHour, fd.currentHour);
      const hi = Math.max(fd.fromHour, fd.currentHour);
      // Se nada se moveu, não dispara
      if (lo === hi) return;
      onFillInstructorVertical?.({
        instructorId: fd.instructorId,
        roomId: fd.roomId,
        day,
        fromHour: lo,
        toHour: hi,
      });
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [fillDrag, slots, day, onFillInstructorVertical]);


  // ===== Marquee (Excel-style drag select) =====
  const baseSlotKeysRef = useRef<Set<string>>(new Set());
  const baseEmptyKeysRef = useRef<Set<EmptyCellKey>>(new Set());
  const collectInRect = (rect: MarqueeRect, container: HTMLElement) => {
    const cRect = container.getBoundingClientRect();
    const absLeft = cRect.left + rect.left - container.scrollLeft;
    const absTop = cRect.top + rect.top - container.scrollTop;
    const absRight = absLeft + rect.width;
    const absBottom = absTop + rect.height;
    const slotKeys = new Set<string>();
    const emptyKeys = new Set<EmptyCellKey>();
    container.querySelectorAll<HTMLElement>('[data-cell-key],[data-slot-key]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const intersects = r.right >= absLeft && r.left <= absRight && r.bottom >= absTop && r.top <= absBottom;
      if (!intersects) return;
      const slotK = el.getAttribute('data-slot-key');
      const cellK = el.getAttribute('data-cell-key');
      if (slotK && el.getAttribute('data-selectable') !== 'false') slotKeys.add(slotK);
      if (cellK) emptyKeys.add(cellK);
    });
    return { slotKeys, emptyKeys };
  };

  const marquee = useMarqueeSelection({
    disabled: !(onReplaceSelection || onAddSelection),
    onUpdate: (rect, additive) => {
      const container = marquee.containerRef.current;
      if (!container) return;
      const { slotKeys, emptyKeys } = collectInRect(rect, container);
      if (additive) {
        const sk = new Set(baseSlotKeysRef.current);
        slotKeys.forEach((k) => sk.add(k));
        const ek = new Set(baseEmptyKeysRef.current);
        emptyKeys.forEach((k) => ek.add(k));
        onReplaceSelection?.(sk, ek);
      } else {
        onReplaceSelection?.(slotKeys, emptyKeys);
      }
    },
    onEnd: (rect, additive) => {
      const container = marquee.containerRef.current;
      if (!container || !rect) return;
      const { slotKeys, emptyKeys } = collectInRect(rect, container);
      const total = slotKeys.size + emptyKeys.size;
      if (total > 0) onMarqueeEnd?.({ slotCount: slotKeys.size, emptyCount: emptyKeys.size, additive });
    },
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    // captura snapshot da seleção atual para modo aditivo
    baseSlotKeysRef.current = new Set(selectedSlotKeys ?? []);
    baseEmptyKeysRef.current = new Set(selectedEmptyKeys ?? []);
    marquee.onPointerDown(e);
  };


  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const totalHeight = hours.length * hourHeight;
  const minutesToTop = (date: Date) => {
    const m = (date.getHours() - startHour) * 60 + date.getMinutes();
    return (m / 60) * hourHeight;
  };
  const now = new Date();
  const isToday = isSameDay(day, now);

  const hasOrphan = slots.some((s) => !s.room_id);
  const cols: (Room | { id: null; name: string; capacity?: number | null })[] = [
    ...rooms,
    ...(hasOrphan ? [{ id: null as null, name: 'Sem sala' }] : []),
  ];

  const slotsForRoom = (roomId: string | null) =>
    slots.filter((s) => (s.room_id ?? null) === roomId);

  const occupancyAt = (roomId: string | null, hour: number) => {
    if (!roomId) return null;
    const room = rooms.find((r) => r.id === roomId);
    const cap = room?.capacity;
    if (!cap) return null;
    const used = slotsForRoom(roomId).filter((s) => {
      if (s.isOpen) return false;
      return parseISO(s.scheduled_at).getHours() === hour;
    }).length;
    return { used, cap };
  };

  return (
    <div className="border rounded-md overflow-hidden bg-card">
      <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: `60px repeat(${cols.length}, minmax(120px, 1fr))` }}>
        <div />
        {cols.map((r) => (
          <button
            key={r.id ?? 'orphan'}
            type="button"
            onClick={() => onRoomHeaderClick?.(r.id ?? null)}
            className={cn(
              'px-2 py-2 text-center border-l transition',
              onRoomHeaderClick && 'hover:bg-primary/10 cursor-pointer',
            )}
            title={onRoomHeaderClick ? `Selecionar coluna · ${r.name}` : r.name}
          >
            <div className="flex items-center justify-center gap-1 text-sm font-semibold truncate">
              <DoorOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{r.name}</span>
            </div>
            {('capacity' in r && r.capacity) ? (
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                <Users className="h-2.5 w-2.5" />cap. {r.capacity}
              </div>
            ) : null}
          </button>
        ))}
      </div>

      <div
        ref={marquee.containerRef}
        onPointerDown={handlePointerDown}
        className="grid relative overflow-x-auto select-none"
        style={{ gridTemplateColumns: `60px repeat(${cols.length}, minmax(120px, 1fr))`, height: totalHeight }}
      >
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

        {cols.map((r) => {
          const roomSlots = slotsForRoom(r.id);
          return (
            <div key={r.id ?? 'orphan'} className="relative border-l">
              {hours.map((h) => {
                const occ = occupancyAt(r.id, h);
                const full = occ && occ.used >= occ.cap;
                const emptyKey = makeEmptyKey(day, h, r.id);
                const emptySelected = selectionMode && selectedEmptyKeys?.has(emptyKey);
                const cellHoverKey = `cell-${r.id ?? 'orphan'}-${h}`;
                const isDropHover = hoverKey === cellHoverKey;
                // Destaca células-alvo do fill handle (mesma sala, dentro do range)
                const isFillTarget = !!fillDrag
                  && fillDrag.roomId === r.id
                  && h !== fillDrag.fromHour
                  && h >= Math.min(fillDrag.fromHour, fillDrag.currentHour)
                  && h <= Math.max(fillDrag.fromHour, fillDrag.currentHour);
                // Horário passado: dia anterior ao hoje OU hora < agora no mesmo dia
                const cellDate = new Date(day);
                cellDate.setHours(h + 1, 0, 0, 0); // fim da hora
                const isPast = cellDate.getTime() <= now.getTime();
                return (
                  <button
                    key={h}
                    data-cell-key={emptyKey}
                    disabled={isPast}
                    onClick={(e) => {
                      if (isPast) return;
                      if (marquee.didDrag()) return;
                      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
                      if (selectionMode || additive) {
                        if (additive && onAddSelection) {
                          onAddSelection(new Set(), new Set([emptyKey]));
                        } else {
                          onToggleEmpty?.(emptyKey);
                        }
                      } else {
                        onCellClick(day, h, r.id);
                      }
                    }}
                    onDragOver={(e) => {
                      if (isPast) return;
                      if (!onDropInstructorOnCell) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      if (hoverKey !== cellHoverKey) setHoverKey(cellHoverKey);
                    }}
                    onDragLeave={() => { if (hoverKey === cellHoverKey) setHoverKey(null); }}
                    onDrop={(e) => {
                      if (isPast) return;
                      if (!onDropInstructorOnCell) return;
                      e.preventDefault();
                      const id = readInstructor(e);
                      setHoverKey(null);
                      if (id) onDropInstructorOnCell(id, day, h, r.id);
                    }}
                    title={
                      isPast
                        ? `Horário já passou — ${String(h).padStart(2, '0')}:00`
                        : selectionMode
                          ? `${emptySelected ? 'Remover' : 'Selecionar'} ${String(h).padStart(2, '0')}:00 em ${r.name}`
                          : dragActive
                            ? `Soltar professor às ${String(h).padStart(2, '0')}:00 em ${r.name}`
                            : `Adicionar aula às ${String(h).padStart(2, '0')}:00 em ${r.name}`
                    }
                    className={cn(
                      'absolute left-0 right-0 border-t border-border/40 transition group',
                      !isPast && 'hover:bg-primary/5',
                      isPast && 'bg-muted/30 cursor-not-allowed opacity-60',
                      full && !isPast && 'bg-destructive/[0.04]',
                      emptySelected && 'bg-primary/15 ring-2 ring-inset ring-primary',
                      dragActive && !isPast && 'bg-primary/[0.04]',
                      isDropHover && 'bg-primary/20 ring-2 ring-inset ring-primary',
                      isFillTarget && 'bg-primary/10 ring-1 ring-inset ring-primary/60',
                    )}
                    style={{ top: (h - startHour) * hourHeight, height: hourHeight }}
                  >
                    {!isPast && (emptySelected ? (
                      <Check className="h-3.5 w-3.5 text-primary absolute top-1 right-1" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-70 absolute top-1 right-1" />
                    ))}
                    {occ && (
                      <span className={cn(
                        'absolute bottom-0.5 left-1 text-[9px] font-bold px-1 rounded',
                        full ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary',
                      )}>
                        {occ.used}/{occ.cap}
                      </span>
                    )}
                  </button>
                );

              })}

              {isToday && now.getHours() >= startHour && now.getHours() < endHour && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: minutesToTop(now) }}
                >
                  <div className="h-px bg-destructive" />
                  <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                </div>
              )}

              {roomSlots.map((s) => {
                const t = parseISO(s.scheduled_at);
                const top = minutesToTop(t);
                const height = Math.max(22, (s.duration_minutes / 60) * hourHeight - 2);
                if (top < 0 || top >= totalHeight) return null;
                const color = colorOf(s.instructor_id);
                const instr = instructorName(s.instructor_id);
                const isSelected = selectionMode && selectedSlotKeys?.has(s.key);
                const canSelect = selectionMode && (s.appointment_id || s.bookable_slot_id);

                const slotHoverKey = `slot-${s.key}`;
                const isSlotDropHover = hoverKey === slotHoverKey;
                const slotHour = t.getHours();
                const slotIsFillTarget = !!fillDrag
                  && fillDrag.roomId === (s.room_id ?? null)
                  && slotHour !== fillDrag.fromHour
                  && slotHour >= Math.min(fillDrag.fromHour, fillDrag.currentHour)
                  && slotHour <= Math.max(fillDrag.fromHour, fillDrag.currentHour);
                const slotIsFillOrigin = !!fillDrag
                  && fillDrag.roomId === (s.room_id ?? null)
                  && slotHour === fillDrag.fromHour;
                const canFillFrom = !!onFillInstructorVertical
                  && !s.isBlocked
                  && !s.isOpen
                  && !!s.instructor_id;
                const eventBox = (
                  <div
                    role="button"
                    tabIndex={0}
                    data-slot-key={s.key}
                    data-selectable={(s.appointment_id || s.bookable_slot_id) ? 'true' : 'false'}
                    onDragOver={(e) => {
                      if (!onDropInstructorOnSlot) return;
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'copy';
                      if (hoverKey !== slotHoverKey) setHoverKey(slotHoverKey);
                    }}
                    onDragLeave={() => { if (hoverKey === slotHoverKey) setHoverKey(null); }}
                    onDrop={(e) => {
                      if (!onDropInstructorOnSlot) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const id = readInstructor(e);
                      setHoverKey(null);
                      if (id) onDropInstructorOnSlot(id, s);
                    }}
                    onClick={(e) => {
                      // intercept Shift/Ctrl click for additive selection
                      if ((e.shiftKey || e.metaKey || e.ctrlKey) && (s.appointment_id || s.bookable_slot_id)) {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddSelection?.(new Set([s.key]), new Set());
                      }
                    }}
                    style={{
                      top: top + 1,
                      height,
                      borderLeftColor: s.uncovered ? 'hsl(var(--destructive))' : (color || 'hsl(var(--primary))'),
                    }}
                    className={cn(
                      'absolute left-1 right-1 z-10 rounded border border-l-4 px-1.5 py-1 text-[10px] cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/30 transition shadow-sm',
                      s.isBlocked
                        ? 'bg-muted/60 border-muted-foreground/40 border-dashed opacity-80'
                        : s.isOpen
                          ? 'bg-emerald-500/10 border-emerald-500/30 border-dashed'
                          : s.isProjected
                            ? 'bg-amber-500/10 border-amber-500/40 border-dashed'
                            : s.isVirtual
                              ? 'bg-card border-dashed'
                              : 'bg-card',
                      s.uncovered && !s.isOpen && !s.isBlocked && 'bg-destructive/5',
                      isSelected && 'ring-2 ring-primary bg-primary/10',
                      selectionMode && !canSelect && 'opacity-50',
                      isSlotDropHover && 'ring-2 ring-primary bg-primary/15',
                      slotIsFillTarget && 'ring-2 ring-primary bg-primary/15',
                      slotIsFillOrigin && 'ring-2 ring-primary',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 leading-tight">
                      <span className="font-bold">{format(t, 'HH:mm')}</span>
                      <div className="flex items-center gap-0.5">
                        {isSelected && <Check className="h-2.5 w-2.5 text-primary" />}
                        {s.isBlocked && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                        {s.uncovered && !s.isBlocked && <AlertTriangle className="h-2.5 w-2.5 text-destructive" />}
                        {s.isProjected && <RefreshCw className="h-2.5 w-2.5 text-amber-600" />}
                        {s.isVirtual && !s.isProjected && <Repeat className="h-2.5 w-2.5 text-muted-foreground" />}
                        {s.hasGrade && <Sparkles className="h-2.5 w-2.5 text-primary" />}
                      </div>
                    </div>
                    <div className="truncate font-medium">
                      {s.isBlocked
                        ? <span className="italic text-muted-foreground">Bloqueado</span>
                        : s.isOpen
                          ? <span className="italic text-emerald-700 dark:text-emerald-400">Livre</span>
                          : studentName(s.student_id)}
                    </div>
                    {instr && height > 36 && !s.isBlocked && (
                      <div className="truncate text-muted-foreground">{instr}</div>
                    )}
                    {canFillFrom && !selectionMode && (
                      <span
                        role="presentation"
                        title="Arraste para preencher horários abaixo/acima com este professor"
                        onPointerDown={(ev) => startFillDrag(ev, s, color)}
                        onClick={(ev) => { ev.stopPropagation(); }}
                        className="absolute -bottom-1 -right-1 z-20 h-2.5 w-2.5 rounded-sm border border-card cursor-ns-resize hover:scale-125 transition-transform"
                        style={{ background: color || 'hsl(var(--primary))' }}
                      />
                    )}
                  </div>
                );


                if (selectionMode) {
                  return (
                    <div
                      key={s.key}
                      onClick={() => canSelect && onToggleSlot?.(s)}
                      style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
                    >
                      {eventBox}
                    </div>
                  );
                }

                return (
                  <Popover key={s.key}>
                    <PopoverTrigger asChild>{eventBox}</PopoverTrigger>
                    <PopoverContent
                      className="w-72 p-0 text-xs overflow-hidden border-border shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      {/* Header */}
                      <div
                        className={cn(
                          'px-3 py-2.5 border-b',
                          s.isBlocked ? 'bg-destructive/5' : s.isOpen ? 'bg-emerald-500/5' : 'bg-muted/40'
                        )}
                      >
                        <div className="font-serif text-[15px] leading-tight tracking-tight">
                          {s.isBlocked
                            ? 'Horário bloqueado'
                            : s.isOpen
                              ? 'Horário disponível'
                              : studentName(s.student_id)}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">
                            {format(t, "EEE dd/MM '·' HH:mm", { locale: ptBR })}
                          </span>
                          <span className="opacity-60">·</span>
                          <span>{s.duration_minutes}min</span>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="px-3 py-2 space-y-1.5 border-b bg-background">
                        <div className="flex items-center gap-1.5 text-[11.5px] text-foreground/80">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{r.name}</span>
                        </div>
                        {instr && !s.isBlocked && (
                          <div className="flex items-center gap-1.5 text-[11.5px] text-foreground/80">
                            <span
                              className="h-2.5 w-2.5 rounded-full ring-1 ring-border shrink-0"
                              style={{ background: color }}
                            />
                            <span>{instr}</span>
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="p-2 grid grid-cols-2 gap-1.5">
                        {!s.isBlocked && (
                          <button
                            onClick={() => onSlotClick(s)}
                            className="px-2 py-2 rounded-md border border-border bg-background hover:bg-muted inline-flex items-center justify-center gap-1.5 text-[11.5px] font-medium transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />Abrir
                          </button>
                        )}
                        {!s.isBlocked && onAddStudent && (
                          <button
                            onClick={() => onAddStudent(s)}
                            className="px-2 py-2 rounded-md border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/5 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-medium transition-colors"
                            title="Adicionar aluno a esta aula"
                          >
                            <UserPlus className="h-3.5 w-3.5" />Adicionar
                          </button>
                        )}
                        {!s.isBlocked && s.appointment_id && onPlanClick && (
                          <button
                            onClick={() => onPlanClick(s)}
                            className="px-2 py-2 rounded-md border border-primary/40 text-primary hover:bg-primary/5 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-medium transition-colors"
                            title="Planejar sequência de exercícios"
                          >
                            <Wand2 className="h-3.5 w-3.5" />Planejar
                          </button>
                        )}
                        {!s.isBlocked && renderInstructorPicker && (
                          <div className="contents">{renderInstructorPicker(s)}</div>
                        )}
                        {onDelete && (s.appointment_id || s.bookable_slot_id) && (
                          s.isBlocked ? (
                            <button
                              onClick={() => onDelete(s)}
                              className="col-span-2 px-2 py-2 rounded-md border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/5 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-medium transition-colors"
                            >
                              <Unlock className="h-3.5 w-3.5" />Desbloquear
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const isAppointment = !!s.appointment_id;
                                const ok = await confirm({
                                  title: isAppointment ? 'Cancelar aula' : 'Bloquear horário',
                                  description: isAppointment
                                    ? 'Cancelar esta aula?'
                                    : 'Bloquear este horário? Ele continuará na grade mas ninguém poderá agendar.',
                                  destructive: isAppointment,
                                  confirmText: isAppointment ? 'Cancelar aula' : 'Bloquear',
                                });
                                if (ok) onDelete(s);
                              }}
                              className="px-2 py-2 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center justify-center gap-1.5 text-[11.5px] font-medium transition-colors"
                              title={s.appointment_id ? 'Cancelar aula' : 'Bloquear horário'}
                            >
                              {s.appointment_id ? <X className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                              {s.appointment_id ? 'Cancelar' : 'Bloquear'}
                            </button>
                          )
                        )}
                        {onPermanentDelete && s.bookable_slot_id && !s.appointment_id && (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Excluir horário',
                                description: 'Excluir definitivamente este horário disponível da grade? Esta ação não pode ser desfeita.',
                                destructive: true,
                                confirmText: 'Excluir',
                              });
                              if (ok) onPermanentDelete(s);
                            }}
                            className="px-2 py-2 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/5 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-medium transition-colors"
                            title="Excluir horário definitivamente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />Excluir
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

        {/* Marquee selection rectangle */}
        {marquee.state.active && marquee.state.rect && (
          <div
            className="absolute z-30 pointer-events-none border-2 border-primary bg-primary/10 rounded-sm"
            style={{
              left: marquee.state.rect.left,
              top: marquee.state.rect.top,
              width: marquee.state.rect.width,
              height: marquee.state.rect.height,
            }}
          />
        )}
      </div>
    </div>
  );
}
