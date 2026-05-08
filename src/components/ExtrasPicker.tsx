import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useExerciseExtras, type ExerciseExtra } from '@/hooks/useExerciseExtras';

interface ExtrasPickerProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Show inline create button (default true). */
  allowCreate?: boolean;
  /** Compact = smaller chips. */
  compact?: boolean;
  /** Optional render of right-side adornment per chip (e.g. count input). */
  renderAdornment?: (extra: ExerciseExtra, selected: boolean) => React.ReactNode;
  emptyHint?: string;
  /** When defined, shows a "Sem equipamento" chip controlled by these props. */
  noneSelected?: boolean;
  onToggleNone?: () => void;
}

export function ExtrasPicker({
  selectedIds,
  onToggle,
  allowCreate = true,
  compact = false,
  renderAdornment,
  emptyHint = 'Nenhum equipamento extra criado ainda.',
  noneSelected,
  onToggleNone,
}: ExtrasPickerProps) {
  const { extras, createExtra } = useExerciseExtras();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createExtra.mutateAsync({ name });
      setNewName('');
      setCreating(false);
    } catch {
      /* toast handled */
    }
  };

  const chipBase = compact
    ? 'text-[11px] px-2.5 py-1'
    : 'text-xs px-3 py-1.5';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {extras.map((ex) => {
          const active = selectedIds.includes(ex.id);
          return (
            <div key={ex.id} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onToggle(ex.id)}
                className={`${chipBase} rounded-full border transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border/70 hover:bg-accent hover:border-primary/40 text-foreground/80'
                }`}
              >
                {ex.icon ? `${ex.icon} ` : ''}{ex.name}
              </button>
              {renderAdornment?.(ex, active)}
            </div>
          );
        })}

        {allowCreate && !creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={`${chipBase} rounded-full border border-dashed border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors inline-flex items-center gap-1`}
          >
            <Plus className="h-3 w-3" />
            Novo
          </button>
        )}

        {extras.length === 0 && !creating && (
          <p className="text-xs text-muted-foreground italic">{emptyHint}</p>
        )}
      </div>

      {creating && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              } else if (e.key === 'Escape') {
                setCreating(false);
                setNewName('');
              }
            }}
            placeholder="Ex.: Bola, Halter, Elástico..."
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={!newName.trim() || createExtra.isPending}
            className="h-8"
          >
            {createExtra.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setCreating(false);
              setNewName('');
            }}
            className="h-8 w-8 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
