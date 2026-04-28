import { useState } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, UserCog, X, Ban } from 'lucide-react';

export const INSTRUCTOR_DRAG_TYPE = 'application/x-pilar-instructor';
/** Valor especial para "limpar professor" via drop. */
export const CLEAR_INSTRUCTOR = '__clear__';
/** Valor especial para "bloquear horário" via drop. */
export const BLOCK_SLOT = '__block__';

interface Instructor { user_id: string; name: string | null }

interface Props {
  instructors: Instructor[];
  colorOf: (id: string | null | undefined) => string;
  /** Id atualmente sendo arrastado (controlado pelo pai para destacar drop targets). */
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

/**
 * Paleta horizontal de professores arrastáveis. Arraste um chip e solte sobre
 * um horário (vazio ou existente) na grade para atribuir aquele professor.
 */
export function InstructorDragPalette({ instructors, colorOf, draggingId, onDragStart, onDragEnd }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const handleStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(INSTRUCTOR_DRAG_TYPE, id);
    e.dataTransfer.setData('text/plain', id);
    onDragStart(id);
  };

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <UserCog className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">
          Arrastar professor para um horário
        </span>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline"
        >
          {collapsed ? 'mostrar' : 'ocultar'}
        </button>
      </div>
      {!collapsed && (
        <div className="p-2 flex flex-wrap gap-2 overflow-x-auto">
          {instructors.length === 0 && (
            <span className="text-xs text-muted-foreground py-1.5 px-1">
              Nenhum professor cadastrado.
            </span>
          )}
          {instructors.map((i) => {
            const color = colorOf(i.user_id);
            const dragging = draggingId === i.user_id;
            return (
              <div
                key={i.user_id}
                draggable
                onDragStart={(e) => handleStart(e, i.user_id)}
                onDragEnd={onDragEnd}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs cursor-grab active:cursor-grabbing select-none transition',
                  'hover:bg-muted/50 hover:shadow-sm',
                  dragging && 'opacity-40 ring-2 ring-primary',
                )}
                style={{ borderColor: color }}
                title={`Arrastar ${i.name || 'professor'} para um horário`}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="font-medium">{i.name || `Prof. ${i.user_id.slice(0, 4)}`}</span>
              </div>
            );
          })}

          {/* Chip "limpar professor" — solte sobre um horário para remover o professor atribuído */}
          {instructors.length > 0 && (
            <div
              draggable
              onDragStart={(e) => handleStart(e, CLEAR_INSTRUCTOR)}
              onDragEnd={onDragEnd}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-dashed text-xs cursor-grab active:cursor-grabbing select-none transition hover:bg-muted/50',
                draggingId === CLEAR_INSTRUCTOR && 'opacity-40 ring-2 ring-destructive',
              )}
              title="Arraste para remover o professor de um horário"
            >
              <X className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Sem professor</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
