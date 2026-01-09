import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flame, Plus, Dumbbell, Trash2, ChevronDown, Pencil, Check, Clock } from 'lucide-react';
import { useExerciseEntries, EXERCISE_TYPES, calculateCaloriesBurned, ExerciseEntry } from '@/hooks/useExerciseEntries';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function ExerciseTracker() {
  const { entries, addExerciseEntry, updateExerciseEntry, deleteExerciseEntry, getTodayTotalBurned } = useExerciseEntries();
  const { profile } = useProfile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');
  const [exerciseType, setExerciseType] = useState<keyof typeof EXERCISE_TYPES>('walking_fast');
  const [duration, setDuration] = useState('30');
  const [manualCalories, setManualCalories] = useState('');
  
  // Edit state
  const [editingEntry, setEditingEntry] = useState<ExerciseEntry | null>(null);
  const [editCalories, setEditCalories] = useState('');
  const [editName, setEditName] = useState('');

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

  const handleEdit = (entry: ExerciseEntry) => {
    setEditingEntry(entry);
    setEditCalories(entry.calories_burned.toString());
    setEditName(entry.name);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const calories = parseInt(editCalories);
    if (calories <= 0) { toast.error('Valor inválido'); return; }
    try {
      await updateExerciseEntry(editingEntry.id, { 
        calories_burned: calories,
        name: editName || editingEntry.name
      });
      toast.success('Atualizado');
      setEditingEntry(null);
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExerciseEntry(id);
      toast.success('Removido');
    } catch { toast.error('Erro ao remover'); }
  };

  return (
    <>
      <div className="space-y-2">
        {/* Header colapsável */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-card shadow-card hover:shadow-soft transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-exercise">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Exercícios</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold num-display text-rose-500">-{totalBurned}</span>
                <span className="text-xs text-muted-foreground">kcal queimadas</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{entries.length} registro(s)</span>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={(e) => { e.stopPropagation(); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Lista de entradas */}
        {isExpanded && (
          <div className="space-y-2 animate-fade-in pl-2">
            {entries.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Nenhum exercício hoje
              </div>
            ) : (
              entries.map((entry) => {
                const exerciseInfo = EXERCISE_TYPES[entry.exercise_type as keyof typeof EXERCISE_TYPES];
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-card">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                      <span className="text-lg">{exerciseInfo?.icon || '🏋️'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{entry.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-rose-500 font-semibold">-{entry.calories_burned} kcal</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.performed_at), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => handleEdit(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Dialog para adicionar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-rose-500" />
              Adicionar Exercício
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <button 
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${mode === 'manual' ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80'}`} 
                onClick={() => setMode('manual')}
              >
                🏋️ Equipamento
              </button>
              <button 
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${mode === 'auto' ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80'}`} 
                onClick={() => setMode('auto')}
              >
                🧮 Calcular
              </button>
            </div>

            {mode === 'manual' ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Informe as calorias mostradas no equipamento:</p>
                <Input 
                  type="number" 
                  value={manualCalories} 
                  onChange={(e) => setManualCalories(e.target.value)} 
                  placeholder="Calorias queimadas" 
                  className="h-12 text-lg"
                  autoFocus
                />
                <Button className="w-full h-12" onClick={handleSubmit}>
                  <Flame className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Select value={exerciseType} onValueChange={(v) => setExerciseType(v as keyof typeof EXERCISE_TYPES)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXERCISE_TYPES).map(([key, ex]) => (
                      <SelectItem key={key} value={key}>{ex.icon} {ex.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Duração (minutos)</label>
                  <Input 
                    type="number" 
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    placeholder="30" 
                    className="h-12 text-lg"
                  />
                </div>

                <div className="p-3 rounded-lg bg-rose-500/10 text-center">
                  <p className="text-sm text-muted-foreground">Calorias estimadas</p>
                  <p className="text-2xl font-bold text-rose-500">-{calculatedCalories} kcal</p>
                </div>

                <Button className="w-full h-12" onClick={handleSubmit}>
                  <Flame className="h-4 w-4 mr-2" />
                  Adicionar Exercício
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Exercício
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
              <Input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                placeholder="Nome do exercício" 
                className="h-12"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Calorias queimadas</label>
              <Input 
                type="number" 
                value={editCalories} 
                onChange={(e) => setEditCalories(e.target.value)} 
                placeholder="kcal" 
                className="h-12 text-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingEntry(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSaveEdit}>
                <Check className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
