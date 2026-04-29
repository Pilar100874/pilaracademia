import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkoutPlans, WorkoutPlan, WorkoutExercise } from '@/hooks/useWorkoutPlans';
import { LibraryExercise } from '@/hooks/useExerciseLibrary';
import { ExerciseListItem } from '@/components/ExerciseListItem';
import { SelectExerciseDialog } from '@/components/SelectExerciseDialog';
import { ExerciseLibraryDialog } from '@/components/ExerciseLibraryDialog';
import { EditWorkoutExerciseDialog } from '@/components/EditWorkoutExerciseDialog';
import { Plus, Trash2, Save } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

const DAYS_OF_WEEK = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

const EMPTY_EXERCISES: WorkoutExercise[] = [];

interface WorkoutPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlan: WorkoutPlan | null;
  /** Called right after a brand-new plan is created. Page should switch the
   * dialog into edit mode so the user can keep adding exercises. */
  onCreated?: (plan: WorkoutPlan) => void;
}

export function WorkoutPlanDialog({
  open,
  onOpenChange,
  editingPlan,
  onCreated,
}: WorkoutPlanDialogProps) {
  const {
    workoutPlans,
    createPlan,
    updatePlan,
    deletePlan,
    addExercise,
    updateExercise,
    deleteExercise,
    reorderExercises,
  } = useWorkoutPlans();

  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [localExercises, setLocalExercises] = useState<WorkoutExercise[]>([]);
  const [selectExerciseOpen, setSelectExerciseOpen] = useState(false);
  const [createExerciseOpen, setCreateExerciseOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<WorkoutExercise | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<WorkoutExercise | null>(null);

  // Get the current plan from workoutPlans (this updates when query is invalidated)
  const currentPlan = useMemo(() => {
    if (!editingPlan) return null;
    return workoutPlans.find(p => p.id === editingPlan.id) || editingPlan;
  }, [workoutPlans, editingPlan]);

  const exercises = currentPlan?.exercises ?? EMPTY_EXERCISES;

  // Sync name and days only when the dialog opens or editingPlan changes
  useEffect(() => {
    if (open && editingPlan) {
      setName(editingPlan.name);
      setSelectedDays(editingPlan.days_of_week);
    } else if (!open) {
      setName('');
      setSelectedDays([]);
    }
  }, [editingPlan?.id, open]);

  useEffect(() => {
    setLocalExercises((prev) => (prev === exercises ? prev : exercises));
  }, [exercises]);

  const handleDayToggle = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (editingPlan) {
      await updatePlan.mutateAsync({
        id: editingPlan.id,
        name: name.trim(),
        days_of_week: selectedDays,
      });
    } else {
      await createPlan.mutateAsync({
        name: name.trim(),
        days_of_week: selectedDays,
      });
    }

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (editingPlan) {
      await deletePlan.mutateAsync(editingPlan.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    }
  };

  const handleSelectFromLibrary = async (
    libraryExercise: LibraryExercise,
    sets: number,
    reps: number
  ) => {
    if (!editingPlan) return;

    await addExercise.mutateAsync({
      workout_plan_id: editingPlan.id,
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

  const handleDeleteExercise = async (id: string) => {
    await deleteExercise.mutateAsync(id);
    setDeletingExercise(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newExercises = [...localExercises];
    const draggedItem = newExercises[draggedIndex];
    newExercises.splice(draggedIndex, 1);
    newExercises.splice(index, 0, draggedItem);

    setLocalExercises(newExercises);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null) {
      const reorderedExercises = localExercises.map((ex, idx) => ({
        id: ex.id,
        order_index: idx,
      }));
      await reorderExercises.mutateAsync(reorderedExercises);
    }
    setDraggedIndex(null);
  };

  const handleEditExercise = (exercise: WorkoutExercise) => {
    setEditingExercise(exercise);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Treino' : 'Novo Treino'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Treino</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Treino A - Peito e Tríceps"
              />
            </div>

            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day.value}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                  >
                    <Checkbox
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {editingPlan && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Exercícios (arraste para reordenar)</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectExerciseOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {exercises.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Nenhum exercício adicionado
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectExerciseOpen(true)}
                    >
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
                        className={`transition-opacity ${
                          draggedIndex === index ? 'opacity-50' : ''
                        }`}
                      >
                        <ExerciseListItem
                          exercise={exercise}
                          index={index}
                          onEdit={() => handleEditExercise(exercise)}
                          onDelete={() => setDeletingExercise(exercise)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {editingPlan && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!name.trim() || createPlan.isPending || updatePlan.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            </div>
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
        onOpenChange={(open) => {
          setCreateExerciseOpen(open);
          if (!open) {
            // Reopen select dialog after creating
            setSelectExerciseOpen(true);
          }
        }}
        editingExercise={null}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Excluir treino?"
        description="Esta ação não pode ser desfeita. Todos os exercícios deste treino serão removidos."
      />

      <EditWorkoutExerciseDialog
        open={!!editingExercise}
        onOpenChange={(open) => !open && setEditingExercise(null)}
        exercise={editingExercise}
        onSave={handleSaveExercise}
      />

      <ConfirmDeleteDialog
        open={!!deletingExercise}
        onOpenChange={(open) => !open && setDeletingExercise(null)}
        itemName={deletingExercise?.name}
        title="Remover exercício do treino?"
        onConfirm={() => deletingExercise && handleDeleteExercise(deletingExercise.id)}
      />
    </>
  );
}
