import { useEffect, useRef } from 'react';
import { parseYouTubeId } from '@/lib/youtubeUtils';

interface Props {
  videoType: 'youtube' | 'upload' | string | null;
  videoUrl: string | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
}

// Lazy-load the YouTube IFrame API once
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeAPI(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('SSR');
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(w.YT);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

/**
 * Plays only the trimmed portion of an exercise video.
 * - YouTube: uses IFrame Player API for accurate autoplay + segment looping.
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
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytIntervalRef = useRef<number | null>(null);

  const start = startSeconds ?? 0;
  const end = endSeconds ?? 0;

  // Uploaded video handling
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
        try {
          v.currentTime = start;
          if (autoPlay || loop) v.play().catch(() => {});
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

    const handleEnded = () => {
      try {
        v.currentTime = start;
        if (autoPlay || loop) v.play().catch(() => {});
      } catch {
        // ignore
      }
    };

    v.addEventListener('loadedmetadata', handleLoaded);
    v.addEventListener('timeupdate', handleTimeUpdate);
    v.addEventListener('ended', handleEnded);
    return () => {
      v.removeEventListener('loadedmetadata', handleLoaded);
      v.removeEventListener('timeupdate', handleTimeUpdate);
      v.removeEventListener('ended', handleEnded);
    };
  }, [videoType, videoUrl, start, end, autoPlay, loop]);

  // YouTube IFrame API handling
  useEffect(() => {
    if (videoType !== 'youtube' || !videoUrl) return;
    const id = parseYouTubeId(videoUrl);
    if (!id || !ytContainerRef.current) return;

    let cancelled = false;
    let player: any = null;

    loadYouTubeAPI().then((YT) => {
      if (cancelled || !ytContainerRef.current) return;

      player = new YT.Player(ytContainerRef.current, {
        videoId: id,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          mute: 1,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: start > 0 ? Math.floor(start) : 0,
          end: end > 0 ? Math.ceil(end) : undefined,
        },
        events: {
          onReady: (e: any) => {
            try {
              e.target.mute();
              if (autoPlay || loop) {
                e.target.playVideo();
              }
            } catch {
              // ignore
            }
          },
          onStateChange: (e: any) => {
            // 0 = ended -> loop back to start
            if (e.data === YT.PlayerState.ENDED && loop) {
              try {
                e.target.seekTo(start, true);
                e.target.playVideo();
              } catch {
                // ignore
              }
            }
          },
        },
      });
      ytPlayerRef.current = player;

      // Poll for end-of-segment looping (YouTube doesn't fire ENDED at custom end)
      if (end > 0 && loop) {
        ytIntervalRef.current = window.setInterval(() => {
          try {
            const p = ytPlayerRef.current;
            if (!p || typeof p.getCurrentTime !== 'function') return;
            const t = p.getCurrentTime();
            if (t >= end - 0.2) {
              p.seekTo(start, true);
              p.playVideo();
            }
          } catch {
            // ignore
          }
        }, 250);
      }
    });

    return () => {
      cancelled = true;
      if (ytIntervalRef.current) {
        clearInterval(ytIntervalRef.current);
        ytIntervalRef.current = null;
      }
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      ytPlayerRef.current = null;
    };
  }, [videoType, videoUrl, start, end, autoPlay, loop]);

  if (!videoUrl || !videoType) return null;

  if (videoType === 'youtube') {
    const id = parseYouTubeId(videoUrl);
    if (!id) return null;
    return (
      <div className={className}>
        <div ref={ytContainerRef} className="w-full h-full" />
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
        muted
        playsInline
        className="w-full h-full bg-black"
      />
    </div>
  );
}
