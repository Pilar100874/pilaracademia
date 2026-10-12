import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WorkoutExercise } from '@/hooks/useWorkoutPlans';
import { GripVertical, Edit, Trash2, Dumbbell, ImageIcon, Play } from 'lucide-react';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { VideoPreviewDialog } from '@/components/VideoPreviewDialog';
import { getFreshMediaUrl } from '@/lib/mediaUrl';

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
          <p className="text-xs text-muted-foreground mt-0.5">
            {exercise.sets} × {exercise.reps}
          </p>
        </div>

        <div className="flex gap-0.5 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            onClick={onEdit}
            aria-label="Editar exercício"
          >
            <Edit className="h-4 w-4" />
          </Button>
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
