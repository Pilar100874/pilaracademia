import { useEffect, useRef, useState } from 'react';
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
 * Wraps VideoThumbnail and only enables autoplay preview when the element
 * is visible in the viewport. This prevents dozens of <video> elements from
 * decoding in parallel and freezing the page when scrolling long lists.
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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(entry.isIntersecting);
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
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
    </div>
  );
}
