import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { ChevronLeft, ChevronRight, Dumbbell, ChevronUp, ChevronDown, Play, ImageIcon, Sparkles } from 'lucide-react';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
import { AnalysisOverlay } from '@/components/AnalysisOverlay';
import { WorkoutFormCoach } from '@/components/WorkoutFormCoach';
import { getFreshMediaUrl } from '@/lib/mediaUrl';

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
  const [coachOpen, setCoachOpen] = useState(false);
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
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none bg-black [&>button]:top-5 [&>button]:right-5 [&>button]:z-50 [&>button]:h-12 [&>button]:w-12 [&>button]:p-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:backdrop-blur-2xl [&>button]:border [&>button]:border-white/25 [&>button]:text-white [&>button]:opacity-100 [&>button]:shadow-[0_4px_20px_rgba(0,0,0,0.6)] [&>button]:transition-all [&>button]:hover:bg-black/70 [&>button]:hover:scale-110 [&>button]:hover:border-white/40 [&>button]:active:scale-95 [&>button>svg]:h-6 [&>button>svg]:w-6 [&>button>svg]:stroke-[2.5]"
        onKeyDown={handleKeyDown}
      >
        {/* Fullscreen media area */}
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
          {showVideo && hasVideo ? (
            <ExerciseVideoPlayer
              key={`v-${currentExerciseIndex}`}
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
              src={getFreshMediaUrl(currentImages[currentPhotoIndex]) ?? currentImages[currentPhotoIndex]}
              alt={`${currentExercise.name} - Foto ${currentPhotoIndex + 1}`}
              className="w-full h-full object-contain"
            />
          ) : hasVideo ? (
            <ExerciseVideoPlayer
              key={`vf-${currentExerciseIndex}`}
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
          <div className="inline-flex items-center gap-3 bg-black/40 backdrop-blur-xl rounded-2xl pl-2 pr-4 py-2 border border-white/10 shadow-xl">
            <div className="bg-gradient-to-br from-primary to-primary/70 h-10 w-10 rounded-xl flex items-center justify-center shadow-md ring-1 ring-white/20 shrink-0">
              <Dumbbell className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-extrabold text-base sm:text-lg leading-tight tracking-tight truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {plan.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-baseline gap-1 text-white text-[11px] font-semibold bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <span className="font-bold">{exercises.length}</span>
                  <span className="text-white/70 text-[9px] uppercase tracking-wider">
                    exercícios
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Top-right action stack: toggle media */}
        <div className="absolute top-4 right-16 z-40 flex items-center gap-2">
          {hasVideo && currentImages.length > 0 && (
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
          )}
        </div>

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

        {/* Mobile-only: exercise name + sets×reps card above the bottom bar */}
        <div className="sm:hidden absolute bottom-24 left-4 right-4 z-40 pointer-events-none">
          <div className="pointer-events-auto bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 px-4 py-2.5 shadow-2xl mx-auto max-w-lg flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground h-10 w-10 rounded-xl flex flex-col items-center justify-center font-extrabold shadow-md ring-1 ring-white/20 shrink-0">
              <span className="text-base leading-none">{currentExerciseIndex + 1}</span>
              <span className="text-[8px] font-medium opacity-80 leading-none mt-0.5">
                /{exercises.length}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base truncate leading-tight tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {currentExercise.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-baseline gap-1 text-white text-xs font-semibold bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <span className="font-bold">{currentExercise.sets}</span>
                  <span className="text-white/70 text-[10px] uppercase tracking-wider">séries</span>
                </span>
                <span className="inline-flex items-baseline gap-1 text-white text-xs font-semibold bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <span className="font-bold">{currentExercise.reps}</span>
                  <span className="text-white/70 text-[10px] uppercase tracking-wider">reps</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating bottom bar with prev/info/next */}
        <div className="absolute bottom-4 left-4 right-4 z-40 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-md rounded-full border border-white/10 p-2 shadow-2xl mx-auto max-w-lg">
            {/* Previous */}
            <button
              onClick={handlePreviousExercise}
              disabled={isFirstExercise}
              aria-label="Anterior"
              className="group h-12 w-12 shrink-0 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground transition-all hover:bg-primary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-primary/90"
            >
              <ChevronLeft className="h-7 w-7 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
            </button>

            {/* Number badge */}
            <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground h-12 w-12 rounded-2xl flex flex-col items-center justify-center font-extrabold shadow-lg ring-2 ring-white/20 shrink-0">
              <span className="text-lg leading-none">{currentExerciseIndex + 1}</span>
              <span className="text-[9px] font-medium opacity-80 leading-none mt-0.5">
                /{exercises.length}
              </span>
            </div>

            {/* Name + sets×reps */}
            <div className="flex-1 min-w-0 text-left px-1">
              <p className="text-white font-bold text-base sm:text-lg truncate leading-tight tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {currentExercise.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-baseline gap-1 text-white text-xs font-semibold bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <span className="font-bold">{currentExercise.sets}</span>
                  <span className="text-white/70 text-[10px] uppercase tracking-wider">séries</span>
                </span>
                <span className="inline-flex items-baseline gap-1 text-white text-xs font-semibold bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <span className="font-bold">{currentExercise.reps}</span>
                  <span className="text-white/70 text-[10px] uppercase tracking-wider">reps</span>
                </span>
              </div>
            </div>

            {/* Analysis (icon-only, sits next to Next) */}
            <AnalysisOverlay
              body={(currentExercise as any).body_analysis}
              aesthetic={(currentExercise as any).aesthetic_analysis}
              mobility={(currentExercise as any).mobility_analysis}
              variant="inline-icon"
            />

            {/* Coach IA toggle */}
            <button
              onClick={() => setCoachOpen((s) => !s)}
              aria-label="Coach IA"
              aria-pressed={coachOpen}
              className={`group h-12 w-12 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                coachOpen
                  ? 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground ring-2 ring-white/40 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
              }`}
            >
              <Sparkles className="h-6 w-6" strokeWidth={2.3} />
            </button>

            {/* Next */}
            <button
              onClick={handleNextExercise}
              disabled={isLastExercise}
              aria-label="Próximo"
              className="group h-12 w-12 shrink-0 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground transition-all hover:bg-primary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-primary/90"
            >
              <ChevronRight className="h-7 w-7 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {coachOpen && currentExercise && (
          <WorkoutFormCoach
            exerciseName={currentExercise.name}
            exerciseInstructions={(currentExercise as any).instructions || (currentExercise as any).description}
            onClose={() => setCoachOpen(false)}
            onNext={handleNextExercise}
            onPrev={handlePreviousExercise}
            canPrev={!isFirstExercise}
            canNext={!isLastExercise}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}