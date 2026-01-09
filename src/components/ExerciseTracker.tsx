import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Plus, Trash2, Dumbbell } from 'lucide-react';
import { useExerciseEntries, EXERCISE_TYPES, calculateCaloriesBurned } from '@/hooks/useExerciseEntries';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ExerciseTracker() {
  const { entries, addExerciseEntry, deleteExerciseEntry, getTodayTotalBurned } = useExerciseEntries();
  const { profile } = useProfile();
  const [showForm, setShowForm] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  
  // Form state
  const [exerciseType, setExerciseType] = useState<keyof typeof EXERCISE_TYPES>('walking_fast');
  const [duration, setDuration] = useState('30');
  const [manualCalories, setManualCalories] = useState('');

  const totalBurned = getTodayTotalBurned();
  const userWeight = profile?.weight_kg || 70;

  const calculatedCalories = calculateCaloriesBurned(
    exerciseType,
    parseInt(duration) || 0,
    userWeight
  );

  const handleSubmit = async () => {
    if (mode === 'manual') {
      const caloriesBurned = parseInt(manualCalories) || 0;
      if (caloriesBurned <= 0) {
        toast.error('Informe as calorias');
        return;
      }

      try {
        await addExerciseEntry({
          name: 'Exercício',
          duration_minutes: 0,
          calories_burned: caloriesBurned,
          exercise_type: 'other',
        });
        toast.success(`🏃 ${caloriesBurned} kcal queimadas!`);
        setShowForm(false);
        setManualCalories('');
      } catch {
        toast.error('Erro ao adicionar');
      }
      return;
    }

    // Modo automático
    const durationNum = parseInt(duration) || 0;
    if (durationNum <= 0) {
      toast.error('Informe a duração');
      return;
    }

    try {
      const exercise = EXERCISE_TYPES[exerciseType];
      await addExerciseEntry({
        name: exercise.name,
        duration_minutes: durationNum,
        calories_burned: calculatedCalories,
        exercise_type: exerciseType,
      });
      toast.success(`${exercise.icon} ${calculatedCalories} kcal queimadas!`);
      setShowForm(false);
      setDuration('30');
    } catch {
      toast.error('Erro ao adicionar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExerciseEntry(id);
      toast.success('Removido!');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
            <Dumbbell className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold">Exercícios</h3>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-lg font-bold text-orange-500">-{totalBurned} kcal</span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancelar' : <><Plus className="h-4 w-4 mr-1" /> Adicionar</>}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 mb-3 p-3 bg-secondary/30 rounded-xl">
          {/* Toggle modo */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'auto' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setMode('auto')}
            >
              Calcular por exercício
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setMode('manual')}
            >
              Informar do equipamento
            </Button>
          </div>

          {mode === 'auto' ? (
            <>
              {/* Tipo de exercício */}
              <Select value={exerciseType} onValueChange={(v) => setExerciseType(v as keyof typeof EXERCISE_TYPES)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de exercício" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXERCISE_TYPES).map(([key, exercise]) => (
                    <SelectItem key={key} value={key}>
                      {exercise.icon} {exercise.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Duração */}
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Duração"
                  min={1}
                  max={300}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>

              <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Calorias estimadas</p>
                <p className="text-2xl font-bold text-orange-500">{calculatedCalories} kcal</p>
                <p className="text-xs text-muted-foreground">
                  (peso: {userWeight}kg × MET: {EXERCISE_TYPES[exerciseType].met})
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                Informe as calorias mostradas no seu equipamento (esteira, relógio, app)
              </p>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  placeholder="Calorias queimadas"
                  min={1}
                  max={5000}
                  className="flex-1 text-lg"
                />
                <span className="text-sm text-muted-foreground">kcal</span>
              </div>
            </div>
          )}

          <Button variant="gradient" className="w-full" onClick={handleSubmit}>
            Adicionar Exercício
          </Button>
        </div>
      )}

      {entries.length > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowEntries(!showEntries)}
          >
            {showEntries ? 'Ocultar' : `Ver exercícios (${entries.length})`}
          </Button>

          {showEntries && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {EXERCISE_TYPES[entry.exercise_type as keyof typeof EXERCISE_TYPES]?.icon || '🏃'}{' '}
                      {entry.name}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {entry.duration_minutes}min
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 font-medium">-{entry.calories_burned} kcal</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.performed_at), 'HH:mm', { locale: ptBR })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Registre exercícios para descontar calorias do dia
        </p>
      )}
    </div>
  );
}
