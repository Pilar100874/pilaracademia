import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { ChevronLeft, ChevronRight, X, Dumbbell, Play } from 'lucide-react';

interface WorkoutViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: WorkoutPlan;
}

export function WorkoutViewerDialog({
  open,
  onOpenChange,
  plan,
}: WorkoutViewerDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const exercises = plan.exercises || [];

  const currentExercise = exercises[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === exercises.length - 1;

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
  };

  if (!currentExercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-bold text-lg">{plan.name}</h2>
            <p className="text-sm text-muted-foreground">
              Exercício {currentIndex + 1} de {exercises.length}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Exercise content */}
        <div className="relative">
          {/* Image */}
          <div className="aspect-video bg-muted relative">
            {currentExercise.image_url ? (
              <img
                src={currentExercise.image_url}
                alt={currentExercise.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Dumbbell className="h-16 w-16 text-muted-foreground" />
              </div>
            )}

            {/* Navigation arrows on image */}
            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
              <Button
                size="icon"
                variant="secondary"
                className={`h-12 w-12 rounded-full shadow-lg pointer-events-auto ${
                  isFirst ? 'opacity-30 cursor-not-allowed' : 'opacity-90 hover:opacity-100'
                }`}
                onClick={handlePrevious}
                disabled={isFirst}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className={`h-12 w-12 rounded-full shadow-lg pointer-events-auto ${
                  isLast ? 'opacity-30 cursor-not-allowed' : 'opacity-90 hover:opacity-100'
                }`}
                onClick={handleNext}
                disabled={isLast}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Exercise number badge */}
            <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
              {currentIndex + 1}
            </div>
          </div>

          {/* Exercise info */}
          <div className="p-4 space-y-3">
            <h3 className="text-xl font-bold">{currentExercise.name}</h3>
            
            <div className="flex gap-4">
              <div className="flex-1 bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {currentExercise.sets}
                </p>
                <p className="text-sm text-muted-foreground">Séries</p>
              </div>
              <div className="flex-1 bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {currentExercise.reps}
                </p>
                <p className="text-sm text-muted-foreground">Repetições</p>
              </div>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pb-4">
            {exercises.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
