import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SmartAlert } from '@/hooks/useSmartAlerts';

const iconFor = (l: SmartAlert['level']) => {
  if (l === 'critical') return <AlertTriangle className="h-4 w-4 text-red-600" />;
  if (l === 'warning') return <AlertCircle className="h-4 w-4 text-amber-600" />;
  return <Info className="h-4 w-4 text-sky-600" />;
};

export function SmartAlertsCard({ alerts }: { alerts: SmartAlert[] }) {
  const navigate = useNavigate();
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((al) => {
        const inner = (
          <div className="rounded-md border border-border bg-card p-3 flex items-start gap-3 text-left w-full">
            <div className="mt-0.5">{iconFor(al.level)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{al.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{al.description}</p>
            </div>
            {al.action && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          </div>
        );
        return al.action ? (
          <button key={al.id} onClick={() => navigate(al.action!.route)} className="w-full">
            {inner}
          </button>
        ) : (
          <div key={al.id}>{inner}</div>
        );
      })}
    </div>
  );
}
