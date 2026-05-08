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
  /** Adds N pending units to a job (creates if missing). */
  addWork: (id: string, label: string, count: number, current?: string) => void;
  /** Increments `done` by 1 (and optionally updates `current`). Removes job when finished. */
  tick: (id: string, current?: string) => void;
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

  const addWork = useCallback((id: string, label: string, count: number, current?: string) => {
    if (count <= 0) return;
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === id);
      if (idx === -1) {
        return [...prev, { id, label, done: 0, total: count, current }];
      }
      const next = prev.slice();
      const existing = next[idx];
      next[idx] = {
        ...existing,
        label,
        total: existing.total + count,
        current: current ?? existing.current,
      };
      return next;
    });
  }, []);

  const tick = useCallback((id: string, current?: string) => {
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === id);
      if (idx === -1) return prev;
      const job = prev[idx];
      const done = job.done + 1;
      if (done >= job.total) {
        return prev.filter((j) => j.id !== id);
      }
      const next = prev.slice();
      next[idx] = { ...job, done, current: current ?? job.current };
      return next;
    });
  }, []);

  return (
    <BackgroundProgressContext.Provider value={{ jobs, upsert, remove, addWork, tick }}>
      {children}
    </BackgroundProgressContext.Provider>
  );
}
