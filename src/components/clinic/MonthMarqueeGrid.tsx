import { useRef } from 'react';
import { format, parseISO, isSameDay, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useMarqueeSelection, type MarqueeRect } from '@/hooks/useMarqueeSelection';
import { INSTRUCTOR_DRAG_TYPE } from './InstructorDragPalette';
import type { EmptyCellKey } from './RoomsTimeline';

const DEFAULT_HOUR = 8;
const makeMonthKey = (d: Date) => `${d.toISOString().slice(0, 10)}|${DEFAULT_HOUR}|none`;

interface Props {
  monthDays: Date[];
  day: Date;
  roomColorOf: (id: string | null | undefined) => string | null;
  roomName: (id: string | null | undefined) => string | null;
  studentName: (id: string | null) => string;
  slotsForDay: (d: Date) => any[];
  draggingInstructorId: string | null;
  dropInstructorOnCell: (id: string, d: Date, h: number, roomId: string | null) => void;
  selectedEmptyKeys?: Set<EmptyCellKey>;
  onReplaceSelection: (slotKeys: Set<string>, emptyKeys: Set<EmptyCellKey>) => void;
  onAddSelection: (slotKeys: Set<string>, emptyKeys: Set<EmptyCellKey>) => void;
  onMarqueeEnd: (info: { slotCount: number; emptyCount: number; additive: boolean }) => void;
  onCellOpen: (d: Date) => void;
}

export function MonthMarqueeGrid({
  monthDays, day, roomColorOf, roomName, studentName, slotsForDay,
  draggingInstructorId, dropInstructorOnCell,
  selectedEmptyKeys, onReplaceSelection, onAddSelection, onMarqueeEnd, onCellOpen,
}: Props) {
  const baseRef = useRef<Set<EmptyCellKey>>(new Set());

  const collectInRect = (rect: MarqueeRect, container: HTMLElement) => {
    const cRect = container.getBoundingClientRect();
    const absLeft = cRect.left + rect.left - container.scrollLeft;
    const absTop = cRect.top + rect.top - container.scrollTop;
    const absRight = absLeft + rect.width;
    const absBottom = absTop + rect.height;
    const emptyKeys = new Set<EmptyCellKey>();
    container.querySelectorAll<HTMLElement>('[data-cell-key]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const intersects = r.right >= absLeft && r.left <= absRight && r.bottom >= absTop && r.top <= absBottom;
      if (!intersects) return;
      const k = el.getAttribute('data-cell-key');
      if (k) emptyKeys.add(k);
    });
    return emptyKeys;
  };

  const marquee = useMarqueeSelection({
    onUpdate: (rect, additive) => {
      const c = marquee.containerRef.current;
      if (!c) return;
      const emptyKeys = collectInRect(rect, c);
      if (additive) {
        const ek = new Set(baseRef.current); emptyKeys.forEach((k) => ek.add(k));
        onReplaceSelection(new Set(), ek);
      } else {
        onReplaceSelection(new Set(), emptyKeys);
      }
    },
    onEnd: (rect, additive) => {
      const c = marquee.containerRef.current;
      if (!c || !rect) return;
      const emptyKeys = collectInRect(rect, c);
      if (emptyKeys.size > 0) onMarqueeEnd({ slotCount: 0, emptyCount: emptyKeys.size, additive });
    },
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    baseRef.current = new Set(selectedEmptyKeys ?? []);
    marquee.onPointerDown(e);
  };

  return (
    <div ref={marquee.containerRef} onPointerDown={handlePointerDown} className="grid grid-cols-7 gap-1 relative select-none">
      {monthDays.map((d) => {
        const slots = slotsForDay(d);
        const isToday = isSameDay(d, new Date());
        const inMonth = isSameMonth(d, day);
        const visible = slots.slice(0, 3);
        const extra = slots.length - visible.length;
        const roomIds = Array.from(new Set(slots.map((s: any) => s.room_id).filter(Boolean))) as string[];
        const cellKey = makeMonthKey(d);
        const isSelected = selectedEmptyKeys?.has(cellKey);
        return (
          <button
            key={d.toISOString()}
            data-cell-key={cellKey}
            onClick={(e) => {
              if (marquee.didDrag()) return;
              const additive = e.shiftKey || e.metaKey || e.ctrlKey;
              if (additive) {
                onAddSelection(new Set(), new Set([cellKey]));
                return;
              }
              onCellOpen(d);
            }}
            onDragOver={(e) => {
              if (draggingInstructorId === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              if (draggingInstructorId === null) return;
              e.preventDefault();
              const id = e.dataTransfer.getData(INSTRUCTOR_DRAG_TYPE) || e.dataTransfer.getData('text/plain');
              if (id) dropInstructorOnCell(id, d, DEFAULT_HOUR, null);
            }}
            className={cn(
              'min-h-[100px] p-1.5 rounded border text-left flex flex-col gap-1 hover:border-primary transition relative',
              !inMonth && 'opacity-40 bg-muted/30',
              isToday && 'border-primary border-2',
              draggingInstructorId !== null && 'ring-1 ring-primary/30',
              isSelected && 'ring-2 ring-primary bg-primary/10',
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn('text-xs font-bold', isToday && 'text-primary')}>{format(d, 'd')}</span>
              <div className="flex items-center gap-1">
                {isSelected && <Check className="h-3 w-3 text-primary" />}
                {slots.length > 0 && <span className="text-[9px] text-muted-foreground">{slots.length}</span>}
              </div>
            </div>
            {roomIds.length > 0 && (
              <div className="flex items-center gap-px h-1 -mt-0.5" title={`${roomIds.length} sala(s) usada(s)`}>
                {roomIds.map((rid) => (
                  <span key={rid} className="flex-1 rounded-sm" style={{ background: roomColorOf(rid) || 'hsl(var(--muted))' }} />
                ))}
              </div>
            )}
            <div className="space-y-0.5 flex-1">
              {visible.map((s: any) => {
                const hasGrade = !!s.appointment?.sequence_id;
                const rcolor = roomColorOf(s.room_id);
                return (
                  <div
                    key={s.key}
                    className={cn(
                      'text-[9px] px-1 py-0.5 rounded truncate border flex items-center gap-1',
                      s.isVirtual && 'border-dashed',
                      s.isProjected && 'border-dashed border-amber-500/50 bg-amber-500/5',
                      s.isOpen && 'border-dashed border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
                      !s.isOpen && (hasGrade ? 'bg-primary/10 text-primary' : 'bg-muted'),
                    )}
                  >
                    {rcolor && (
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: rcolor }} title={roomName(s.room_id) || ''} />
                    )}
                    <span className="truncate">
                      {format(parseISO(s.scheduled_at), 'HH:mm')} {s.isOpen ? (roomName(s.room_id) || 'livre') : studentName(s.student_id).split(' ')[0]}
                    </span>
                  </div>
                );
              })}
              {extra > 0 && <div className="text-[9px] text-muted-foreground px-1">+{extra} mais</div>}
            </div>
          </button>
        );
      })}

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
  );
}
