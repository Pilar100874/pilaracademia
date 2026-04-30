import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FormStatus = 'correct' | 'partial' | 'wrong' | 'unknown' | 'idle';

interface WorkoutFormCoachProps {
  exerciseName: string;
  exerciseInstructions?: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  canPrev: boolean;
  canNext: boolean;
}

const ANALYSIS_INTERVAL_MS = 2800;
const GESTURE_CONFIRM_FRAMES = 1; // 1 frame is enough; 2s countdown provides safety
const COUNTDOWN_SECONDS = 2;

export function WorkoutFormCoach({
  exerciseName,
  exerciseInstructions,
  onClose,
  onNext,
  onPrev,
  canPrev,
  canNext,
}: WorkoutFormCoachProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const inflightRef = useRef(false);
  const gestureStreakRef = useRef<{ next: number; prev: number }>({ next: 0, prev: 0 });
  // Smoothed bounding box (normalized 0-1) used for auto-framing the next capture.
  const bboxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const [status, setStatus] = useState<FormStatus>('idle');
  const [feedback, setFeedback] = useState<string>('Iniciando análise...');
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoFramed, setAutoFramed] = useState(false);
  const [pendingNav, setPendingNav] = useState<null | { dir: 'next' | 'prev'; countdown: number }>(null);

  // Start camera (hidden — used only for capture)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error('Camera error', e);
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    // Decide source crop region based on smoothed bbox (auto-framing).
    // We expand it a bit and clamp inside the frame.
    let sx = 0, sy = 0, sW = vw, sH = vh;
    const bb = bboxRef.current;
    if (bb && bb.w > 0.05 && bb.h > 0.05) {
      const padX = bb.w * 0.15;
      const padY = bb.h * 0.10;
      const cx = Math.max(0, bb.x - padX);
      const cy = Math.max(0, bb.y - padY);
      const cw = Math.min(1 - cx, bb.w + padX * 2);
      const ch = Math.min(1 - cy, bb.h + padY * 2);
      sx = cx * vw;
      sy = cy * vh;
      sW = cw * vw;
      sH = ch * vh;
    }

    // Output target: keep aspect ratio of crop, max 480px wide.
    const targetW = 480;
    const targetH = Math.round((sH / sW) * targetW) || 360;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, sW, sH, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const triggerNav = useCallback(
    (dir: 'next' | 'prev') => {
      if (pendingNav) return;
      if (dir === 'next' && !canNext) return;
      if (dir === 'prev' && !canPrev) return;
      setPendingNav({ dir, countdown: COUNTDOWN_SECONDS });
    },
    [pendingNav, canNext, canPrev],
  );

  useEffect(() => {
    if (!pendingNav) return;
    if (pendingNav.countdown <= 0) {
      const dir = pendingNav.dir;
      setPendingNav(null);
      gestureStreakRef.current = { next: 0, prev: 0 };
      if (dir === 'next') onNext();
      else onPrev();
      return;
    }
    const t = window.setTimeout(() => {
      setPendingNav((p) => (p ? { ...p, countdown: p.countdown - 1 } : null));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [pendingNav, onNext, onPrev]);

  useEffect(() => {
    if (error) return;

    const tick = async () => {
      if (inflightRef.current) return;
      const frame = captureFrame();
      if (!frame) return;
      inflightRef.current = true;
      setAnalyzing(true);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          'analyze-workout-form',
          { body: { imageBase64: frame, exerciseName, exerciseInstructions } },
        );
        if (fnErr) throw fnErr;
        if (data?.error) {
          if (typeof data.error === 'string' && data.error.toLowerCase().includes('crédito')) {
            setError(data.error);
          }
          return;
        }
        const newStatus = (data?.status || 'unknown') as FormStatus;
        setStatus(newStatus);
        setFeedback(data?.feedback || '');

        // Auto-framing: smoothly converge on the AI-reported person bbox.
        // The bbox is in the coordinate space of the frame we SENT, which itself
        // may already be a crop. So we map it back into the FULL video coords.
        const reported = data?.person_bbox as
          | { x: number; y: number; w: number; h: number }
          | null
          | undefined;
        if (
          reported &&
          typeof reported.x === 'number' &&
          typeof reported.y === 'number' &&
          typeof reported.w === 'number' &&
          typeof reported.h === 'number' &&
          reported.w > 0.05 &&
          reported.h > 0.05
        ) {
          const prev = bboxRef.current;
          // Map reported bbox (relative to last sent crop) back to full video coords.
          const base = prev ?? { x: 0, y: 0, w: 1, h: 1 };
          const padX = base.w * 0.15;
          const padY = base.h * 0.10;
          const cx = Math.max(0, base.x - padX);
          const cy = Math.max(0, base.y - padY);
          const cw = Math.min(1 - cx, base.w + padX * 2);
          const ch = Math.min(1 - cy, base.h + padY * 2);
          const absolute = {
            x: cx + reported.x * cw,
            y: cy + reported.y * ch,
            w: reported.w * cw,
            h: reported.h * ch,
          };
          // EMA smoothing (alpha=0.4) to avoid jitter.
          const alpha = prev ? 0.4 : 1;
          bboxRef.current = {
            x: prev ? prev.x * (1 - alpha) + absolute.x * alpha : absolute.x,
            y: prev ? prev.y * (1 - alpha) + absolute.y * alpha : absolute.y,
            w: prev ? prev.w * (1 - alpha) + absolute.w * alpha : absolute.w,
            h: prev ? prev.h * (1 - alpha) + absolute.h * alpha : absolute.h,
          };
          setAutoFramed(true);
        }

        const gesture = data?.gesture as 'next' | 'prev' | null;
        if (gesture === 'next') {
          gestureStreakRef.current.next += 1;
          gestureStreakRef.current.prev = 0;
        } else if (gesture === 'prev') {
          gestureStreakRef.current.prev += 1;
          gestureStreakRef.current.next = 0;
        } else {
          gestureStreakRef.current = { next: 0, prev: 0 };
        }
        if (gestureStreakRef.current.next >= GESTURE_CONFIRM_FRAMES) triggerNav('next');
        else if (gestureStreakRef.current.prev >= GESTURE_CONFIRM_FRAMES) triggerNav('prev');
      } catch (e) {
        console.error('Analysis error', e);
      } finally {
        inflightRef.current = false;
        setAnalyzing(false);
      }
    };

    const startTimer = window.setTimeout(tick, 1500);
    intervalRef.current = window.setInterval(tick, ANALYSIS_INTERVAL_MS);
    return () => {
      window.clearTimeout(startTimer);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [exerciseName, exerciseInstructions, captureFrame, triggerNav, error]);

  useEffect(() => {
    gestureStreakRef.current = { next: 0, prev: 0 };
    setPendingNav(null);
    setStatus('idle');
    setFeedback('Analisando...');
  }, [exerciseName]);

  const lightColor =
    status === 'correct'
      ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.7)]'
      : status === 'partial'
        ? 'bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.7)]'
        : status === 'wrong'
          ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.7)]'
          : 'bg-white/20';

  const statusLabel =
    status === 'correct'
      ? 'Forma correta'
      : status === 'partial'
        ? 'Atenção'
        : status === 'wrong'
          ? 'Forma incorreta'
          : status === 'idle'
            ? 'Aguardando...'
            : 'Analisando...';

  const ringColor =
    status === 'correct'
      ? 'ring-green-500/80 shadow-[0_0_40px_rgba(34,197,94,0.5)]'
      : status === 'partial'
        ? 'ring-yellow-400/80 shadow-[0_0_40px_rgba(250,204,21,0.5)]'
        : status === 'wrong'
          ? 'ring-red-500/80 shadow-[0_0_40px_rgba(239,68,68,0.5)]'
          : 'ring-white/10';

  return (
    <>
      {/* Small camera PiP — top-right, below the dialog close button */}
      <div className="absolute top-20 right-4 z-[56] w-28 sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 bg-black shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-1.5 py-0.5 border border-white/15">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-[9px] font-bold tracking-wider">AO VIVO</span>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Status overlay on TOP of the workout video — non-blocking */}
      <div className="absolute top-20 left-4 z-[55] pointer-events-none flex flex-col gap-2 max-w-[70%]">
        <div className={`flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2 border ring-2 transition-all ${ringColor} pointer-events-auto`}>
          <div className={`h-3 w-3 rounded-full ${lightColor}`} />
          <span className="text-white text-xs font-bold">{statusLabel}</span>
          {analyzing && <Loader2 className="h-3 w-3 text-white/60 animate-spin" />}
          <button
            onClick={onClose}
            aria-label="Fechar coach"
            className="ml-1 h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {feedback && (
          <p className="text-white text-xs bg-black/55 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 line-clamp-2 drop-shadow">
            {feedback}
          </p>
        )}
      </div>

      {/* Traffic light horizontal — below the camera PiP */}
      <div className="absolute right-4 z-[55] flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-2 py-1.5 border border-white/10" style={{ top: 'calc(5rem + min(36vw, 9rem) * 4 / 3 + 0.5rem)' }}>
        <div className={`h-3 w-3 rounded-full transition-all ${status === 'wrong' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'bg-red-500/20'}`} />
        <div className={`h-3 w-3 rounded-full transition-all ${status === 'partial' ? 'bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.9)]' : 'bg-yellow-400/20'}`} />
        <div className={`h-3 w-3 rounded-full transition-all ${status === 'correct' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.9)]' : 'bg-green-500/20'}`} />
      </div>

      {/* Camera-active hint — sits just above the exercise name card (mobile) / bottom bar (desktop) */}
      <div className="absolute bottom-[10.5rem] sm:bottom-24 left-1/2 -translate-x-1/2 z-[55] bg-black/55 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 flex items-center gap-2 whitespace-nowrap max-w-[calc(100vw-2rem)]">
        <Camera className="h-3.5 w-3.5 text-white/80 shrink-0" />
        <p className="text-white/85 text-[11px] tracking-wide truncate">
          Coach IA ativo · ✋ palma aberta para próximo exercício
        </p>
      </div>

      {/* Gesture countdown */}
      {pendingNav && (
        <div className="absolute inset-0 z-[58] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-black/80 border border-white/20 rounded-3xl px-8 py-6 text-center">
            <p className="text-white/70 text-sm mb-2">
              {pendingNav.dir === 'next' ? 'Próximo exercício' : 'Exercício anterior'} em
            </p>
            <p className="text-white text-7xl font-extrabold tabular-nums">
              {pendingNav.countdown}
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setPendingNav(null);
                gestureStreakRef.current = { next: 0, prev: 0 };
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-[59] flex items-center justify-center bg-black/85 p-6">
          <div className="max-w-sm text-center">
            <p className="text-white text-base mb-4">{error}</p>
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      )}
    </>
  );
}
