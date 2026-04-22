import { useEffect, useRef } from 'react';
import { parseYouTubeId, buildYouTubeEmbedUrl } from '@/lib/youtubeUtils';

interface Props {
  videoType: 'youtube' | 'upload' | string | null;
  videoUrl: string | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
}

/**
 * Plays only the trimmed portion of an exercise video.
 * - YouTube: uses embed `start` and `end` query params (auto loops via key change).
 * - Upload: HTML5 <video> with manual time enforcement (auto-restart at end).
 */
export function ExerciseVideoPlayer({
  videoType,
  videoUrl,
  startSeconds,
  endSeconds,
  className,
  autoPlay = false,
  loop = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const start = startSeconds ?? 0;
  const end = endSeconds ?? 0;

  useEffect(() => {
    if (videoType !== 'upload') return;
    const v = videoRef.current;
    if (!v) return;

    const handleLoaded = () => {
      try {
        v.currentTime = start;
      } catch {
        // ignore
      }
    };

    const handleTimeUpdate = () => {
      if (end > 0 && v.currentTime >= end) {
        // Loop the trimmed segment
        try {
          v.currentTime = start;
          if (autoPlay) v.play().catch(() => {});
        } catch {
          // ignore
        }
      } else if (v.currentTime < start - 0.5) {
        try {
          v.currentTime = start;
        } catch {
          // ignore
        }
      }
    };

    v.addEventListener('loadedmetadata', handleLoaded);
    v.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      v.removeEventListener('loadedmetadata', handleLoaded);
      v.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoType, videoUrl, start, end, autoPlay]);

  if (!videoUrl || !videoType) return null;

  if (videoType === 'youtube') {
    const id = parseYouTubeId(videoUrl);
    if (!id) return null;
    return (
      <div className={className}>
        <iframe
          src={buildYouTubeEmbedUrl(id, start, end, autoPlay)}
          title="Vídeo do exercício"
          className="w-full h-full"
          frameBorder={0}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        autoPlay={autoPlay}
        muted={autoPlay}
        playsInline
        className="w-full h-full bg-black"
      />
    </div>
  );
}
