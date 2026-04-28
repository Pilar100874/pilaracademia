import React, { useCallback, useRef, useState } from 'react';
import { TimelineState, TimelineClip, TRACK_COLORS, EFFECT_TRACK_PRESETS, TransitionType } from './types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
}

// Which media types are allowed on which track types
const TRACK_ACCEPTS: Record<string, string[]> = {
  video: ['video'],
  image: ['image'],
  canvas: ['canvas', 'image'],
  audio: ['audio', 'video'], // video on audio = extract audio only
  effect: ['effect'],
  text: ['text'],
};

function isCompatible(trackType: string, clipType: string): boolean {
  return TRACK_ACCEPTS[trackType]?.includes(clipType) ?? false;
}

interface Props {
  state: TimelineState;
  onSelectClip: (id: string, multi?: boolean) => void;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onDeselectAll: () => void;
  onSeek: (time: number) => void;
  onPause?: () => void;
  onDoubleClickClip?: (clip: TimelineClip) => void;
  onAddClip?: (type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem, trackId?: string, dropStartTime?: number) => void;
  onAddEffectClip?: (trackId: string, startTime: number, effectType: TransitionType, label: string) => void;
}

const TimelineTracks: React.FC<Props> = ({ state, onSelectClip, onUpdateClip, onDeselectAll, onSeek, onPause, onDoubleClickClip, onAddClip, onAddEffectClip }) => {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropTargetTrackId, setDropTargetTrackId] = useState<string | null>(null);
  const [dragMediaType, setDragMediaType] = useState<string | null>(null);
  const [effectPopover, setEffectPopover] = useState<{ trackId: string; startTime: number; x: number; y: number } | null>(null);
  const [effectCategory, setEffectCategory] = useState<string | null>(null);
  const draggingRef = useRef<{
    clipId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    startY: number;
    originalStart: number;
    originalDuration: number;
    originalTrimStart: number;
    originalTrackId: string;
  } | null>(null);

  const totalWidth = state.duration * state.zoom;

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.timeline-clip')) return;
    onPause?.();
    onDeselectAll();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft;
      onSeek(x / state.zoom);
    }
  }, [onDeselectAll, onSeek, onPause, state.zoom]);

  // Find which track the mouse Y is over
  const getTrackAtY = useCallback((clientY: number): string | null => {
    if (!containerRef.current) return null;
    const container = containerRef.current;
    const trackElements = container.querySelectorAll('[data-track-id]');
    for (const el of trackElements) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return el.getAttribute('data-track-id');
      }
    }
    return null;
  }, []);

  const handleClipMouseDown = useCallback((e: React.MouseEvent, clip: TimelineClip, type: 'move' | 'resize-start' | 'resize-end') => {
    // Block interaction if clip or its track is locked
    const track = state.tracks.find(t => t.id === clip.trackId);
    if (clip.locked || track?.locked) {
      if (clip.locked && clip.name?.includes('Transição AI')) {
        toast?.({ title: '🔒 Clipe bloqueado', description: 'Transições AI são travadas para preservar a continuidade. Desbloqueie manualmente se necessário.', variant: 'destructive' });
      }
      return;
    }
    // Block resize on locked edges (to preserve AI transition continuity)
    if (clip.lockedEdge) {
      const blocksEnd = clip.lockedEdge === 'end' || clip.lockedEdge === 'both';
      const blocksStart = clip.lockedEdge === 'start' || clip.lockedEdge === 'both';
      if ((blocksEnd && type === 'resize-end') || (blocksStart && type === 'resize-start')) {
        toast?.({ title: '🔒 Borda bloqueada', description: 'Esta borda está travada para preservar a continuidade com a transição AI adjacente. Desbloqueie nas propriedades do clipe se necessário.', variant: 'destructive' });
        return;
      }
    }
    e.stopPropagation();
    e.preventDefault();
    onSelectClip(clip.id, e.ctrlKey || e.metaKey);

    const startX = e.clientX;
    const startY = e.clientY;
    const originalStart = clip.startTime;
    const originalDuration = clip.duration;
    const originalTrimStart = clip.trimStart;
    const originalTrackId = clip.trackId;

    draggingRef.current = { clipId: clip.id, type, startX, startY, originalStart, originalDuration, originalTrimStart, originalTrackId };

    const handleMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dt = dx / state.zoom;

      if (type === 'move') {
        onUpdateClip(clip.id, { startTime: Math.max(0, originalStart + dt) });

        // Check vertical movement for track switching
        const hoverTrackId = getTrackAtY(me.clientY);
        if (hoverTrackId && hoverTrackId !== clip.trackId) {
          const hoverTrack = state.tracks.find(t => t.id === hoverTrackId);
          if (hoverTrack && !hoverTrack.locked) {
            // Check compatibility
            if (isCompatible(hoverTrack.type, clip.type)) {
              onUpdateClip(clip.id, { trackId: hoverTrackId, startTime: Math.max(0, originalStart + dt) });
            } else if (clip.type === 'video' && hoverTrack.type === 'audio') {
              onUpdateClip(clip.id, {
                trackId: hoverTrackId,
                type: 'audio',
                name: `🔊 ${clip.name}`,
                startTime: Math.max(0, originalStart + dt),
                color: TRACK_COLORS.audio,
              });
            }
          }
        }
      } else if (type === 'resize-end') {
        onUpdateClip(clip.id, { duration: Math.max(0.5, originalDuration + dt) });
      } else if (type === 'resize-start') {
        const newDt = Math.min(dt, originalDuration - 0.5);
        const clampedDt = Math.max(-originalStart, newDt);
        onUpdateClip(clip.id, {
          startTime: originalStart + clampedDt,
          duration: originalDuration - clampedDt,
          trimStart: Math.max(0, originalTrimStart + clampedDt),
        });
      }
    };

    const handleMouseUp = () => {
      draggingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [state.zoom, state.tracks, onSelectClip, onUpdateClip, getTrackAtY]);

  // Memoize waveform bars to prevent re-render flicker
  const renderWaveform = useCallback((clip: TimelineClip, width: number, trackColor: string) => {
    if (clip.type === 'audio') {
      const barCount = Math.min(Math.floor(width / 3), 80);
      const envelope = clip.volumeEnvelope && clip.volumeEnvelope.length >= 2 ? clip.volumeEnvelope : null;
      const getEnvVal = (t: number) => {
        if (!envelope) return clip.volume ?? 1;
        for (let p = 0; p < envelope.length - 1; p++) {
          if (t >= envelope[p].time && t <= envelope[p + 1].time) {
            const segLen = envelope[p + 1].time - envelope[p].time;
            const frac = segLen > 0 ? (t - envelope[p].time) / segLen : 0;
            return envelope[p].value + (envelope[p + 1].value - envelope[p].value) * frac;
          }
        }
        return envelope[envelope.length - 1].value;
      };
      return (
        <div className="flex items-end gap-px h-full w-full py-1">
          {Array.from({ length: barCount }).map((_, i) => {
            const t = i / barCount;
            const envVal = getEnvVal(t);
            const baseH = 20 + Math.sin(i * 0.7 + clip.startTime) * 30 + Math.sin(i * 1.5) * 20;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  backgroundColor: `${clip.color || trackColor}60`,
                  height: `${baseH * envVal}%`,
                  minWidth: 1,
                }}
              />
            );
          })}
        </div>
      );
    }
    if (clip.type === 'video') {
      const thumbCount = Math.min(Math.floor(width / 30), 12);
      return (
        <div className="flex gap-0.5 h-full w-full py-1 overflow-hidden">
          {Array.from({ length: thumbCount }).map((_, i) => (
            <div
              key={i}
              className="h-full rounded-sm shrink-0"
              style={{
                width: 28,
                backgroundColor: `${clip.color || trackColor}${30 + (i % 3) * 10}`,
              }}
            />
          ))}
        </div>
      );
    }
    if (clip.type === 'image' || clip.type === 'canvas') {
      return clip.src ? (
        <div className="flex items-center gap-1 h-full w-full py-1 overflow-hidden">
          <img src={clip.src} className="h-full rounded-sm object-cover" alt="" draggable={false} style={{ maxWidth: 40 }} />
          <span className="text-[9px] text-muted-foreground truncate">{clip.name}</span>
        </div>
      ) : (
        <span className="text-[9px] text-muted-foreground truncate">{clip.type === 'canvas' ? '🎨' : '🖼️'} {clip.name}</span>
      );
    }
    if (clip.type === 'text') {
      return <span className="text-[9px] text-muted-foreground italic truncate">{clip.name}</span>;
    }
    return null;
  }, []);

  // Handle external drag (from MediaBin) compatibility
  const handleExternalDragOver = useCallback((e: React.DragEvent, track: typeof state.tracks[0]) => {
    if (!e.dataTransfer.types.includes('application/timeline-media')) return;
    e.preventDefault();

    // Block drops on locked tracks
    if (track.locked) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    const typeHint = e.dataTransfer.types.find(t => t.startsWith('mediatype/'));
    const mediaType = typeHint ? typeHint.replace('mediatype/', '') : null;
    
    if (mediaType) {
      setDragMediaType(mediaType);
      const canAccept = isCompatible(track.type, mediaType) || (mediaType === 'video' && track.type === 'audio');
      if (!canAccept) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
    }
    
    e.dataTransfer.dropEffect = 'copy';
    setDropTargetTrackId(track.id);
  }, []);

  const handleExternalDrop = useCallback((e: React.DragEvent, track: typeof state.tracks[0]) => {
    e.preventDefault();
    setDropTargetTrackId(null);
    setDragMediaType(null);
    if (track.locked) return; // Block drops on locked tracks
    const raw = e.dataTransfer.getData('application/timeline-media');
    if (!raw) return;
    try {
      const media = JSON.parse(raw);

      // Calculate drop time from mouse position
      const rect = containerRef.current?.getBoundingClientRect();
      const scrollLeft = containerRef.current?.scrollLeft || 0;
      const x = e.clientX - (rect?.left || 0) + scrollLeft;
      const dropTime = Math.max(0, x / state.zoom);

      // Handle effect drops
      if (media.type === 'effect' && track.type === 'effect' && onAddEffectClip && media.effectType) {
        onAddEffectClip(track.id, dropTime, media.effectType, media.name);
        return;
      }
      if (!onAddClip) return;
      if (isCompatible(track.type, media.type)) {
        onAddClip(media.type, media, track.id, dropTime);
      } else if (media.type === 'video' && track.type === 'audio') {
        onAddClip('audio', { ...media, type: 'audio', name: `🔊 ${media.name}` }, track.id, dropTime);
      }
    } catch {}
  }, [onAddClip, onAddEffectClip, state.zoom]);

  const handleDragLeave = useCallback(() => {
    setDropTargetTrackId(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto relative"
      onClick={(e) => { handleTrackClick(e); setEffectPopover(null); }}
      onDragEnd={() => { setDropTargetTrackId(null); setDragMediaType(null); }}
      onDrop={() => { setDropTargetTrackId(null); setDragMediaType(null); }}
    >
      <div style={{ minWidth: totalWidth, position: 'relative' }}>
        {state.tracks.map((track) => {
          const trackClips = state.clips.filter((c) => c.trackId === track.id);
          const canAccept = dragMediaType ? (isCompatible(track.type, dragMediaType) || (dragMediaType === 'video' && track.type === 'audio')) : true;
          const isDropTarget = dropTargetTrackId === track.id;
          const isDimmed = dragMediaType && !canAccept;
          const hasSolo = state.tracks.some(t => t.solo);
          const isTrackActive = !hasSolo || track.solo;
          
          return (
            <div
              key={track.id}
              data-track-id={track.id}
              className={`relative border-b transition-all ${isDropTarget ? 'ring-2 ring-inset ring-primary/60' : ''} ${track.locked ? 'cursor-not-allowed' : ''}`}
              style={{
                height: track.height,
                opacity: isDimmed ? 0.15 : (!track.visible || !isTrackActive) ? 0.25 : 1,
                backgroundColor: isDropTarget && canAccept
                  ? `${TRACK_COLORS[track.type] || TRACK_COLORS.video}30`
                  : `${TRACK_COLORS[track.type] || TRACK_COLORS.video}12`,
              }}
              onDragOver={(e) => handleExternalDragOver(e, track)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleExternalDrop(e, track)}
              onDoubleClick={(e) => {
                // Effect track double-click to add effects removed per user request
              }}
            >
              {/* Left color indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: `${TRACK_COLORS[track.type] || TRACK_COLORS.video}60` }} />
              
              {/* Locked overlay */}
              {track.locked && (
                <div className="absolute inset-0 z-20 bg-muted/20 pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground/60 font-medium">🔒</span>
                </div>
              )}
              
              {/* Muted overlay */}
              {track.muted && (track.type === 'audio' || track.type === 'video') && (
                <div className="absolute top-0 right-1 z-20 pointer-events-none">
                  <span className="text-[9px] text-destructive/60">🔇</span>
                </div>
              )}

              {trackClips.map((clip) => {
                const left = clip.startTime * state.zoom;
                const width = clip.duration * state.zoom;
                const isSelected = state.selectedClipIds.includes(clip.id);
                const trackColor = TRACK_COLORS[track.type] || TRACK_COLORS.video;

                return (
                  <div
                    key={clip.id}
                    className={`
                      timeline-clip absolute top-1 bottom-1 rounded-md cursor-pointer
                      border-2 transition-shadow overflow-hidden group
                      ${isSelected ? 'ring-2 ring-primary shadow-lg z-10' : 'hover:shadow-md'}
                      ${(clip.locked || track.locked) ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                    style={{
                      left,
                      width: Math.max(width, 20),
                      backgroundColor: `${clip.color || trackColor}20`,
                      borderColor: isSelected ? 'hsl(var(--primary))' : `${clip.color || trackColor}80`,
                    }}
                    onMouseDown={(e) => handleClipMouseDown(e, clip, 'move')}
                    onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickClip?.(clip); }}
                  >
                    <div
                      className="px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1"
                      style={{ backgroundColor: `${clip.color || trackColor}40`, color: 'hsl(var(--foreground))' }}
                    >
                      {clip.type === 'video' && '🎬'}
                      {clip.type === 'audio' && '🔊'}
                      {clip.type === 'image' && '🖼️'}
                      {clip.type === 'text' && '✏️'}
                      {clip.type === 'effect' && '✨'}
                      {clip.type === 'canvas' && '🎨'}
                      <span className="truncate">{clip.name}</span>
                      {(clip.muted || track.muted) && <span className="text-destructive">🔇</span>}
                    </div>

                    <div className="flex-1 px-1 flex items-center">
                      {renderWaveform(clip, width, trackColor)}
                    </div>

                    {/* Entrance transition indicator */}
                    {clip.transitions?.entrance && clip.transitions.entrance.type !== 'none' && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500/40 to-transparent flex items-end pb-0.5 pl-1 pointer-events-none"
                        style={{ width: Math.max(clip.transitions.entrance.duration * state.zoom, 16) }}
                      >
                        <span className="text-[7px] text-emerald-300 font-medium">▶ IN</span>
                      </div>
                    )}

                    {/* Exit transition indicator */}
                    {clip.transitions?.exit && clip.transitions.exit.type !== 'none' && (
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-amber-500/40 to-transparent flex items-end pb-0.5 pr-1 justify-end pointer-events-none"
                        style={{ width: Math.max(clip.transitions.exit.duration * state.zoom, 16) }}
                      >
                        <span className="text-[7px] text-amber-300 font-medium">OUT ◀</span>
                      </div>
                    )}

                    {/* Legacy transition support */}
                    {clip.transition && clip.transition.type !== 'none' && !clip.transitions?.entrance && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-yellow-500/30 to-transparent flex items-center pl-1 pointer-events-none"
                        style={{ width: clip.transition.duration * state.zoom }}
                      >
                        <span className="text-[8px]">⚡</span>
                      </div>
                    )}

                    {!clip.locked && !track.locked && (() => {
                      const startLocked = clip.lockedEdge === 'start' || clip.lockedEdge === 'both';
                      const endLocked = clip.lockedEdge === 'end' || clip.lockedEdge === 'both';
                      return (
                        <>
                          {!startLocked ? (
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-foreground/20 rounded-l"
                              onMouseDown={(e) => handleClipMouseDown(e, clip, 'resize-start')}
                            />
                          ) : (
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 opacity-0 group-hover:opacity-100 bg-destructive/30 rounded-l cursor-not-allowed flex items-center justify-center"
                              onMouseDown={(e) => handleClipMouseDown(e, clip, 'resize-start')}
                            >
                              <span className="text-[6px]">🔒</span>
                            </div>
                          )}
                          {!endLocked ? (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-foreground/20 rounded-r"
                              onMouseDown={(e) => handleClipMouseDown(e, clip, 'resize-end')}
                            />
                          ) : (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 opacity-0 group-hover:opacity-100 bg-destructive/30 rounded-r cursor-not-allowed flex items-center justify-center"
                              onMouseDown={(e) => handleClipMouseDown(e, clip, 'resize-end')}
                            >
                              <span className="text-[6px]">🔒</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Hint for empty effect tracks */}
            </div>
          );
        })}

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30 pointer-events-none"
          style={{ left: state.currentTime * state.zoom }}
        />
      </div>

      {/* Effect type selection popover */}
      {effectPopover && onAddEffectClip && (
        <div
          className="fixed z-[100] bg-popover border border-border rounded-lg shadow-xl p-2 w-64 max-h-80 overflow-auto"
          style={{ left: effectPopover.x, top: effectPopover.y - 10, transform: 'translate(-50%, -100%)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-foreground px-1">✨ Adicionar Efeito na Track</p>
            <button className="text-[10px] text-muted-foreground hover:text-foreground px-1" onClick={() => setEffectPopover(null)}>✕</button>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1 mb-2">
            {Array.from(new Set(EFFECT_TRACK_PRESETS.map(p => p.category))).map(cat => (
              <button
                key={cat}
                className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${effectCategory === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}`}
                onClick={() => setEffectCategory(effectCategory === cat ? null : cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Effect items */}
          <div className="grid grid-cols-2 gap-1">
            {EFFECT_TRACK_PRESETS
              .filter(p => !effectCategory || p.category === effectCategory)
              .map(preset => (
                <button
                  key={preset.type}
                  className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-accent text-left transition-colors"
                  onClick={() => {
                    onAddEffectClip(effectPopover.trackId, effectPopover.startTime, preset.type, preset.label);
                    setEffectPopover(null);
                  }}
                >
                  <span className="text-sm">{preset.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-foreground truncate">{preset.label}</p>
                    <p className="text-[8px] text-muted-foreground truncate">{preset.description}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineTracks;
