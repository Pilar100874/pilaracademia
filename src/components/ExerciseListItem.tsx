import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WorkoutExercise } from '@/hooks/useWorkoutPlans';
import { GripVertical, Trash2, Dumbbell, ImageIcon, Play } from 'lucide-react';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { VideoPreviewDialog } from '@/components/VideoPreviewDialog';
import { getFreshMediaUrl } from '@/lib/mediaUrl';

interface ExerciseListItemProps {
  exercise: WorkoutExercise;
  index: number;
  onDelete: () => void;
  onChangeSetsReps?: (sets: number, reps: number) => void;
  onChangeRest?: (seconds: number) => void;
}

export function ExerciseListItem({
  exercise,
  index,
  onDelete,
  onChangeSetsReps,
  onChangeRest,
}: ExerciseListItemProps) {
  const [setsTxt, setSetsTxt] = useState(String(exercise.sets));
  const [repsTxt, setRepsTxt] = useState(String(exercise.reps));
  useEffect(() => { setSetsTxt(String(exercise.sets)); setRepsTxt(String(exercise.reps)); }, [exercise.sets, exercise.reps]);
  const commit = () => {
    const s = Math.min(20, Math.max(1, parseInt(setsTxt) || exercise.sets));
    const r = Math.min(100, Math.max(1, parseInt(repsTxt) || exercise.reps));
    setSetsTxt(String(s)); setRepsTxt(String(r));
    if (s !== exercise.sets || r !== exercise.reps) onChangeSetsReps?.(s, r);
  };
  const [restTxt, setRestTxt] = useState(String(exercise.rest_seconds ?? 30));
  useEffect(() => { setRestTxt(String(exercise.rest_seconds ?? 30)); }, [exercise.rest_seconds]);
  const commitRest = () => {
    const v = Math.min(600, Math.max(0, parseInt(restTxt) || 0));
    setRestTxt(String(v));
    if (v !== (exercise.rest_seconds ?? 30)) onChangeRest?.(v);
  };
  const [zoomOpen, setZoomOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  // Support both image_urls and legacy image_url
  const images = exercise.image_urls?.length
    ? exercise.image_urls
    : exercise.image_url
      ? [exercise.image_url]
      : [];
  const imageCount = images.length;
  const firstImage = getFreshMediaUrl(images[0]);
  const hasVideo = !!(exercise.video_url && exercise.video_type);

  // Prioriza foto se existir (mais leve e mais informativa que um play vazio).
  // Se não tiver foto mas tiver vídeo, mostra o thumbnail do vídeo.
  const showImageFirst = !!firstImage;

  const handleThumbClick = () => {
    if (hasVideo) setVideoOpen(true);
    else if (firstImage) setZoomOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border group">
        <div
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        <button
          type="button"
          className="relative w-16 h-16 rounded-md bg-muted overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={handleThumbClick}
          aria-label="Ver mídia"
        >
          {showImageFirst ? (
            <>
              <img
                src={firstImage!}
                alt={exercise.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              {hasVideo && (
                <div className="absolute top-0.5 right-0.5 bg-black/60 backdrop-blur-sm rounded-full h-5 w-5 flex items-center justify-center pointer-events-none">
                  <Play className="h-2.5 w-2.5 text-white fill-white" />
                </div>
              )}
              {imageCount > 1 && (
                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl flex items-center gap-0.5 pointer-events-none">
                  <ImageIcon className="h-2.5 w-2.5" />
                  {imageCount}
                </div>
              )}
            </>
          ) : hasVideo ? (
            <VideoThumbnail
              videoType={exercise.video_type}
              videoUrl={exercise.video_url}
              startSeconds={exercise.video_start_seconds}
              endSeconds={exercise.video_end_seconds}
              iconSize="sm"
              className="w-full h-full"
              autoplayPreview={exercise.video_type === 'upload'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight truncate" title={exercise.name}>
            {exercise.name}
          </p>
          {onChangeSetsReps ? (
            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground" onPointerDown={(e) => e.stopPropagation()}>
              <input
                inputMode="numeric" aria-label="Séries" value={setsTxt} draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onChange={(e) => setSetsTxt(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="h-7 w-10 rounded-md border border-border bg-background text-center text-sm text-foreground"
              />
              <span>séries ×</span>
              <input
                inputMode="numeric" aria-label="Repetições" value={repsTxt} draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onChange={(e) => setRepsTxt(e.target.value.replace(/\D/g, '').slice(0, 3))}
                onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="h-7 w-11 rounded-md border border-border bg-background text-center text-sm text-foreground"
              />
              <span>reps</span>
              {onChangeRest && (
                <>
                  <span className="ml-1">· descanso</span>
                  <input
                    inputMode="numeric" aria-label="Descanso em segundos" value={restTxt} draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onChange={(e) => setRestTxt(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    onBlur={commitRest} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="h-7 w-11 rounded-md border border-border bg-background text-center text-sm text-foreground"
                  />
                  <span>s</span>
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              {exercise.sets} × {exercise.reps}
            </p>
          )}
        </div>

        <div className="flex gap-0.5 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Remover exercício"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ImageZoomDialog
        images={images}
        alt={exercise.name}
        open={zoomOpen}
        onOpenChange={setZoomOpen}
      />

      <VideoPreviewDialog
        open={videoOpen}
        onOpenChange={setVideoOpen}
        name={exercise.name}
        videoType={exercise.video_type}
        videoUrl={exercise.video_url}
        startSeconds={exercise.video_start_seconds}
        endSeconds={exercise.video_end_seconds}
      />
    </>
  );
}
