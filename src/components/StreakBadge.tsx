import { Flame } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { cn } from '@/lib/utils';

export function StreakBadge({ className }: { className?: string }) {
  const { data } = useStreak();
  const streak = data?.streak ?? 0;
  if (streak < 2) return null;

  const tone =
    streak >= 30 ? 'text-rose-500 bg-rose-500/10' :
    streak >= 7 ? 'text-orange-500 bg-orange-500/10' :
    'text-amber-600 bg-amber-500/10';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        tone,
        className,
      )}
      title={`${streak} dias seguidos registrando alimentação`}
    >
      <Flame className="h-3.5 w-3.5" />
      <span className="num-display">{streak}</span>
      <span className="opacity-80">dias</span>
    </div>
  );
}
