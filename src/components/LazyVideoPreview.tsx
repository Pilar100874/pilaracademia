import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { VideoThumbnail } from '@/components/VideoThumbnail';

interface Props {
  videoType: string | null;
  videoUrl: string | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  className?: string;
  iconSize?: 'sm' | 'md';
  objectFit?: 'cover' | 'contain';
}

/**
 * Wraps VideoThumbnail and only mounts/plays the underlying <video> element
 * when it's visible in the viewport. Off-screen items render only a cheap
 * placeholder, so dozens of items in a list don't all decode in parallel
 * (which on mobile freezes the page and blows the network budget).
 *
 * - Once the element has been visible at least once, we keep VideoThumbnail
 *   mounted so re-scrolling back is instant.
 * - When still off-screen for the FIRST time, we render only a static
 *   placeholder (no <video>, no metadata preload, no network request).
 * - Autoplay is only enabled while the element is currently in view.
 */
export function LazyVideoPreview({
  videoType,
  videoUrl,
  startSeconds,
  endSeconds,
  className,
  iconSize = 'md',
  objectFit = 'cover',
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(entry.isIntersecting);
          if (entry.isIntersecting) setHasBeenVisible(true);
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const playSize = iconSize === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const badgeSize = iconSize === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  return (
    <div ref={ref} className={className}>
      {hasBeenVisible ? (
        <VideoThumbnail
          videoType={videoType}
          videoUrl={videoUrl}
          startSeconds={startSeconds}
          endSeconds={endSeconds}
          autoplayPreview={visible}
          className="w-full h-full"
          iconSize={iconSize}
          objectFit={objectFit}
        />
      ) : (
        <div className="relative w-full h-full bg-muted">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`${badgeSize} rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center`}>
              <Play className={`${playSize} text-white fill-white`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
