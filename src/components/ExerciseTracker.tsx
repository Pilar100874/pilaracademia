import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Plus, Dumbbell } from 'lucide-react';
import { useExerciseEntries, EXERCISE_TYPES, calculateCaloriesBurned } from '@/hooks/useExerciseEntries';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export function ExerciseTracker() {
  const { entries, addExerciseEntry, getTodayTotalBurned } = useExerciseEntries();
  const { profile } = useProfile();
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');
  const [exerciseType, setExerciseType] = useState<keyof typeof EXERCISE_TYPES>('walking_fast');
  const [duration, setDuration] = useState('30');
  const [manualCalories, setManualCalories] = useState('');

  const totalBurned = getTodayTotalBurned();
  const userWeight = profile?.weight_kg || 70;
  const calculatedCalories = calculateCaloriesBurned(exerciseType, parseInt(duration) || 0, userWeight);

  const handleSubmit = async () => {
    if (mode === 'manual') {
      const cal = parseInt(manualCalories) || 0;
      if (cal <= 0) { toast.error('Informe as calorias'); return; }
      try {
        await addExerciseEntry({ name: 'Exercício', duration_minutes: 0, calories_burned: cal, exercise_type: 'other' });
        toast.success(`🔥 -${cal} kcal`);
        setShowForm(false);
        setManualCalories('');
      } catch { toast.error('Erro'); }
      return;
    }

    const dur = parseInt(duration) || 0;
    if (dur <= 0) { toast.error('Informe a duração'); return; }
    try {
      const exercise = EXERCISE_TYPES[exerciseType];
      await addExerciseEntry({ name: exercise.name, duration_minutes: dur, calories_burned: calculatedCalories, exercise_type: exerciseType });
      toast.success(`${exercise.icon} -${calculatedCalories} kcal`);
      setShowForm(false);
      setDuration('30');
    } catch { toast.error('Erro'); }
  };

  return (
    <div className="card-compact">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-exercise">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Exercício</p>
            <p className="text-lg num-display text-rose-500">-{totalBurned}</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowForm(!showForm)}>
          <Plus className={`h-4 w-4 transition-transform ${showForm ? 'rotate-45' : ''}`} />
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 pt-2 border-t border-border/50 animate-fade-in">
          <div className="flex gap-1">
            <button className={`quick-btn flex-1 ${mode === 'manual' ? 'bg-primary text-white' : 'bg-secondary'}`} onClick={() => setMode('manual')}>
              Equipamento
            </button>
            <button className={`quick-btn flex-1 ${mode === 'auto' ? 'bg-primary text-white' : 'bg-secondary'}`} onClick={() => setMode('auto')}>
              Calcular
            </button>
          </div>

          {mode === 'manual' ? (
            <div className="flex gap-2">
              <Input type="number" value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} placeholder="kcal queimadas" className="flex-1 h-10" />
              <Button size="sm" className="h-10" onClick={handleSubmit}>OK</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Select value={exerciseType} onValueChange={(v) => setExerciseType(v as keyof typeof EXERCISE_TYPES)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EXERCISE_TYPES).map(([key, ex]) => (
                    <SelectItem key={key} value={key}>{ex.icon} {ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="min" className="flex-1 h-10" />
                <Button size="sm" className="h-10 min-w-[70px]" onClick={handleSubmit}>
                  <Flame className="h-3 w-3 mr-1" />{calculatedCalories}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!showForm && entries.length > 0 && (
        <p className="text-xs text-muted-foreground">{entries.length} exercício(s)</p>
      )}
    </div>
  );
}
