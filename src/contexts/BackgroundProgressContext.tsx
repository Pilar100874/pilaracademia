import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export interface ProgressJob {
  id: string;
  /** Short label, e.g. "Otimizando vídeos", "Análise por IA" */
  label: string;
  done: number;
  total: number;
  /** Optional sub-text (current item name) */
  current?: string;
}

interface Ctx {
  jobs: ProgressJob[];
  upsert: (job: ProgressJob) => void;
  remove: (id: string) => void;
}

const BackgroundProgressContext = createContext<Ctx | null>(null);

export function useBackgroundProgress() {
  const ctx = useContext(BackgroundProgressContext);
  if (!ctx) throw new Error('useBackgroundProgress fora do provider');
  return ctx;
}

export function BackgroundProgressProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<ProgressJob[]>([]);

  const upsert = useCallback((job: ProgressJob) => {
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === job.id);
      if (idx === -1) return [...prev, job];
      const next = prev.slice();
      next[idx] = job;
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  return (
    <BackgroundProgressContext.Provider value={{ jobs, upsert, remove }}>
      {children}
    </BackgroundProgressContext.Provider>
  );
}
