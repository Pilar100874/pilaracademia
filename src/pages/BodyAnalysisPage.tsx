import { useRef, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import {
  Activity,
  Upload,
  Loader2,
  Sparkles,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  Flame,
  Dumbbell,
  Heart,
  Apple,
  Target,
  ChevronRight,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ListChecks,
  Utensils,
  GitCompareArrows,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBodyAnalyses } from '@/hooks/useBodyAnalyses';
import { useProfile } from '@/hooks/useProfile';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { fileToBase64 } from '@/lib/analyzeFood';
import type { BodyAnalysisRow, BodyPlan } from '@/types/bodyAnalysis';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AIWorkoutDialog } from '@/components/AIWorkoutDialog';
import { MacroAdjustmentPanel } from '@/components/MacroAdjustmentPanel';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { useNavigate } from 'react-router-dom';

const goalLabels: Record<string, string> = {
  cutting: 'Cutting (perda de gordura)',
  recomposicao: 'Recomposição',
  hipertrofia: 'Hipertrofia',
  manutencao: 'Manutenção',
};

const profileLabels: Record<string, string> = {
  obeso: 'Obeso',
  sobrepeso_muscular: 'Sobrepeso com massa muscular',
  falso_magro: 'Falso magro',
  atletico: 'Atlético',
  baixa_massa_muscular: 'Baixa massa muscular',
  saudavel: 'Saudável',
};

function alertIcon(level: string) {
  if (level === 'critical') return <AlertTriangle className="h-4 w-4 text-red-600" />;
  if (level === 'warning') return <AlertCircle className="h-4 w-4 text-amber-600" />;
  return <Info className="h-4 w-4 text-sky-600" />;
}

function Stat({ label, value, unit }: { label: string; value: React.ReactNode; unit?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">
        {value}
        {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function DeltaPill({ label, value, unit, invert }: { label: string; value: number | undefined; unit?: string; invert?: boolean }) {
  if (value == null || isNaN(value)) return null;
  // invert=true -> lower is better (e.g. fat, weight in cutting)
  const isPositive = invert ? value < 0 : value > 0;
  const isZero = Math.abs(value) < 0.05;
  const Icon = isZero ? ArrowRight : value > 0 ? TrendingUp : TrendingDown;
  const color = isZero
    ? 'text-muted-foreground'
    : isPositive
      ? 'text-emerald-600'
      : 'text-amber-600';
  const sign = value > 0 ? '+' : '';
  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-base font-semibold flex items-center gap-1', color)}>
        <Icon className="h-3.5 w-3.5" />
        {sign}
        {value.toFixed(1)}
        {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function PlanView({
  row,
  onApplyMacros,
  onGenerateWorkout,
  onApplyWorkout,
  macrosApplied,
  isActive,
  applyingWorkout,
}: {
  row: BodyAnalysisRow;
  onApplyMacros: (plan: BodyPlan) => void;
  onGenerateWorkout: (plan: BodyPlan) => void;
  onApplyWorkout: (plan: BodyPlan) => void;
  macrosApplied: boolean;
  isActive: boolean;
  applyingWorkout: boolean;
}) {
  const plan = row.plan as BodyPlan;
  const e = plan.extracted || {};

  // Compute current week of the 12-week periodization (only for the active/most-recent plan)
  const startIso = row.measured_at || row.created_at;
  const daysSinceStart = startIso
    ? Math.max(0, differenceInDays(new Date(), parseISO(startIso)))
    : 0;
  const currentWeek = isActive
    ? Math.min(12, Math.max(1, Math.floor(daysSinceStart / 7) + 1))
    : 0;
  const currentPhaseIdx = isActive && plan.periodization?.length
    ? plan.periodization.findIndex((p) => {
        const m = (p.weeks || '').match(/(\d+)\s*[-–]\s*(\d+)/);
        if (!m) return false;
        return currentWeek >= parseInt(m[1], 10) && currentWeek <= parseInt(m[2], 10);
      })
    : -1;

  return (
    <div className="space-y-4">
      {/* Score + perfil */}
      <div className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Perfil metabólico</p>
            <p className="text-lg font-semibold leading-tight">{plan.profile_label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {profileLabels[plan.classification?.body_profile] || plan.classification?.body_profile}
              {' · '}
              músculo {plan.classification?.muscle_level}
              {' · '}
              {plan.classification?.metabolic_state?.replace('_', ' ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-muted-foreground">Score</p>
            <p className="text-4xl font-bold leading-none">{Math.round(plan.score)}</p>
            <p className="text-[10px] text-muted-foreground">/100</p>
          </div>
        </div>
      </div>

      {/* Evolução vs análise anterior */}
      {plan.delta && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            <span className="font-semibold">Evolução desde a última análise</span>
            {plan.delta.days_between != null && (
              <span className="text-xs text-muted-foreground">
                · {plan.delta.days_between} dias
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <DeltaPill label="Peso" value={plan.delta.weight_kg} unit="kg" invert />
            <DeltaPill label="Gordura" value={plan.delta.body_fat_pct} unit="%" invert />
            <DeltaPill label="Músculo" value={plan.delta.muscle_mass_kg} unit="kg" />
            <DeltaPill label="Score" value={plan.delta.score} />
          </div>
          {plan.delta.commentary && (
            <p className="text-sm leading-relaxed">{plan.delta.commentary}</p>
          )}
          {plan.delta.periodization_adjustment && (
            <div className="rounded-md border border-border bg-card p-3 text-sm">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Ajuste sugerido
              </p>
              {plan.delta.periodization_adjustment}
            </div>
          )}
        </div>
      )}

      {/* Narrativa estruturada (Situação → Plano → Próximos passos) */}
      {plan.narrative ? (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Situação atual
            </p>
            <p className="text-sm leading-relaxed">{plan.narrative.situation}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Plano
            </p>
            <p className="text-sm leading-relaxed">{plan.narrative.plan}</p>
          </div>
          {plan.narrative.next_steps?.length > 0 && (
            <div className="rounded-md border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <ListChecks className="h-3 w-3" />
                Próximos passos
              </p>
              <ul className="space-y-1.5">
                {plan.narrative.next_steps.map((s, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        plan.summary && (
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <p className="text-sm leading-relaxed whitespace-pre-line">{plan.summary}</p>
          </div>
        )
      )}

      {/* Alertas */}
      {plan.alerts && plan.alerts.length > 0 && (
        <div className="space-y-2">
          {plan.alerts.map((a, i) => (
            <div
              key={i}
              className={cn(
                'rounded-md border p-3 flex gap-3 items-start',
                a.level === 'critical' && 'border-red-500/40 bg-red-500/10',
                a.level === 'warning' && 'border-amber-500/40 bg-amber-500/10',
                a.level === 'info' && 'border-sky-500/40 bg-sky-500/10',
              )}
            >
              {alertIcon(a.level)}
              <p className="text-sm">{a.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Composição extraída */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Composição corporal</h3>
        <div className="grid grid-cols-2 gap-2">
          {e.weight_kg != null && <Stat label="Peso" value={e.weight_kg} unit="kg" />}
          {e.bmi != null && <Stat label="IMC" value={e.bmi.toFixed(1)} />}
          {e.body_fat_pct != null && <Stat label="% Gordura" value={e.body_fat_pct.toFixed(1)} unit="%" />}
          {e.fat_mass_kg != null && <Stat label="Massa gorda" value={e.fat_mass_kg} unit="kg" />}
          {e.muscle_mass_kg != null && <Stat label="Massa muscular" value={e.muscle_mass_kg} unit="kg" />}
          {e.skeletal_muscle_kg != null && <Stat label="Músculo esquelético" value={e.skeletal_muscle_kg} unit="kg" />}
          {e.body_water_kg != null && <Stat label="Água corporal" value={e.body_water_kg} unit="kg" />}
          {e.bone_mass_kg != null && <Stat label="Massa óssea" value={e.bone_mass_kg} unit="kg" />}
          {e.visceral_fat != null && <Stat label="Gordura visceral" value={e.visceral_fat} />}
          {e.bmr_kcal != null && <Stat label="TMB" value={Math.round(e.bmr_kcal)} unit="kcal" />}
        </div>
      </div>

      {/* Objetivo + calorias + macros */}
      <div className="rounded-md border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="font-semibold">Objetivo</span>
        </div>
        <p className="text-base">{goalLabels[plan.goal?.primary] || plan.goal?.primary}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {plan.goal?.target_weight_kg != null && (
            <span>
              Meta peso: <b className="text-foreground">{plan.goal.target_weight_kg} kg</b>
            </span>
          )}
          {plan.goal?.target_body_fat_pct != null && (
            <span>
              Meta gordura: <b className="text-foreground">{plan.goal.target_body_fat_pct}%</b>
            </span>
          )}
          {plan.goal?.timeframe_weeks != null && (
            <span>
              Prazo: <b className="text-foreground">{plan.goal.timeframe_weeks} sem</b>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <Stat label="TDEE" value={plan.calories?.tdee} unit="kcal" />
          <Stat label="Alvo diário" value={plan.calories?.target} unit="kcal" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Proteína" value={plan.macros?.protein_g} unit="g" />
          <Stat label="Carbo" value={plan.macros?.carbs_g} unit="g" />
          <Stat label="Gordura" value={plan.macros?.fat_g} unit="g" />
        </div>

        <Button
          size="sm"
          variant={macrosApplied ? 'outline' : 'default'}
          className="w-full"
          onClick={() => onApplyMacros(plan)}
          disabled={macrosApplied}
        >
          {macrosApplied ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Plano nutricional aplicado
            </>
          ) : (
            <>
              <Utensils className="h-4 w-4 mr-1.5" />
              Usar como minha meta diária
            </>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Aplica calorias e macros deste plano como meta oficial no dashboard de alimentação.
        </p>
      </div>

      {/* Treino + exercícios sugeridos */}
      <div className="rounded-md border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          <span className="font-semibold">Intenção de treino</span>
        </div>
        <p className="text-sm">
          <b>Foco:</b> {plan.training_intent?.focus}
        </p>
        <p className="text-sm">
          <b>Divisão:</b> {plan.training_intent?.split}
        </p>
        <p className="text-sm">
          <b>Frequência:</b> {plan.training_intent?.frequency_per_week}x/sem
          {plan.training_intent?.session_minutes ? ` · ${plan.training_intent.session_minutes} min` : ''}
          {plan.training_intent?.intensity ? ` · intensidade ${plan.training_intent.intensity}` : ''}
        </p>
        {plan.training_intent?.priority_muscle_groups && plan.training_intent.priority_muscle_groups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plan.training_intent.priority_muscle_groups.map((g) => (
              <span
                key={g}
                className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {g}
              </span>
            ))}
          </div>
        )}
        {plan.training_intent?.volume_note && (
          <p className="text-xs text-muted-foreground">{plan.training_intent.volume_note}</p>
        )}

        {plan.recommended_exercises && plan.recommended_exercises.length > 0 && (
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Exercícios sugeridos da sua biblioteca
            </p>
            <ul className="space-y-1.5">
              {plan.recommended_exercises.map((r) => (
                <li key={r.exercise_id} className="text-sm">
                  <span className="font-medium">{r.name}</span>
                  {(r.sets || r.reps) && (
                    <span className="text-xs text-muted-foreground ml-1.5">
                      {r.sets ? `${r.sets}×` : ''}
                      {r.reps || ''}
                    </span>
                  )}
                  {r.reason && <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button size="sm" onClick={() => onGenerateWorkout(plan)}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            Gerar treino com IA
          </Button>
          {plan.recommended_exercises && plan.recommended_exercises.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApplyWorkout(plan)}
              disabled={applyingWorkout}
            >
              {applyingWorkout ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Dumbbell className="h-4 w-4 mr-1.5" />
              )}
              Salvar como treino
            </Button>
          )}
        </div>
      </div>

      {/* Cardio */}
      {plan.cardio && (
        <div className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            <span className="font-semibold">Cardio & NEAT</span>
          </div>
          <p className="text-sm">
            {plan.cardio.type ? <b>{plan.cardio.type}</b> : null}
            {plan.cardio.sessions_per_week != null && ` · ${plan.cardio.sessions_per_week}x/sem`}
            {plan.cardio.minutes_per_session != null && ` · ${plan.cardio.minutes_per_session} min`}
          </p>
          {plan.cardio.daily_steps != null && (
            <p className="text-sm">
              Meta de passos: <b>{plan.cardio.daily_steps.toLocaleString('pt-BR')}/dia</b>
            </p>
          )}
        </div>
      )}

      {/* Regras de dieta */}
      {plan.diet_rules && plan.diet_rules.length > 0 && (
        <div className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Apple className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold">Regras alimentares</span>
          </div>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            {plan.diet_rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Periodização */}
      {plan.periodization && plan.periodization.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold">Periodização 12 semanas</h3>
            {isActive && (
              <span className="text-[11px] text-muted-foreground">
                Semana {currentWeek}/12
              </span>
            )}
          </div>
          {isActive && (
            <div className="mb-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(currentWeek / 12) * 100}%` }}
              />
            </div>
          )}
          <div className="space-y-2">
            {plan.periodization.map((p, i) => {
              const isCurrent = i === currentPhaseIdx;
              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-md border p-3 transition-colors',
                    isCurrent
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card',
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold flex items-center gap-2">
                      {p.phase}
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                          ATUAL
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Semanas {p.weeks}</p>
                  </div>
                  <p className="text-sm mt-1">{p.focus}</p>
                  <div className="text-xs text-muted-foreground mt-1 space-x-3">
                    {p.calories != null && <span>{p.calories} kcal</span>}
                    {p.training && <span>{p.training}</span>}
                    {p.cardio && <span>{p.cardio}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Projeção */}
      {plan.projection && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Projeção 30 / 60 / 90 dias</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['day_30', 'day_60', 'day_90'] as const).map((k, idx) => {
              const d = plan.projection![k];
              const lbl = ['30d', '60d', '90d'][idx];
              if (!d)
                return (
                  <div
                    key={k}
                    className="rounded-md border border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground"
                  >
                    {lbl}
                  </div>
                );
              return (
                <div key={k} className="rounded-md border border-border bg-card p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{lbl}</p>
                  {d.weight_kg != null && <p className="text-base font-semibold">{d.weight_kg} kg</p>}
                  {d.body_fat_pct != null && <p className="text-xs text-muted-foreground">{d.body_fat_pct}% gord.</p>}
                  {d.muscle_mass_kg != null && (
                    <p className="text-xs text-muted-foreground">{d.muscle_mass_kg} kg músc.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-ajuste de macros — aparece quando peso real diverge da projeção (≥14 dias) */}
      {isActive && (
        <MacroAdjustmentPanel
          plan={plan}
          startIso={startIso || row.created_at}
          daysSinceStart={daysSinceStart}
          analysisId={row.id}
        />
      )}

      <p className="text-[11px] text-muted-foreground italic px-1">
        Este plano é gerado automaticamente a partir do seu relatório e tem caráter informativo.
        Não substitui orientação médica.
      </p>
    </div>
  );
}

/** Side-by-side comparison of the two most recent analyses. */
function CompareDialog({
  rows,
  onClose,
}: {
  rows: BodyAnalysisRow[];
  onClose: () => void;
}) {
  const [a, setA] = useState<BodyAnalysisRow>(rows[1]);
  const [b, setB] = useState<BodyAnalysisRow>(rows[0]);

  const eA = a.extracted || {};
  const eB = b.extracted || {};
  const days = differenceInDays(parseISO(b.created_at), parseISO(a.created_at));

  const metrics: Array<{
    key: string;
    label: string;
    unit?: string;
    invert?: boolean;
    decimals?: number;
  }> = [
    { key: 'weight_kg', label: 'Peso', unit: 'kg', invert: true, decimals: 1 },
    { key: 'body_fat_pct', label: '% Gordura', unit: '%', invert: true, decimals: 1 },
    { key: 'fat_mass_kg', label: 'Massa gorda', unit: 'kg', invert: true, decimals: 1 },
    { key: 'muscle_mass_kg', label: 'Músculo', unit: 'kg', decimals: 1 },
    { key: 'visceral_fat', label: 'Visceral', invert: true, decimals: 0 },
    { key: 'body_water_kg', label: 'Água', unit: 'kg', decimals: 1 },
    { key: 'bmi', label: 'IMC', invert: true, decimals: 1 },
    { key: 'bmr_kcal', label: 'TMB', unit: 'kcal', decimals: 0 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-t-lg sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              Comparar análises
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Diferença de {Math.abs(days)} dias
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {rows.length > 2 && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] uppercase text-muted-foreground">Anterior</label>
                <select
                  className="w-full mt-1 rounded-md border border-border bg-card px-2 py-1.5 text-sm"
                  value={a.id}
                  onChange={(ev) => {
                    const r = rows.find((x) => x.id === ev.target.value);
                    if (r) setA(r);
                  }}
                >
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {format(parseISO(r.created_at), "d MMM yy", { locale: ptBR })} · {r.profile_label || '—'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-muted-foreground">Atual</label>
                <select
                  className="w-full mt-1 rounded-md border border-border bg-card px-2 py-1.5 text-sm"
                  value={b.id}
                  onChange={(ev) => {
                    const r = rows.find((x) => x.id === ev.target.value);
                    if (r) setB(r);
                  }}
                >
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {format(parseISO(r.created_at), "d MMM yy", { locale: ptBR })} · {r.profile_label || '—'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[a, b].map((r, idx) => (
              <div key={r.id} className="rounded-md border border-border bg-card p-3 space-y-2">
                <p className="text-[10px] uppercase text-muted-foreground">
                  {idx === 0 ? 'Anterior' : 'Atual'}
                </p>
                <p className="text-sm font-semibold leading-tight">{r.profile_label || '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(r.created_at), "d 'de' MMM yyyy", { locale: ptBR })}
                </p>
                {r.image_url && (
                  <img
                    src={r.image_url}
                    alt="Relatório"
                    className="w-full aspect-[3/4] object-cover rounded-md border border-border"
                    loading="lazy"
                  />
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">{r.score ?? '—'}</span>
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
              <span>Métrica</span>
              <span className="text-right">Anterior</span>
              <span className="text-right">Atual</span>
              <span className="text-right">Δ</span>
            </div>
            {metrics.map((m) => {
              const va = (eA as Record<string, number | null | undefined>)[m.key];
              const vb = (eB as Record<string, number | null | undefined>)[m.key];
              if (va == null && vb == null) return null;
              const diff = va != null && vb != null ? vb - va : null;
              const isZero = diff != null && Math.abs(diff) < 0.05;
              const isPositive = diff != null && (m.invert ? diff < 0 : diff > 0);
              const color =
                diff == null || isZero
                  ? 'text-muted-foreground'
                  : isPositive
                    ? 'text-emerald-600'
                    : 'text-amber-600';
              const dec = m.decimals ?? 1;
              return (
                <div
                  key={m.key}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-sm border-b border-border last:border-0"
                >
                  <span className="text-muted-foreground">
                    {m.label}
                    {m.unit && <span className="text-[10px] ml-1">({m.unit})</span>}
                  </span>
                  <span className="text-right font-mono">{va != null ? va.toFixed(dec) : '—'}</span>
                  <span className="text-right font-mono font-semibold">
                    {vb != null ? vb.toFixed(dec) : '—'}
                  </span>
                  <span className={cn('text-right font-mono font-semibold', color)}>
                    {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(dec)}` : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {b.plan?.delta?.commentary && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Comentário da IA
              </p>
              {b.plan.delta.commentary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BodyAnalysisPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { list, create, remove } = useBodyAnalyses();
  const { profile, applyNutritionOverride, clearNutritionOverride } = useProfile();
  const { allExercises } = useExerciseLibrary();
  const { createPlan, addExercise } = useWorkoutPlans();
  const navigate = useNavigate();
  const [applyingWorkout, setApplyingWorkout] = useState(false);

  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiName, setAiName] = useState<string>('');
  const [aiCount, setAiCount] = useState<number>(8);
  const [compareOpen, setCompareOpen] = useState(false);

  const selected = (list.data || []).find((r) => r.id === selectedId) || (list.data || [])[0];

  const macrosAppliedFromSelected =
    !!selected &&
    profile?.nutrition_override_source === `body_analysis:${selected.id}`;

  async function handleFile(file: File) {
    if (!user) {
      toast.error('Faça login para analisar relatórios');
      return;
    }
    setAnalyzing(true);
    try {
      const base64 = await fileToBase64(file);

      // Upload original
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('body-analysis-reports')
        .upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' });
      if (upErr) console.warn('upload failed', upErr);
      const { data: pub } = supabase.storage.from('body-analysis-reports').getPublicUrl(path);
      const imageUrl = upErr ? null : pub.publicUrl;

      // Build library payload (id + name only)
      const library = (allExercises || []).map((ex) => ({ id: ex.id, name: ex.name }));

      // Build "previous" for delta
      const prevRow = (list.data || [])[0]; // most recent existing row
      const previous = prevRow
        ? {
            measured_at: prevRow.measured_at || prevRow.created_at,
            extracted: prevRow.extracted,
            score: prevRow.score,
            days_since: prevRow.created_at
              ? differenceInDays(new Date(), parseISO(prevRow.created_at))
              : null,
          }
        : null;

      const { data, error } = await supabase.functions.invoke('analyze-bioimpedance', {
        body: { imageBase64: base64, library, previous },
      });
      if (error) throw error;
      if (!data?.success || !data?.data) {
        throw new Error(data?.error || 'Falha ao analisar relatório');
      }

      const created = await create.mutateAsync({ plan: data.data as BodyPlan, imageUrl });
      setSelectedId(created.id);
      toast.success('Análise pronta!');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao analisar relatório');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleApplyMacros(plan: BodyPlan) {
    if (!selected) return;
    try {
      await applyNutritionOverride({
        calories: plan.calories?.target ?? plan.calories?.tdee ?? 2000,
        protein: plan.macros?.protein_g ?? 150,
        carbs: plan.macros?.carbs_g ?? 250,
        fat: plan.macros?.fat_g ?? 65,
        fiber: plan.macros?.fiber_g,
        liquid_ml: plan.macros?.water_ml,
        source: `body_analysis:${selected.id}`,
      });
      toast.success('Plano nutricional aplicado como meta diária');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao aplicar plano nutricional');
    }
  }

  async function handleClearMacros() {
    try {
      await clearNutritionOverride();
      toast.success('Meta nutricional voltou ao cálculo padrão');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao restaurar meta');
    }
  }

  async function handleApplyWorkout(plan: BodyPlan) {
    const recs = plan.recommended_exercises || [];
    if (recs.length === 0) {
      toast.error('Nenhum exercício sugerido neste plano');
      return;
    }
    setApplyingWorkout(true);
    try {
      const ti = plan.training_intent;
      const planName = `${plan.profile_label || 'Plano'} – ${ti?.focus || 'IA'}`.slice(0, 60);
      // Default schedule: distribute frequency across the week starting Monday
      const freq = Math.max(1, Math.min(7, ti?.frequency_per_week || 3));
      const days = [1, 2, 3, 4, 5, 6, 0].slice(0, freq);
      const created = await createPlan.mutateAsync({ name: planName, days_of_week: days });
      // Persist exercises sequentially keeping order
      for (let i = 0; i < recs.length; i++) {
        const r = recs[i];
        await addExercise.mutateAsync({
          workout_plan_id: created.id,
          name: r.name,
          sets: r.sets ?? 3,
          reps: r.reps ?? 10,
          order_index: i,
          exercise_library_id: r.exercise_id || null,
        });
      }
      toast.success('Treino criado a partir do plano!');
      navigate('/workouts');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao criar treino');
    } finally {
      setApplyingWorkout(false);
    }
  }

  function handleGenerateWorkout(plan: BodyPlan) {
    const ti = plan.training_intent;
    const muscles = ti?.priority_muscle_groups?.length
      ? ` Foco nos grupos: ${ti.priority_muscle_groups.join(', ')}.`
      : '';
    const intensity = ti?.intensity ? ` Intensidade ${ti.intensity}.` : '';
    const split = ti?.split ? ` Divisão ${ti.split}.` : '';
    const recommended = plan.recommended_exercises?.length
      ? ` Considere priorizar: ${plan.recommended_exercises.map((r) => r.name).slice(0, 8).join(', ')}.`
      : '';
    setAiPrompt(
      `Treino para ${goalLabels[plan.goal?.primary] || plan.goal?.primary} (${plan.profile_label}). Foco: ${ti?.focus || 'geral'}.${split}${intensity}${muscles}${recommended}`,
    );
    setAiName(`Plano ${plan.profile_label || 'corporal'} – ${ti?.focus || 'IA'}`.slice(0, 60));
    setAiCount(plan.recommended_exercises?.length || 8);
    setAiDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Análise corporal
        </h1>
        <p className="text-xs text-muted-foreground">Bioimpedância · IA · Plano integrado</p>
      </header>

      <div className="px-4 py-4 space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />

        <div className="rounded-md border border-dashed border-border bg-muted/20 p-5 text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium">Envie a foto do seu relatório</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Fitdays, InBody, Tanita ou similar — a IA extrai os dados, monta seu plano e
            sugere exercícios da sua biblioteca.
          </p>
          <Button onClick={() => fileInputRef.current?.click()} disabled={analyzing} className="w-full">
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando relatório…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Enviar relatório
              </>
            )}
          </Button>
        </div>

        {/* Lembrete de re-análise mensal */}
        {(() => {
          const latest = (list.data || [])[0];
          if (!latest) return null;
          const refIso = latest.measured_at || latest.created_at;
          const days = differenceInDays(new Date(), parseISO(refIso));
          if (days < 30) return null;
          return (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
              <RefreshCw className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Hora de uma nova análise
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-100/70">
                  Sua última bioimpedância foi há {days} dias. Reanalise para ajustar o plano à sua evolução.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="h-8 text-xs shrink-0"
              >
                Reanalisar
              </Button>
            </div>
          );
        })()}

        {profile?.nutrition_override_source?.startsWith('body_analysis') && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2">
            <Utensils className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-emerald-900 dark:text-emerald-100">
                Plano nutricional ativo
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-100/70">
                Sua meta diária está vindo de uma análise corporal.
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={handleClearMacros} className="h-7 text-xs">
              Restaurar padrão
            </Button>
          </div>
        )}

        {/* Histórico */}
        {(list.data?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground px-1">Histórico</h2>
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2">
              {list.data!.map((r) => {
                const isSel = selected?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      'shrink-0 rounded-md border px-3 py-2 text-left min-w-[140px]',
                      isSel ? 'border-primary bg-primary/5' : 'border-border bg-card',
                    )}
                  >
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(r.created_at), "d MMM ''yy", { locale: ptBR })}
                    </p>
                    <p className="text-sm font-semibold truncate">{r.profile_label || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      Score {r.score ?? '—'} · {goalLabels[r.goal || ''] || r.goal || '—'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Plano selecionado */}
        {selected ? (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                Análise de {format(parseISO(selected.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <div className="flex items-center gap-1">
                {(list.data?.length ?? 0) >= 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCompareOpen(true)}
                    className="h-7 text-xs"
                  >
                    <GitCompareArrows className="h-3.5 w-3.5 mr-1" />
                    Comparar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs"
                  disabled={analyzing}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5 mr-1', analyzing && 'animate-spin')} />
                  Re-analisar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Excluir esta análise?')) remove.mutate(selected.id);
                  }}
                  className="text-muted-foreground h-7"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <PlanView
              row={selected}
              onApplyMacros={handleApplyMacros}
              onGenerateWorkout={handleGenerateWorkout}
              onApplyWorkout={handleApplyWorkout}
              macrosApplied={macrosAppliedFromSelected}
              isActive={selected.id === (list.data || [])[0]?.id}
              applyingWorkout={applyingWorkout}
            />
          </>
        ) : (
          !analyzing && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <Flame className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma análise ainda. Envie seu primeiro relatório.
            </div>
          )
        )}
      </div>

      {compareOpen && (list.data?.length ?? 0) >= 2 && (
        <CompareDialog
          rows={list.data!}
          onClose={() => setCompareOpen(false)}
        />
      )}

      <AIWorkoutDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        initialPrompt={aiPrompt}
        initialName={aiName}
        initialCount={aiCount}
      />

      <BottomNav />
    </div>
  );
}
