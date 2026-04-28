import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { TimelineClip, VolumeEnvelopePoint } from './types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Plus, Trash2, Zap, Gauge } from 'lucide-react';

interface Props {
  clip: TimelineClip;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
}

const ENVELOPE_PRESETS = [
  { id: 'linear', label: 'Linear', icon: '📏', points: [{ time: 0, value: 1 }, { time: 1, value: 1 }] },
  { id: 'fade-in', label: 'Fade In', icon: '📈', points: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }, { time: 1, value: 1 }] },
  { id: 'fade-out', label: 'Fade Out', icon: '📉', points: [{ time: 0, value: 1 }, { time: 0.7, value: 1 }, { time: 1, value: 0 }] },
  { id: 'fade-in-out', label: 'Fade In/Out', icon: '🔔', points: [{ time: 0, value: 0 }, { time: 0.15, value: 1 }, { time: 0.85, value: 1 }, { time: 1, value: 0 }] },
  { id: 'crescendo', label: 'Crescendo', icon: '📐', points: [{ time: 0, value: 0.2 }, { time: 1, value: 1 }] },
  { id: 'decrescendo', label: 'Decrescendo', icon: '📐', points: [{ time: 0, value: 1 }, { time: 1, value: 0.2 }] },
  { id: 'duck', label: 'Ducking', icon: '🦆', points: [{ time: 0, value: 1 }, { time: 0.1, value: 0.3 }, { time: 0.9, value: 0.3 }, { time: 1, value: 1 }] },
  { id: 'swell', label: 'Swell', icon: '🌊', points: [{ time: 0, value: 0.3 }, { time: 0.5, value: 1 }, { time: 1, value: 0.3 }] },
  { id: 'pulse', label: 'Pulsação', icon: '💓', points: [
    { time: 0, value: 0.5 }, { time: 0.125, value: 1 }, { time: 0.25, value: 0.5 },
    { time: 0.375, value: 1 }, { time: 0.5, value: 0.5 }, { time: 0.625, value: 1 },
    { time: 0.75, value: 0.5 }, { time: 0.875, value: 1 }, { time: 1, value: 0.5 },
  ] },
  { id: 'staircase', label: 'Escada', icon: '🪜', points: [
    { time: 0, value: 0.2 }, { time: 0.25, value: 0.2 }, { time: 0.25, value: 0.4 },
    { time: 0.5, value: 0.4 }, { time: 0.5, value: 0.7 }, { time: 0.75, value: 0.7 },
    { time: 0.75, value: 1 }, { time: 1, value: 1 },
  ] },
];

const SPEED_PRESETS = [
  { value: 0.25, label: '0.25x (Ultra Lento)' },
  { value: 0.5, label: '0.5x (Lento)' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x (Normal)' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x (Rápido)' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x (Ultra Rápido)' },
];

const AudioWaveformEditor: React.FC<Props> = ({ clip, onUpdateClip }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const WIDTH = 400;
  const HEIGHT = 140;
  const PAD_X = 12;
  const PAD_Y = 16;
  const GRAPH_W = WIDTH - PAD_X * 2;
  const GRAPH_H = HEIGHT - PAD_Y * 2;

  const envelope = useMemo(() => {
    return clip.volumeEnvelope && clip.volumeEnvelope.length >= 2
      ? clip.volumeEnvelope
      : [{ time: 0, value: clip.volume ?? 1 }, { time: 1, value: clip.volume ?? 1 }];
  }, [clip.volumeEnvelope, clip.volume]);

  // Generate fake waveform data based on clip
  const waveformBars = useMemo(() => {
    const count = 80;
    return Array.from({ length: count }, (_, i) => {
      const t = i / count;
      // Find the envelope value at this position
      let envVal = 1;
      for (let p = 0; p < envelope.length - 1; p++) {
        if (t >= envelope[p].time && t <= envelope[p + 1].time) {
          const segLen = envelope[p + 1].time - envelope[p].time;
          const frac = segLen > 0 ? (t - envelope[p].time) / segLen : 0;
          envVal = envelope[p].value + (envelope[p + 1].value - envelope[p].value) * frac;
          break;
        }
      }
      // Base waveform shape (pseudo-random based on seed)
      const baseHeight = 0.3 + Math.abs(Math.sin(i * 0.7 + clip.startTime) * 0.35 + Math.sin(i * 1.5) * 0.25);
      return baseHeight * envVal;
    });
  }, [envelope, clip.startTime]);

  const toSvgX = (t: number) => PAD_X + t * GRAPH_W;
  const toSvgY = (v: number) => PAD_Y + (1 - v) * GRAPH_H;
  const fromSvgX = (sx: number) => Math.max(0, Math.min(1, (sx - PAD_X) / GRAPH_W));
  const fromSvgY = (sy: number) => Math.max(0, Math.min(1, 1 - (sy - PAD_Y) / GRAPH_H));

  const handleMouseDown = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Don't allow dragging first/last point's time
    setDraggingIdx(idx);
  }, []);

  useEffect(() => {
    if (draggingIdx === null) return;
    const handleMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const scaleY = HEIGHT / rect.height;
      const sx = (e.clientX - rect.left) * scaleX;
      const sy = (e.clientY - rect.top) * scaleY;

      const newPoints = [...envelope];
      const isFirst = draggingIdx === 0;
      const isLast = draggingIdx === newPoints.length - 1;

      // First and last points: lock time to 0 and 1
      const newTime = isFirst ? 0 : isLast ? 1 : fromSvgX(sx);
      const newValue = fromSvgY(sy);

      // Clamp time between neighbors
      let clampedTime = newTime;
      if (!isFirst && !isLast) {
        const prev = newPoints[draggingIdx - 1];
        const next = newPoints[draggingIdx + 1];
        clampedTime = Math.max(prev.time + 0.01, Math.min(next.time - 0.01, newTime));
      }

      newPoints[draggingIdx] = { time: clampedTime, value: Math.round(newValue * 100) / 100 };
      onUpdateClip(clip.id, { volumeEnvelope: newPoints });
    };

    const handleUp = () => setDraggingIdx(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingIdx, envelope, clip.id, onUpdateClip]);

  const addPoint = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIdx !== null) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;
    const t = fromSvgX(sx);
    const v = fromSvgY(sy);

    // Don't add if too close to existing point
    if (envelope.some(p => Math.abs(p.time - t) < 0.02)) return;

    const newPoints = [...envelope, { time: t, value: Math.round(v * 100) / 100 }]
      .sort((a, b) => a.time - b.time);
    onUpdateClip(clip.id, { volumeEnvelope: newPoints });
  }, [envelope, clip.id, onUpdateClip, draggingIdx]);

  const removePoint = useCallback((idx: number) => {
    if (idx === 0 || idx === envelope.length - 1) return; // keep first/last
    const newPoints = envelope.filter((_, i) => i !== idx);
    onUpdateClip(clip.id, { volumeEnvelope: newPoints });
  }, [envelope, clip.id, onUpdateClip]);

  const applyEnvelopePreset = (presetId: string) => {
    const preset = ENVELOPE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    onUpdateClip(clip.id, { volumeEnvelope: [...preset.points] });
  };

  const resetEnvelope = () => {
    onUpdateClip(clip.id, { volumeEnvelope: undefined });
  };

  const playbackRate = clip.playbackRate ?? 1;

  // Build envelope line path
  const envelopePath = envelope.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toSvgX(p.time)} ${toSvgY(p.value)}`
  ).join(' ');

  // Build filled area path
  const fillPath = `${envelopePath} L ${toSvgX(1)} ${toSvgY(0)} L ${toSvgX(0)} ${toSvgY(0)} Z`;

  return (
    <div className="space-y-3">
      {/* === VOLUME ENVELOPE === */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Curva de Volume
          </Label>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-1" onClick={resetEnvelope}>
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
        </div>

        {/* Envelope presets */}
        <div className="grid grid-cols-5 gap-1 mb-2">
          {ENVELOPE_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyEnvelopePreset(preset.id)}
              className="flex flex-col items-center gap-0.5 p-1 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
              title={preset.label}
            >
              <span className="text-xs leading-none">{preset.icon}</span>
              <span className="text-[7px] font-medium leading-tight">{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Interactive waveform + envelope */}
        <div className="relative border rounded-lg bg-muted/20 overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full cursor-crosshair"
            style={{ height: 140 }}
            onDoubleClick={addPoint}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(v => (
              <g key={v}>
                <line
                  x1={PAD_X} y1={toSvgY(v)} x2={PAD_X + GRAPH_W} y2={toSvgY(v)}
                  stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray={v === 0 || v === 1 ? '' : '2,2'}
                  opacity={0.5}
                />
                <text x={PAD_X - 2} y={toSvgY(v) + 3} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="end">
                  {Math.round(v * 100)}%
                </text>
              </g>
            ))}

            {/* Time markers */}
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <text key={t} x={toSvgX(t)} y={HEIGHT - 3} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="middle">
                {(t * clip.duration).toFixed(1)}s
              </text>
            ))}

            {/* Waveform bars (modulated by envelope) */}
            {waveformBars.map((h, i) => {
              const barW = GRAPH_W / waveformBars.length;
              const x = PAD_X + i * barW;
              const barH = h * GRAPH_H;
              return (
                <rect
                  key={i}
                  x={x}
                  y={PAD_Y + GRAPH_H - barH}
                  width={Math.max(barW - 1, 1)}
                  height={barH}
                  fill="hsl(var(--primary))"
                  opacity={0.15}
                  rx={0.5}
                />
              );
            })}

            {/* Envelope filled area */}
            <path d={fillPath} fill="hsl(var(--primary))" opacity={0.08} />

            {/* Envelope line */}
            <path d={envelopePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" />

            {/* Control points */}
            {envelope.map((point, idx) => {
              const cx = toSvgX(point.time);
              const cy = toSvgY(point.value);
              const isFirst = idx === 0;
              const isLast = idx === envelope.length - 1;
              const isHovered = hoveredIdx === idx;
              const isDragging = draggingIdx === idx;
              return (
                <g key={idx}>
                  {/* Hit area (larger) */}
                  <circle
                    cx={cx} cy={cy} r={12}
                    fill="transparent"
                    className="cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => handleMouseDown(idx, e)}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!isFirst && !isLast) removePoint(idx);
                    }}
                  />
                  {/* Visible point */}
                  <circle
                    cx={cx} cy={cy}
                    r={isDragging ? 6 : isHovered ? 5 : 4}
                    fill={isFirst || isLast ? 'hsl(var(--primary))' : 'hsl(var(--background))'}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    className="pointer-events-none transition-all"
                  />
                  {/* Tooltip */}
                  {(isHovered || isDragging) && (
                    <g>
                      <rect
                        x={cx - 22} y={cy - 20} width={44} height={14}
                        rx={3}
                        fill="hsl(var(--popover))"
                        stroke="hsl(var(--border))"
                        strokeWidth={0.5}
                      />
                      <text
                        x={cx} y={cy - 10.5}
                        fontSize="7" fill="hsl(var(--popover-foreground))"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {(point.time * clip.duration).toFixed(1)}s · {Math.round(point.value * 100)}%
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Instructions */}
          <div className="absolute bottom-1 right-2 text-[8px] text-muted-foreground/60 pointer-events-none">
            Duplo-clique para adicionar/remover pontos
          </div>
        </div>

        <p className="text-[9px] text-muted-foreground mt-1">
          {envelope.length} pontos · Arraste para ajustar · Duplo-clique no gráfico = novo ponto · Duplo-clique no ponto = remover
        </p>
      </div>

      {/* === SPEED / PLAYBACK RATE === */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            Velocidade de Reprodução
          </Label>
          <span className="text-[10px] font-mono text-muted-foreground">{playbackRate.toFixed(2)}x</span>
        </div>

        <Slider
          value={[playbackRate]}
          onValueChange={([v]) => onUpdateClip(clip.id, { playbackRate: Math.round(v * 100) / 100 })}
          min={0.25}
          max={4}
          step={0.05}
          className="mb-2"
        />

        <div className="grid grid-cols-3 gap-1">
          {SPEED_PRESETS.filter(p => [0.5, 0.75, 1, 1.5, 2, 4].includes(p.value)).map(preset => (
            <button
              key={preset.value}
              onClick={() => onUpdateClip(clip.id, { playbackRate: preset.value })}
              className={`text-[9px] py-1 px-2 rounded-md border transition-all ${
                Math.abs(playbackRate - preset.value) < 0.01
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
              }`}
            >
              {preset.value}x
            </button>
          ))}
        </div>

        {playbackRate !== 1 && (
          <p className="text-[9px] text-muted-foreground mt-1.5">
            Duração efetiva: {(clip.duration / playbackRate).toFixed(2)}s (original: {clip.duration.toFixed(2)}s)
          </p>
        )}
      </div>
    </div>
  );
};

export default AudioWaveformEditor;
