import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
const GESTURE_CONFIRM_FRAMES = 2; // require 2 consecutive frames
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

  const [status, setStatus] = useState<FormStatus>('idle');
  const [feedback, setFeedback] = useState<string>('Iniciando análise...');
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingNav, setPendingNav] = useState<null | { dir: 'next' | 'prev'; countdown: number }>(null);

  // Start camera
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
    const w = 480;
    const h = (video.videoHeight / video.videoWidth) * w || 360;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
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

  // Countdown for gesture nav
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

  // Analysis loop
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
          {
            body: {
              imageBase64: frame,
              exerciseName,
              exerciseInstructions,
            },
          },
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

    // First tick after a small delay
    const startTimer = window.setTimeout(tick, 1500);
    intervalRef.current = window.setInterval(tick, ANALYSIS_INTERVAL_MS);
    return () => {
      window.clearTimeout(startTimer);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [exerciseName, exerciseInstructions, captureFrame, triggerNav, error]);

  // Reset gesture streak when exercise changes
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

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Camera feed */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-10">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
            <Camera className="h-4 w-4 text-white" />
            <span className="text-white text-xs font-semibold truncate max-w-[180px]">
              {exerciseName}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar coach"
            className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/80 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Traffic light */}
        <div className="absolute top-20 right-4 flex flex-col items-center gap-3 bg-black/60 backdrop-blur-md rounded-2xl p-3 border border-white/10 z-10">
          <div className={`h-5 w-5 rounded-full transition-all ${status === 'wrong' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'bg-red-500/20'}`} />
          <div className={`h-5 w-5 rounded-full transition-all ${status === 'partial' ? 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)]' : 'bg-yellow-400/20'}`} />
          <div className={`h-5 w-5 rounded-full transition-all ${status === 'correct' ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]' : 'bg-green-500/20'}`} />
        </div>

        {/* Status pill */}
        <div className="absolute top-20 left-4 z-10 max-w-[60%]">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2 border border-white/10">
            <div className={`h-3 w-3 rounded-full ${lightColor}`} />
            <span className="text-white text-xs font-bold">{statusLabel}</span>
            {analyzing && <Loader2 className="h-3 w-3 text-white/60 animate-spin" />}
          </div>
          {feedback && (
            <p className="mt-2 text-white text-xs bg-black/50 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 line-clamp-2 drop-shadow">
              {feedback}
            </p>
          )}
        </div>

        {/* Gesture countdown overlay */}
        {pendingNav && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-6">
            <div className="max-w-sm text-center">
              <p className="text-white text-base mb-4">{error}</p>
              <Button onClick={onClose}>Fechar</Button>
            </div>
          </div>
        )}

        {/* Gesture hint */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10">
          <p className="text-white/80 text-[11px] tracking-wide">
            ✋ Mostre a palma da mão parada para mudar de exercício
          </p>
        </div>
      </div>

      {/* Big bottom controls */}
      <div className="bg-black border-t border-white/10 p-4 pb-6 flex items-center gap-3 safe-bottom">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="flex-1 h-16 rounded-2xl bg-white/10 border border-white/20 text-white font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-7 w-7" />
          <span>Anterior</span>
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex-1 h-16 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span>Próximo</span>
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
