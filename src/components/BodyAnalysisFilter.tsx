import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, X } from 'lucide-react';
import {
  BODY_GROUPS,
  AESTHETIC_ITEMS,
  MOBILITY_GROUPS,
  BodyAnalysisKey,
  AestheticAnalysisKey,
  MobilityAnalysisKey,
  BodyAnalysis,
  AestheticAnalysis,
  MobilityAnalysis,
} from '@/lib/exerciseAnalysis';

export interface BodyAnalysisFilterValue {
  bodyKeys: BodyAnalysisKey[];
  aestheticKeys: AestheticAnalysisKey[];
  mobilityKeys: MobilityAnalysisKey[];
  minPercent: number;
}

export const EMPTY_BODY_FILTER: BodyAnalysisFilterValue = {
  bodyKeys: [],
  aestheticKeys: [],
  mobilityKeys: [],
  minPercent: 20,
};

export function bodyFilterIsActive(v: BodyAnalysisFilterValue) {
  return v.bodyKeys.length > 0 || v.aestheticKeys.length > 0 || v.mobilityKeys.length > 0;
}

export function bodyFilterMatches(
  body: BodyAnalysis | null | undefined,
  aesthetic: AestheticAnalysis | null | undefined,
  mobility: MobilityAnalysis | null | undefined,
  filter: BodyAnalysisFilterValue
): boolean {
  if (!bodyFilterIsActive(filter)) return true;
  const min = filter.minPercent;
  for (const k of filter.bodyKeys) {
    const v = body?.[k];
    if (typeof v === 'number' && v >= min) return true;
  }
  for (const k of filter.aestheticKeys) {
    const v = aesthetic?.[k];
    if (typeof v === 'number' && v >= min) return true;
  }
  for (const k of filter.mobilityKeys) {
    const v = mobility?.[k];
    if (typeof v === 'number' && v >= min) return true;
  }
  return false;
}

interface Props {
  value: BodyAnalysisFilterValue;
  onChange: (v: BodyAnalysisFilterValue) => void;
  /** Compact icon-only trigger */
  compact?: boolean;
}

export function BodyAnalysisFilter({ value, onChange, compact }: Props) {
  const totalSelected = value.bodyKeys.length + value.aestheticKeys.length + value.mobilityKeys.length;
  const active = totalSelected > 0;

  const toggleBody = (k: BodyAnalysisKey) => {
    const set = new Set(value.bodyKeys);
    if (set.has(k)) set.delete(k);
    else set.add(k);
    onChange({ ...value, bodyKeys: Array.from(set) });
  };
  const toggleAesthetic = (k: AestheticAnalysisKey) => {
    const set = new Set(value.aestheticKeys);
    if (set.has(k)) set.delete(k);
    else set.add(k);
    onChange({ ...value, aestheticKeys: Array.from(set) });
  };
  const toggleMobility = (k: MobilityAnalysisKey) => {
    const set = new Set(value.mobilityKeys);
    if (set.has(k)) set.delete(k);
    else set.add(k);
    onChange({ ...value, mobilityKeys: Array.from(set) });
  };

  const clear = () => onChange(EMPTY_BODY_FILTER);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={active ? 'default' : 'outline'}
          size={compact ? 'icon' : 'sm'}
          className={compact ? 'h-9 w-9 shrink-0' : 'shrink-0'}
          title="Filtrar por classificação"
        >
          <Sparkles className="h-4 w-4" />
          {!compact && (
            <span className="ml-1.5">
              Classificação{active ? ` (${totalSelected})` : ''}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Filtrar por classificação</span>
          {active && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={clear}>
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        <div className="px-3 py-2 border-b space-y-1.5">
          <Label className="text-xs">% mínimo (intensidade)</Label>
          <Input
            inputMode="numeric"
            value={String(value.minPercent)}
            onChange={(e) => {
              const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
              onChange({ ...value, minPercent: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 });
            }}
            className="h-8 text-sm"
          />
        </div>
        <ScrollArea className="h-[360px]">
          <div className="p-3 space-y-3">
            {BODY_GROUPS.map((g) => (
              <div key={g.group} className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {g.group}
                </p>
                {g.items.map((it) => (
                  <label key={it.key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={value.bodyKeys.includes(it.key)}
                      onCheckedChange={() => toggleBody(it.key)}
                    />
                    <span className="text-sm">{it.label}</span>
                  </label>
                ))}
              </div>
            ))}
            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Análise estética
              </p>
              {AESTHETIC_ITEMS.map((it) => (
                <label key={it.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={value.aestheticKeys.includes(it.key)}
                    onCheckedChange={() => toggleAesthetic(it.key)}
                  />
                  <span className="text-sm">{it.label}</span>
                </label>
              ))}
            </div>
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Mobilidade e flexibilidade
              </p>
              {MOBILITY_GROUPS.map((mg) => (
                <div key={mg.group} className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground/80">{mg.group}</p>
                  {mg.items.map((it) => (
                    <label key={it.key} className="flex items-center gap-2 cursor-pointer pl-1">
                      <Checkbox
                        checked={value.mobilityKeys.includes(it.key)}
                        onCheckedChange={() => toggleMobility(it.key)}
                      />
                      <span className="text-sm">{it.label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
