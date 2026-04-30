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
  /** Render the colored category label/icon before each row. Default true. */
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
    chipText: 'text-emerald-700 dark:text-emerald-300',
    chipBg: 'bg-emerald-500/10',
    chipBorder: 'border-emerald-500/20',
    bar: 'bg-emerald-500',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  mob: {
    icon: Activity,
    label: 'Mobilidade',
    chipText: 'text-sky-700 dark:text-sky-300',
    chipBg: 'bg-sky-500/10',
    chipBorder: 'border-sky-500/20',
    bar: 'bg-sky-500',
    accent: 'text-sky-600 dark:text-sky-400',
  },
  aesth: {
    icon: Flame,
    label: 'Estética',
    chipText: 'text-amber-700 dark:text-amber-300',
    chipBg: 'bg-amber-500/10',
    chipBorder: 'border-amber-500/20',
    bar: 'bg-amber-500',
    accent: 'text-amber-600 dark:text-amber-400',
  },
} as const;

type ToneKey = keyof typeof TONES;

/**
 * Compact, color-coded classification rows for cards.
 *
 * Layout: one row per dimension. Each row has a small colored icon + label
 * on the left, then chips with the top items. Each chip shows the label and
 * a tiny percentage bar (instead of dumping numbers as text), making the
 * layout calm and scannable even with multiple items.
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
    <div className={`space-y-1.5 min-w-0 ${className ?? ''}`}>
      {rows.map(({ tone, items }) => {
        const t = TONES[tone];
        const Icon = t.icon;
        return (
          <div key={tone} className="flex items-start gap-1.5 min-w-0 w-full">
            {showLabels && (
              <div
                className={`shrink-0 inline-flex items-center gap-1 ${t.accent}`}
                aria-label={t.label}
                title={t.label}
              >
                <Icon className="h-3 w-3" strokeWidth={2.5} />
              </div>
            )}
            <div className="flex flex-wrap gap-1 min-w-0 flex-1">
              {items.map((i) => {
                const pct = Math.min(100, Math.max(0, i.value));
                return (
                  <span
                    key={`${tone}-${i.label}`}
                    title={`${i.label} • ${i.value}%`}
                    className={`inline-flex items-center gap-1.5 text-[10px] leading-none pl-1.5 pr-1 py-0.5 rounded-md border min-w-0 max-w-full ${t.chipBg} ${t.chipBorder} ${t.chipText}`}
                  >
                    <span className="truncate min-w-0 font-medium">{i.label}</span>
                    <span className="relative h-1 w-6 rounded-full bg-foreground/10 overflow-hidden shrink-0">
                      <span
                        className={`absolute inset-y-0 left-0 ${t.bar} rounded-full`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
