import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkoutPlans, WorkoutPlan, WorkoutExercise } from '@/hooks/useWorkoutPlans';
import { LibraryExercise } from '@/hooks/useExerciseLibrary';
import { ExerciseListItem } from '@/components/ExerciseListItem';
import { SelectExerciseDialog } from '@/components/SelectExerciseDialog';
import { ExerciseLibraryDialog } from '@/components/ExerciseLibraryDialog';
import { EditWorkoutExerciseDialog } from '@/components/EditWorkoutExerciseDialog';
import { Plus, Trash2, Save, Mic } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { FieldError } from '@/components/FieldError';
import { useFieldError, validateRequired } from '@/lib/formValidation';
import { Switch } from '@/components/ui/switch';
import { useVoiceCommandsEnabled } from '@/lib/voiceCommands';
import { AddMoreExercisesDialog } from '@/components/AddMoreExercisesDialog';
import { Sparkles } from 'lucide-react';

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
  const [objective, setObjective] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [localExercises, setLocalExercises] = useState<WorkoutExercise[]>([]);
  const [selectExerciseOpen, setSelectExerciseOpen] = useState(false);
  const [createExerciseOpen, setCreateExerciseOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<WorkoutExercise | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<WorkoutExercise | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const { errorOf, setError, clearError, clearIf } = useFieldError();

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
      setObjective(editingPlan.objective || '');
      setSelectedDays(editingPlan.days_of_week);
    } else if (!open) {
      setName('');
      setObjective('');
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
    const first = validateRequired([
      { key: 'name', ref: nameRef, valid: !!name.trim(), message: 'Informe o nome do treino' },
    ]);
    if (first) {
      setError(first.key, first.message);
      return;
    }
    clearError();

    if (currentPlan) {
      await updatePlan.mutateAsync({
        id: currentPlan.id,
        name: name.trim(),
        days_of_week: selectedDays,
        objective: objective.trim() || null,
      });
      onOpenChange(false);
    } else {
      const created = await createPlan.mutateAsync({
        name: name.trim(),
        days_of_week: selectedDays,
        objective: objective.trim() || null,
      });
      if (created && onCreated) onCreated(created as WorkoutPlan);
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (editingPlan) {
      await deletePlan.mutateAsync(editingPlan.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    }
  };

  // Ensure a plan exists (auto-creates on first action when creating a new plan).
  const ensurePlan = async (): Promise<WorkoutPlan | null> => {
    if (currentPlan) return currentPlan;
    if (!name.trim()) {
      setError('name', 'Informe o nome do treino antes de adicionar exercícios');
      nameRef.current?.focus();
      return null;
    }
    const created = await createPlan.mutateAsync({
      name: name.trim(),
      days_of_week: selectedDays,
      objective: objective.trim() || null,
    });
    if (created && onCreated) onCreated(created as WorkoutPlan);
    return (created as WorkoutPlan) || null;
  };

  const openAddExercise = async () => {
    const plan = await ensurePlan();
    if (!plan) return;
    setSelectExerciseOpen(true);
  };

  const handleSelectFromLibrary = async (
    libraryExercise: LibraryExercise,
    sets: number,
    reps: number
  ) => {
    const plan = currentPlan ?? (await ensurePlan());
    if (!plan) return;

    // Coloca o novo exercício no início: desloca os existentes em +1
    if (exercises.length > 0) {
      await reorderExercises.mutateAsync(
        exercises.map((ex, idx) => ({ id: ex.id, order_index: idx + 1 }))
      );
    }

    await addExercise.mutateAsync({
      workout_plan_id: plan.id,
      name: libraryExercise.name,
      sets,
      reps,
      image_urls: libraryExercise.image_urls || [],
      order_index: 0,
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
        <DialogContent className="max-w-lg w-[calc(100vw-1rem)] sm:w-full max-h-[92vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
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
                ref={nameRef}
                value={name}
                onChange={(e) => { setName(e.target.value); clearIf('name'); }}
                placeholder="Ex: Treino A - Peito e Tríceps"
                aria-invalid={!!errorOf('name')}
              />
              <FieldError message={errorOf('name')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo do treino <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                id="objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Ex.: Foco em hipertrofia de membros inferiores e mobilidade de quadril"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {currentPlan?.ai_rationale && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
                  </span>
                  Sugestão da IA
                </Label>
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {currentPlan.ai_rationale}
                </div>
              </div>
            )}

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

            

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Exercícios (arraste para reordenar)</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAddExercise()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {localExercises.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Nenhum exercício adicionado
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddExercise()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar da Biblioteca
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentPlan && (
                      <Button size="sm" variant="secondary" className="w-full" onClick={() => setMoreOpen(true)}>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Adicionar mais (de outro treino ou novo objetivo)
                      </Button>
                    )}
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
                disabled={createPlan.isPending || updatePlan.isPending}
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

      {currentPlan && (
        <AddMoreExercisesDialog open={moreOpen} onOpenChange={setMoreOpen} plan={currentPlan} exercises={localExercises} />
      )}

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

function VoiceCommandsToggle() {
  const [enabled, setEnabled] = useVoiceCommandsEnabled();
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="min-w-0 flex items-start gap-2">
        <Mic className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="min-w-0">
          <Label className="cursor-pointer">Comandos por voz</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Diga <strong>"próximo"</strong>, <strong>"voltar"</strong> ou <strong>"finalizar"</strong> durante o treino. Útil quando estiver sozinho na sala.
          </p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={setEnabled} />
    </div>
  );
}
