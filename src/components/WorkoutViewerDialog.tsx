import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { ChevronLeft, ChevronRight, Dumbbell, ChevronUp, ChevronDown, Play, ImageIcon } from 'lucide-react';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';

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
  const [showVideo, setShowVideo] = useState(false);
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

  const hasVideo = !!(currentExercise?.video_type && currentExercise?.video_url);
  const isFirstExercise = currentExerciseIndex === 0;
  const isLastExercise = currentExerciseIndex === exercises.length - 1;
  const hasMultiplePhotos = currentImages.length > 1;

  // Reset media state when exercise changes or dialog opens
  useEffect(() => {
    if (!open) return;
    setCurrentPhotoIndex(0);
    setShowVideo(hasVideo);
  }, [currentExerciseIndex, open, hasVideo]);

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
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none bg-black flex flex-col [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:top-4 [&>button]:right-4 [&>button]:z-50 [&>button]:bg-black/40 [&>button]:backdrop-blur-md [&>button]:rounded-full"
        onKeyDown={handleKeyDown}
      >
        {/* Media area - takes all available space above the bottom panel */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black overflow-hidden">
          {showVideo && hasVideo ? (
            <ExerciseVideoPlayer
              videoType={currentExercise.video_type}
              videoUrl={currentExercise.video_url}
              startSeconds={currentExercise.video_start_seconds}
              endSeconds={currentExercise.video_end_seconds}
              autoPlay
              loop
              className="w-full h-full"
            />
          ) : currentImages.length > 0 ? (
            <img
              src={currentImages[currentPhotoIndex]}
              alt={`${currentExercise.name} - Foto ${currentPhotoIndex + 1}`}
              className="w-full h-full object-contain"
            />
          ) : hasVideo ? (
            <ExerciseVideoPlayer
              videoType={currentExercise.video_type}
              videoUrl={currentExercise.video_url}
              startSeconds={currentExercise.video_start_seconds}
              endSeconds={currentExercise.video_end_seconds}
              autoPlay
              loop
              className="w-full h-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/50">
              <Dumbbell className="h-24 w-24 mb-4" />
              <p className="text-lg">Sem mídia</p>
            </div>
          )}
        </div>
        {/* Header overlay (on top of media) */}
        <div className="absolute top-4 left-4 right-20 z-40 pointer-events-none">
          <div className="inline-block bg-black/40 backdrop-blur-md rounded-xl px-3 py-2">
            <h2 className="text-white font-bold text-lg drop-shadow-lg">{plan.name}</h2>
            <p className="text-white/80 text-xs">
              Exercício {currentExerciseIndex + 1} de {exercises.length}
            </p>
          </div>
        </div>
        {/* Toggle video/image button - only show if both exist */}
        {hasVideo && currentImages.length > 0 && (
          <div className="absolute top-4 right-16 z-40">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowVideo((s) => !s)}
              className="gap-1.5"
            >
              {showVideo ? (
                <>
                  <ImageIcon className="h-4 w-4" />
                  Ver foto
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Ver vídeo
                </>
              )}
            </Button>
          </div>
        )}

        {/* Photo navigation (left/right) - only show if multiple photos */}
        {hasMultiplePhotos && (
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 z-40 flex justify-between px-4">
            <Button
              size="icon"
              variant="ghost"
              className={`h-12 w-12 rounded-full bg-orange-500 text-white hover:bg-orange-600 ${
                currentPhotoIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              onClick={handlePreviousPhoto}
              disabled={currentPhotoIndex === 0}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            
            {/* Photo counter - centered */}
            <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium self-center">
              Foto {currentPhotoIndex + 1} de {currentImages.length}
            </div>
            
            <Button
              size="icon"
              variant="ghost"
              className={`h-12 w-12 rounded-full bg-orange-500 text-white hover:bg-orange-600 ${
                currentPhotoIndex === currentImages.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              onClick={handleNextPhoto}
              disabled={currentPhotoIndex === currentImages.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        )}

        {/* Exercise info panel - single compact row */}
        <div className="relative z-40 shrink-0 bg-black/80 backdrop-blur-md border-t border-white/10 px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Number badge */}
            <div className="bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
              {currentExerciseIndex + 1}
            </div>

            {/* Name + sets×reps */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate leading-tight">
                {currentExercise.name}
              </p>
              <p className="text-white/70 text-xs leading-tight">
                {currentExercise.sets} × {currentExercise.reps}
              </p>
            </div>

            {/* Navigation */}
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={handlePreviousExercise}
              disabled={isFirstExercise}
              aria-label="Anterior"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleNextExercise}
              disabled={isLastExercise}
              aria-label="Próximo"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}