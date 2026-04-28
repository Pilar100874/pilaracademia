import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play, Pause, Scissors, Save, Undo2,
  Loader2, Volume2, VolumeX, RotateCcw, Eye, ChevronDown
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface VideoTrimmerProps {
  videoUrl: string;
  onSaveTrimmed: (blob: Blob, startTime: number, endTime: number, withAudio: boolean) => Promise<void>;
  onSaveOriginal: (withAudio: boolean) => void | Promise<void>;
  isSaving?: boolean;
}

/** A cut = a removed segment */
interface CutSegment {
  id: string;
  start: number; // seconds
  end: number;   // seconds
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00.0';
  }

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
};

const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ videoUrl, onSaveTrimmed, onSaveOriginal, isSaving }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);

  // Selection state: the user drags on the timeline to select a region to cut
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Cut segments (removed regions) and undo history
  const [cuts, setCuts] = useState<CutSegment[]>([]);
  const [undoStack, setUndoStack] = useState<CutSegment[][]>([]);

  // Preview mode: plays only kept segments
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewRef = useRef(false);

  const animRef = useRef<number | null>(null);

  // Sort selection
  const selStart = selectionStart !== null && selectionEnd !== null ? Math.min(selectionStart, selectionEnd) : null;
  const selEnd = selectionStart !== null && selectionEnd !== null ? Math.max(selectionStart, selectionEnd) : null;
  const hasSelection = selStart !== null && selEnd !== null && (selEnd - selStart) > 0.05;

  // Compute kept segments (inverse of cuts)
  const keptSegments = useMemo(() => {
    if (duration <= 0) return [];
    const sorted = [...cuts].sort((a, b) => a.start - b.start);
    const kept: { start: number; end: number }[] = [];
    let cursor = 0;
    for (const cut of sorted) {
      if (cut.start > cursor) {
        kept.push({ start: cursor, end: cut.start });
      }
      cursor = Math.max(cursor, cut.end);
    }
    if (cursor < duration) {
      kept.push({ start: cursor, end: duration });
    }
    return kept;
  }, [cuts, duration]);

  const totalKeptDuration = useMemo(() => 
    keptSegments.reduce((sum, s) => sum + (s.end - s.start), 0), [keptSegments]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const rawDuration = video.duration;
    if (Number.isFinite(rawDuration) && rawDuration > 0) {
      setDuration(rawDuration);
      setVideoReady(true);
      return;
    }

    const finalizeDuration = () => {
      const resolvedDuration = video.duration;
      if (Number.isFinite(resolvedDuration) && resolvedDuration > 0) {
        setDuration(resolvedDuration);
        setVideoReady(true);
      }
    };

    const handleDurationChange = () => {
      finalizeDuration();
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.removeEventListener('durationchange', handleDurationChange);
      }
    };

    video.addEventListener('durationchange', handleDurationChange);

    try {
      const previousTime = video.currentTime;
      video.currentTime = 1e101;
      setTimeout(() => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) {
          video.currentTime = previousTime || 0;
        }
      }, 200);
    } catch {
      finalizeDuration();
    }
  }, []);

  // Sync current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      setCurrentTime(video.currentTime);

      // In preview mode, skip over cut regions
      if (previewRef.current && video.currentTime >= 0) {
        for (const cut of cuts) {
          if (video.currentTime >= cut.start && video.currentTime < cut.end) {
            video.currentTime = cut.end;
            break;
          }
        }
      }

      if (!video.paused && !video.ended) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    if (isPlaying || isPreviewing) {
      animRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, isPreviewing, cuts]);

  const stopPlayback = useCallback(() => {
    const video = videoRef.current;
    if (video) video.pause();
    setIsPlaying(false);
    setIsPreviewing(false);
    previewRef.current = false;
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying || isPreviewing) {
      stopPlayback();
    } else {
      video.play();
      setIsPlaying(true);
    }
  }, [isPlaying, isPreviewing, stopPlayback]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  // --- Timeline mouse interaction for selection ---
  const getTimeFromMouse = useCallback((e: React.MouseEvent | MouseEvent) => {
    const el = timelineRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }, [duration]);

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const time = getTimeFromMouse(e);
    setSelectionStart(time);
    setSelectionEnd(time);
    setIsDragging(true);
    seekTo(time);
  }, [getTimeFromMouse, seekTo]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const time = getTimeFromMouse(e);
      setSelectionEnd(time);
    };
    const handleUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, getTimeFromMouse]);

  // --- Cut action ---
  const handleCut = useCallback(() => {
    if (!hasSelection || selStart === null || selEnd === null) return;
    stopPlayback();

    // Save current state for undo
    setUndoStack(prev => [...prev, [...cuts]]);

    const newCut: CutSegment = {
      id: Date.now().toString(),
      start: selStart,
      end: selEnd,
    };

    // Merge overlapping cuts
    const allCuts = [...cuts, newCut].sort((a, b) => a.start - b.start);
    const merged: CutSegment[] = [];
    for (const c of allCuts) {
      const last = merged[merged.length - 1];
      if (last && c.start <= last.end) {
        last.end = Math.max(last.end, c.end);
      } else {
        merged.push({ ...c });
      }
    }

    setCuts(merged);
    setSelectionStart(null);
    setSelectionEnd(null);
    toast.success(`Cortado: ${formatTime(selStart)} → ${formatTime(selEnd)}`);
  }, [hasSelection, selStart, selEnd, cuts, stopPlayback]);

  // --- Undo ---
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    stopPlayback();
    const prev = undoStack[undoStack.length - 1];
    setCuts(prev);
    setUndoStack(s => s.slice(0, -1));
    toast.info('Corte desfeito');
  }, [undoStack, stopPlayback]);

  // --- Reset all ---
  const handleResetAll = useCallback(() => {
    stopPlayback();
    setUndoStack(prev => [...prev, [...cuts]]);
    setCuts([]);
    setSelectionStart(null);
    setSelectionEnd(null);
    seekTo(0);
    toast.info('Todos os cortes foram removidos');
  }, [cuts, stopPlayback, seekTo]);

  // --- Preview (plays video skipping cut regions) ---
  const handlePreview = useCallback(() => {
    if (cuts.length === 0) {
      toast.info('Nenhum corte para simular');
      return;
    }
    stopPlayback();
    seekTo(0);
    setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      previewRef.current = true;
      setIsPreviewing(true);
      video.play();
    }, 100);
  }, [cuts, stopPlayback, seekTo]);

  // --- Export: record only the kept segments ---
  const handleExport = useCallback(async (withAudio: boolean) => {
    if (cuts.length === 0) {
      toast.info('Nenhum corte foi feito');
      return;
    }
    setIsTrimming(true);
    setTrimProgress(0);
    toast.info(`Processando vídeo cortado ${withAudio ? 'com áudio' : 'sem áudio'}...`);

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Falha ao carregar vídeo');
      const sourceBlob = await response.blob();
      const localUrl = URL.createObjectURL(sourceBlob);

      const offscreen = document.createElement('video');
      offscreen.src = localUrl;
      offscreen.playsInline = true;
      offscreen.preload = 'auto';
      offscreen.muted = !withAudio;

      await new Promise<void>((resolve, reject) => {
        offscreen.onloadedmetadata = () => resolve();
        offscreen.onerror = () => reject(new Error('Erro ao carregar vídeo'));
        setTimeout(() => reject(new Error('Timeout')), 15000);
      });

      const canvas = document.createElement('canvas');
      canvas.width = offscreen.videoWidth || 1280;
      canvas.height = offscreen.videoHeight || 720;
      const ctx = canvas.getContext('2d')!;

      const canvasStream = canvas.captureStream(30);

      let audioCtx: AudioContext | null = null;
      if (withAudio) {
        try {
          audioCtx = new AudioContext();
          const source = audioCtx.createMediaElementSource(offscreen);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          dest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));
        } catch { /* no audio */ }
      }

      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';

      const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const recordingDone = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        recorder.onerror = () => reject(new Error('Erro no MediaRecorder'));
      });

      const segments = [...keptSegments];
      let processedTime = 0;

      recorder.start(100);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        offscreen.currentTime = seg.start;
        await new Promise<void>(r => { offscreen.onseeked = () => r(); });

        await offscreen.play();

        await new Promise<void>((resolve) => {
          const draw = () => {
            if (offscreen.currentTime >= seg.end || offscreen.paused || offscreen.ended) {
              offscreen.pause();
              resolve();
              return;
            }
            ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
            processedTime = (offscreen.currentTime - seg.start);
            const totalProcessed = segments.slice(0, i).reduce((s, sg) => s + (sg.end - sg.start), 0) + processedTime;
            setTrimProgress(Math.min(100, (totalProcessed / totalKeptDuration) * 100));
            requestAnimationFrame(draw);
          };
          draw();
        });
      }

      recorder.stop();
      const blob = await recordingDone;

      URL.revokeObjectURL(localUrl);
      offscreen.remove();
      if (audioCtx) audioCtx.close().catch(() => {});

      if (blob.size < 100) throw new Error('O vídeo cortado ficou vazio');

      await onSaveTrimmed(blob, 0, totalKeptDuration, withAudio);
      toast.success(`✅ Vídeo cortado e salvo ${withAudio ? 'com áudio' : 'sem áudio'}!`);
    } catch (err: any) {
      console.error('[VideoTrimmer] Export error:', err);
      toast.error('Erro ao exportar: ' + (err.message || String(err)));
    } finally {
      setIsTrimming(false);
      setTrimProgress(0);
    }
  }, [cuts, keptSegments, totalKeptDuration, videoUrl, onSaveTrimmed]);

  const hasCuts = cuts.length > 0;

  return (
    <div className="flex flex-col w-full">
      {/* Video player */}
      <div className="relative bg-black rounded-t-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleLoadedMetadata}
          onEnded={() => { setIsPlaying(false); setIsPreviewing(false); previewRef.current = false; }}
          muted={isMuted}
          className="w-full max-h-[50vh] object-contain"
          playsInline
          preload="metadata"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls panel */}
      <div className="bg-card border-t border-border px-4 pt-3 pb-3 space-y-3">
        
        {/* Instructions */}
        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
          <Scissors className="h-3.5 w-3.5 shrink-0" />
          <span>Clique e arraste na timeline para selecionar a parte que deseja <strong>remover</strong>, depois clique em "Cortar".</span>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Time markers */}
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
            <span>{formatTime(0)}</span>
            <span className="text-primary font-semibold">{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Visual timeline */}
          <div
            ref={timelineRef}
            className="relative h-12 bg-muted/50 rounded-md cursor-crosshair overflow-hidden border select-none"
            onMouseDown={handleTimelineMouseDown}
          >
            {/* Faux waveform */}
            <div className="absolute inset-0 flex items-end px-0.5 gap-px pointer-events-none">
              {Array.from({ length: 100 }).map((_, i) => {
                const pos = (i / 100) * duration;
                const isCut = cuts.some(c => pos >= c.start && pos < c.end);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-colors"
                    style={{
                      height: `${20 + Math.sin(i * 0.5) * 30 + Math.sin(i * 1.3) * 20}%`,
                      backgroundColor: isCut
                        ? 'hsl(var(--destructive) / 0.25)'
                        : 'hsl(var(--primary) / 0.3)',
                    }}
                  />
                );
              })}
            </div>

            {/* Cut regions (removed) */}
            {cuts.map((cut) => (
              <div
                key={cut.id}
                className="absolute top-0 bottom-0 bg-destructive/20 border-x border-destructive/40 pointer-events-none z-[5]"
                style={{
                  left: `${(cut.start / duration) * 100}%`,
                  width: `${((cut.end - cut.start) / duration) * 100}%`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] text-destructive font-medium bg-background/70 px-1 rounded">
                    CORTE
                  </span>
                </div>
                {/* Striped overlay */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, hsl(var(--destructive)) 3px, hsl(var(--destructive)) 4px)',
                }} />
              </div>
            ))}

            {/* Current selection (being dragged) */}
            {hasSelection && selStart !== null && selEnd !== null && (
              <div
                className="absolute top-0 bottom-0 bg-destructive/30 border-x-2 border-destructive/60 pointer-events-none z-[6]"
                style={{
                  left: `${(selStart / duration) * 100}%`,
                  width: `${((selEnd - selStart) / duration) * 100}%`,
                }}
              />
            )}

            {/* Playhead */}
            {duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none"
                style={{
                  left: `${(currentTime / duration) * 100}%`,
                  backgroundColor: 'hsl(var(--primary))',
                }}
              >
                <div
                  className="absolute -top-0.5 -left-[5px] w-[11px] h-2.5"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                    backgroundColor: 'hsl(var(--primary))',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Selection + Duration info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3 flex-wrap">
            <span>Original: <strong className="text-foreground">{formatTime(duration)}</strong></span>
            {hasCuts && (
              <span className="text-primary">
                Resultado: <strong>{formatTime(totalKeptDuration)}</strong>
              </span>
            )}
            {hasCuts && (
              <span className="text-destructive">
                {cuts.length} corte{cuts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {hasSelection && selStart !== null && selEnd !== null && (
            <span className="text-destructive font-medium">
              Seleção: {formatTime(selStart)} → {formatTime(selEnd)} ({formatTime(selEnd - selStart)})
            </span>
          )}
        </div>

        {/* Progress bar */}
        {isTrimming && (
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${trimProgress}%` }} />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left: playback */}
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant={isPlaying ? 'default' : 'outline'}
              className="h-9 w-9"
              onClick={togglePlay}
              disabled={!videoReady || isTrimming}
            >
              {isPlaying || isPreviewing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Center: cut actions */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 text-xs"
              onClick={handleCut}
              disabled={!hasSelection || isTrimming}
            >
              <Scissors className="h-3.5 w-3.5" />
              Cortar Seleção
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleUndo}
              disabled={undoStack.length === 0 || isTrimming}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Desfazer
            </Button>
            {hasCuts && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs"
                onClick={handleResetAll}
                disabled={isTrimming}
              >
                <RotateCcw className="h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          {/* Right: preview + save */}
          <div className="flex items-center gap-1.5">
            {hasCuts && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handlePreview}
                disabled={isTrimming || isSaving}
              >
                <Eye className="h-3.5 w-3.5" />
                Simular
              </Button>
            )}
            {hasCuts && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 text-xs"
                    disabled={isTrimming || isSaving}
                  >
                    {isTrimming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
                    {isTrimming ? `Processando ${Math.round(trimProgress)}%` : 'Salvar Cortado'}
                    {!isTrimming && <ChevronDown className="h-3 w-3" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport(true)}>
                    <Volume2 className="h-3.5 w-3.5 mr-2" /> Com áudio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport(false)}>
                    <VolumeX className="h-3.5 w-3.5 mr-2" /> Sem áudio
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  disabled={isSaving || isTrimming}
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar Original
                  {!isSaving && !isTrimming && <ChevronDown className="h-3 w-3" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSaveOriginal(true)}>
                  <Volume2 className="h-3.5 w-3.5 mr-2" /> Com áudio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSaveOriginal(false)}>
                  <VolumeX className="h-3.5 w-3.5 mr-2" /> Sem áudio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTrimmer;
