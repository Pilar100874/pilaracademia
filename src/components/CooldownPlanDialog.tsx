import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWorkoutPlans, WorkoutExercise, WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { LibraryExercise } from '@/hooks/useExerciseLibrary';
import { ExerciseListItem } from '@/components/ExerciseListItem';
import { SelectExerciseDialog } from '@/components/SelectExerciseDialog';
import { ExerciseLibraryDialog } from '@/components/ExerciseLibraryDialog';
import { EditWorkoutExerciseDialog } from '@/components/EditWorkoutExerciseDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Plus, Leaf } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCooldownPromptEnabled } from '@/lib/cooldownPreference';

interface CooldownPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CooldownPlanDialog({ open, onOpenChange }: CooldownPlanDialogProps) {
  const {
    cooldownPlan,
    createPlan,
    addExercise,
    updateExercise,
    deleteExercise,
    reorderExercises,
  } = useWorkoutPlans();

  const [selectExerciseOpen, setSelectExerciseOpen] = useState(false);
  const [createExerciseOpen, setCreateExerciseOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<WorkoutExercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<WorkoutExercise | null>(null);
  const [localExercises, setLocalExercises] = useState<WorkoutExercise[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const exercises = useMemo(() => cooldownPlan?.exercises ?? [], [cooldownPlan]);

  useEffect(() => {
    setLocalExercises(exercises);
  }, [exercises]);

  const ensurePlan = async (): Promise<WorkoutPlan | null> => {
    if (cooldownPlan) return cooldownPlan;
    const created = await createPlan.mutateAsync({
      name: 'Alongamento Final',
      days_of_week: [],
      is_cooldown_plan: true,
    });
    return (created as WorkoutPlan) || null;
  };

  const handleAdd = async () => {
    const plan = await ensurePlan();
    if (!plan) return;
    setSelectExerciseOpen(true);
  };

  const handleSelectFromLibrary = async (
    libraryExercise: LibraryExercise,
    sets: number,
    reps: number
  ) => {
    const plan = cooldownPlan ?? (await ensurePlan());
    if (!plan) return;
    await addExercise.mutateAsync({
      workout_plan_id: plan.id,
      name: libraryExercise.name,
      sets,
      reps,
      image_urls: libraryExercise.image_urls || [],
      order_index: exercises.length,
      video_type: libraryExercise.video_type ?? null,
      video_url: libraryExercise.video_url ?? null,
      video_start_seconds: libraryExercise.video_start_seconds ?? null,
      video_end_seconds: libraryExercise.video_end_seconds ?? null,
      exercise_library_id: libraryExercise.id,
    });
  };

  const handleSaveExercise = async (data: {
    sets: number;
    reps: number;
    video: {
      video_type: 'youtube' | 'upload' | 'instagram' | null;
      video_url: string | null;
      video_start_seconds: number | null;
      video_end_seconds: number | null;
    };
  }) => {
    if (!editingExercise) return;
    await updateExercise.mutateAsync({
      id: editingExercise.id,
      sets: data.sets,
      reps: data.reps,
      video_type: data.video.video_type,
      video_url: data.video.video_url,
      video_start_seconds: data.video.video_start_seconds,
      video_end_seconds: data.video.video_end_seconds,
    });
    setEditingExercise(null);
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const next = [...localExercises];
    const dragged = next[draggedIndex];
    next.splice(draggedIndex, 1);
    next.splice(index, 0, dragged);
    setLocalExercises(next);
    setDraggedIndex(index);
  };
  const handleDragEnd = async () => {
    if (draggedIndex !== null) {
      await reorderExercises.mutateAsync(
        localExercises.map((ex, idx) => ({ id: ex.id, order_index: idx }))
      );
    }
    setDraggedIndex(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg w-[calc(100vw-1rem)] sm:w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-600" />
              Final de Aula
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta sequência é compartilhada por todos os treinos. Ao finalizar qualquer treino, você poderá rodá-la para terminar com um alongamento.
            </p>

            <CooldownPromptToggle />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {localExercises.length} {localExercises.length === 1 ? 'exercício' : 'exercícios'}
              </span>
              <Button size="sm" variant="outline" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {localExercises.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhum alongamento adicionado
                </p>
                <Button size="sm" variant="outline" onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar da Biblioteca
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {localExercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`transition-opacity ${draggedIndex === index ? 'opacity-50' : ''}`}
                  >
                    <ExerciseListItem
                      exercise={exercise}
                      index={index}
                      onEdit={() => setEditingExercise(exercise)}
                      onDelete={() => setDeletingExercise(exercise)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SelectExerciseDialog
        open={selectExerciseOpen}
        onOpenChange={setSelectExerciseOpen}
        onSelect={handleSelectFromLibrary}
        onCreateNew={() => {
          setSelectExerciseOpen(false);
          setCreateExerciseOpen(true);
        }}
      />

      <ExerciseLibraryDialog
        open={createExerciseOpen}
        onOpenChange={(o) => {
          setCreateExerciseOpen(o);
          if (!o) setSelectExerciseOpen(true);
        }}
        editingExercise={null}
      />

      <EditWorkoutExerciseDialog
        open={!!editingExercise}
        onOpenChange={(o) => !o && setEditingExercise(null)}
        exercise={editingExercise}
        onSave={handleSaveExercise}
      />

      <ConfirmDeleteDialog
        open={!!deletingExercise}
        onOpenChange={(o) => !o && setDeletingExercise(null)}
        onConfirm={async () => {
          if (deletingExercise) {
            await deleteExercise.mutateAsync(deletingExercise.id);
            setDeletingExercise(null);
          }
        }}
        title="Remover alongamento?"
        description="Este alongamento será removido da sequência final."
      />
    </>
  );
}

function CooldownPromptToggle() {
  const [enabled, setEnabled] = useCooldownPromptEnabled();
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="min-w-0">
        <Label className="cursor-pointer">Perguntar ao finalizar treino</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quando desativado, o app não pergunta se quer rodar o alongamento ao encerrar um treino.
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={setEnabled} />
    </div>
  );
}

