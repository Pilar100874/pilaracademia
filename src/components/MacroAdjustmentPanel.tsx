import { useState, useMemo } from 'react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWeightHistory } from '@/hooks/useWeightHistory';
import { useProfile } from '@/hooks/useProfile';
import { differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { BodyPlan } from '@/types/bodyAnalysis';
import { sanitizeFitnessText } from '@/lib/goalLabels';
import { useBloodExams } from '@/hooks/useBloodExams';
import { buildBloodExamContext } from '@/lib/bloodExamContext';

interface Props {
  plan: BodyPlan;
  startIso: string;
  daysSinceStart: number;
  analysisId: string;
}

interface Adjustment {
  new_calories: number;
  new_protein: number;
  new_carbs: number;
  new_fat: number;
  delta_kcal: number;
  reasoning: string;
  severity: 'none' | 'minor' | 'major';
}

/**
 * Shows macro auto-adjustment when:
 * - The active plan is at least 14 days old
 * - There's at least one weight entry after the plan start
 * - The current weight diverges from the linear projection
 */
export function MacroAdjustmentPanel({ plan, startIso, daysSinceStart, analysisId }: Props) {
  const { entries: weightEntries } = useWeightHistory();
  const { applyNutritionOverride } = useProfile();
  const [loading, setLoading] = useState(false);
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
  const [applied, setApplied] = useState(false);

  const analysis = useMemo(() => {
    const start = parseISO(startIso);
    // weight at start: prefer the entry closest to start date, else extracted from plan
    const startWeight =
      weightEntries.find((w) => Math.abs(differenceInDays(parseISO(w.recorded_at), start)) <= 3)
        ?.weight_kg ??
      plan.extracted?.weight_kg ??
      null;

    const latest = weightEntries[weightEntries.length - 1];
    const currentWeight = latest ? Number(latest.weight_kg) : null;

    if (!startWeight || !currentWeight || daysSinceStart < 14) return null;

    // Linear projection: interpolate plan.projection.day_30 / 60 / 90
    const proj = plan.projection;
    let expectedAtDay: number | null = null;
    if (proj?.day_90?.weight_kg) {
      const d90 = proj.day_90.weight_kg;
      const slope = (d90 - startWeight) / 90;
      expectedAtDay = startWeight + slope * daysSinceStart;
    } else if (proj?.day_30?.weight_kg) {
      const d30 = proj.day_30.weight_kg;
      const slope = (d30 - startWeight) / 30;
      expectedAtDay = startWeight + slope * daysSinceStart;
    }
    if (expectedAtDay == null) return null;

    const divergence = currentWeight - expectedAtDay;
    return { startWeight, currentWeight, expectedAtDay, divergence };
  }, [weightEntries, startIso, daysSinceStart, plan.projection, plan.extracted]);

  if (!analysis) return null;

  // Only show when divergence is meaningful (>0.7 kg)
  if (Math.abs(analysis.divergence) < 0.7) return null;

  const askAi = async () => {
    setLoading(true);
    setAdjustment(null);
    try {
      const { data, error } = await supabase.functions.invoke('adjust-macros', {
        body: {
          current_goals: {
            calories: plan.calories?.target ?? plan.calories?.tdee ?? 2000,
            protein: plan.macros?.protein_g ?? 150,
            carbs: plan.macros?.carbs_g ?? 250,
            fat: plan.macros?.fat_g ?? 65,
          },
          plan_goal: plan.goal?.primary,
          start_weight_kg: analysis.startWeight,
          current_weight_kg: analysis.currentWeight,
          expected_weight_kg: Math.round(analysis.expectedAtDay * 10) / 10,
          days_elapsed: daysSinceStart,
          blood_exam_context: buildBloodExamContext(bloodExamsQ.data) || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAdjustment((data as any).adjustment as Adjustment);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao recalcular macros');
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!adjustment) return;
    try {
      await applyNutritionOverride({
        calories: adjustment.new_calories,
        protein: adjustment.new_protein,
        carbs: adjustment.new_carbs,
        fat: adjustment.new_fat,
        liquid_ml: plan.macros?.water_ml,
        source: `body_analysis_adjusted:${analysisId}`,
      });
      setApplied(true);
      toast.success('Macros ajustados aplicados');
    } catch {
      toast.error('Falha ao aplicar ajuste');
    }
  };

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Seu progresso divergiu do plano</p>
          <p className="text-xs text-muted-foreground">
            Esperado: {analysis.expectedAtDay.toFixed(1)} kg · Atual: {analysis.currentWeight.toFixed(1)} kg ·{' '}
            {analysis.divergence > 0 ? '+' : ''}
            {analysis.divergence.toFixed(1)} kg em {daysSinceStart} dias
          </p>
        </div>
      </div>

      {!adjustment && (
        <Button size="sm" onClick={askAi} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Recalcular macros com IA
        </Button>
      )}

      {adjustment && (
        <div className="space-y-2">
          <div className="rounded-md border border-border bg-card p-2 text-xs">
            <p className="font-medium">{sanitizeFitnessText(adjustment.reasoning)}</p>
            <div className="mt-2 grid grid-cols-4 gap-1 text-center">
              <Cell label="kcal" v={adjustment.new_calories} delta={adjustment.delta_kcal} />
              <Cell label="P (g)" v={adjustment.new_protein} />
              <Cell label="C (g)" v={adjustment.new_carbs} />
              <Cell label="G (g)" v={adjustment.new_fat} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdjustment(null)} className="flex-1">
              Descartar
            </Button>
            <Button size="sm" onClick={apply} disabled={applied} className="flex-1 gap-1.5">
              {applied ? 'Aplicado' : <>Aplicar <ArrowRight className="h-3.5 w-3.5" /></>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({ label, v, delta }: { label: string; v: number; delta?: number }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{Math.round(v)}</p>
      {delta != null && (
        <p className={`text-[10px] ${delta < 0 ? 'text-rose-600' : delta > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {delta > 0 ? '+' : ''}
          {Math.round(delta)}
        </p>
      )}
    </div>
  );
}
