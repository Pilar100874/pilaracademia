import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { ChevronLeft, ChevronRight, X, Dumbbell, ChevronUp, ChevronDown } from 'lucide-react';

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
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none bg-black/95"
        onKeyDown={handleKeyDown}
      >
        {/* Close button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 h-10 w-10"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Header overlay */}
        <div className="absolute top-4 left-4 z-40">
          <h2 className="text-white font-bold text-lg drop-shadow-lg">{plan.name}</h2>
          <p className="text-white/70 text-sm">
            Exercício {currentExerciseIndex + 1} de {exercises.length}
          </p>
        </div>

        {/* Main image area - centered fullscreen */}
        <div className="absolute inset-0 flex items-center justify-center">
          {currentImages.length > 0 ? (
            <img
              src={currentImages[currentPhotoIndex]}
              alt={`${currentExercise.name} - Foto ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/50">
              <Dumbbell className="h-24 w-24 mb-4" />
              <p className="text-lg">Sem imagem</p>
            </div>
          )}
        </div>

        {/* Photo navigation (left/right) - only show if multiple photos */}
        {hasMultiplePhotos && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className={`absolute left-4 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 ${
                currentPhotoIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              onClick={handlePreviousPhoto}
              disabled={currentPhotoIndex === 0}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`absolute right-4 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 ${
                currentPhotoIndex === currentImages.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              onClick={handleNextPhoto}
              disabled={currentPhotoIndex === currentImages.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>

            {/* Photo counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              Foto {currentPhotoIndex + 1} de {currentImages.length}
            </div>
          </>
        )}

        {/* Exercise info overlay - bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20 pb-6 px-4">
          {/* Exercise number badge */}
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
              {currentExerciseIndex + 1}
            </div>
            <h3 className="text-white text-xl font-bold">{currentExercise.name}</h3>
          </div>

          {/* Sets and reps */}
          <div className="flex gap-4 mb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-white">{currentExercise.sets}</p>
              <p className="text-xs text-white/70">Séries</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-white">{currentExercise.reps}</p>
              <p className="text-xs text-white/70">Repetições</p>
            </div>
          </div>

          {/* Exercise navigation */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={handlePreviousExercise}
              disabled={isFirstExercise}
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              className="flex-1"
              onClick={handleNextExercise}
              disabled={isLastExercise}
            >
              Próximo
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Exercise progress dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {exercises.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentExerciseIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentExerciseIndex
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}