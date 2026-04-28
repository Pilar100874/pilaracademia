import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExecutionLogEntry } from './useStudioExecution';
import { 
  CheckCircle2, XCircle, Loader2, Clock, ChevronDown, ChevronUp, 
  SkipForward, Circle, X, Terminal
} from 'lucide-react';

interface ExecutionLogPanelProps {
  log: ExecutionLogEntry[];
  isExecuting: boolean;
  currentNodeId: string | null;
  onClear: () => void;
}

const statusConfig = {
  pending: { icon: Circle, color: 'text-muted-foreground/50', bg: 'bg-muted/30', label: 'Aguardando' },
  running: { icon: Loader2, color: 'text-sky-400', bg: 'bg-sky-500/10', label: 'Processando' },
  success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Concluído' },
  error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Erro' },
  skipped: { icon: SkipForward, color: 'text-amber-500/60', bg: 'bg-amber-500/5', label: 'Pulado' },
};

function formatElapsed(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ElapsedTimer({ startedAt }: { startedAt?: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) return null;
  return (
    <span className="text-[10px] text-sky-400 font-mono tabular-nums">
      {formatElapsed(elapsed)}
    </span>
  );
}

const ExecutionLogPanel: React.FC<ExecutionLogPanelProps> = ({ log, isExecuting, currentNodeId, onClear }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (log.length === 0) return null;

  const completedCount = log.filter(e => e.status === 'success').length;
  const errorCount = log.filter(e => e.status === 'error').length;
  const totalCount = log.filter(e => e.status !== 'skipped').length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-3 right-3 left-3 sm:left-auto z-50 sm:w-80 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Execução</span>
          {isExecuting && (
            <span className="flex items-center gap-1 text-[10px] text-sky-400 font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              Em andamento
            </span>
          )}
          {!isExecuting && errorCount > 0 && (
            <span className="text-[10px] text-destructive font-medium">
              {errorCount} erro(s)
            </span>
          )}
          {!isExecuting && errorCount === 0 && completedCount > 0 && (
            <span className="text-[10px] text-emerald-500 font-medium">
              Concluído
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {!isExecuting && (
            <button
              onClick={onClear}
              className="p-1 rounded hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/50">
        <motion.div
          className={`h-full transition-all duration-300 ${errorCount > 0 ? 'bg-destructive' : 'bg-emerald-500'}`}
          style={{ width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      {/* Log entries */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-h-64 overflow-y-auto"
          >
            <div className="p-1.5 space-y-0.5">
              {log.map((entry, idx) => {
                const config = statusConfig[entry.status];
                const Icon = config.icon;
                const isRunning = entry.status === 'running';

                return (
                  <motion.div
                    key={entry.nodeId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${config.bg} ${
                      isRunning ? 'ring-1 ring-sky-500/30' : ''
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color} ${isRunning ? 'animate-spin' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${entry.status === 'skipped' ? 'text-muted-foreground/50' : 'text-foreground/80'}`}>
                        {entry.nodeLabel}
                      </p>
                      {entry.errorMessage && (
                        <p className="text-[10px] text-destructive truncate mt-0.5">
                          {entry.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {isRunning && <ElapsedTimer startedAt={entry.startedAt} />}
                      {entry.status === 'success' && entry.elapsedMs && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-500/70 font-mono">
                          <Clock className="h-2.5 w-2.5" />
                          {formatElapsed(entry.elapsedMs)}
                        </span>
                      )}
                      {entry.status === 'error' && entry.elapsedMs && (
                        <span className="flex items-center gap-0.5 text-[10px] text-destructive/70 font-mono">
                          <Clock className="h-2.5 w-2.5" />
                          {formatElapsed(entry.elapsedMs)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Summary */}
            {!isExecuting && completedCount > 0 && (
              <div className="px-3 py-2 border-t border-border/30 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>{completedCount}/{totalCount} nós executados</span>
                <span>
                  {formatElapsed(
                    log.reduce((sum, e) => sum + (e.elapsedMs || 0), 0)
                  )} total
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ExecutionLogPanel;
