import { Button } from '@/components/ui/button';
import { WorkoutExercise } from '@/hooks/useWorkoutPlans';
import { GripVertical, Edit, Trash2, Dumbbell } from 'lucide-react';

interface ExerciseListItemProps {
  exercise: WorkoutExercise;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function ExerciseListItem({
  exercise,
  index,
  onEdit,
  onDelete,
}: ExerciseListItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border group">
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
        {index + 1}
      </span>

      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
        {exercise.image_url ? (
          <img
            src={exercise.image_url}
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{exercise.name}</p>
        <p className="text-xs text-muted-foreground">
          {exercise.sets} séries × {exercise.reps} reps
        </p>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
