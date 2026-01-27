import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { ChevronLeft, ChevronRight, X, Dumbbell } from 'lucide-react';

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
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const exercises = plan.exercises || [];

  const currentExercise = exercises[currentExerciseIndex];
  
  // Get images for current exercise (support both image_urls and legacy image_url)
  const currentImages = currentExercise
    ? currentExercise.image_urls?.length 
      ? currentExercise.image_urls 
      : currentExercise.image_url 
        ? [currentExercise.image_url] 
        : []
    : [];

  const isFirstExercise = currentExerciseIndex === 0;
  const isLastExercise = currentExerciseIndex === exercises.length - 1;
  const hasMultiplePhotos = currentImages.length > 1;

  // Reset photo index when exercise changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [currentExerciseIndex]);

  // Reset indices when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentExerciseIndex(0);
      setCurrentPhotoIndex(0);
    }
  }, [open]);

  const handlePreviousExercise = () => {
    if (!isFirstExercise) {
      setCurrentExerciseIndex((prev) => prev - 1);
    }
  };

  const handleNextExercise = () => {
    if (!isLastExercise) {
      setCurrentExerciseIndex((prev) => prev + 1);
    }
  };

  const handlePreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex((prev) => prev - 1);
    }
  };

  const handleNextPhoto = () => {
    if (currentPhotoIndex < currentImages.length - 1) {
      setCurrentPhotoIndex((prev) => prev + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      if (hasMultiplePhotos && currentPhotoIndex > 0) {
        handlePreviousPhoto();
      } else {
        handlePreviousExercise();
      }
    }
    if (e.key === 'ArrowRight') {
      if (hasMultiplePhotos && currentPhotoIndex < currentImages.length - 1) {
        handleNextPhoto();
      } else {
        handleNextExercise();
      }
    }
    if (e.key === 'ArrowUp') handlePreviousExercise();
    if (e.key === 'ArrowDown') handleNextExercise();
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
              Exercício {currentExerciseIndex + 1} de {exercises.length}
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
            {currentImages.length > 0 ? (
              <img
                src={currentImages[currentPhotoIndex]}
                alt={`${currentExercise.name} - Foto ${currentPhotoIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Dumbbell className="h-16 w-16 text-muted-foreground" />
              </div>
            )}

            {/* Photo navigation arrows (only show if multiple photos) */}
            {hasMultiplePhotos && (
              <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                <Button
                  size="icon"
                  variant="secondary"
                  className={`h-10 w-10 rounded-full shadow-lg pointer-events-auto ${
                    currentPhotoIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-90 hover:opacity-100'
                  }`}
                  onClick={handlePreviousPhoto}
                  disabled={currentPhotoIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className={`h-10 w-10 rounded-full shadow-lg pointer-events-auto ${
                    currentPhotoIndex === currentImages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-90 hover:opacity-100'
                  }`}
                  onClick={handleNextPhoto}
                  disabled={currentPhotoIndex === currentImages.length - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Photo dots (only show if multiple photos) */}
            {hasMultiplePhotos && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 rounded-full px-2 py-1">
                {currentImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`h-2 w-2 rounded-full transition-all ${
                      index === currentPhotoIndex
                        ? 'bg-white'
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Exercise number badge */}
            <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
              {currentExerciseIndex + 1}
            </div>

            {/* Photo counter badge (only show if multiple photos) */}
            {hasMultiplePhotos && (
              <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                {currentPhotoIndex + 1}/{currentImages.length}
              </div>
            )}
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

            {/* Exercise navigation buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handlePreviousExercise}
                disabled={isFirstExercise}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                className="flex-1"
                onClick={handleNextExercise}
                disabled={isLastExercise}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Exercise progress dots */}
          <div className="flex justify-center gap-1.5 pb-4">
            {exercises.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentExerciseIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentExerciseIndex
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