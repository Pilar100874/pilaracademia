import { useRef, useState } from 'react';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Plus, X, AlertTriangle, Repeat, Sparkles, Users, RefreshCw, Check, Lock, Unlock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { INSTRUCTOR_DRAG_TYPE } from './InstructorDragPalette';
import { useMarqueeSelection, type MarqueeRect } from '@/hooks/useMarqueeSelection';
import { useConfirm } from '@/components/ConfirmProvider';

/** Empty-cell key for week view. Compatible with RoomsTimeline format: `${ISODate}|${hour}|${roomId ?? 'none'}`. */
export type WeekEmptyKey = string;
export const makeWeekEmptyKey = (d: Date, hour: number, roomId: string | null = null) =>
  `${d.toISOString().slice(0, 10)}|${hour}|${roomId ?? 'none'}`;
export const parseWeekEmptyKey = (k: WeekEmptyKey) => {
  const [date, h, roomId] = k.split('|');
  return { date, hour: parseInt(h, 10), roomId: roomId === 'none' ? null : roomId };
};

interface RoomLite { id: string; name: string; capacity?: number | null }

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
  isBlocked?: boolean;
  hasGrade?: boolean;
  uncovered?: boolean;
  appointment_id?: string;
  bookable_slot_id?: string;
  recurring_id?: string;
  /** Bloqueio padrão recorrente (ex: almoço). Quando setado, "Desbloquear" cria exceção. */
  blockedPeriodId?: string;
  blockedPeriodName?: string;
  blockedPeriodColor?: string | null;
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
  onCellClick: (d: Date, hour: number, roomId?: string | null) => void;
  onSlotClick: (s: TimelineSlot) => void;
  onDelete?: (s: TimelineSlot) => void;
  renderInstructorPicker?: (s: TimelineSlot) => React.ReactNode;
  // Drag & drop de professor
  dragActive?: boolean;
  onDropInstructorOnCell?: (instructorId: string, day: Date, hour: number, roomId?: string | null) => void;
  onDropInstructorOnSlot?: (instructorId: string, slot: TimelineSlot) => void;
  // Seleção múltipla (marquee + Shift/Ctrl)
  selectedSlotKeys?: Set<string>;
  selectedEmptyKeys?: Set<WeekEmptyKey>;
  onReplaceSelection?: (slotKeys: Set<string>, emptyKeys: Set<WeekEmptyKey>) => void;
  onAddSelection?: (slotKeys: Set<string>, emptyKeys: Set<WeekEmptyKey>) => void;
  onMarqueeEnd?: (info: { slotCount: number; emptyCount: number; additive: boolean }) => void;
  /** Quando informado e com pelo menos 1 sala, cada dia ganha sub-colunas por sala. */
  rooms?: RoomLite[];
  /** Clique no sub-cabeçalho de uma sala (no dia D) — para selecionar a coluna.
   * O segundo argumento `allDays` é true quando o usuário usou Shift/Ctrl/Cmd
   * para indicar "selecionar essa sala em TODOS os dias visíveis". */
  onRoomColumnClick?: (day: Date, roomId: string | null, allDays: boolean) => void;
}

export function CalendarTimeline({
  days, startHour, endHour, hourHeight = 56,
  slotsForDay, studentName, instructorName, roomName, roomColorOf, colorOf,
  onCellClick, onSlotClick, onDelete, renderInstructorPicker,
  dragActive = false, onDropInstructorOnCell, onDropInstructorOnSlot,
  selectedSlotKeys, selectedEmptyKeys,
  onReplaceSelection, onAddSelection, onMarqueeEnd,
  rooms,
  onRoomColumnClick,
}: Props) {
  const splitByRoom = !!rooms && rooms.length > 0;
  // Sub-colunas: se houver salas, cada dia tem N colunas (1 por sala). Caso contrário, 1.
  const subCols: (RoomLite | null)[] = splitByRoom ? (rooms as RoomLite[]) : [null];
  const colsPerDay = subCols.length;
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const { confirm } = useConfirm();
  const readInstructor = (e: React.DragEvent) =>
    e.dataTransfer.getData(INSTRUCTOR_DRAG_TYPE) || e.dataTransfer.getData('text/plain') || '';

  // ===== Marquee =====
  const baseSlotKeysRef = useRef<Set<string>>(new Set());
  const baseEmptyKeysRef = useRef<Set<WeekEmptyKey>>(new Set());
  const collectInRect = (rect: MarqueeRect, container: HTMLElement) => {
    const cRect = container.getBoundingClientRect();
    const absLeft = cRect.left + rect.left - container.scrollLeft;
    const absTop = cRect.top + rect.top - container.scrollTop;
    const absRight = absLeft + rect.width;
    const absBottom = absTop + rect.height;
    const slotKeys = new Set<string>();
    const emptyKeys = new Set<WeekEmptyKey>();
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
        const sk = new Set(baseSlotKeysRef.current); slotKeys.forEach((k) => sk.add(k));
        const ek = new Set(baseEmptyKeysRef.current); emptyKeys.forEach((k) => ek.add(k));
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

  return (
    <div className="border rounded-md overflow-hidden bg-card overflow-x-auto">
      {/* Header dos dias */}
      <div
        className="grid border-b bg-muted/40 backdrop-blur-sm sticky top-0 z-20"
        style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(${splitByRoom ? colsPerDay * 110 : 120}px, 1fr))` }}
      >
        <div className="border-r border-border/60" />
        {days.map((d) => {
          const isToday = isSameDay(d, now);
          return (
            <div key={d.toISOString()} className={cn('border-l border-border/60', isToday && 'bg-primary/10')}>
              <div className="px-2 pt-2.5 pb-1.5 text-center">
                <div className={cn('text-[11px] uppercase tracking-wider font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {format(d, 'EEE', { locale: ptBR })}
                </div>
                <div className={cn('text-lg font-bold leading-tight mt-0.5', isToday && 'text-primary')}>
                  {format(d, 'd/MM')}
                </div>
              </div>
              {splitByRoom && (
                <div className="grid border-t border-border/40 bg-card/50" style={{ gridTemplateColumns: `repeat(${colsPerDay}, minmax(0, 1fr))` }}>
                  {subCols.map((r, i) => (
                    <button
                      key={r?.id ?? i}
                      type="button"
                      onClick={(e) => {
                        const allDays = e.shiftKey || e.metaKey || e.ctrlKey;
                        onRoomColumnClick?.(d, r?.id ?? null, allDays);
                      }}
                      className={cn(
                        'px-1.5 py-1.5 text-[10px] font-semibold truncate text-center flex items-center justify-center gap-1.5 transition',
                        i > 0 && 'border-l border-border/40',
                        onRoomColumnClick && 'hover:bg-primary/10 cursor-pointer',
                      )}
                      title={onRoomColumnClick ? `Clique: coluna do dia · Shift+clique: a sala em toda a semana` : r?.name}
                    >
                      <span
                        className="h-2 w-2 rounded-sm shrink-0 border border-border/60"
                        style={{ background: roomColorOf?.(r?.id ?? null) || 'hsl(var(--muted))' }}
                      />
                      <span className="truncate text-foreground/80">{r?.name ?? '—'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid principal com timeline */}
      <div
        ref={marquee.containerRef}
        onPointerDown={handlePointerDown}
        className="grid relative select-none"
        style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(${splitByRoom ? colsPerDay * 110 : 120}px, 1fr))`, height: totalHeight }}
      >
        {/* Coluna de horas */}
        <div className="relative bg-muted/20 border-r border-border/60">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-border/60"
              style={{ top: (h - startHour) * hourHeight, height: hourHeight }}
            >
              <div className="text-[11px] font-semibold text-muted-foreground/90 text-right pr-2.5 pt-1 tabular-nums">
                {String(h).padStart(2, '0')}:00
              </div>
              {/* meia-hora marcador sutil */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-border/30"
                style={{ top: hourHeight / 2 }}
                aria-hidden
              />
            </div>
          ))}
        </div>

        {/* Colunas de dias */}
        {days.map((d) => {
          const isToday = isSameDay(d, now);
          const allSlots = slotsForDay(d);
          const showNow = isToday && now.getHours() >= startHour && now.getHours() < endHour;

          // Sub-colunas: filtra slots por sala. Slots sem sala vão para a 1ª sub-coluna quando dividindo.
          const renderSubCol = (subRoom: RoomLite | null, subIdx: number) => {
            const subRoomId: string | null = subRoom?.id ?? null;
            const slots = splitByRoom
              ? allSlots.filter((s) => (s.room_id ?? null) === subRoomId || (subIdx === 0 && !s.room_id && !subRoomId))
              : allSlots;

            // Ocupação por hora (apenas sub-colunas com sala + capacidade definida)
            const cap = subRoom?.capacity ?? null;
            const occupancyByHour = new Map<number, { used: number; ratio: number; status: 'free' | 'low' | 'mid' | 'full' }>();
            if (cap && cap > 0) {
              hours.forEach((h) => {
                const used = slots.filter((s) => {
                  if (s.isOpen || s.isBlocked) return false;
                  const t = parseISO(s.scheduled_at);
                  return t.getHours() === h;
                }).length;
                const ratio = Math.min(1, used / cap);
                const status: 'free' | 'low' | 'mid' | 'full' =
                  used === 0 ? 'free' : ratio >= 1 ? 'full' : ratio >= 0.66 ? 'mid' : 'low';
                occupancyByHour.set(h, { used, ratio, status });
              });
            }

            return (
              <div
                key={subRoom?.id ?? `sub-${subIdx}`}
                className={cn('relative', subIdx > 0 && 'border-l border-border/40')}
                style={{ height: totalHeight }}
              >
                {/* linhas de hora clicáveis */}
                {hours.map((h) => {
                  const cellKey = `cell-${d.toISOString()}-${h}-${subRoomId ?? 'none'}`;
                  const weekKey = makeWeekEmptyKey(d, h, subRoomId);
                  const isHover = hoverKey === cellKey;
                  const isSelected = selectedEmptyKeys?.has(weekKey);
                  const occ = occupancyByHour.get(h);
                  const isFull = occ?.status === 'full';
                  const statusBg =
                    occ?.status === 'full' ? 'bg-destructive/10' :
                    occ?.status === 'mid'  ? 'bg-amber-500/10' :
                    occ?.status === 'low'  ? 'bg-emerald-500/[0.06]' :
                    '';
                  const statusBar =
                    occ?.status === 'full' ? 'bg-destructive' :
                    occ?.status === 'mid'  ? 'bg-amber-500' :
                    occ?.status === 'low'  ? 'bg-emerald-500' :
                    'bg-transparent';
                  return (
                    <button
                      key={h}
                      data-cell-key={weekKey}
                      onClick={(e) => {
                        if (marquee.didDrag()) return;
                        const additive = e.shiftKey || e.metaKey || e.ctrlKey;
                        if (additive) {
                          onAddSelection?.(new Set(), new Set([weekKey]));
                        } else {
                          onCellClick(d, h, subRoomId);
                        }
                      }}
                      onDragOver={(e) => {
                        if (!onDropInstructorOnCell) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                        if (hoverKey !== cellKey) setHoverKey(cellKey);
                      }}
                      onDragLeave={() => { if (hoverKey === cellKey) setHoverKey(null); }}
                      onDrop={(e) => {
                        if (!onDropInstructorOnCell) return;
                        e.preventDefault();
                        const id = readInstructor(e);
                        setHoverKey(null);
                        if (id) onDropInstructorOnCell(id, d, h, subRoomId);
                      }}
                      title={
                        occ && cap
                          ? `${occ.used}/${cap} ${isFull ? '· LOTADA' : occ.status === 'mid' ? '· quase cheia' : ''}${subRoom ? ` · ${subRoom.name}` : ''} às ${String(h).padStart(2, '0')}:00`
                          : dragActive
                            ? `Soltar professor às ${String(h).padStart(2, '0')}:00${subRoom ? ` · ${subRoom.name}` : ''}`
                            : `Adicionar aula às ${String(h).padStart(2, '0')}:00${subRoom ? ` · ${subRoom.name}` : ''}`
                      }
                      className={cn(
                        'absolute left-0 right-0 border-t border-border/40 hover:bg-primary/5 transition group',
                        statusBg,
                        dragActive && 'bg-primary/[0.03]',
                        isHover && 'bg-primary/20 ring-2 ring-inset ring-primary',
                        isSelected && 'bg-primary/15 ring-2 ring-inset ring-primary',
                      )}
                      style={{ top: (h - startHour) * hourHeight, height: hourHeight }}
                    >
                      {/* Barra de status de ocupação (lateral esquerda) */}
                      {occ && (
                        <span
                          className={cn('absolute left-0 top-0 bottom-0 w-[3px]', statusBar)}
                          aria-hidden
                        />
                      )}
                      {/* Badge de capacidade (canto inferior esquerdo) */}
                      {occ && cap && occ.used > 0 && (
                        <span
                          className={cn(
                            'absolute bottom-0.5 left-1.5 text-[9px] font-bold tabular-nums px-1 rounded-sm leading-tight',
                            occ.status === 'full' && 'bg-destructive text-destructive-foreground',
                            occ.status === 'mid' && 'bg-amber-500 text-white',
                            occ.status === 'low' && 'bg-emerald-500/90 text-white',
                          )}
                        >
                          {occ.used}/{cap}
                        </span>
                      )}
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-primary absolute top-1 right-1" />
                      ) : isFull ? (
                        <span className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-wider text-destructive">
                          Lotada
                        </span>
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-70 absolute top-1 right-1" />
                      )}
                    </button>
                  );
                })}

                {/* now indicator (apenas na primeira sub-coluna) */}
                {showNow && subIdx === 0 && (
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
                  const slotKey = `slot-${s.key}`;
                  const isSlotHover = hoverKey === slotKey;
                  const isSelected = selectedSlotKeys?.has(s.key);
                  return (
                    <Popover key={s.key}>
                      <PopoverTrigger asChild>
                        <div
                          role="button"
                          tabIndex={0}
                          data-slot-key={s.key}
                          data-selectable={(s.appointment_id || s.bookable_slot_id) ? 'true' : 'false'}
                          onClick={(e) => {
                            if ((e.shiftKey || e.metaKey || e.ctrlKey) && (s.appointment_id || s.bookable_slot_id)) {
                              e.preventDefault();
                              e.stopPropagation();
                              onAddSelection?.(new Set([s.key]), new Set());
                            }
                          }}
                          onDragOver={(e) => {
                            if (!onDropInstructorOnSlot) return;
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'copy';
                            if (hoverKey !== slotKey) setHoverKey(slotKey);
                          }}
                          onDragLeave={() => { if (hoverKey === slotKey) setHoverKey(null); }}
                          onDrop={(e) => {
                            if (!onDropInstructorOnSlot) return;
                            e.preventDefault();
                            e.stopPropagation();
                            const id = readInstructor(e);
                            setHoverKey(null);
                            if (id) onDropInstructorOnSlot(id, s);
                          }}
                          style={{
                            top: top + 1,
                            height,
                            borderLeftColor: s.blockedPeriodId
                              ? (s.blockedPeriodColor || 'hsl(var(--destructive))')
                              : s.uncovered ? 'hsl(var(--destructive))' : (color || 'hsl(var(--primary))'),
                          }}
                          className={cn(
                            'absolute left-1 right-1 rounded-md border border-l-[5px] px-2 py-1.5 text-[11px] cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/30 transition shadow-sm',
                            s.blockedPeriodId || s.isBlocked ? 'z-30' : 'z-10',
                            s.blockedPeriodId
                              ? 'bg-[repeating-linear-gradient(45deg,hsl(var(--destructive)/0.10)_0_6px,transparent_6px_12px)] border-destructive/30 border-dashed'
                              : s.isBlocked
                                ? 'bg-muted/60 border-muted-foreground/40 border-dashed opacity-80'
                                : s.isOpen
                                  ? 'bg-emerald-500/10 border-emerald-500/30 border-dashed'
                                  : s.isProjected
                                    ? 'bg-amber-500/10 border-amber-500/40 border-dashed'
                                    : s.isVirtual
                                      ? 'bg-card'
                                      : 'bg-card',
                            s.uncovered && !s.isOpen && !s.isBlocked && 'bg-destructive/5',
                            isSlotHover && 'ring-2 ring-primary bg-primary/15',
                            isSelected && 'ring-2 ring-primary bg-primary/15',
                          )}
                        >
                          <div className="flex items-center justify-between gap-1 leading-tight">
                            <span className="font-bold tabular-nums text-[11px]">{format(t, 'HH:mm')}</span>
                            <div className="flex items-center gap-0.5">
                              {s.isBlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                              {s.uncovered && !s.isBlocked && <AlertTriangle className="h-3 w-3 text-destructive" />}
                              {s.isProjected && <RefreshCw className="h-3 w-3 text-amber-600" />}
                              {s.isVirtual && !s.isProjected && <Repeat className="h-3 w-3 text-muted-foreground" />}
                              {s.hasGrade && <Sparkles className="h-3 w-3 text-primary" />}
                            </div>
                          </div>
                          <div className="truncate font-semibold text-[12px] mt-0.5 leading-snug">
                            {s.blockedPeriodId
                              ? <span className="italic text-destructive/90">{s.blockedPeriodName || 'Bloqueado'}</span>
                              : s.isBlocked
                                ? <span className="italic text-muted-foreground">Bloqueado</span>
                                : s.isOpen
                                  ? <span className="italic text-emerald-700 dark:text-emerald-400">Livre</span>
                                  : studentName(s.student_id)}
                          </div>
                          {!splitByRoom && room && (
                            <div className="flex items-center gap-1 truncate mt-0.5">
                              <span
                                className="h-2 w-2 rounded-sm shrink-0 border"
                                style={{ background: roomColorOf?.(s.room_id) || 'hsl(var(--muted))' }}
                              />
                              <span className="truncate text-[10px] font-semibold text-foreground/80">{room}</span>
                            </div>
                          )}
                          {instr && height > 48 && !s.isBlocked && (
                            <div className="truncate text-muted-foreground text-[10px] mt-0.5">{instr}</div>
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2 text-xs space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <div className="font-semibold text-sm">
                            {s.blockedPeriodId
                              ? (s.blockedPeriodName || 'Bloqueio padrão')
                              : s.isBlocked ? 'Horário bloqueado' : s.isOpen ? 'Horário disponível' : studentName(s.student_id)}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            {format(t, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })} · {s.duration_minutes}min
                          </div>
                          {s.blockedPeriodId && (
                            <div className="text-[11px] text-muted-foreground italic">
                              Bloqueio recorrente. Você pode liberar só este dia.
                            </div>
                          )}
                          {room && <div className="text-[11px]">📍 {room}</div>}
                          {instr && !s.isBlocked && (
                            <div className="text-[11px] flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                              {instr}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap pt-1 border-t">
                          {s.blockedPeriodId && onDelete && (
                            <button
                              onClick={() => onDelete(s)}
                              className="flex-1 px-2 py-1.5 rounded border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/5 inline-flex items-center justify-center gap-1"
                              title="Liberar este dia"
                            >
                              <Unlock className="h-3 w-3" />Liberar este dia
                            </button>
                          )}
                          {!s.blockedPeriodId && !s.isBlocked && (
                            <button
                              onClick={() => onSlotClick(s)}
                              className="flex-1 px-2 py-1.5 rounded border text-[11px] hover:bg-muted text-center"
                            >
                              Abrir
                            </button>
                          )}
                          {!s.blockedPeriodId && !s.isBlocked && renderInstructorPicker?.(s)}
                          {!s.blockedPeriodId && onDelete && (s.appointment_id || s.bookable_slot_id) && (
                            s.isBlocked ? (
                              <button
                                onClick={() => onDelete(s)}
                                className="flex-1 px-2 py-1.5 rounded border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/5 inline-flex items-center justify-center gap-1"
                                title="Desbloquear"
                              >
                                <Unlock className="h-3 w-3" />Desbloquear
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
                                className="px-2 py-1.5 rounded border border-muted-foreground/30 text-muted-foreground hover:bg-muted inline-flex items-center gap-1"
                                title={s.appointment_id ? 'Cancelar aula' : 'Bloquear horário'}
                              >
                                <Lock className="h-3 w-3" />{s.appointment_id ? 'Cancelar' : 'Bloquear'}
                              </button>
                            )
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            );
          };

          return (
            <div key={d.toISOString()} className={cn('relative border-l', isToday && 'bg-primary/[0.02]')}>
              {splitByRoom ? (
                <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${colsPerDay}, minmax(0, 1fr))` }}>
                  {subCols.map((r, i) => renderSubCol(r, i))}
                </div>
              ) : (
                renderSubCol(null, 0)
              )}
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
