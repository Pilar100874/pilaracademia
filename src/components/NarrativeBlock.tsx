import { useState } from 'react';
import { ListChecks, CheckCircle2, Sparkles, Loader2, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BodyPlanNarrative } from '@/types/bodyAnalysis';
import { sanitizeFitnessText } from '@/lib/goalLabels';

export function NarrativeBlock({ narrative }: { narrative: BodyPlanNarrative }) {
  const [simple, setSimple] = useState<BodyPlanNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSimple, setShowSimple] = useState(false);

  const toggle = async () => {
    if (showSimple) { setShowSimple(false); return; }
    if (simple) { setShowSimple(true); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('simplify-narrative', {
        body: { situation: narrative.situation, plan: narrative.plan, next_steps: narrative.next_steps },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSimple((data as any).narrative);
      setShowSimple(true);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao simplificar');
    } finally {
      setLoading(false);
    }
  };

  const n = showSimple && simple ? simple : narrative;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={toggle} disabled={loading} className="gap-1.5 h-7 text-xs">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : showSimple ? <Sparkles className="h-3 w-3" /> : <Baby className="h-3 w-3" />}
          {showSimple ? 'Versão técnica' : 'Explicar simples'}
        </Button>
      </div>
      <div className="rounded-md border border-border bg-card p-4">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Situação atual</p>
        <p className="text-sm leading-relaxed">{n.situation}</p>
      </div>
      <div className="rounded-md border border-border bg-card p-4">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Plano</p>
        <p className="text-sm leading-relaxed">{n.plan}</p>
      </div>
      {n.next_steps?.length > 0 && (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <ListChecks className="h-3 w-3" /> Próximos passos
          </p>
          <ul className="space-y-1.5">
            {n.next_steps.map((s, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
