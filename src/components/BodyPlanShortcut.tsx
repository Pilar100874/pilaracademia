import { ChevronRight, Activity, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentBodyPlan } from '@/hooks/useCurrentBodyPlan';

/**
 * Compact dashboard shortcut shown when the user has at least one body analysis.
 * Displays current week / 12 of the periodization plus the plan focus.
 * If there are no analyses, renders a discreet CTA inviting the user to create one.
 */
export function BodyPlanShortcut() {
  const navigate = useNavigate();
  const info = useCurrentBodyPlan();

  if (!info) {
    return (
      <button
        onClick={() => navigate('/body-analysis')}
        className="w-full rounded-md border border-dashed border-border bg-muted/20 p-3 text-left flex items-center gap-3 hover:bg-muted/40 transition-colors"
      >
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Análise corporal por IA</p>
          <p className="text-xs text-muted-foreground">
            Envie sua bioimpedância e gere plano completo
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    );
  }

  const { plan, currentWeek, totalWeeks, currentPhase, row } = info;
  const progressPct = (currentWeek / totalWeeks) * 100;

  return (
    <button
      onClick={() => navigate('/body-analysis')}
      className="w-full rounded-md border border-border bg-card p-3 text-left hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold truncate">
              {currentPhase?.phase || plan.profile_label || 'Plano ativo'}
            </p>
            <p className="text-[11px] text-muted-foreground shrink-0">
              Semana {currentWeek}/{totalWeeks}
            </p>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {currentPhase?.focus || plan.training_intent?.focus || '—'}
            {row.score != null && (
              <span className="ml-1.5 text-foreground/70">· score {row.score}</span>
            )}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </button>
  );
}
