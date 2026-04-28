import React from 'react';
import { AgentExecution, AGENT_DEPENDENCIES, getUnmetDependencies } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Loader2, CheckCircle2, XCircle, Zap, Lock, ArrowRight, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentInfo {
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface Props {
  executions: AgentExecution[];
  onExecuteAgent: (agentType: string) => void;
  onExecuteAll: (dependencyMap?: Record<string, string[]>) => void;
  runningAgents: Set<string>;
  isPipelineRunning: boolean;
  agentOrder: string[];
  agentInfo: Record<string, AgentInfo>;
  dependencyMap?: Record<string, string[]>;
}

export function StrategyTimeline({ executions, onExecuteAgent, onExecuteAll, runningAgents, isPipelineRunning, agentOrder, agentInfo, dependencyMap }: Props) {
  const executionMap = new Map<string, AgentExecution>();
  executions.forEach(e => {
    const existing = executionMap.get(e.agent_type);
    if (!existing || new Date(e.created_at) > new Date(existing.created_at)) {
      executionMap.set(e.agent_type, e);
    }
  });

  const completedAgents = new Set<string>();
  executionMap.forEach((exec, key) => {
    if (exec.status === 'completed') completedAgents.add(key);
  });

  const hasAnyRunning = runningAgents.size > 0;
  const allCompleted = agentOrder.every(k => completedAgents.has(k));

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Execute All Button */}
        <Button
          onClick={() => onExecuteAll(dependencyMap)}
          disabled={isPipelineRunning}
          size="sm"
          className="w-full"
          variant={allCompleted ? 'outline' : 'default'}
        >
          {hasAnyRunning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          {hasAnyRunning
            ? `Executando ${runningAgents.size} agente(s)...`
            : allCompleted
              ? 'Reexecutar Todos'
              : `Executar Todos (${agentOrder.length}) em Sequência`
          }
        </Button>

        {/* Agent Cards */}
        <div className="space-y-2">
          {agentOrder.map((agentKey, index) => {
            const info = agentInfo[agentKey] || { name: agentKey, icon: '🤖', color: '#888', description: '' };
            const execution = executionMap.get(agentKey);
            const isRunning = runningAgents.has(agentKey);
            const isCompleted = execution?.status === 'completed';
            const isFailed = execution?.status === 'failed';

            const resolvedDeps = dependencyMap || AGENT_DEPENDENCIES;
            const deps = resolvedDeps[agentKey] ?? [];
            const unmetDeps = getUnmetDependencies(agentKey, completedAgents, dependencyMap);
            const isBlocked = unmetDeps.length > 0;

            return (
              <Card
                key={agentKey}
                className={cn(
                  'transition-all',
                  isRunning && 'border-primary/50 shadow-sm shadow-primary/10',
                  isCompleted && 'border-primary/30',
                  isFailed && 'border-destructive/30',
                  isBlocked && !isRunning && !isCompleted && !isFailed && 'opacity-70'
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                        isCompleted ? 'bg-primary/10 text-primary' :
                        isFailed ? 'bg-destructive/10 text-destructive' :
                        isRunning ? 'bg-primary/10 text-primary' :
                        isBlocked ? 'bg-muted text-muted-foreground' :
                        'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> :
                       isFailed ? <XCircle className="h-4 w-4" /> :
                       isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> :
                       isBlocked ? <Lock className="h-4 w-4" /> :
                       index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{info.icon}</span>
                        <span className="font-medium text-sm">{info.name}</span>
                        {execution?.duration_ms && (
                          <span className="text-xs text-muted-foreground">
                            {(execution.duration_ms / 1000).toFixed(1)}s
                          </span>
                        )}
                        {!Object.keys(AGENT_DEPENDENCIES).includes(agentKey) && (
                          <Badge variant="secondary" className="text-[10px]">Custom</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                      {isFailed && execution?.error_message && (
                        <p className="text-xs text-destructive mt-1 truncate">{execution.error_message}</p>
                      )}
                    </div>

                    {isBlocked ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="shrink-0 opacity-50"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              <span className="ml-1 text-xs">Bloqueado</span>
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[220px]">
                          <p className="text-xs font-medium mb-1">Dependências não concluídas:</p>
                          <div className="space-y-0.5">
                            {unmetDeps.map(dep => {
                              const depInfo = agentInfo[dep] || { name: dep, icon: '🤖' };
                              return (
                                <p key={dep} className="text-xs text-muted-foreground">
                                  {depInfo.icon} {depInfo.name}
                                </p>
                              );
                            })}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        variant={isCompleted ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => onExecuteAgent(agentKey)}
                        disabled={isRunning || isPipelineRunning}
                        className="shrink-0"
                      >
                        {isRunning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1 text-xs">
                          {isRunning ? 'Rodando...' : isCompleted ? 'Reexecutar' : isFailed ? 'Tentar Novamente' : 'Executar'}
                        </span>
                      </Button>
                    )}
                  </div>

                  {/* Dependency badges */}
                  {deps.length > 0 && (
                    <div className="mt-2 ml-11 flex items-center gap-1 flex-wrap">
                      <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-[10px] text-muted-foreground mr-1">Depende de:</span>
                      {deps.map(dep => {
                        const depInfo = agentInfo[dep] || { name: dep, icon: '🤖' };
                        const depCompleted = completedAgents.has(dep);
                        return (
                          <Badge
                            key={dep}
                            variant={depCompleted ? 'default' : 'secondary'}
                            className={cn(
                              'text-[10px] px-1.5 py-0 h-4 gap-0.5',
                              depCompleted ? 'bg-primary/15 text-primary border-primary/20' : 'text-muted-foreground'
                            )}
                          >
                            {depCompleted && <CheckCircle2 className="h-2.5 w-2.5" />}
                            {depInfo.icon} {depInfo.name.split(' ')[0]}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
