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
import { WorkoutExercise } from '@/hooks/useWorkoutPlans';
import { Save } from 'lucide-react';

interface EditWorkoutExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: WorkoutExercise | null;
  onSave: (sets: number, reps: number) => void;
}

export function EditWorkoutExerciseDialog({
  open,
  onOpenChange,
  exercise,
  onSave,
}: EditWorkoutExerciseDialogProps) {
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(12);

  useEffect(() => {
    if (exercise && open) {
      setSets(exercise.sets);
      setReps(exercise.reps);
    }
  }, [exercise, open]);

  const handleSave = () => {
    onSave(sets, reps);
    onOpenChange(false);
  };

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Exercício</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="font-medium">{exercise.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sets">Séries</Label>
              <Input
                id="sets"
                type="number"
                min={1}
                max={20}
                value={sets}
                onChange={(e) => setSets(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reps">Repetições</Label>
              <Input
                id="reps"
                type="number"
                min={1}
                max={100}
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
