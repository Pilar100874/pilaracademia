import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Wand2, Zap, Eye, X, ArrowRightToLine, ArrowLeftFromLine, Clock,
  RotateCcw, Plus, Play, Pause, RefreshCw, Music, Headphones, Volume2, ChevronDown, ChevronRight, Gauge, Check
} from 'lucide-react';
import { TimelineClip, EFFECT_PRESETS, TRANSITION_PRESETS, VideoFilter, TransitionType, ClipTransition, FilterType, AudioFilter, AudioFilterType, AUDIO_FILTER_DEFS, AUDIO_PRESETS, VolumeEnvelopePoint } from './types';
import TransitionPreviewThumb from './TransitionPreviewThumb';

interface Props {
  selectedClip: TimelineClip;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onPreviewTransition?: (clipId: string, phase: 'entrance' | 'exit') => void;
  onToggleFilterPreview?: (active: boolean) => void;
  onClose: () => void;
  onSimulate?: (active: boolean) => void;
  isSimulating?: boolean;
}

const TRANSITION_CATEGORIES = [
  { id: 'cinematic', label: '🎬 Cinematográfico', icon: '🎬', types: ['cinematic-fade', 'dolly-zoom', 'lens-flare', 'anamorphic-wipe', 'rack-focus', 'letterbox-reveal', 'speed-ramp', 'film-grain-fade', 'smoke-reveal', 'prism-shift'] as TransitionType[] },
  { id: 'ugc', label: '📱 UGC / Social', icon: '📱', types: ['snap-cut', 'phone-swipe-up', 'phone-swipe-left', 'tiktok-zoom', 'vlog-jump', 'selfie-flip', 'story-slide', 'boomerang', 'hand-block', 'quick-pan'] as TransitionType[] },
  { id: 'brands', label: '🏆 Marcas Famosas', icon: '🏆', types: ['nike-swoosh', 'apple-fade', 'netflix-punch', 'adidas-stripe', 'coca-wave', 'samsung-fold', 'google-morph', 'disney-sparkle', 'supreme-drop', 'luxury-curtain'] as TransitionType[] },
  { id: 'basic', label: 'Básicas', icon: '✨', types: ['fade', 'dissolve', 'crossfade', 'fade-blur', 'luma-fade'] as TransitionType[] },
  { id: 'movement', label: 'Movimento', icon: '🔀', types: ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'roll-left', 'roll-right', 'whip-pan'] as TransitionType[] },
  { id: 'push-cover', label: 'Push/Cover', icon: '📑', types: ['push-left', 'push-right', 'push-up', 'push-down', 'cover-left', 'cover-right', 'reveal-left', 'reveal-right'] as TransitionType[] },
  { id: 'scale', label: 'Escala & Rotação', icon: '🔍', types: ['zoom-in', 'zoom-out', 'scale-up', 'scale-down', 'morph-scale', 'rotate-in', 'rotate-out', 'spiral', 'flip-x', 'flip-y', 'cross-zoom', 'cross-spin'] as TransitionType[] },
  { id: 'dynamic', label: 'Dinâmicas', icon: '🎢', types: ['bounce', 'elastic', 'swing', 'shake', 'drop', 'tumble'] as TransitionType[] },
  { id: 'reveal', label: 'Revelação & Wipe', icon: '🎭', types: ['wipe-left', 'wipe-right', 'wipe-up', 'wipe-down', 'wipe-circle', 'wipe-diamond', 'iris-open', 'iris-close', 'split-horizontal', 'split-vertical', 'clock-wipe', 'radial-wipe', 'blinds-h', 'blinds-v', 'color-wipe'] as TransitionType[] },
  { id: '3d', label: '3D & Perspectiva', icon: '🧊', types: ['cube-left', 'cube-right', 'page-curl', 'door-open', 'door-close', 'stretch-h', 'stretch-v', 'fly-in', 'fly-out'] as TransitionType[] },
  { id: 'special', label: 'Efeitos Especiais', icon: '⚡', types: ['blur-transition', 'flash', 'glitch', 'pixelate', 'light-leak', 'film-burn', 'ripple', 'mosaic', 'spin-out'] as TransitionType[] },
];

const FILTER_CATEGORIES = [
  { id: 'cor', label: 'Cor', presets: ['cinematic', 'cinematic-teal', 'vintage', 'vivid', 'warm', 'cold', 'sunset', 'bw', 'noir'] },
  { id: 'estilo', label: 'Estilo', presets: ['dreamy', 'hdr', 'matte', 'bleach', 'lomo', 'retro-vhs'] },
  { id: 'especial', label: 'Especial', presets: ['negative', 'xray', 'cyberpunk'] },
];

const INDIVIDUAL_FILTERS: { type: FilterType; label: string; icon: string; defaultValue: number }[] = [
  { type: 'brightness', label: 'Brilho', icon: '☀️', defaultValue: 50 },
  { type: 'contrast', label: 'Contraste', icon: '◐', defaultValue: 50 },
  { type: 'saturation', label: 'Saturação', icon: '🎨', defaultValue: 50 },
  { type: 'hue-rotate', label: 'Matiz', icon: '🌈', defaultValue: 0 },
  { type: 'blur', label: 'Desfoque', icon: '💫', defaultValue: 0 },
  { type: 'grayscale', label: 'Escala Cinza', icon: '⬜', defaultValue: 0 },
  { type: 'sepia', label: 'Sépia', icon: '📜', defaultValue: 0 },
  { type: 'invert', label: 'Inverter', icon: '🔄', defaultValue: 0 },
  { type: 'opacity', label: 'Opacidade', icon: '👁️', defaultValue: 100 },
  { type: 'drop-shadow', label: 'Sombra', icon: '🌑', defaultValue: 0 },
];

const EASING_OPTIONS = [
  { value: 'ease-out', label: 'Suave' },
  { value: 'ease-in', label: 'Acelerado' },
  { value: 'ease-in-out', label: 'Suave Duplo' },
  { value: 'linear', label: 'Linear' },
  { value: 'elastic', label: 'Elástico' },
];

// === Transition animation style calculator (mirrors VideoPreview) ===
function getTransitionStyle(type: TransitionType, progress: number, isExit: boolean): React.CSSProperties {
  const p = isExit ? 1 - progress : progress;
  switch (type) {
    case 'fade': return { opacity: p };
    case 'dissolve': return { opacity: p };
    case 'crossfade': return { opacity: p };
    case 'fade-blur': return { opacity: p, filter: `blur(${(1 - p) * 12}px)` };
    case 'luma-fade': return { opacity: p, filter: `brightness(${0.5 + p * 0.5}) contrast(${0.8 + p * 0.2})` };
    case 'slide-left': return { transform: `translateX(${(1 - p) * 100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-right': return { transform: `translateX(${(1 - p) * -100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-up': return { transform: `translateY(${(1 - p) * 100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-down': return { transform: `translateY(${(1 - p) * -100}%)`, opacity: Math.min(1, p * 2) };
    case 'roll-left': return { transform: `translateX(${(1 - p) * 100}%) rotate(${(1 - p) * 45}deg)`, opacity: p };
    case 'roll-right': return { transform: `translateX(${(1 - p) * -100}%) rotate(${(1 - p) * -45}deg)`, opacity: p };
    case 'push-left': return { transform: `translateX(${(1 - p) * 100}%)` };
    case 'push-right': return { transform: `translateX(${(1 - p) * -100}%)` };
    case 'push-up': return { transform: `translateY(${(1 - p) * 100}%)` };
    case 'push-down': return { transform: `translateY(${(1 - p) * -100}%)` };
    case 'cover-left': return { transform: `translateX(${(1 - p) * 100}%)`, zIndex: 10 };
    case 'cover-right': return { transform: `translateX(${(1 - p) * -100}%)`, zIndex: 10 };
    case 'reveal-left': return { transform: `translateX(${-p * 100}%)` };
    case 'reveal-right': return { transform: `translateX(${p * 100}%)` };
    case 'whip-pan': return { transform: `translateX(${(1 - p) * 120}%)`, filter: `blur(${(1 - p) * 20}px)` };
    case 'zoom-in': return { transform: `scale(${0.3 + p * 0.7})`, opacity: p };
    case 'zoom-out': return { transform: `scale(${1 + (1 - p) * 0.5})`, opacity: p };
    case 'scale-up': { const b = p < 0.7 ? p / 0.7 : 1 + Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.1; return { transform: `scale(${b * 0.5 + 0.5})`, opacity: Math.min(1, p * 1.5) }; }
    case 'scale-down': return { transform: `scale(${1 + (1 - p) * 0.3})`, opacity: p };
    case 'morph-scale': return { transform: `scale(${0.5 + p * 0.5}) scaleX(${0.7 + p * 0.3})`, opacity: p };
    case 'rotate-in': return { transform: `rotate(${(1 - p) * 90}deg) scale(${0.5 + p * 0.5})`, opacity: p };
    case 'rotate-out': return { transform: `rotate(${(1 - p) * -90}deg) scale(${0.5 + p * 0.5})`, opacity: p };
    case 'spiral': return { transform: `rotate(${(1 - p) * 360}deg) scale(${p})`, opacity: p };
    case 'flip-x': return { transform: `perspective(800px) rotateY(${(1 - p) * 90}deg)`, opacity: Math.min(1, p * 1.5) };
    case 'flip-y': return { transform: `perspective(800px) rotateX(${(1 - p) * 90}deg)`, opacity: Math.min(1, p * 1.5) };
    case 'cross-zoom': return { transform: `scale(${p < 0.5 ? 1 + (0.5 - p) * 4 : 1 + (p - 0.5) * 4})`, opacity: p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2, filter: `blur(${Math.abs(p - 0.5) * 16}px)` };
    case 'cross-spin': return { transform: `rotate(${(1 - p) * 180}deg) scale(${p})`, opacity: p };
    case 'bounce': { const e = p < 1 ? 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * (2 * Math.PI) / 3) : 1; return { transform: `scale(${e})`, opacity: Math.min(1, p * 2) }; }
    case 'elastic': { const e = p < 1 ? 1 - Math.pow(2, -8 * p) * Math.cos((p * 12 - 0.5) * (2 * Math.PI) / 3) : 1; return { transform: `scaleX(${e}) scaleY(${2 - e})`, opacity: Math.min(1, p * 2) }; }
    case 'swing': return { transform: `rotate(${Math.sin(p * Math.PI * 3) * (1 - p) * 25}deg)`, opacity: p };
    case 'shake': return { transform: `translateX(${Math.sin(p * 40) * (1 - p) * 15}px) translateY(${Math.cos(p * 35) * (1 - p) * 8}px)`, opacity: p };
    case 'drop': { const g = p < 0.6 ? (p / 0.6) * (p / 0.6) : 1 - Math.sin((p - 0.6) / 0.4 * Math.PI * 3) * (1 - p) * 0.3; return { transform: `translateY(${(1 - g) * -200}px)`, opacity: Math.min(1, p * 2) }; }
    case 'tumble': return { transform: `perspective(600px) rotateX(${(1 - p) * 90}deg) translateY(${(1 - p) * -50}px)`, opacity: p, transformOrigin: 'bottom center' };
    case 'wipe-left': return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case 'wipe-right': return { clipPath: `inset(0 0 0 ${(1 - p) * 100}%)` };
    case 'wipe-up': return { clipPath: `inset(${(1 - p) * 100}% 0 0 0)` };
    case 'wipe-down': return { clipPath: `inset(0 0 ${(1 - p) * 100}% 0)` };
    case 'wipe-circle': return { clipPath: `circle(${p * 75}% at 50% 50%)` };
    case 'wipe-diamond': return { clipPath: `polygon(50% ${50 - p * 50}%, ${50 + p * 50}% 50%, 50% ${50 + p * 50}%, ${50 - p * 50}% 50%)` };
    case 'iris-open': return { clipPath: `circle(${p * 72}% at 50% 50%)` };
    case 'iris-close': return { clipPath: `circle(${(1 - p) * 72}% at 50% 50%)` };
    case 'split-horizontal': return { clipPath: `inset(${(1 - p) * 50}% 0)` };
    case 'split-vertical': return { clipPath: `inset(0 ${(1 - p) * 50}%)` };
    case 'clock-wipe': { const angle = p * 360; return { clipPath: `polygon(50% 50%, 50% 0%, ${angle > 90 ? '100% 0%,' : `${50 + Math.tan(angle * Math.PI / 180) * 50}% 0%,`} ${angle > 90 ? (angle > 180 ? '100% 100%,' : `100% ${Math.tan((angle - 90) * Math.PI / 180) * 50}%,`) : ''} ${angle > 180 ? (angle > 270 ? '0% 100%,' : `${100 - Math.tan((angle - 180) * Math.PI / 180) * 50}% 100%,`) : ''} ${angle > 270 ? `0% ${100 - Math.tan((angle - 270) * Math.PI / 180) * 50}%` : ''})`.replace(/,\s*\)/, ')') }; }
    case 'radial-wipe': return { clipPath: `circle(${p * 100}% at 50% 50%)` };
    case 'blinds-h': { const n = 6; const s = p * 100 / n; return { clipPath: Array.from({ length: n }, (_, i) => `inset(${i * 100 / n}% 0 ${100 - (i + 1) * 100 / n}% 0)`).join(','), opacity: p > 0.1 ? 1 : p * 10 }; }
    case 'blinds-v': { return { clipPath: `inset(0 ${(1 - p) * 50}% 0 ${(1 - p) * 50}%)`, opacity: p }; }
    case 'color-wipe': return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, boxShadow: `inset 3px 0 0 0 hsl(var(--primary))` };
    case 'cube-left': return { transform: `perspective(800px) rotateY(${(1 - p) * -90}deg)`, opacity: p, transformOrigin: 'right center' };
    case 'cube-right': return { transform: `perspective(800px) rotateY(${(1 - p) * 90}deg)`, opacity: p, transformOrigin: 'left center' };
    case 'page-curl': return { transform: `perspective(800px) rotateY(${(1 - p) * 90}deg) scale(${0.8 + p * 0.2})`, opacity: p, transformOrigin: 'left center' };
    case 'door-open': return { clipPath: `inset(0 ${(1 - p) * 50}%)` };
    case 'door-close': return { clipPath: `inset(0 ${p * 50}%)` };
    case 'stretch-h': return { transform: `scaleX(${p})`, opacity: p, transformOrigin: 'center' };
    case 'stretch-v': return { transform: `scaleY(${p})`, opacity: p, transformOrigin: 'center' };
    case 'fly-in': return { transform: `perspective(800px) translateZ(${(1 - p) * -500}px)`, opacity: p };
    case 'fly-out': return { transform: `perspective(800px) translateZ(${(1 - p) * 500}px)`, opacity: p };
    case 'blur-transition': return { filter: `blur(${(1 - p) * 15}px)`, opacity: p };
    case 'flash': return { opacity: p, filter: `brightness(${1 + (1 - p) * 3})` };
    case 'glitch': { const offset = Math.sin(p * 30) * (1 - p) * 8; return { transform: `translateX(${offset}px)`, opacity: 0.6 + p * 0.4, filter: `hue-rotate(${(1 - p) * 120}deg)` }; }
    case 'pixelate': return { filter: `blur(${(1 - p) * 8}px)`, opacity: p };
    case 'light-leak': return { opacity: p, filter: `brightness(${1 + (1 - p) * 2}) saturate(${1 + (1 - p) * 1.5})` };
    case 'film-burn': return { opacity: p, filter: `brightness(${1 + (1 - p) * 4}) contrast(${1 + (1 - p)}) sepia(${(1 - p) * 80}%)` };
    case 'ripple': return { transform: `scale(${1 + Math.sin(p * Math.PI * 4) * (1 - p) * 0.1})`, opacity: p, filter: `blur(${(1 - p) * 4}px)` };
    case 'mosaic': return { filter: `blur(${(1 - p) * 10}px)`, opacity: p, transform: `scale(${1 + (1 - p) * 0.05})` };
    case 'spin-out': return { transform: `rotate(${(1 - p) * 720}deg) scale(${p})`, opacity: p };
    // Cinematográfico
    case 'cinematic-fade': return { opacity: p * p, filter: `blur(${(1 - p) * 3}px) brightness(${0.6 + p * 0.4})` };
    case 'dolly-zoom': return { transform: `scale(${1 + (1 - p) * 0.5})`, opacity: p, filter: `blur(${(1 - p) * 2}px)` };
    case 'lens-flare': return { opacity: p, filter: `brightness(${1 + (1 - p) * 4}) saturate(${1 + (1 - p) * 3})` };
    case 'anamorphic-wipe': return { clipPath: `inset(0 ${(1 - p) * 50}%)`, transform: `scaleX(${0.8 + p * 0.2})` };
    case 'rack-focus': return { filter: `blur(${Math.sin((1 - p) * Math.PI) * 8}px)`, opacity: 0.5 + p * 0.5 };
    case 'letterbox-reveal': return { clipPath: `inset(${(1 - p) * 35}% 0)`, opacity: p };
    case 'speed-ramp': { const sp = p < 0.3 ? p / 0.3 * 0.3 : 0.3 + (p - 0.3) / 0.7 * 0.7; return { transform: `scale(${1 + (1 - sp) * 0.3})`, filter: `blur(${(1 - sp) * 4}px)`, opacity: sp }; }
    case 'film-grain-fade': return { opacity: p, filter: `contrast(${1 + (1 - p) * 0.4}) brightness(${0.7 + p * 0.3})` };
    case 'smoke-reveal': return { clipPath: `circle(${p * 85}% at 50% 50%)`, filter: `blur(${(1 - p) * 5}px)`, opacity: p };
    case 'prism-shift': { const off = (1 - p) * 5; return { transform: `translateX(${off}px)`, filter: `hue-rotate(${(1 - p) * 80}deg) blur(${(1 - p) * 2}px)`, opacity: p }; }
    // UGC / Social
    case 'snap-cut': return { opacity: p > 0.08 ? 1 : 0, transform: `scale(${p > 0.08 ? 1 : 0.95})` };
    case 'phone-swipe-up': return { transform: `translateY(${(1 - p) * 110}%)`, opacity: Math.min(1, p * 4) };
    case 'phone-swipe-left': return { transform: `translateX(${(1 - p) * 110}%) rotate(${(1 - p) * -3}deg)`, opacity: Math.min(1, p * 4) };
    case 'tiktok-zoom': { const tz = p < 0.4 ? p / 0.4 : 1; return { transform: `scale(${0.4 + tz * 0.6})`, filter: `blur(${(1 - tz) * 3}px)`, opacity: tz }; }
    case 'vlog-jump': return { opacity: p > 0.04 ? 1 : 0, transform: `scale(${p > 0.04 ? 1 + (1 - p) * 0.04 : 0.9})` };
    case 'selfie-flip': return { transform: `perspective(800px) rotateY(${(1 - p) * 180}deg)`, opacity: p > 0.5 ? 1 : p * 2 };
    case 'story-slide': return { transform: `translateX(${(1 - p) * 100}%)`, opacity: p };
    case 'boomerang': { const bp = p < 0.5 ? p * 2 : 2 - p * 2; return { transform: `scale(${0.7 + bp * 0.3})`, opacity: 0.4 + bp * 0.6 }; }
    case 'hand-block': return { opacity: p < 0.3 ? 0 : (p - 0.3) / 0.7, filter: p < 0.3 ? 'brightness(0.1)' : '' };
    case 'quick-pan': return { transform: `translateX(${(1 - p) * 120}%)`, filter: `blur(${(1 - p) * 6}px)`, opacity: Math.min(1, p * 3) };
    // Marcas Famosas
    case 'nike-swoosh': return { clipPath: `polygon(0 0, ${p * 100}% 0, ${Math.max(0, p * 100 - 25)}% 100%, 0 100%)` };
    case 'apple-fade': return { opacity: p * p * p };
    case 'netflix-punch': return { transform: `scale(${0.2 + p * 0.8})`, opacity: p, filter: `brightness(${1 + (1 - p) * 2})` };
    case 'adidas-stripe': return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, transform: `skewX(${(1 - p) * -10}deg)` };
    case 'coca-wave': { const w = Math.sin(p * Math.PI * 2) * (1 - p) * 15; return { transform: `translateY(${w}px) scale(${0.85 + p * 0.15})`, opacity: p }; }
    case 'samsung-fold': return { transform: `perspective(800px) rotateY(${(1 - p) * 70}deg)`, opacity: p };
    case 'google-morph': return { transform: `scale(${0.5 + p * 0.5}) rotate(${(1 - p) * 20}deg)`, filter: `hue-rotate(${(1 - p) * 150}deg) saturate(${1 + (1 - p) * 3})`, opacity: p };
    case 'disney-sparkle': return { transform: `scale(${0.4 + p * 0.6})`, opacity: p, filter: `brightness(${1 + (1 - p) * 2}) saturate(${1 + (1 - p) * 1.5})` };
    case 'supreme-drop': return { transform: `translateY(${(1 - p) * -80}%)`, opacity: p < 0.7 ? p / 0.7 : 1 };
    case 'luxury-curtain': return { clipPath: `inset(0 ${(1 - p) * 50}%)`, filter: `brightness(${0.6 + p * 0.4}) sepia(${(1 - p) * 40}%)` };
    default: return {};
  }
}

// === Build CSS filter string from clip filters ===
function buildFilterCss(filters: VideoFilter[] | undefined): string {
  if (!filters?.length) return 'none';
  return filters.filter(f => f.enabled).map(f => {
    switch (f.type) {
      case 'brightness': return `brightness(${f.value / 50})`;
      case 'contrast': return `contrast(${f.value / 50})`;
      case 'saturation': return `saturate(${f.value / 50})`;
      case 'hue-rotate': return `hue-rotate(${f.value * 3.6}deg)`;
      case 'blur': return `blur(${f.value / 10}px)`;
      case 'grayscale': return `grayscale(${f.value}%)`;
      case 'sepia': return `sepia(${f.value}%)`;
      case 'invert': return `invert(${f.value}%)`;
      case 'opacity': return `opacity(${f.value}%)`;
      case 'drop-shadow': return `drop-shadow(0 ${f.value / 10}px ${f.value / 5}px rgba(0,0,0,0.5))`;
      default: return '';
    }
  }).filter(Boolean).join(' ') || 'none';
}

// === Mini Transition Preview Component ===
const MiniTransitionPreview: React.FC<{
  type: TransitionType | undefined;
  isExit: boolean;
  clipSrc?: string;
  clipType?: string;
}> = ({ type, isExit, clipSrc, clipType }) => {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rafRef = useRef<number>(0);
  const startRef = useRef(performance.now());

  const restart = useCallback(() => {
    startRef.current = performance.now();
    setPlaying(true);
  }, []);

  useEffect(() => {
    restart();
  }, [type, isExit, restart]);

  useEffect(() => {
    if (!playing || !type || type === 'none') return;
    const duration = 1500; // 1.5s animation loop
    const animate = () => {
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Pause 600ms at end, then loop
        setTimeout(() => {
          startRef.current = performance.now();
          rafRef.current = requestAnimationFrame(animate);
        }, 600);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, type]);

  if (!type || type === 'none') {
    return (
      <div className="w-full h-24 rounded-lg bg-muted/40 flex items-center justify-center">
        <p className="text-[10px] text-muted-foreground">Selecione uma transição para simular</p>
      </div>
    );
  }

  const style = getTransitionStyle(type, progress, isExit);
  const hasThumbnail = clipSrc && (clipType === 'image' || clipType === 'canvas');

  return (
    <div className="w-full h-28 rounded-lg bg-muted/60 overflow-hidden relative">
      {/* Background checkerboard */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-conic-gradient(hsl(var(--muted-foreground)) 0% 25%, transparent 0% 50%)', backgroundSize: '12px 12px' }} />

      {/* Animated element */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[85%] h-[85%] rounded-md overflow-hidden" style={style}>
          {hasThumbnail ? (
            <img src={clipSrc} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/80 via-primary/50 to-primary/30 flex items-center justify-center">
              <span className="text-primary-foreground/80 text-lg font-bold">{isExit ? '🎬 Saída' : '🎬 Entrada'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/40">
        <div className="h-full bg-primary/60 transition-none" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Replay button */}
      <button
        onClick={restart}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
        title="Repetir"
      >
        <RefreshCw className="h-3 w-3 text-muted-foreground" />
      </button>

      {/* Label */}
      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm">
        <span className="text-[8px] font-medium text-muted-foreground">
          {TRANSITION_PRESETS.find(p => p.type === type)?.label} · {isExit ? 'Saída' : 'Entrada'}
        </span>
      </div>
    </div>
  );
};

// === Mini Filter Preview Component ===
const MiniFilterPreview: React.FC<{
  filters: VideoFilter[] | undefined;
  clipSrc?: string;
  clipType?: string;
}> = ({ filters, clipSrc, clipType }) => {
  const filterCss = buildFilterCss(filters);
  const hasFilters = filters && filters.length > 0;
  const hasThumbnail = clipSrc && (clipType === 'image' || clipType === 'canvas');

  const sampleContent = hasThumbnail ? (
    <img src={clipSrc} alt="preview" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-primary/70 via-accent/40 to-secondary/60 flex items-center justify-center">
      <div className="text-center">
        <span className="text-2xl">🎬</span>
        <p className="text-[8px] text-primary-foreground/70 font-medium mt-0.5">Exemplo</p>
      </div>
    </div>
  );

  if (!hasFilters) {
    return (
      <div className="w-full h-24 rounded-lg bg-muted/40 flex items-center justify-center">
        <p className="text-[10px] text-muted-foreground">Aplique filtros para ver a simulação</p>
      </div>
    );
  }

  return (
    <div className="w-full h-28 rounded-lg overflow-hidden relative flex">
      {/* Before */}
      <div className="flex-1 relative overflow-hidden border-r border-background/50">
        {sampleContent}
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm">
          <span className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wider">Original</span>
        </div>
      </div>
      {/* After */}
      <div className="flex-1 relative overflow-hidden" style={{ filter: filterCss }}>
        {sampleContent}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm">
          <span className="text-[7px] font-semibold text-primary uppercase tracking-wider">Com Filtros</span>
        </div>
      </div>
      {/* Center divider */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-background/80 z-10" />
    </div>
  );
};

// === Main Toolbar ===
const FloatingEffectsToolbar: React.FC<Props> = ({
  selectedClip, onUpdateClip, onPreviewTransition, onToggleFilterPreview, onClose, onSimulate, isSimulating
}) => {
  const [transitionPhase, setTransitionPhase] = useState<'entrance' | 'exit'>('entrance');
  const [selectedTransCat, setSelectedTransCat] = useState(TRANSITION_CATEGORIES[0].id);
  const [selectedFilterCat, setSelectedFilterCat] = useState<string>('cor');
  const [selectedAudioCat, setSelectedAudioCat] = useState<string>('Equalizador');
  const [selectedAudioPresetCat, setSelectedAudioPresetCat] = useState<string>('Podcast');
  const [audioTab, setAudioTab] = useState<'presets' | 'filters' | 'active' | 'wave' | 'speed'>('presets');
  const [expandedAudioParams, setExpandedAudioParams] = useState<Record<string, boolean>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [transPopoverOpen, setTransPopoverOpen] = useState(false);
  const [audioPopoverOpen, setAudioPopoverOpen] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const originalAudioRef = useRef<{
    audioFilters?: AudioFilter[];
    volumeEnvelope?: VolumeEnvelopePoint[];
    playbackRate?: number;
    volume?: number;
  } | null>(null);
  const originalTransitionsRef = useRef<TimelineClip['transitions'] | null>(null);
  const originalFiltersRef = useRef<VideoFilter[] | null>(null);

  const appliedAudioRef = useRef(false);
  const appliedTransitionsRef = useRef(false);
  const appliedFiltersRef = useRef(false);

  // === Audio capture/restore/apply ===
  const captureOriginalAudioState = useCallback(() => {
    appliedAudioRef.current = false;
    originalAudioRef.current = {
      audioFilters: selectedClip.audioFilters ? JSON.parse(JSON.stringify(selectedClip.audioFilters)) : [],
      volumeEnvelope: selectedClip.volumeEnvelope ? JSON.parse(JSON.stringify(selectedClip.volumeEnvelope)) : undefined,
      playbackRate: selectedClip.playbackRate ?? 1,
      volume: selectedClip.volume ?? 1,
    };
  }, [selectedClip.audioFilters, selectedClip.volumeEnvelope, selectedClip.playbackRate, selectedClip.volume]);

  const restoreOriginalAudio = useCallback(() => {
    const orig = originalAudioRef.current;
    if (!orig) return;
    onUpdateClip(selectedClip.id, {
      audioFilters: JSON.parse(JSON.stringify(orig.audioFilters || [])),
      volumeEnvelope: orig.volumeEnvelope ? JSON.parse(JSON.stringify(orig.volumeEnvelope)) : undefined,
      playbackRate: orig.playbackRate,
      volume: orig.volume,
    });
  }, [selectedClip.id, onUpdateClip]);

  const applyAndConfirmAudio = useCallback(() => {
    appliedAudioRef.current = true;
    originalAudioRef.current = null;
  }, []);

  const handleAudioPopoverChange = useCallback((open: boolean) => {
    if (open) {
      captureOriginalAudioState();
    } else if (!appliedAudioRef.current && originalAudioRef.current) {
      restoreOriginalAudio();
      originalAudioRef.current = null;
    }
    setAudioPopoverOpen(open);
  }, [captureOriginalAudioState, restoreOriginalAudio]);

  // === Transitions capture/restore/apply ===
  const captureOriginalTransitions = useCallback(() => {
    appliedTransitionsRef.current = false;
    originalTransitionsRef.current = selectedClip.transitions ? JSON.parse(JSON.stringify(selectedClip.transitions)) : {};
  }, [selectedClip.transitions]);

  const restoreOriginalTransitions = useCallback(() => {
    const orig = originalTransitionsRef.current;
    if (orig === null) return;
    onUpdateClip(selectedClip.id, { transitions: JSON.parse(JSON.stringify(orig)) });
  }, [selectedClip.id, onUpdateClip]);

  const applyAndConfirmTransitions = useCallback(() => {
    appliedTransitionsRef.current = true;
    originalTransitionsRef.current = null;
  }, []);

  const handleTransPopoverChange = useCallback((open: boolean) => {
    if (open) {
      captureOriginalTransitions();
    } else if (!appliedTransitionsRef.current && originalTransitionsRef.current !== null) {
      restoreOriginalTransitions();
      originalTransitionsRef.current = null;
    }
    setTransPopoverOpen(open);
  }, [captureOriginalTransitions, restoreOriginalTransitions]);

  // === Filters capture/restore/apply ===
  const captureOriginalFilters = useCallback(() => {
    appliedFiltersRef.current = false;
    originalFiltersRef.current = selectedClip.filters ? JSON.parse(JSON.stringify(selectedClip.filters)) : [];
  }, [selectedClip.filters]);

  const restoreOriginalFilters = useCallback(() => {
    const orig = originalFiltersRef.current;
    if (orig === null) return;
    onUpdateClip(selectedClip.id, { filters: JSON.parse(JSON.stringify(orig)) });
  }, [selectedClip.id, onUpdateClip]);

  const applyAndConfirmFilters = useCallback(() => {
    appliedFiltersRef.current = true;
    originalFiltersRef.current = null;
  }, []);

  const handleFilterPopoverChange = useCallback((open: boolean) => {
    if (open) {
      captureOriginalFilters();
    } else if (!appliedFiltersRef.current && originalFiltersRef.current !== null) {
      restoreOriginalFilters();
      originalFiltersRef.current = null;
    }
    setFilterPopoverOpen(open);
  }, [captureOriginalFilters, restoreOriginalFilters]);

  const isVisual = ['video', 'image', 'canvas'].includes(selectedClip.type);
  const isAudio = selectedClip.type === 'audio';
  const entranceTransition = selectedClip.transitions?.entrance;
  const exitTransition = selectedClip.transitions?.exit;
  const hasTransitions = (entranceTransition && entranceTransition.type !== 'none') || (exitTransition && exitTransition.type !== 'none');
  const hasFilters = (selectedClip.filters?.length ?? 0) > 0;
  const hasAudioFilters = (selectedClip.audioFilters?.length ?? 0) > 0;

  const setTransition = (phase: 'entrance' | 'exit', type: TransitionType) => {
    const current = selectedClip.transitions || {};
    if (type === 'none') {
      onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: undefined } });
    } else {
      onUpdateClip(selectedClip.id, {
        transitions: { ...current, [phase]: { type, duration: current[phase]?.duration || 0.5, easing: current[phase]?.easing || 'ease-out' } },
      });
    }
  };

  const setTransitionDuration = (phase: 'entrance' | 'exit', duration: number) => {
    const current = selectedClip.transitions || {};
    if (!current[phase]) return;
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: { ...current[phase]!, duration } } });
  };

  const setTransitionEasing = (phase: 'entrance' | 'exit', easing: string) => {
    const current = selectedClip.transitions || {};
    if (!current[phase]) return;
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: { ...current[phase]!, easing } } });
  };

  const removeTransition = (phase: 'entrance' | 'exit') => {
    const current = selectedClip.transitions || {};
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: undefined } });
  };

  const applyPreset = (presetId: string) => {
    const preset = EFFECT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const existing = selectedClip.filters || [];
    const presetFilters: VideoFilter[] = preset.filters.map((f, i) => ({
      ...f,
      id: `f_${Date.now()}_${i}`,
    }));

    onUpdateClip(selectedClip.id, { filters: [...existing, ...presetFilters] });
  };

  const toggleFilter = (type: FilterType) => {
    const def = INDIVIDUAL_FILTERS.find(f => f.type === type);
    if (!def) return;
    const existing = selectedClip.filters || [];
    const found = existing.find(f => f.type === type);
    if (found) {
      onUpdateClip(selectedClip.id, { filters: existing.filter(f => f.type !== type) });
    } else {
      onUpdateClip(selectedClip.id, {
        filters: [...existing, { id: `f_${Date.now()}`, type, label: def.label, value: def.defaultValue, enabled: true }],
      });
    }
  };

  const updateFilter = (filterId: string, updates: Partial<VideoFilter>) => {
    onUpdateClip(selectedClip.id, {
      filters: (selectedClip.filters || []).map((f) => f.id === filterId ? { ...f, ...updates } : f),
    });
  };

  const removeFilter = (filterId: string) => {
    onUpdateClip(selectedClip.id, { filters: (selectedClip.filters || []).filter((f) => f.id !== filterId) });
  };

  const resetFilters = () => {
    onUpdateClip(selectedClip.id, { filters: [] });
  };

  const restoreAssetOriginalFilters = () => {
    onUpdateClip(selectedClip.id, { filters: [] });
  };

  // === Audio filter handlers ===
  const addAudioFilter = (type: AudioFilterType) => {
    const def = AUDIO_FILTER_DEFS.find(f => f.type === type);
    if (!def) return;
    const existing = selectedClip.audioFilters || [];
    const params: Record<string, number> = {};
    def.params?.forEach(p => { params[p.key] = p.defaultValue; });
    onUpdateClip(selectedClip.id, {
      audioFilters: [...existing, { id: `af_${Date.now()}`, type, label: def.label, value: def.defaultValue, enabled: true, params: Object.keys(params).length > 0 ? params : undefined }],
    });
  };

  const updateAudioFilter = (filterId: string, updates: Partial<AudioFilter>) => {
    onUpdateClip(selectedClip.id, {
      audioFilters: (selectedClip.audioFilters || []).map((f) => f.id === filterId ? { ...f, ...updates } : f),
    });
  };

  const updateAudioFilterParam = (filterId: string, paramKey: string, paramValue: number) => {
    const existing = selectedClip.audioFilters || [];
    onUpdateClip(selectedClip.id, {
      audioFilters: existing.map(f => f.id === filterId ? { ...f, params: { ...(f.params || {}), [paramKey]: paramValue } } : f),
    });
  };

  const removeAudioFilter = (filterId: string) => {
    onUpdateClip(selectedClip.id, { audioFilters: (selectedClip.audioFilters || []).filter((f) => f.id !== filterId) });
  };

  const resetAudioFilters = () => {
    onUpdateClip(selectedClip.id, { audioFilters: [] });
  };

  const restoreAssetOriginalAudio = () => {
    onUpdateClip(selectedClip.id, {
      audioFilters: [],
      volumeEnvelope: undefined,
      playbackRate: 1,
      volume: 1,
    });
  };

  const clearAllTransitionsToOriginal = () => {
    onUpdateClip(selectedClip.id, { transitions: {} });
  };

  const applyAudioPreset = (presetId: string) => {
    const preset = AUDIO_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const existing = selectedClip.audioFilters || [];
    const audioFilters: AudioFilter[] = preset.filters.map((f, i) => {
      const def = AUDIO_FILTER_DEFS.find(d => d.type === f.type);
      const params: Record<string, number> = {};
      def?.params?.forEach(p => { params[p.key] = p.defaultValue; });
      return { ...f, id: `af_${Date.now()}_${i}`, params: Object.keys(params).length > 0 ? params : undefined };
    });

    onUpdateClip(selectedClip.id, { audioFilters: [...existing, ...audioFilters] });
  };

  // === Volume envelope helpers ===
  const ENVELOPE_PRESETS = [
    { id: 'linear', label: 'Linear', icon: '📏', points: [{ time: 0, value: 1 }, { time: 1, value: 1 }] as VolumeEnvelopePoint[] },
    { id: 'fade-in', label: 'Fade In', icon: '📈', points: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }, { time: 1, value: 1 }] as VolumeEnvelopePoint[] },
    { id: 'fade-out', label: 'Fade Out', icon: '📉', points: [{ time: 0, value: 1 }, { time: 0.7, value: 1 }, { time: 1, value: 0 }] as VolumeEnvelopePoint[] },
    { id: 'fade-in-out', label: 'Fade In/Out', icon: '🔔', points: [{ time: 0, value: 0 }, { time: 0.15, value: 1 }, { time: 0.85, value: 1 }, { time: 1, value: 0 }] as VolumeEnvelopePoint[] },
    { id: 'crescendo', label: 'Crescendo', icon: '📐', points: [{ time: 0, value: 0.2 }, { time: 1, value: 1 }] as VolumeEnvelopePoint[] },
    { id: 'decrescendo', label: 'Decresc.', icon: '📐', points: [{ time: 0, value: 1 }, { time: 1, value: 0.2 }] as VolumeEnvelopePoint[] },
    { id: 'duck', label: 'Ducking', icon: '🦆', points: [{ time: 0, value: 1 }, { time: 0.1, value: 0.3 }, { time: 0.9, value: 0.3 }, { time: 1, value: 1 }] as VolumeEnvelopePoint[] },
    { id: 'swell', label: 'Swell', icon: '🌊', points: [{ time: 0, value: 0.3 }, { time: 0.5, value: 1 }, { time: 1, value: 0.3 }] as VolumeEnvelopePoint[] },
    { id: 'pulse', label: 'Pulso', icon: '💓', points: [
      { time: 0, value: 0.5 }, { time: 0.125, value: 1 }, { time: 0.25, value: 0.5 },
      { time: 0.375, value: 1 }, { time: 0.5, value: 0.5 }, { time: 0.625, value: 1 },
      { time: 0.75, value: 0.5 }, { time: 0.875, value: 1 }, { time: 1, value: 0.5 },
    ] as VolumeEnvelopePoint[] },
    { id: 'staircase', label: 'Escada', icon: '🪜', points: [
      { time: 0, value: 0.2 }, { time: 0.25, value: 0.2 }, { time: 0.25, value: 0.4 },
      { time: 0.5, value: 0.4 }, { time: 0.5, value: 0.7 }, { time: 0.75, value: 0.7 },
      { time: 0.75, value: 1 }, { time: 1, value: 1 },
    ] as VolumeEnvelopePoint[] },
  ];

  const SVG_W = 400, SVG_H = 110, SVG_PAD_X = 10, SVG_PAD_Y = 12;
  const GRAPH_W = SVG_W - SVG_PAD_X * 2, GRAPH_H = SVG_H - SVG_PAD_Y * 2;
  const toSvgX = (t: number) => SVG_PAD_X + t * GRAPH_W;
  const toSvgY = (v: number) => SVG_PAD_Y + (1 - v) * GRAPH_H;
  const fromSvgX = (sx: number) => Math.max(0, Math.min(1, (sx - SVG_PAD_X) / GRAPH_W));
  const fromSvgY = (sy: number) => Math.max(0, Math.min(1, 1 - (sy - SVG_PAD_Y) / GRAPH_H));

  const envelope = useMemo(() => {
    return selectedClip.volumeEnvelope && selectedClip.volumeEnvelope.length >= 2
      ? selectedClip.volumeEnvelope
      : [{ time: 0, value: selectedClip.volume ?? 1 }, { time: 1, value: selectedClip.volume ?? 1 }];
  }, [selectedClip.volumeEnvelope, selectedClip.volume]);

  const waveformBars = useMemo(() => {
    const count = 60;
    return Array.from({ length: count }, (_, i) => {
      const t = i / count;
      let envVal = 1;
      for (let p = 0; p < envelope.length - 1; p++) {
        if (t >= envelope[p].time && t <= envelope[p + 1].time) {
          const segLen = envelope[p + 1].time - envelope[p].time;
          const frac = segLen > 0 ? (t - envelope[p].time) / segLen : 0;
          envVal = envelope[p].value + (envelope[p + 1].value - envelope[p].value) * frac;
          break;
        }
      }
      const baseHeight = 0.3 + Math.abs(Math.sin(i * 0.7 + selectedClip.startTime) * 0.35 + Math.sin(i * 1.5) * 0.25);
      return baseHeight * envVal;
    });
  }, [envelope, selectedClip.startTime]);

  const envelopePath = envelope.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.time)} ${toSvgY(p.value)}`).join(' ');
  const fillPath = `${envelopePath} L ${toSvgX(1)} ${toSvgY(0)} L ${toSvgX(0)} ${toSvgY(0)} Z`;

  const handleEnvMouseDown = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingIdx(idx);
  }, []);

  useEffect(() => {
    if (draggingIdx === null) return;
    const handleMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = SVG_W / rect.width;
      const scaleY = SVG_H / rect.height;
      const sx = (e.clientX - rect.left) * scaleX;
      const sy = (e.clientY - rect.top) * scaleY;
      const newPoints = [...envelope];
      const isFirst = draggingIdx === 0;
      const isLast = draggingIdx === newPoints.length - 1;
      const newTime = isFirst ? 0 : isLast ? 1 : fromSvgX(sx);
      const newValue = fromSvgY(sy);
      let clampedTime = newTime;
      if (!isFirst && !isLast) {
        clampedTime = Math.max(newPoints[draggingIdx - 1].time + 0.01, Math.min(newPoints[draggingIdx + 1].time - 0.01, newTime));
      }
      newPoints[draggingIdx] = { time: clampedTime, value: Math.round(newValue * 100) / 100 };
      onUpdateClip(selectedClip.id, { volumeEnvelope: newPoints });
    };
    const handleUp = () => setDraggingIdx(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [draggingIdx, envelope, selectedClip.id, onUpdateClip]);

  const addEnvPoint = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIdx !== null) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (SVG_W / rect.width);
    const sy = (e.clientY - rect.top) * (SVG_H / rect.height);
    const t = fromSvgX(sx);
    const v = fromSvgY(sy);
    if (envelope.some(p => Math.abs(p.time - t) < 0.02)) return;
    const newPoints = [...envelope, { time: t, value: Math.round(v * 100) / 100 }].sort((a, b) => a.time - b.time);
    onUpdateClip(selectedClip.id, { volumeEnvelope: newPoints });
  }, [envelope, selectedClip.id, onUpdateClip, draggingIdx]);

  const removeEnvPoint = useCallback((idx: number) => {
    if (idx === 0 || idx === envelope.length - 1) return;
    onUpdateClip(selectedClip.id, { volumeEnvelope: envelope.filter((_, i) => i !== idx) });
  }, [envelope, selectedClip.id, onUpdateClip]);

  const playbackRate = selectedClip.playbackRate ?? 1;
  const SPEED_PRESETS = [
    { value: 0.25, label: '0.25x' }, { value: 0.5, label: '0.5x' }, { value: 0.75, label: '0.75x' },
    { value: 1, label: '1x' }, { value: 1.25, label: '1.25x' }, { value: 1.5, label: '1.5x' },
    { value: 2, label: '2x' }, { value: 3, label: '3x' }, { value: 4, label: '4x' },
  ];

  const clipIcon = selectedClip.type === 'video' ? '🎬' : selectedClip.type === 'image' ? '🖼️' : selectedClip.type === 'canvas' ? '🎨' : '🔊';
  const activeTransition = transitionPhase === 'entrance' ? entranceTransition : exitTransition;
  const AUDIO_CATEGORIES = [...new Set(AUDIO_FILTER_DEFS.map(f => f.category))];
  const AUDIO_PRESET_CATEGORIES = [...new Set(AUDIO_PRESETS.map(p => p.category))];

  return (
    <div className="fixed bottom-10 sm:bottom-12 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-1rem)] sm:w-auto sm:max-w-[95vw] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 sm:gap-1.5 bg-background/95 backdrop-blur-xl border border-border/60 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 shadow-2xl shadow-black/20 ring-1 ring-white/10 min-w-max">

          {/* Clip info */}
          <div className="flex items-center gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 border-r border-border/40">
            <span className="text-xs sm:text-sm">{clipIcon}</span>
            <span className="text-[9px] sm:text-[10px] font-semibold truncate max-w-[60px] sm:max-w-[100px]">{selectedClip.name}</span>
            <span className="text-[8px] sm:text-[9px] text-muted-foreground hidden sm:inline">{selectedClip.duration.toFixed(1)}s</span>
          </div>

          {/* Transitions Popover - only for visual clips */}
          {isVisual && (
            <Popover open={transPopoverOpen} onOpenChange={handleTransPopoverChange}>
              <PopoverTrigger asChild>
                <Button variant={hasTransitions ? 'default' : 'ghost'} size="sm" className="h-7 sm:h-8 px-2 sm:px-3 rounded-full gap-1 sm:gap-1.5">
                  <Zap className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                  <span className="text-[10px] sm:text-xs">Transições</span>
                  {hasTransitions && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-1rem)] sm:w-[420px] p-0" side="top" align="center">
                {/* === LIVE SIMULATION PREVIEW === */}
                <div className="p-2 border-b bg-muted/10">
                  <MiniTransitionPreview
                    type={activeTransition?.type}
                    isExit={transitionPhase === 'exit'}
                    clipSrc={selectedClip.src}
                    clipType={selectedClip.type}
                  />
                </div>

                <div className="p-3 border-b bg-muted/20">
                  {/* Phase toggle */}
                  <div className="flex rounded-lg border overflow-hidden">
                    <button
                      onClick={() => setTransitionPhase('entrance')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors border-r ${
                        transitionPhase === 'entrance' ? 'bg-emerald-500/15 text-emerald-600' : 'hover:bg-muted/50'
                      }`}
                    >
                      <ArrowRightToLine className="h-3 w-3" /> Entrada
                      {entranceTransition && entranceTransition.type !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                    <button
                      onClick={() => setTransitionPhase('exit')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${
                        transitionPhase === 'exit' ? 'bg-amber-500/15 text-amber-600' : 'hover:bg-muted/50'
                      }`}
                    >
                      <ArrowLeftFromLine className="h-3 w-3" /> Saída
                      {exitTransition && exitTransition.type !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </button>
                  </div>

                  {/* Active transition controls */}
                  {activeTransition && activeTransition.type !== 'none' && (
                    <div className="mt-2 rounded-lg border p-2 space-y-1.5 bg-background/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <TransitionPreviewThumb type={activeTransition.type} isExit={transitionPhase === 'exit'} isActive size={28} />
                          <span className="text-[10px] font-semibold">{TRANSITION_PRESETS.find(p => p.type === activeTransition.type)?.label}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onPreviewTransition?.(selectedClip.id, transitionPhase)} title="Simular no preview principal">
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeTransition(transitionPhase)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground w-7">{activeTransition.duration.toFixed(1)}s</span>
                        <Slider value={[activeTransition.duration]} onValueChange={([v]) => setTransitionDuration(transitionPhase, v)} min={0.1} max={3} step={0.1} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <Select value={activeTransition.easing || 'ease-out'} onValueChange={(e) => setTransitionEasing(transitionPhase, e)}>
                          <SelectTrigger className="h-6 text-[9px] flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {EASING_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-[10px]">{opt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2">
                  <Select value={selectedTransCat} onValueChange={setSelectedTransCat}>
                    <SelectTrigger className="h-7 text-[10px] mb-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSITION_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-[11px]">
                          {cat.icon} {cat.label} ({cat.types.length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {TRANSITION_PRESETS.filter(p => TRANSITION_CATEGORIES.find(c => c.id === selectedTransCat)?.types.includes(p.type)).map(preset => {
                      const activeType = transitionPhase === 'entrance' ? entranceTransition?.type : exitTransition?.type;
                      const isActive = activeType === preset.type;
                      return (
                        <button
                          key={preset.type}
                          onClick={() => setTransition(transitionPhase, preset.type)}
                          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                            isActive ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm' : 'border-border/50 hover:border-border hover:bg-muted/40'
                          }`}
                        >
                          <TransitionPreviewThumb type={preset.type} isExit={transitionPhase === 'exit'} isActive={isActive} size={36} />
                          <span className="text-[7px] font-medium leading-tight text-center truncate w-full">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Footer: Apply / Restore */}
                <div className="p-2 border-t bg-muted/20 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-dashed" onClick={() => { restoreOriginalTransitions(); }}>
                    <RotateCcw className="h-3 w-3" /> Restaurar
                  </Button>
                  <Button variant="default" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={() => { applyAndConfirmTransitions(); setTransPopoverOpen(false); }}>
                    <Check className="h-3 w-3" /> Aplicar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => { restoreOriginalTransitions(); setTransPopoverOpen(false); appliedTransitionsRef.current = true; }}>
                    <X className="h-3 w-3" /> Fechar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <div className="h-4 sm:h-5 w-px bg-border/40" />

          {/* === AUDIO EFFECTS POPOVER (for audio clips) === */}
          {isAudio ? (
            <Popover open={audioPopoverOpen} onOpenChange={handleAudioPopoverChange}>
              <PopoverTrigger asChild>
                <Button variant={hasAudioFilters ? 'default' : 'ghost'} size="sm" className="h-7 sm:h-8 px-2 sm:px-3 rounded-full gap-1 sm:gap-1.5">
                  <Headphones className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                  <span className="text-[10px] sm:text-xs">Efeitos de Áudio</span>
                  {hasAudioFilters && <span className="text-[8px] sm:text-[9px] bg-primary-foreground/20 px-1 sm:px-1.5 rounded-full">{selectedClip.audioFilters?.length}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-1rem)] sm:w-[480px] p-0" side="top" align="center">
                {/* Header */}
                <div className="p-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Headphones className="h-3.5 w-3.5 text-primary" /> Efeitos de Áudio Profissional
                    </p>
                    <Button size="sm" variant="ghost" className="text-[9px] h-6 gap-1" onClick={restoreAssetOriginalAudio}>
                      <RotateCcw className="h-3 w-3" /> Original
                    </Button>
                  </div>
                  {/* Tab switcher */}
                  <div className="flex mt-2 rounded-lg border overflow-hidden">
                    {(['presets', 'filters', 'active', 'wave', 'speed'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setAudioTab(tab)}
                        className={`flex-1 py-1.5 text-[9px] font-medium transition-colors border-r last:border-r-0 ${
                          audioTab === tab ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                        }`}
                      >
                        {tab === 'presets' ? '🎛️ Presets' : tab === 'filters' ? '🔧 Filtros' : tab === 'active' ? `🎚️ (${selectedClip.audioFilters?.length || 0})` : tab === 'wave' ? '🎵 Onda' : '⚡ Vel.'}
                      </button>
                    ))}
                  </div>
                </div>

                <ScrollArea className="max-h-[55vh]">
                  <div className="p-2 space-y-2">
                    {/* PRESETS TAB */}
                    {audioTab === 'presets' && (
                      <>
                        <Select value={selectedAudioPresetCat} onValueChange={setSelectedAudioPresetCat}>
                          <SelectTrigger className="h-7 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AUDIO_PRESET_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat} className="text-[11px]">{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {AUDIO_PRESETS.filter(p => p.category === selectedAudioPresetCat).map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => applyAudioPreset(preset.id)}
                              className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
                              title={preset.description}
                            >
                              <span className="text-xl leading-none">{preset.icon}</span>
                              <span className="text-[9px] font-semibold leading-tight">{preset.name}</span>
                              <span className="text-[7px] text-muted-foreground leading-tight line-clamp-2">{preset.description}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* FILTERS TAB */}
                    {audioTab === 'filters' && (
                      <>
                        <Select value={selectedAudioCat} onValueChange={setSelectedAudioCat}>
                          <SelectTrigger className="h-7 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AUDIO_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat} className="text-[11px]">
                                {cat} ({AUDIO_FILTER_DEFS.filter(f => f.category === cat).length})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {AUDIO_FILTER_DEFS.filter(f => f.category === selectedAudioCat).map(def => {
                            const alreadyAdded = selectedClip.audioFilters?.some(af => af.type === def.type);
                            return (
                              <button
                                key={def.type}
                                onClick={() => { addAudioFilter(def.type); setAudioTab('active'); }}
                                disabled={alreadyAdded}
                                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all text-center ${
                                  alreadyAdded ? 'opacity-40 cursor-not-allowed border-primary/30 bg-primary/5' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                                }`}
                                title={def.description}
                              >
                                <span className="text-lg leading-none">{def.icon}</span>
                                <span className="text-[8px] font-semibold leading-tight">{def.label}</span>
                                <span className="text-[7px] text-muted-foreground leading-tight line-clamp-1">{def.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* ACTIVE TAB */}
                    {audioTab === 'active' && (
                      <>
                        {!hasAudioFilters ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Headphones className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Nenhum efeito aplicado</p>
                            <p className="text-[10px]">Use as abas Presets ou Filtros para adicionar</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedClip.audioFilters!.map(filter => {
                              const def = AUDIO_FILTER_DEFS.find(d => d.type === filter.type);
                              const isExpanded = expandedAudioParams[filter.id] || false;
                              const hasParams = def?.params && def.params.length > 0;
                              return (
                                <div key={filter.id} className="border rounded-lg p-2 space-y-1.5 bg-background/60">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm">{def?.icon || '🔧'}</span>
                                      <div>
                                        <span className="text-[10px] font-semibold block leading-tight">{filter.label}</span>
                                        <span className="text-[8px] text-muted-foreground">{def?.category}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {hasParams && (
                                        <button
                                          onClick={() => setExpandedAudioParams(prev => ({ ...prev, [filter.id]: !prev[filter.id] }))}
                                          className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        </button>
                                      )}
                                      <span className="text-[8px] text-muted-foreground tabular-nums w-7 text-right">{filter.value}%</span>
                                      <Switch checked={filter.enabled} onCheckedChange={(v) => updateAudioFilter(filter.id, { enabled: v })} />
                                      <button onClick={() => removeAudioFilter(filter.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  {/* Main intensity slider */}
                                  <div className="flex items-center gap-2">
                                    <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <Slider
                                      value={[filter.value]}
                                      onValueChange={([v]) => updateAudioFilter(filter.id, { value: v })}
                                      min={0} max={100} step={1}
                                      disabled={!filter.enabled}
                                    />
                                  </div>
                                  {/* Advanced params */}
                                  {isExpanded && hasParams && (
                                    <div className="pl-2 border-l-2 border-primary/20 space-y-1.5 mt-1">
                                      {def!.params!.map(param => (
                                        <div key={param.key} className="flex items-center gap-2">
                                          <span className="text-[8px] text-muted-foreground w-20 shrink-0 truncate">{param.label}</span>
                                          <Slider
                                            value={[filter.params?.[param.key] ?? param.defaultValue]}
                                            onValueChange={([v]) => updateAudioFilterParam(filter.id, param.key, v)}
                                            min={param.min} max={param.max} step={param.step}
                                            disabled={!filter.enabled}
                                            className="flex-1"
                                          />
                                          <span className="text-[8px] text-muted-foreground tabular-nums w-8 text-right">
                                            {(filter.params?.[param.key] ?? param.defaultValue).toFixed(param.step < 1 ? 1 : 0)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {/* WAVE TAB - Volume Envelope */}
                    {audioTab === 'wave' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold flex items-center gap-1">🎵 Curva de Volume</span>
                          <Button size="sm" variant="ghost" className="h-5 text-[8px] gap-0.5" onClick={() => onUpdateClip(selectedClip.id, { volumeEnvelope: undefined })}>
                            <RotateCcw className="h-2.5 w-2.5" /> Reset
                          </Button>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {ENVELOPE_PRESETS.map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => onUpdateClip(selectedClip.id, { volumeEnvelope: [...preset.points] })}
                              className="flex flex-col items-center gap-0.5 p-1 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
                              title={preset.label}
                            >
                              <span className="text-xs leading-none">{preset.icon}</span>
                              <span className="text-[7px] font-medium leading-tight">{preset.label}</span>
                            </button>
                          ))}
                        </div>
                        <div className="relative border rounded-lg bg-muted/20 overflow-hidden">
                          <svg
                            ref={svgRef}
                            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                            className="w-full cursor-crosshair"
                            style={{ height: 110 }}
                            onDoubleClick={addEnvPoint}
                          >
                            {[0, 0.25, 0.5, 0.75, 1].map(v => (
                              <line key={v} x1={SVG_PAD_X} y1={toSvgY(v)} x2={SVG_PAD_X + GRAPH_W} y2={toSvgY(v)} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray={v === 0 || v === 1 ? '' : '2,2'} opacity={0.5} />
                            ))}
                            {waveformBars.map((h, i) => {
                              const barW = GRAPH_W / waveformBars.length;
                              const x = SVG_PAD_X + i * barW;
                              const barH = h * GRAPH_H;
                              return <rect key={i} x={x} y={SVG_PAD_Y + GRAPH_H - barH} width={Math.max(barW - 1, 1)} height={barH} fill="hsl(var(--primary))" opacity={0.15} rx={0.5} />;
                            })}
                            <path d={fillPath} fill="hsl(var(--primary))" opacity={0.08} />
                            <path d={envelopePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" />
                            {envelope.map((point, idx) => {
                              const cx = toSvgX(point.time);
                              const cy = toSvgY(point.value);
                              const isFirst = idx === 0;
                              const isLast = idx === envelope.length - 1;
                              const isHov = hoveredIdx === idx;
                              const isDrag = draggingIdx === idx;
                              return (
                                <g key={idx}>
                                  <circle cx={cx} cy={cy} r={12} fill="transparent" className="cursor-grab active:cursor-grabbing"
                                    onMouseDown={(e) => handleEnvMouseDown(idx, e)}
                                    onMouseEnter={() => setHoveredIdx(idx)}
                                    onMouseLeave={() => setHoveredIdx(null)}
                                    onDoubleClick={(e) => { e.stopPropagation(); if (!isFirst && !isLast) removeEnvPoint(idx); }}
                                  />
                                  <circle cx={cx} cy={cy} r={isDrag ? 5 : isHov ? 4 : 3}
                                    fill={isFirst || isLast ? 'hsl(var(--primary))' : 'hsl(var(--background))'}
                                    stroke="hsl(var(--primary))" strokeWidth={2} className="pointer-events-none"
                                  />
                                  {(isHov || isDrag) && (
                                    <text x={cx} y={cy - 8} fontSize="7" fill="hsl(var(--foreground))" textAnchor="middle" className="pointer-events-none">
                                      {(point.time * selectedClip.duration).toFixed(1)}s·{Math.round(point.value * 100)}%
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                          <div className="absolute bottom-0.5 right-1.5 text-[7px] text-muted-foreground/60 pointer-events-none">
                            Duplo-clique: add/remover pontos
                          </div>
                        </div>
                        <p className="text-[8px] text-muted-foreground">{envelope.length} pontos · Arraste para ajustar</p>
                      </div>
                    )}

                    {/* SPEED TAB */}
                    {audioTab === 'speed' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold flex items-center gap-1">⚡ Velocidade</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{playbackRate.toFixed(2)}x</span>
                        </div>
                        <Slider
                          value={[playbackRate]}
                          onValueChange={([v]) => onUpdateClip(selectedClip.id, { playbackRate: Math.round(v * 100) / 100 })}
                          min={0.25} max={4} step={0.05}
                        />
                        <div className="grid grid-cols-3 gap-1">
                          {SPEED_PRESETS.map(preset => (
                            <button
                              key={preset.value}
                              onClick={() => onUpdateClip(selectedClip.id, { playbackRate: preset.value })}
                              className={`text-[9px] py-1 px-2 rounded-md border transition-all ${
                                Math.abs(playbackRate - preset.value) < 0.01
                                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                                  : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        {playbackRate !== 1 && (
                          <p className="text-[8px] text-muted-foreground">
                            Duração efetiva: {(selectedClip.duration / playbackRate).toFixed(2)}s (original: {selectedClip.duration.toFixed(2)}s)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-2 border-t bg-muted/20 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-dashed" onClick={() => { restoreOriginalAudio(); }}>
                    <RotateCcw className="h-3 w-3" /> Restaurar
                  </Button>
                  <Button variant="default" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={() => { applyAndConfirmAudio(); setAudioPopoverOpen(false); }}>
                    <Check className="h-3 w-3" /> Aplicar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => { restoreOriginalAudio(); setAudioPopoverOpen(false); appliedAudioRef.current = true; }}>
                    <X className="h-3 w-3" /> Fechar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            /* === VISUAL FILTERS POPOVER (for visual clips) === */
            <Popover open={filterPopoverOpen} onOpenChange={handleFilterPopoverChange}>
              <PopoverTrigger asChild>
                <Button variant={hasFilters ? 'default' : 'ghost'} size="sm" className="h-7 sm:h-8 px-2 sm:px-3 rounded-full gap-1 sm:gap-1.5">
                  <Wand2 className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                  <span className="text-[10px] sm:text-xs">Filtros</span>
                  {hasFilters && <span className="text-[8px] sm:text-[9px] bg-primary-foreground/20 px-1 sm:px-1.5 rounded-full">{selectedClip.filters?.length}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-1rem)] sm:w-[440px] p-0" side="top" align="center">
              {/* === LIVE FILTER SIMULATION === */}
              <div className="p-2 border-b bg-muted/10">
                <MiniFilterPreview
                  filters={selectedClip.filters}
                  clipSrc={selectedClip.src}
                  clipType={selectedClip.type}
                />
              </div>

              <div className="p-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Wand2 className="h-3.5 w-3.5 text-primary" /> Filtros & Presets
                  </p>
                  <Button size="sm" variant="ghost" className="text-[9px] h-6 gap-1" onClick={restoreAssetOriginalFilters}>
                    <RotateCcw className="h-3 w-3" /> Original
                  </Button>
                </div>
              </div>

              <ScrollArea className="max-h-[50vh]">
                <div className="p-2 space-y-2">
                  {/* Category dropdown + grid */}
                  <Select value={selectedFilterCat} onValueChange={setSelectedFilterCat}>
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...FILTER_CATEGORIES, { id: 'individual', label: 'Filtro Individual', presets: [] }].map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-[11px]">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedFilterCat !== 'individual' ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {EFFECT_PRESETS.filter(p => FILTER_CATEGORIES.find(c => c.id === selectedFilterCat)?.presets.includes(p.id)).map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset.id)}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                          title={preset.description}
                        >
                          <span className="text-lg leading-none">{preset.icon}</span>
                          <span className="text-[8px] font-medium leading-tight text-center w-full">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {INDIVIDUAL_FILTERS.map(f => {
                        const alreadyAdded = selectedClip.filters?.some(ef => ef.type === f.type);
                        return (
                          <button
                            key={f.type}
                            onClick={() => toggleFilter(f.type)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all cursor-pointer ${
                              alreadyAdded ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
                            }`}
                          >
                            <span className="text-lg leading-none">{f.icon}</span>
                            <span className="text-[8px] font-medium leading-tight text-center">{f.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active filters with sliders */}
                  {hasFilters && (
                    <div className="border rounded-lg p-2">
                      <Label className="text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                        <Wand2 className="h-3 w-3" /> Ativos ({selectedClip.filters?.length})
                      </Label>
                      <div className="space-y-1.5">
                        {selectedClip.filters!.map((filter) => {
                          const def = INDIVIDUAL_FILTERS.find(f => f.type === filter.type);
                          return (
                            <div key={filter.id} className="border rounded-md p-1.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs">{def?.icon || '🔧'}</span>
                                  <span className="text-[9px] font-medium">{filter.label}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] text-muted-foreground tabular-nums w-6 text-right">{filter.value}%</span>
                                  <Switch checked={filter.enabled} onCheckedChange={(v) => updateFilter(filter.id, { enabled: v })} />
                                  <button onClick={() => removeFilter(filter.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <Slider
                                value={[filter.value]}
                                onValueChange={([v]) => updateFilter(filter.id, { value: v })}
                                min={0} max={100} step={1}
                                disabled={!filter.enabled}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-2 border-t bg-muted/20 flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-dashed" onClick={() => { restoreOriginalFilters(); }}>
                  <RotateCcw className="h-3 w-3" /> Restaurar
                </Button>
                <Button variant="default" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={() => { applyAndConfirmFilters(); setFilterPopoverOpen(false); }}>
                  <Check className="h-3 w-3" /> Aplicar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => { restoreOriginalFilters(); setFilterPopoverOpen(false); appliedFiltersRef.current = true; }}>
                  <X className="h-3 w-3" /> Fechar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          )}

          <div className="h-4 sm:h-5 w-px bg-border/40" />

          {/* Close */}
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
            <X className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FloatingEffectsToolbar;
