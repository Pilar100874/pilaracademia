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
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none bg-black [&>button]:text-white [&>button]:hover:bg-white/30 [&>button]:top-4 [&>button]:right-4 [&>button]:z-50 [&>button]:h-11 [&>button]:w-11 [&>button]:bg-black/60 [&>button]:backdrop-blur-xl [&>button]:rounded-full [&>button]:border [&>button]:border-white/30 [&>button]:shadow-2xl [&>button>svg]:h-5 [&>button>svg]:w-5 [&>button>svg]:stroke-[2.5]"
        onKeyDown={handleKeyDown}
      >
        {/* Fullscreen media area */}
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
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

        {/* Side navigation - Previous (left) */}
        {!isFirstExercise && (
          <button
            onClick={handlePreviousExercise}
            aria-label="Anterior"
            className="group absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-40 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex items-center justify-center transition-all hover:bg-white/25 hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="h-7 w-7 sm:h-8 sm:w-8 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
          </button>
        )}

        {/* Side navigation - Next (right) */}
        {!isLastExercise && (
          <button
            onClick={handleNextExercise}
            aria-label="Próximo"
            className="group absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/80 backdrop-blur-xl border border-white/20 text-primary-foreground shadow-2xl flex items-center justify-center transition-all hover:bg-primary hover:scale-110 active:scale-95"
          >
            <ChevronRight className="h-7 w-7 sm:h-8 sm:w-8 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
          </button>
        )}

        {/* Floating info bar over the media (no nav buttons here anymore) */}
        <div className="absolute bottom-4 left-4 right-4 z-40 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto bg-black/30 backdrop-blur-md rounded-full border border-white/10 pl-3 pr-5 py-2 shadow-2xl mx-auto max-w-md">
            {/* Number badge */}
            <div className="bg-primary text-primary-foreground h-10 w-10 rounded-full flex items-center justify-center text-base font-bold shrink-0">
              {currentExerciseIndex + 1}
            </div>

            {/* Name + sets×reps */}
            <div className="flex-1 min-w-0 text-center">
              <p className="text-white font-bold text-base truncate leading-tight drop-shadow">
                {currentExercise.name}
              </p>
              <p className="text-white/80 text-sm leading-tight drop-shadow">
                {currentExercise.sets} × {currentExercise.reps}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}