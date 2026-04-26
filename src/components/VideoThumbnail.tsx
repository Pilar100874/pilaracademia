import { useEffect, useRef, useState } from 'react';
import { Play, Instagram } from 'lucide-react';
import { parseYouTubeId } from '@/lib/youtubeUtils';
import { getFreshMediaUrl } from '@/lib/mediaUrl';

interface Props {
  videoType: 'youtube' | 'upload' | 'instagram' | string | null;
  videoUrl: string | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  className?: string;
  iconSize?: 'sm' | 'md';
  objectFit?: 'cover' | 'contain';
  /** If true and the video is an 'upload', plays it muted/looping as a live preview */
  autoplayPreview?: boolean;
}

// Module-level cache so re-mounts (scrolling) reuse already captured frames.
const frameCache = new Map<string, string>();

/**
 * Renders a thumbnail for an exercise video at the configured start time.
 * - YouTube: uses the official thumbnail.
 * - Upload: captures the frame at video_start_seconds via a hidden <video>,
 *   cached in-memory for instant reuse.
 */
export function VideoThumbnail({
  videoType,
  videoUrl,
  startSeconds,
  endSeconds,
  className,
  iconSize = 'md',
  objectFit = 'cover',
  autoplayPreview = false,
}: Props) {
  const freshVideoUrl = getFreshMediaUrl(videoUrl);
  const cacheKey = freshVideoUrl ? `${freshVideoUrl}@${startSeconds ?? 0}` : '';
  const [frameUrl, setFrameUrl] = useState<string | null>(
    cacheKey ? frameCache.get(cacheKey) ?? null : null
  );
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
    if (videoType !== 'upload' || !freshVideoUrl) return;
    if (frameCache.has(cacheKey)) {
      setFrameUrl(frameCache.get(cacheKey)!);
      return;
    }
    setErrored(false);

    const video = document.createElement('video');
    videoElRef.current = video;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = freshVideoUrl;

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
        // Downscale captured frame to ~360px wide for fast rendering & low memory.
        const maxW = 360;
        const vw = video.videoWidth || 320;
        const vh = video.videoHeight || 180;
        const scale = Math.min(1, maxW / vw);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setErrored(true);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.6);
        frameCache.set(cacheKey, data);
        setFrameUrl(data);
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
  }, [videoType, freshVideoUrl, startSeconds, cacheKey]);

  if (!freshVideoUrl || !videoType) return null;

  let thumbSrc: string | null = null;
  if (videoType === 'youtube') {
    const id = parseYouTubeId(videoUrl);
    // mqdefault (320x180) loads much faster than hqdefault (480x360)
    if (id) thumbSrc = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  } else if (videoType === 'upload' && frameUrl) {
    thumbSrc = frameUrl;
  }

  const playSize = iconSize === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const badgeSize = iconSize === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  const isInstagram = videoType === 'instagram';

  // Live autoplay preview for uploaded videos — show captured frame as poster
  // so the area is never blank while the video downloads.
  if (isUploadAutoplay) {
    return (
      <div className={`relative bg-black ${className ?? ''}`}>
        <video
          ref={previewRef}
          src={freshVideoUrl}
          poster={frameUrl ?? undefined}
          muted
          autoPlay
          playsInline
          loop
          preload="metadata"
          className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
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
          loading="lazy"
          decoding="async"
          className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
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
