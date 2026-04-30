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

/**
 * Renders a thumbnail for an exercise video at the configured start time.
 * - YouTube: uses the official thumbnail.
 * - Upload: renders the real video element paused at the start frame so browser
 *   cache/canvas issues cannot leave the preview blank.
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
  const [errored, setErrored] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const freshVideoUrl = getFreshMediaUrl(videoUrl, retryKey);

  const isUploadAutoplay = autoplayPreview && videoType === 'upload' && !!videoUrl;

  useEffect(() => {
    setErrored(false);
    setVideoReady(false);
    setRetryKey(0);
  }, [videoUrl, videoType]);

  useEffect(() => {
    if (videoType !== 'upload' || !freshVideoUrl || videoReady || errored) return;
    const timeout = window.setTimeout(() => {
      setRetryKey((key) => (key < 2 ? key + 1 : key));
    }, 3500);
    return () => window.clearTimeout(timeout);
  }, [videoType, freshVideoUrl, videoReady, errored]);

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

  if (!freshVideoUrl || !videoType) return null;

  let thumbSrc: string | null = null;
  if (videoType === 'youtube') {
    const id = parseYouTubeId(videoUrl);
    // mqdefault (320x180) loads much faster than hqdefault (480x360)
    if (id) thumbSrc = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  }

  const playSize = iconSize === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const badgeSize = iconSize === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  const isInstagram = videoType === 'instagram';

  if (videoType === 'upload') {
    return (
      <div className={`relative bg-muted ${className ?? ''}`}>
        <video
          ref={previewRef}
          key={freshVideoUrl}
          src={freshVideoUrl}
          muted
          autoPlay={isUploadAutoplay}
          playsInline
          loop={isUploadAutoplay}
          preload="metadata"
          onLoadedMetadata={(e) => {
            try {
              e.currentTarget.currentTime = Math.max(0.1, startSeconds ?? 0);
            } catch {
              // ignore
            }
            setVideoReady(true);
          }}
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={() => {
            if (retryKey < 2) setRetryKey((key) => key + 1);
            else setErrored(true);
          }}
          className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} ${errored ? 'opacity-0' : 'opacity-100'}`}
        />
        {errored && <div className="absolute inset-0 bg-muted" />}
        {!isUploadAutoplay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`${badgeSize} rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center`}>
              <Play className={`${playSize} text-white fill-white`} />
            </div>
          </div>
        )}
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
