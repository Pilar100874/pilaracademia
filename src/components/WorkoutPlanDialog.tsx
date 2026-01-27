import { useState, useEffect } from 'react';
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
import { ExerciseListItem } from '@/components/ExerciseListItem';
import { AddExerciseDialog } from '@/components/AddExerciseDialog';
import { Plus, Trash2, Save, GripVertical } from 'lucide-react';
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

interface WorkoutPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlan: WorkoutPlan | null;
}

export function WorkoutPlanDialog({
  open,
  onOpenChange,
  editingPlan,
}: WorkoutPlanDialogProps) {
  const {
    createPlan,
    updatePlan,
    deletePlan,
    addExercise,
    updateExercise,
    deleteExercise,
    reorderExercises,
    uploadExerciseImage,
  } = useWorkoutPlans();

  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<WorkoutExercise | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  // Always sync exercises from editingPlan (this updates after mutations)
  useEffect(() => {
    setExercises(editingPlan?.exercises || []);
  }, [editingPlan?.exercises]);

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

  const handleAddExercise = async (data: {
    name: string;
    sets: number;
    reps: number;
    imageFile?: File;
  }) => {
    if (!editingPlan) return;

    let image_url: string | undefined;
    if (data.imageFile) {
      image_url = await uploadExerciseImage(data.imageFile);
    }

    await addExercise.mutateAsync({
      workout_plan_id: editingPlan.id,
      name: data.name,
      sets: data.sets,
      reps: data.reps,
      image_url,
      order_index: exercises.length,
    });

    setAddExerciseOpen(false);
  };

  const handleUpdateExercise = async (data: {
    name: string;
    sets: number;
    reps: number;
    imageFile?: File;
  }) => {
    if (!editingExercise) return;

    let image_url: string | undefined;
    if (data.imageFile) {
      image_url = await uploadExerciseImage(data.imageFile);
    }

    await updateExercise.mutateAsync({
      id: editingExercise.id,
      name: data.name,
      sets: data.sets,
      reps: data.reps,
      ...(image_url && { image_url }),
    });

    setEditingExercise(null);
    setAddExerciseOpen(false);
  };

  const handleDeleteExercise = async (id: string) => {
    await deleteExercise.mutateAsync(id);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newExercises = [...exercises];
    const draggedItem = newExercises[draggedIndex];
    newExercises.splice(draggedIndex, 1);
    newExercises.splice(index, 0, draggedItem);

    setExercises(newExercises);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null) {
      const reorderedExercises = exercises.map((ex, idx) => ({
        id: ex.id,
        order_index: idx,
      }));
      await reorderExercises.mutateAsync(reorderedExercises);
    }
    setDraggedIndex(null);
  };

  const handleEditExercise = (exercise: WorkoutExercise) => {
    setEditingExercise(exercise);
    setAddExerciseOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <Label>Exercícios</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingExercise(null);
                      setAddExerciseOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {exercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum exercício adicionado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {exercises.map((exercise, index) => (
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
                          onDelete={() => handleDeleteExercise(exercise.id)}
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

      <AddExerciseDialog
        open={addExerciseOpen}
        onOpenChange={(open) => {
          setAddExerciseOpen(open);
          if (!open) setEditingExercise(null);
        }}
        onSave={editingExercise ? handleUpdateExercise : handleAddExercise}
        editingExercise={editingExercise}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Excluir treino?"
        description="Esta ação não pode ser desfeita. Todos os exercícios deste treino serão removidos."
      />
    </>
  );
}
