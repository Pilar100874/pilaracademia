import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';

interface VideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name?: string | null;
  videoType: string | null | undefined;
  videoUrl: string | null | undefined;
  startSeconds?: number | null;
  endSeconds?: number | null;
}

/**
 * Full-screen video preview dialog with floating title and large close button.
 * Reused by exercise library and workout edit list.
 */
export function VideoPreviewDialog({
  open,
  onOpenChange,
  name,
  videoType,
  videoUrl,
  startSeconds,
  endSeconds,
}: VideoPreviewDialogProps) {
  if (!videoUrl || !videoType) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none bg-black [&>button]:top-5 [&>button]:right-5 [&>button]:z-50 [&>button]:h-12 [&>button]:w-12 [&>button]:p-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:backdrop-blur-2xl [&>button]:border [&>button]:border-white/25 [&>button]:text-white [&>button]:opacity-100 [&>button]:shadow-[0_4px_20px_rgba(0,0,0,0.6)] [&>button]:transition-all [&>button]:hover:bg-black/70 [&>button]:hover:scale-110 [&>button]:hover:border-white/40 [&>button]:active:scale-95 [&>button>svg]:h-6 [&>button>svg]:w-6 [&>button>svg]:stroke-[2.5]"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
          <ExerciseVideoPlayer
            videoType={videoType}
            videoUrl={videoUrl}
            startSeconds={startSeconds}
            endSeconds={endSeconds}
            autoPlay
            loop
            className="w-full h-full"
          />
        </div>
        {name && (
          <div className="absolute top-5 left-5 right-20 z-40 pointer-events-none">
            <div className="inline-block bg-black/40 backdrop-blur-xl rounded-2xl px-4 py-2 border border-white/10 shadow-xl max-w-full">
              <h2 className="text-white font-extrabold text-base sm:text-lg leading-tight tracking-tight truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {name}
              </h2>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
