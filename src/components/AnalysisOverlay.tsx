import { useState } from 'react';
import { ChevronDown, Sparkles, Activity, Dumbbell, Flame, X } from 'lucide-react';
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
  /** Tailwind classes that fully control positioning of the floating chip + panel. */
  positionClass?: string;
  /** Hide entirely if no analysis data is available. */
  minPercent?: number;
  /**
   * Visual variant for the trigger:
   *  - 'floating' (default): absolutely-positioned orange pill with text + count.
   *  - 'inline-icon': compact icon-only round button rendered in normal flow,
   *    intended to sit inside another toolbar/nav. The expanded panel is still
   *    positioned via `positionClass`.
   */
  variant?: 'floating' | 'inline-icon';
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

type Tone = 'body' | 'mob' | 'aesth';

const TONE_STYLES: Record<Tone, { bar: string; text: string; dot: string }> = {
  body: {
    bar: 'bg-gradient-to-r from-emerald-400 to-emerald-300',
    text: 'text-emerald-200',
    dot: 'bg-emerald-400',
  },
  mob: {
    bar: 'bg-gradient-to-r from-sky-400 to-cyan-300',
    text: 'text-sky-200',
    dot: 'bg-sky-400',
  },
  aesth: {
    bar: 'bg-gradient-to-r from-amber-400 to-rose-300',
    text: 'text-amber-200',
    dot: 'bg-amber-400',
  },
};

const Row = ({ label, value, tone }: { label: string; value: number; tone: Tone }) => {
  const t = TONE_STYLES[tone];
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="flex-1 min-w-0 truncate text-[12px] text-white/90 font-medium">
        {label}
      </span>
      <div className="relative h-1.5 w-20 sm:w-28 rounded-full bg-white/10 overflow-hidden shrink-0">
        <div
          className={`absolute inset-y-0 left-0 ${t.bar} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`tabular-nums text-[11px] font-bold ${t.text} w-9 text-right shrink-0`}>
        {value}%
      </span>
    </div>
  );
};

const Section = ({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof Sparkles;
  title: string;
  items: Item[];
  tone: Tone;
}) => {
  if (items.length === 0) return null;
  const t = TONE_STYLES[tone];
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
        <Icon className={`h-3 w-3 ${t.text}`} strokeWidth={2.5} />
        <span className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
          {title}
        </span>
        <span className="text-[10px] text-white/40 font-medium">{items.length}</span>
      </div>
      <div className="space-y-0">
        {items.map((i) => (
          <Row key={`${tone}-${i.label}`} label={i.label} value={i.value} tone={tone} />
        ))}
      </div>
    </div>
  );
};

/**
 * Floating overlay that lists ALL classification descriptions (body, mobility,
 * aesthetics) on top of a video. Collapsible to a single chip to avoid
 * obscuring the video; expands on tap to show full lists with progress bars.
 */
export function AnalysisOverlay({
  body,
  aesthetic,
  mobility,
  positionClass = 'right-4 bottom-24 sm:bottom-28',
  minPercent = 1,
  variant = 'floating',
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
    if (variant === 'inline-icon') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          aria-label={`Mostrar análise (${total})`}
          className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 border border-orange-300/50 text-white inline-flex items-center justify-center shadow-[0_4px_20px_rgba(234,88,12,0.5)] hover:from-orange-500 hover:to-orange-500 active:scale-95 transition"
        >
          <Sparkles className="h-5 w-5" strokeWidth={2.5} />
        </button>
      );
    }
    return (
      <div className={`absolute ${positionClass} z-40 animate-fade-in`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 border border-orange-300/50 text-white pl-2.5 pr-3 py-1.5 text-xs font-semibold shadow-[0_4px_20px_rgba(234,88,12,0.5)] hover:from-orange-500 hover:to-orange-500 active:scale-95 transition"
          aria-label="Mostrar classificações"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>Análise</span>
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/25 text-[10px] font-bold tabular-nums">
            {total}
          </span>
        </button>
      </div>
    );
  }

  const panelPosition =
    variant === 'inline-icon'
      ? 'fixed left-3 right-3 bottom-24 sm:left-auto sm:right-4 sm:bottom-28 sm:w-[340px]'
      : `absolute ${positionClass} w-[min(calc(100vw-1.5rem),340px)]`;

  return (
    <div
      className={`${panelPosition} z-50 animate-scale-in`}
      onClick={(e) => e.stopPropagation()}
      style={{ transformOrigin: 'bottom right' }}
    >
      <div className="rounded-2xl bg-black/70 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-amber-500/10">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center h-6 w-6">
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/50 via-sky-400/50 to-amber-400/50 blur-md" />
              <Sparkles className="relative h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="text-white text-[13px] font-bold tracking-tight">Análise IA</p>
              <p className="text-white/50 text-[10px] font-medium">{total} classificações</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Fechar"
            className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white inline-flex items-center justify-center transition active:scale-90"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[55vh] overflow-y-auto px-3 py-2.5 space-y-3 scrollbar-thin">
          <Section icon={Dumbbell} title="Áreas trabalhadas" items={bodyItems} tone="body" />
          <Section icon={Activity} title="Mobilidade / flexibilidade" items={mobItems} tone="mob" />
          <Section icon={Flame} title="Análise estética" items={aesthItems} tone="aesth" />
        </div>
      </div>
    </div>
  );
}
