import { useEffect, useState } from 'react';
import { Calendar, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Checkin {
  id: string;
  period_start: string;
  period_end: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  adherence_score: number;
}

export function WeeklyCheckinCard() {
  const { user } = useAuth();
  const [latest, setLatest] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('weekly_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setLatest(data as any);
  };

  useEffect(() => { load(); }, [user]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-weekly-checkin', { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setLatest((data as any).checkin);
      setExpanded(true);
      toast.success('Check-in semanal pronto');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao gerar check-in');
    } finally {
      setLoading(false);
    }
  };

  // Show "generate" CTA if no checkin yet OR latest is older than 7 days
  const isStale = !latest || (Date.now() - new Date(latest.period_end).getTime()) > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 text-left">
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Calendar className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Check-in semanal</p>
          <p className="text-xs text-muted-foreground truncate">
            {latest
              ? `${format(parseISO(latest.period_start), 'd MMM', { locale: ptBR })} – ${format(parseISO(latest.period_end), 'd MMM', { locale: ptBR })} · score ${latest.adherence_score}`
              : 'Ainda não gerado'}
          </p>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {latest && (
            <>
              <p className="text-sm leading-relaxed">{latest.summary}</p>
              {latest.highlights?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Destaques</p>
                  <ul className="text-xs space-y-0.5">
                    {latest.highlights.map((h, i) => <li key={i}>• {h}</li>)}
                  </ul>
                </div>
              )}
              {latest.recommendations?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Recomendações</p>
                  <ul className="text-xs space-y-0.5">
                    {latest.recommendations.map((h, i) => <li key={i}>• {h}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
          {isStale && (
            <Button size="sm" onClick={generate} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {latest ? 'Gerar novo check-in' : 'Gerar check-in da semana'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
