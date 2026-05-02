import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ListSkeletonProps {
  rows?: number;
  className?: string;
  /** Show a small title bar above the list */
  withHeader?: boolean;
}

/**
 * Skeleton padrão de lista do app: cards com avatar + 2 linhas de texto.
 * Substitui spinners centrais em telas que carregam coleções.
 */
export function ListSkeleton({ rows = 4, className, withHeader = false }: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {withHeader && <Skeleton className="h-5 w-32" />}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border bg-card p-4"
        >
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton compacto para cards de métrica (Dashboard). */
export function MetricsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-4 space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
