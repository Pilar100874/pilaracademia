import { useBackgroundProgress } from '@/contexts/BackgroundProgressContext';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

/**
 * Barra fixa no topo que mostra o progresso (em %) das rotinas que rodam
 * em background — otimização de vídeos e análise por IA da biblioteca.
 * Cada job aparece como uma faixa empilhada (em ordem de criação).
 *
 * Visível somente na página da Biblioteca de Exercícios (/exercises) para
 * não poluir outras telas — o runner continua rodando em background.
 */
export function GlobalBackgroundProgressBar() {
  const { jobs } = useBackgroundProgress();
  const { pathname } = useLocation();
  if (jobs.length === 0) return null;
  if (!pathname.startsWith('/exercises')) return null;


  return (
    <div className="fixed top-0 inset-x-0 z-[60] pointer-events-none">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 pt-2 space-y-1.5">
        {jobs.map((job) => {
          const total = Math.max(job.total, 1);
          const pct = Math.min(100, Math.round((job.done / total) * 100));
          return (
            <div
              key={job.id}
              className="pointer-events-auto rounded-md border border-border bg-background/95 backdrop-blur shadow-sm px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium flex items-center gap-1.5 min-w-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span className="truncate">{job.label}</span>
                  {job.current && (
                    <span className="text-muted-foreground truncate hidden sm:inline">
                      — {job.current}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {job.done}/{job.total} · {pct}%
                </span>
              </div>
              <Progress value={pct} className="h-1.5 mt-1.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
