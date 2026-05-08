import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExtrasPicker } from '@/components/ExtrasPicker';
import { useExerciseExtras } from '@/hooks/useExerciseExtras';
import { toast } from 'sonner';
import { Loader2, Plus, Minus } from 'lucide-react';

interface BulkExtrasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseIds: string[];
  onDone?: () => void;
}

export function BulkExtrasDialog({
  open,
  onOpenChange,
  exerciseIds,
  onDone,
}: BulkExtrasDialogProps) {
  const { bulkAssignExtra } = useExerciseExtras();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setMode('add');
    }
  }, [open]);

  const handleApply = async () => {
    if (!selected.length || !exerciseIds.length) return;
    setRunning(true);
    try {
      await Promise.all(
        selected.map((extraId) =>
          bulkAssignExtra.mutateAsync({
            extraId,
            exerciseIds,
            mode,
            silent: true,
            skipInvalidate: true,
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success(
        mode === 'add'
          ? `${selected.length} equipamento(s) adicionado(s) a ${exerciseIds.length} exercício(s)`
          : `${selected.length} equipamento(s) removido(s) de ${exerciseIds.length} exercício(s)`
      );
      onDone?.();
      onOpenChange(false);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Equipamentos em lote</DialogTitle>
          <DialogDescription>
            {exerciseIds.length} exercício(s) selecionado(s). Escolha os equipamentos e a ação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-1.5">
            {(['add', 'remove'] as const).map((m) => {
              const active = mode === m;
              const Icon = m === 'add' ? Plus : Minus;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`h-9 rounded-md border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m === 'add' ? 'Adicionar' : 'Remover'}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Equipamentos
            </p>
            <ExtrasPicker
              selectedIds={selected}
              onToggle={(id) =>
                setSelected((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }
              compact
              emptyHint="Crie um equipamento primeiro no botão 🏋️ da biblioteca."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={!selected.length || running}>
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Aplicando...
              </>
            ) : mode === 'add' ? (
              `Adicionar a ${exerciseIds.length}`
            ) : (
              `Remover de ${exerciseIds.length}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
