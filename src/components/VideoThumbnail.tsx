import { useEffect, useRef, useState } from 'react';
import { Play, Instagram } from 'lucide-react';
import { parseYouTubeId } from '@/lib/youtubeUtils';

interface Props {
  videoType: 'youtube' | 'upload' | 'instagram' | string | null;
  videoUrl: string | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  className?: string;
  iconSize?: 'sm' | 'md';
  /** If true and the video is an 'upload', plays it muted/looping as a live preview */
  autoplayPreview?: boolean;
}

/**
 * Renders a thumbnail for an exercise video at the configured start time.
 * - YouTube: uses the official thumbnail (start seconds is informational only,
 *   YouTube doesn't offer per-second thumbnails publicly).
 * - Upload: captures the frame at video_start_seconds via a hidden <video>.
 */
export function VideoThumbnail({
  videoType,
  videoUrl,
  startSeconds,
  endSeconds,
  className,
  iconSize = 'md',
  autoplayPreview = false,
}: Props) {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const isUploadAutoplay = autoplayPreview && videoType === 'upload' && !!videoUrl;

  // Loop the upload preview between start/end seconds
  useEffect(() => {
    if (!isUploadAutoplay) return;
    const v = previewRef.current;
    if (!v) return;
    const start = Math.max(0, startSeconds ?? 0);
    const end = endSeconds ?? null;

    const onLoaded = () => {
      try { v.currentTime = start; v.play().catch(() => {}); } catch {}
    };
    const onTime = () => {
      if (end !== null && v.currentTime >= end) {
        try { v.currentTime = start; } catch {}
      }
    };
    const onEnded = () => {
      try { v.currentTime = start; v.play().catch(() => {}); } catch {}
    };
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnded);
    };
  }, [isUploadAutoplay, startSeconds, endSeconds, videoUrl]);

  // Capture frame for uploaded videos (when not autoplaying)
  useEffect(() => {
    if (isUploadAutoplay) return;
    if (videoType !== 'upload' || !videoUrl) return;
    setFrameUrl(null);
    setErrored(false);

    const video = document.createElement('video');
    videoElRef.current = video;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    const target = Math.max(0, startSeconds ?? 0);

    const onLoaded = () => {
      try {
        video.currentTime = target;
      } catch {
        setErrored(true);
      }
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setErrored(true);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFrameUrl(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        setErrored(true);
      }
    };

    const onError = () => setErrored(true);

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
      videoElRef.current = null;
    };
  }, [videoType, videoUrl, startSeconds, isUploadAutoplay]);

  if (!videoUrl || !videoType) return null;

  let thumbSrc: string | null = null;
  if (videoType === 'youtube') {
    const id = parseYouTubeId(videoUrl);
    if (id) thumbSrc = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  } else if (videoType === 'upload' && frameUrl) {
    thumbSrc = frameUrl;
  }

  const playSize = iconSize === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const badgeSize = iconSize === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  const isInstagram = videoType === 'instagram';

  // Live autoplay preview for uploaded videos
  if (isUploadAutoplay) {
    return (
      <div className={`relative bg-black ${className ?? ''}`}>
        <video
          ref={previewRef}
          src={videoUrl}
          muted
          autoPlay
          playsInline
          loop
          preload="metadata"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className ?? ''}`}>
      {thumbSrc && !errored ? (
        <img
          src={thumbSrc}
          alt="Pré-visualização do vídeo"
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : isInstagram ? (
        <div
          className="w-full h-full"
          style={{ background: 'linear-gradient(135deg, hsl(280 70% 50%), hsl(330 80% 55%), hsl(20 90% 55%))' }}
        />
      ) : (
        <div className="w-full h-full bg-muted" />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${badgeSize} rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center`}>
          {isInstagram ? (
            <Instagram className={`${playSize} text-white`} />
          ) : (
            <Play className={`${playSize} text-white fill-white`} />
          )}
        </div>
      </div>
    </div>
  );
}
