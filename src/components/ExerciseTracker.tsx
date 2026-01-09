import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Plus, Dumbbell, Trash2, ChevronDown } from 'lucide-react';
import { useExerciseEntries, EXERCISE_TYPES, calculateCaloriesBurned } from '@/hooks/useExerciseEntries';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function ExerciseTracker() {
  const { entries, addExerciseEntry, deleteExerciseEntry, getTodayTotalBurned } = useExerciseEntries();
  const { profile } = useProfile();
  const [showForm, setShowForm] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
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

  const handleDelete = async (id: string) => {
    try {
      await deleteExerciseEntry(id);
      toast.success('Removido');
    } catch { toast.error('Erro ao remover'); }
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
        <button 
          onClick={() => setShowEntries(!showEntries)} 
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {entries.length} exercício(s)
          <ChevronDown className={`h-3 w-3 transition-transform ${showEntries ? 'rotate-180' : ''}`} />
        </button>
      )}

      {showEntries && entries.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1 animate-fade-in max-h-40 overflow-y-auto">
          {entries.map((entry) => {
            const exerciseInfo = EXERCISE_TYPES[entry.exercise_type as keyof typeof EXERCISE_TYPES];
            return (
              <div key={entry.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-secondary/50 text-sm">
                <div className="flex items-center gap-2">
                  <span>{exerciseInfo?.icon || '🏋️'}</span>
                  <div>
                    <span className="font-medium">{entry.name}</span>
                    <span className="text-rose-500 ml-2">-{entry.calories_burned} kcal</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.performed_at), 'HH:mm')}
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
