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
import { ExerciseVideoEditor, ExerciseVideoData } from '@/components/ExerciseVideoEditor';

interface EditWorkoutExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: WorkoutExercise | null;
  onSave: (data: { sets: number; reps: number; video: ExerciseVideoData }) => void;
}

export function EditWorkoutExerciseDialog({
  open,
  onOpenChange,
  exercise,
  onSave,
}: EditWorkoutExerciseDialogProps) {
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(12);
  const [video, setVideo] = useState<ExerciseVideoData>({
    video_type: null,
    video_url: null,
    video_start_seconds: null,
    video_end_seconds: null,
  });

  useEffect(() => {
    if (exercise && open) {
      setSets(exercise.sets);
      setReps(exercise.reps);
      setVideo({
        video_type: exercise.video_type ?? null,
        video_url: exercise.video_url ?? null,
        video_start_seconds: exercise.video_start_seconds ?? null,
        video_end_seconds: exercise.video_end_seconds ?? null,
      });
    }
  }, [exercise, open]);

  const handleSave = () => {
    onSave({ sets, reps, video });
    onOpenChange(false);
  };

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Exercício</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="font-medium truncate" title={exercise.name}>{exercise.name}</p>
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

          <ExerciseVideoEditor value={video} onChange={setVideo} />

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
