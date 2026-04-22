import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { parseYouTubeId, parseInstagramShortcode, buildInstagramEmbedUrl, isInstagramReel } from '@/lib/youtubeUtils';

interface Props {
  videoType: 'youtube' | 'upload' | 'instagram' | string | null;
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
  const [igReloadKey, setIgReloadKey] = useState(0);

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

      // YT replaces the target node with an iframe. Create a child element
      // so React keeps owning the wrapper and won't crash on unmount.
      const target = document.createElement('div');
      ytContainerRef.current.appendChild(target);

      player = new YT.Player(target, {
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
      // Clean any iframe YT injected so React's wrapper unmounts cleanly
      if (ytContainerRef.current) {
        ytContainerRef.current.innerHTML = '';
      }
    };
  }, [videoType, videoUrl, start, end, autoPlay, loop]);

  if (!videoUrl || !videoType) return null;

  if (videoType === 'youtube') {
    const id = parseYouTubeId(videoUrl);
    if (!id) return null;
    return (
      <div className={`${className ?? ''} relative bg-black`}>
        <div ref={ytContainerRef} className="w-full h-full [&>iframe]:!w-full [&>iframe]:!h-full" />
        <div className="absolute inset-0" style={{ pointerEvents: 'auto' }} onClick={(e) => e.preventDefault()} />
      </div>
    );
  }

  if (videoType === 'instagram') {
    const shortcode = parseInstagramShortcode(videoUrl);
    if (!shortcode) return null;
    return (
      <div className={`${className ?? ''} relative flex items-center justify-center bg-black overflow-hidden`}>
        <iframe
          key={igReloadKey}
          src={buildInstagramEmbedUrl(shortcode, isInstagramReel(videoUrl))}
          title="Instagram"
          className="bg-black"
          style={{ width: '100%', maxWidth: 540, height: '100%', minHeight: 640, border: 0 }}
          scrolling="yes"
          allow="encrypted-media"
        />
        <button
          type="button"
          onClick={() => setIgReloadKey((k) => k + 1)}
          aria-label="Recarregar vídeo"
          className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/70 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/90 transition-colors shadow-lg"
          style={{ zIndex: 50, pointerEvents: 'auto' }}
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`${className ?? ''} bg-black`}>
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay={autoPlay}
        muted
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full object-cover bg-black pointer-events-none"
      />
    </div>
  );
}
