import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { TransitionType } from './types';

interface Props {
  effectType: TransitionType;
  size?: number;
  autoPlay?: boolean;
}

function getOverlayStyleMini(
  type: TransitionType,
  progress: number
): { style: React.CSSProperties; elements: ReactNode } | null {
  const bell = Math.sin(progress * Math.PI);
  const flash = progress < 0.3 ? progress / 0.3 : (1 - progress) / 0.7;
  const flashI = Math.pow(flash, 0.5);

  switch (type) {
    case 'fade':
    case 'dissolve':
    case 'crossfade':
      return {
        style: { background: `radial-gradient(ellipse at center, rgba(255,255,255,${bell * 0.35}), transparent 70%)` },
        elements: null,
      };
    case 'flash':
    case 'light-leak':
      return {
        style: { background: `radial-gradient(ellipse at 40% 40%, rgba(255,240,200,${bell * 0.7}), rgba(255,180,100,${bell * 0.3}) 50%, transparent 80%)`, mixBlendMode: 'screen' as const },
        elements: null,
      };
    case 'film-burn':
      return {
        style: { background: `radial-gradient(ellipse at 60% 30%, rgba(255,120,40,${bell * 0.6}), rgba(255,60,10,${bell * 0.3}) 40%, transparent 70%)`, mixBlendMode: 'screen' as const },
        elements: (
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 20% 70%, rgba(255,200,50,${bell * 0.4}), transparent 60%)`, mixBlendMode: 'screen' }} />
        ),
      };
    case 'fade-blur':
    case 'blur-transition':
      return {
        style: { background: `rgba(255,255,255,${bell * 0.15})`, backdropFilter: `blur(${bell * 4}px)` },
        elements: null,
      };
    case 'luma-fade':
      return {
        style: { background: `linear-gradient(to bottom, rgba(255,255,255,${bell * 0.3}), rgba(0,0,0,${bell * 0.2}))`, mixBlendMode: 'overlay' as const },
        elements: null,
      };
    case 'glitch': {
      const r = Math.sin(progress * 50) * bell * 6;
      return {
        style: {},
        elements: (
          <>
            <div style={{ position: 'absolute', inset: 0, background: `rgba(255,0,0,${bell * 0.3})`, transform: `translateX(${r}px)`, mixBlendMode: 'screen' }} />
            <div style={{ position: 'absolute', inset: 0, background: `rgba(0,255,255,${bell * 0.3})`, transform: `translateX(${-r}px)`, mixBlendMode: 'screen' }} />
            {bell > 0.3 && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: `${30 + Math.sin(progress * 80) * 20}%`, height: `${2 + bell * 6}%`, background: `rgba(255,255,255,${bell * 0.5})`, mixBlendMode: 'overlay' }} />
            )}
          </>
        ),
      };
    }
    case 'whip-pan':
      return {
        style: { background: `linear-gradient(90deg, transparent, rgba(255,255,255,${bell * 0.3}), transparent)`, backdropFilter: `blur(${bell * 8}px)` },
        elements: null,
      };
    case 'cross-zoom':
      return {
        style: { background: `radial-gradient(circle at center, transparent 20%, rgba(255,255,255,${bell * 0.4}) 60%, transparent 90%)`, mixBlendMode: 'screen' as const },
        elements: null,
      };
    case 'zoom-in':
    case 'zoom-out':
    case 'scale-up':
    case 'scale-down':
      return {
        style: { background: `radial-gradient(circle at center, rgba(255,255,255,${flashI * 0.2}), transparent 60%)` },
        elements: null,
      };
    case 'wipe-left':
    case 'wipe-right':
    case 'wipe-up':
    case 'wipe-down':
    case 'color-wipe': {
      const isH = type === 'wipe-left' || type === 'wipe-right' || type === 'color-wipe';
      const dir = isH ? '90deg' : '180deg';
      const pos = progress * 100;
      return {
        style: { background: `linear-gradient(${dir}, transparent ${pos - 5}%, rgba(255,255,255,0.6) ${pos}%, transparent ${pos + 5}%)`, mixBlendMode: 'screen' as const },
        elements: null,
      };
    }
    case 'wipe-circle':
    case 'iris-open':
    case 'iris-close':
    case 'radial-wipe': {
      const radius = progress * 75;
      return {
        style: {},
        elements: (
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle ${radius + 3}% at 50% 50%, transparent ${radius - 2}%, rgba(255,255,255,0.5) ${radius}%, transparent ${radius + 4}%)`, mixBlendMode: 'screen' }} />
        ),
      };
    }
    case 'cube-left':
    case 'cube-right':
    case 'page-curl':
    case 'flip-x':
    case 'flip-y':
      return {
        style: { background: `linear-gradient(135deg, rgba(255,255,255,${bell * 0.15}), transparent 50%, rgba(0,0,0,${bell * 0.2}))`, mixBlendMode: 'overlay' as const },
        elements: null,
      };
    case 'spin-out':
    case 'spiral':
    case 'cross-spin':
      return {
        style: { background: `conic-gradient(from ${progress * 360}deg, transparent, rgba(255,255,255,${bell * 0.2}), transparent)`, mixBlendMode: 'screen' as const },
        elements: null,
      };
    case 'ripple':
      return {
        style: {},
        elements: (
          <>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ position: 'absolute', inset: 0, border: `2px solid rgba(255,255,255,${bell * 0.3 * (1 - i * 0.3)})`, borderRadius: '50%', transform: `scale(${0.3 + progress * 0.7 + i * 0.15})` }} />
            ))}
          </>
        ),
      };
    case 'bounce':
    case 'elastic':
    case 'drop':
      return {
        style: { background: `radial-gradient(ellipse at 50% 80%, rgba(255,255,255,${flashI * 0.25}), transparent 60%)` },
        elements: null,
      };
    case 'pixelate':
    case 'mosaic':
      return {
        style: { background: `rgba(255,255,255,${bell * 0.1})`, backdropFilter: `blur(${bell * 3}px)` },
        elements: null,
      };
    default:
      if (bell > 0.05) {
        return {
          style: { background: `radial-gradient(ellipse at center, rgba(255,255,255,${bell * 0.15}), transparent 65%)` },
          elements: null,
        };
      }
      return null;
  }
}

const MiniEffectPreview: React.FC<Props> = ({ effectType, size = 64, autoPlay = false }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);

  const animate = useCallback((ts: number) => {
    if (!startRef.current) startRef.current = ts;
    const elapsed = ts - startRef.current;
    const dur = 1200; // 1.2s loop
    const p = (elapsed % dur) / dur;
    setProgress(p);
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isHovering || autoPlay) {
      startRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(rafRef.current);
      setProgress(0);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isHovering, autoPlay, animate]);

  const active = isHovering || autoPlay;
  const overlay = active ? getOverlayStyleMini(effectType, progress) : null;

  return (
    <div
      className="relative rounded-md overflow-hidden cursor-pointer border border-border/50 flex-shrink-0"
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Dark background with subtle gradient to show effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
      {/* Subtle content hint */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[60%] h-[40%] rounded-sm bg-gradient-to-r from-zinc-600 to-zinc-700 opacity-40" />
      </div>
      {/* Overlay effect */}
      {overlay && (
        <div className="absolute inset-0 pointer-events-none" style={overlay.style}>
          {overlay.elements}
        </div>
      )}
      {/* Play hint when not active */}
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-white/70 ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniEffectPreview;
