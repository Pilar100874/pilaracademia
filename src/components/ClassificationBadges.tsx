import { useMemo } from 'react';
import { Activity, Dumbbell, Flame } from 'lucide-react';
import {
  BODY_GROUPS,
  AESTHETIC_ITEMS,
  MOBILITY_GROUPS,
  type BodyAnalysis,
  type AestheticAnalysis,
  type MobilityAnalysis,
} from '@/lib/exerciseAnalysis';

interface ClassificationBadgesProps {
  body?: BodyAnalysis | Record<string, number> | null;
  mobility?: MobilityAnalysis | Record<string, number> | null;
  aesthetic?: AestheticAnalysis | Record<string, number> | null;
  /** How many items to show per dimension. Default 2 — keeps cards compact. */
  perDimension?: number;
  /** Minimum % to consider. */
  minPercent?: number;
  /** Render a label header before each row. */
  showLabels?: boolean;
  className?: string;
}

interface Item {
  label: string;
  value: number;
}

function pickItems(
  data: Record<string, number> | null | undefined,
  defs: { key: string; label: string }[],
  minPercent: number,
  perDimension: number
): Item[] {
  if (!data) return [];
  return defs
    .map((d) => ({ label: d.label, value: Number(data[d.key] ?? 0) }))
    .filter((i) => i.value >= minPercent)
    .sort((a, b) => b.value - a.value)
    .slice(0, perDimension);
}

const TONES = {
  body: {
    icon: Dumbbell,
    label: 'Foco',
    chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  mob: {
    icon: Activity,
    label: 'Mob.',
    chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    dot: 'bg-sky-500',
  },
  aesth: {
    icon: Flame,
    label: 'Estética',
    chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    dot: 'bg-amber-500',
  },
} as const;

type ToneKey = keyof typeof TONES;

/**
 * Compact, color-coded classification chips for cards.
 * Renders one row per dimension (body, mobility, aesthetic) when present.
 */
export function ClassificationBadges({
  body,
  mobility,
  aesthetic,
  perDimension = 2,
  minPercent = 1,
  showLabels = true,
  className,
}: ClassificationBadgesProps) {
  const rows = useMemo(() => {
    const r: { tone: ToneKey; items: Item[] }[] = [];
    const b = pickItems(body as Record<string, number>, BODY_GROUPS.flatMap((g) => g.items), minPercent, perDimension);
    const m = pickItems(mobility as Record<string, number>, MOBILITY_GROUPS.flatMap((g) => g.items), minPercent, perDimension);
    const a = pickItems(aesthetic as Record<string, number>, AESTHETIC_ITEMS, minPercent, perDimension);
    if (b.length) r.push({ tone: 'body', items: b });
    if (m.length) r.push({ tone: 'mob', items: m });
    if (a.length) r.push({ tone: 'aesth', items: a });
    return r;
  }, [body, mobility, aesthetic, perDimension, minPercent]);

  if (rows.length === 0) return null;

  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      {rows.map(({ tone, items }) => {
        const t = TONES[tone];
        const Icon = t.icon;
        return (
          <div key={tone} className="flex items-center gap-1 flex-wrap">
            {showLabels && (
              <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mr-0.5">
                <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                {t.label}
              </span>
            )}
            {items.map((i) => (
              <span
                key={`${tone}-${i.label}`}
                title={`${i.label} • ${i.value}%`}
                className={`inline-flex items-center gap-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full border ${t.chip}`}
              >
                <span className="truncate max-w-[90px]">{i.label}</span>
                <span className="font-bold tabular-nums">{i.value}%</span>
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
