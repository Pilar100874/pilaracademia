import { useState } from 'react';
import { ChevronUp, Sparkles } from 'lucide-react';
import {
  BodyAnalysis,
  AestheticAnalysis,
  MobilityAnalysis,
  BODY_GROUPS,
  AESTHETIC_ITEMS,
  MOBILITY_GROUPS,
} from '@/lib/exerciseAnalysis';

interface AnalysisOverlayProps {
  body?: BodyAnalysis | Record<string, number> | null;
  aesthetic?: AestheticAnalysis | Record<string, number> | null;
  mobility?: MobilityAnalysis | Record<string, number> | null;
  /** Tailwind classes that fully control positioning of the floating chip + panel.
   * Default places it just above the bottom nav controls. */
  positionClass?: string;
  /** Hide entirely if no analysis data is available. */
  minPercent?: number;
}

interface Item {
  label: string;
  value: number;
}

function pickItems(
  data: Record<string, number> | null | undefined,
  defs: { key: string; label: string }[],
  minPercent: number
): Item[] {
  if (!data) return [];
  return defs
    .map((d) => ({ label: d.label, value: Number(data[d.key] ?? 0) }))
    .filter((i) => i.value >= minPercent)
    .sort((a, b) => b.value - a.value);
}

const Pill = ({ label, value, tone }: { label: string; value: number; tone: 'body' | 'mob' | 'aesth' }) => {
  const cls =
    tone === 'body'
      ? 'bg-white/95 text-black border-white'
      : tone === 'mob'
        ? 'bg-blue-500/85 text-white border-blue-300/40'
        : 'bg-amber-400/85 text-black border-amber-200/50';
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border backdrop-blur-md ${cls}`}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span className="font-bold tabular-nums">{value}%</span>
    </span>
  );
};

/**
 * Floating overlay that lists ALL classification descriptions (body, mobility,
 * aesthetics) on top of a video. Collapsible to a single chip to avoid
 * obscuring the video; expands on tap to show full lists.
 */
export function AnalysisOverlay({
  body,
  aesthetic,
  mobility,
  positionClass = 'bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2',
  minPercent = 1,
}: AnalysisOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  const bodyItems = pickItems(
    body as Record<string, number>,
    BODY_GROUPS.flatMap((g) => g.items),
    minPercent
  );
  const mobItems = pickItems(
    mobility as Record<string, number>,
    MOBILITY_GROUPS.flatMap((g) => g.items),
    minPercent
  );
  const aesthItems = pickItems(aesthetic as Record<string, number>, AESTHETIC_ITEMS, minPercent);

  const total = bodyItems.length + mobItems.length + aesthItems.length;
  if (total === 0) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(true);
        }}
        className={`absolute ${positionClass} z-40 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/25 text-white px-3 py-1.5 text-xs font-medium shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:bg-black/75 active:scale-95 transition`}
        aria-label="Mostrar classificações"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Classificações ({total})
      </button>
    );
  }

  return (
    <div
      className={`absolute ${positionClass} left-2 right-2 z-40 max-w-3xl mx-auto`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
          <span className="inline-flex items-center gap-1.5 text-white text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Classificações
          </span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-white/70 hover:text-white inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md hover:bg-white/10"
          >
            Recolher
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="max-h-[40vh] overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
          {bodyItems.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
                Áreas trabalhadas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {bodyItems.map((i) => (
                  <Pill key={`b-${i.label}`} label={i.label} value={i.value} tone="body" />
                ))}
              </div>
            </div>
          )}
          {mobItems.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
                Mobilidade / flexibilidade
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mobItems.map((i) => (
                  <Pill key={`m-${i.label}`} label={i.label} value={i.value} tone="mob" />
                ))}
              </div>
            </div>
          )}
          {aesthItems.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
                Análise estética
              </p>
              <div className="flex flex-wrap gap-1.5">
                {aesthItems.map((i) => (
                  <Pill key={`a-${i.label}`} label={i.label} value={i.value} tone="aesth" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
