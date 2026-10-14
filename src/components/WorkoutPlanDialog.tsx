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
import { Plus, Trash2, Save, Mic } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { FieldError } from '@/components/FieldError';
import { useFieldError, validateRequired } from '@/lib/formValidation';
import { Switch } from '@/components/ui/switch';
import { useVoiceCommandsEnabled } from '@/lib/voiceCommands';
import { useAccountKind } from '@/hooks/useAccountKind';
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
    deleteExercise,
    reorderExercises,
    updateExercise,
  } = useWorkoutPlans();

  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [planSets, setPlanSets] = useState('3');
  const [planReps, setPlanReps] = useState('12');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [localExercises, setLocalExercises] = useState<WorkoutExercise[]>([]);
  const [selectExerciseOpen, setSelectExerciseOpen] = useState(false);
  const [createExerciseOpen, setCreateExerciseOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<WorkoutExercise | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const objectiveRef = useRef<HTMLTextAreaElement>(null);
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
      setPlanSets(String(editingPlan.sets ?? 3));
      setPlanReps(String(editingPlan.reps ?? 12));
      setSelectedDays(editingPlan.days_of_week);
    } else if (!open) {
      setName('');
      setObjective('');
      setPlanSets('3');
      setPlanReps('12');
      setSelectedDays([]);
    }
  }, [editingPlan?.id, open]);

  useEffect(() => {
    setLocalExercises((prev) => (prev === exercises ? prev : exercises));
  }, [exercises]);

  // O campo de objetivo cresce com o texto (até um limite) para não cortar a leitura.
  useEffect(() => {
    const el = objectiveRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [objective, open]);

  const handleDayToggle = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const setsNum = Math.min(20, Math.max(1, parseInt(planSets) || 3));
  const repsNum = Math.min(100, Math.max(1, parseInt(planReps) || 12));

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
        sets: setsNum,
        reps: repsNum,
      });
      onOpenChange(false);
    } else {
      const created = await createPlan.mutateAsync({
        name: name.trim(),
        days_of_week: selectedDays,
        objective: objective.trim() || null,
        sets: setsNum,
        reps: repsNum,
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
      sets: setsNum,
      reps: repsNum,
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


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg lg:max-w-4xl w-[calc(100vw-1rem)] sm:w-full min-w-0 max-h-[92vh] flex flex-col overflow-hidden p-0">
          <div className="shrink-0 px-4 pt-4 pr-12 sm:px-6 sm:pt-6 sm:pr-14 lg:px-8">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Treino' : 'Novo Treino'}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-3 pb-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Treino <span className="text-destructive">*</span></Label>
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
                ref={objectiveRef}
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
              <Label>Séries e repetições do treino</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Séries</span>
                  <Input inputMode="numeric" value={planSets} onChange={(e) => setPlanSets(e.target.value.replace(/\D/g, '').slice(0, 2))} aria-label="Séries" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Repetições</span>
                  <Input inputMode="numeric" value={planReps} onChange={(e) => setPlanReps(e.target.value.replace(/\D/g, '').slice(0, 3))} aria-label="Repetições" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Ao mudar aqui e salvar, vale para todos os exercícios. Depois você pode ajustar cada exercício na lista abaixo.</p>
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

            

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="min-w-0 flex-1 leading-snug">
                    Exercícios <span className="font-normal text-muted-foreground">(arraste para reordenar)</span>
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {currentPlan && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full lg:col-span-2 h-auto whitespace-normal text-center leading-snug py-2.5"
                        onClick={() => setMoreOpen(true)}
                      >
                        <Sparkles className="h-4 w-4 shrink-0" />
                        <span className="min-w-0">Adicionar mais (de outro treino ou novo objetivo)</span>
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
                          onDelete={() => setDeletingExercise(exercise)}
                          onChangeSetsReps={(sets, reps) => updateExercise.mutate({ id: exercise.id, sets, reps })}
                          onChangeRest={(rest_seconds) => updateExercise.mutate({ id: exercise.id, rest_seconds })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="shrink-0 flex gap-2 border-t border-border bg-background px-4 py-3 sm:px-6">
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
