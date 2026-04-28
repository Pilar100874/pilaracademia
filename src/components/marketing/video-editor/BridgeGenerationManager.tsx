import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, Maximize2, X, Check, Film, Wand2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TimelineClip } from './types';
import { motion, AnimatePresence } from 'framer-motion';

export interface BridgeGenerationTask {
  id: string;
  status: 'generating' | 'done' | 'error';
  progress: number; // 0-100
  model: string;
  prompt: string;
  duration: number;
  videoUrl?: string;
  error?: string;
  clipAName: string;
  clipBName: string;
  startedAt: number;
  minimized: boolean;
}

interface BridgeGenerationManagerProps {
  tasks: BridgeGenerationTask[];
  onMaximize: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
  onInsert: (taskId: string) => void;
}

export const BridgeGenerationManager: React.FC<BridgeGenerationManagerProps> = ({
  tasks, onMaximize, onDismiss, onInsert
}) => {
  const minimizedTasks = tasks.filter(t => t.minimized);
  
  // Force re-render every second to update elapsed time
  const [, setTick] = useState(0);
  useEffect(() => {
    if (minimizedTasks.some(t => t.status === 'generating')) {
      const interval = setInterval(() => setTick(n => n + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [minimizedTasks.length, minimizedTasks.some(t => t.status === 'generating')]);

  if (minimizedTasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
      <AnimatePresence>
        {minimizedTasks.map(task => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`rounded-xl border shadow-lg backdrop-blur-sm p-3 min-w-[280px] ${
              task.status === 'done'
                ? 'bg-success/10 border-success/40'
                : task.status === 'error'
                ? 'bg-destructive/10 border-destructive/40'
                : 'bg-background/95 border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {task.status === 'generating' && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              )}
              {task.status === 'done' && (
                <div className="relative shrink-0">
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-success rounded-full animate-ping" />
                </div>
              )}
              {task.status === 'error' && (
                <X className="h-3.5 w-3.5 text-destructive shrink-0" />
              )}
              <span className="text-[11px] font-medium truncate flex-1">
                {task.status === 'done' ? '✅ Transição pronta!' : task.status === 'error' ? '❌ Erro' : 'Gerando transição...'}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${task.status === 'done' ? 'animate-pulse' : ''}`}
                  onClick={() => onMaximize(task.id)}
                  title="Maximizar"
                >
                  <Maximize2 className={`h-3 w-3 ${task.status === 'done' ? 'text-success animate-bounce' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onDismiss(task.id)}
                  title="Fechar"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground truncate mb-1.5">
              {task.clipAName} → {task.clipBName} • {task.model.split('/').pop()}
            </div>

            {task.status === 'generating' && (
              <div className="space-y-1">
                <Progress value={task.progress} className="h-1.5" />
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(task.progress)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round((Date.now() - task.startedAt) / 1000)}s
                  </span>
                </div>
              </div>
            )}

            {task.status === 'done' && (
              <Button
                size="sm"
                variant="success"
                className="w-full h-7 text-[11px] gap-1 mt-1"
                onClick={() => onInsert(task.id)}
              >
                <Film className="h-3 w-3" />
                Inserir na Timeline
              </Button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook to manage background generations
export function useBridgeGenerations() {
  const [tasks, setTasks] = useState<BridgeGenerationTask[]>([]);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const progressIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const updateTask = useCallback((id: string, updates: Partial<BridgeGenerationTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const startGeneration = useCallback(async (params: {
    frameA: string;
    frameB: string;
    prompt: string;
    model: string;
    duration: number;
    clipAName: string;
    clipBName: string;
    minimized?: boolean;
  }): Promise<string> => {
    // Limit to 1 simultaneous generation
    const activeCount = tasksRef.current.filter(t => t.status === 'generating').length;
    if (activeCount >= 1) {
      toast.error('Aguarde a geração atual finalizar antes de iniciar outra.');
      return '';
    }

    const taskId = `bridge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const controller = new AbortController();
    abortControllers.current.set(taskId, controller);

    const task: BridgeGenerationTask = {
      id: taskId,
      status: 'generating',
      progress: 0,
      model: params.model,
      prompt: params.prompt,
      duration: params.duration,
      clipAName: params.clipAName,
      clipBName: params.clipBName,
      startedAt: Date.now(),
      minimized: params.minimized || false,
    };
    setTasks(prev => [...prev, task]);

    const signal = controller.signal;
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) {
      updateTask(taskId, { status: 'error', error: 'Estabelecimento não encontrado' });
      return taskId;
    }

    // Start progress simulation
    const isApiframe = params.model.startsWith('apiframe/');
    const expectedDurationMs = isApiframe ? 5 * 60 * 1000 : 2 * 60 * 1000;
    const progressInterval = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId || t.status !== 'generating') return t;
        const elapsed = Date.now() - t.startedAt;
        // Asymptotic progress: approaches 95% but never reaches 100%
        const p = Math.min(95, (elapsed / expectedDurationMs) * 90);
        return { ...t, progress: p };
      }));
    }, 500);
    progressIntervals.current.set(taskId, progressInterval);

    try {
      // Upload frames
      const uploadFrame = async (dataUrl: string, label: string): Promise<string> => {
        const resp = await fetch(dataUrl);
        const blob = await resp.blob();
        const fileName = `bridge/${Date.now()}_${label}.jpg`;
        const path = `${estabId}/${fileName}`;
        const { error } = await supabase.storage.from('marketing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('marketing-images').getPublicUrl(path);
        return urlData.publicUrl;
      };

      updateTask(taskId, { progress: 5 });
      const [frameAUrl, frameBUrl] = await Promise.all([
        uploadFrame(params.frameA, 'frame_start'),
        uploadFrame(params.frameB, 'frame_end'),
      ]);
      updateTask(taskId, { progress: 10 });

      const fullPrompt = `IMAGE-TO-VIDEO TRANSITION: You MUST start this video from Image 1 (the starting frame) and smoothly transition to end at Image 2 (the ending frame).

START FROM THIS EXACT IMAGE (Image 1): The video's first frame must visually match this image exactly.
END AT THIS EXACT IMAGE (Image 2): The video's last frame must visually match this image exactly.

TRANSITION DIRECTION: ${params.prompt.trim()}

CRITICAL: The generated video must begin looking identical to Image 1 and gradually transform/transition to look identical to Image 2 by the end. This is a bridge/transition between two scenes.`;

      const requestParams = {
        model: params.model,
        prompt: fullPrompt,
        imageUrls: [frameAUrl, frameBUrl],
        imageRoles: ['STARTING FRAME', 'ENDING FRAME'],
        aspectRatio: '16:9',
        duration: params.duration,
        estabelecimentoId: estabId,
        withAudio: false,
        withMusic: false,
        bridgeMode: true,
      };

      if (!isApiframe) {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: 'generate_video', params: requestParams }),
          signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errData.error || `Erro ${response.status}`);
        }

        const data = await response.json();
        const result = data.result;
        if (result?.error) throw new Error(result.error);
        if (!result?.videoUrl) throw new Error('Nenhuma URL de vídeo retornada');

        clearInterval(progressInterval);
        progressIntervals.current.delete(taskId);
        updateTask(taskId, { status: 'done', progress: 100, videoUrl: result.videoUrl });
        toast.success(`🎬 Transição "${params.clipAName} → ${params.clipBName}" finalizada!`);
        return taskId;
      }

      // Apiframe polling flow
      const startResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: 'start_apiframe_video', params: requestParams }),
        signal,
      });

      if (!startResp.ok) {
        const errData = await startResp.json().catch(() => ({ error: `HTTP ${startResp.status}` }));
        throw new Error(errData.error || `Erro ${startResp.status}`);
      }

      const startData = await startResp.json();
      const started = startData.result;
      if (started?.error) throw new Error(started.error);

      if (started?.videoUrl) {
        clearInterval(progressInterval);
        progressIntervals.current.delete(taskId);
        updateTask(taskId, { status: 'done', progress: 100, videoUrl: started.videoUrl });
        toast.success(`🎬 Transição "${params.clipAName} → ${params.clipBName}" finalizada!`);
        return taskId;
      }

      if (!started?.taskId) throw new Error('Nenhuma tarefa de vídeo foi iniciada');

      for (let attempt = 0; attempt < 120; attempt += 1) {
        if (signal.aborted) throw new DOMException('Geração cancelada', 'AbortError');

        // Update progress based on polling attempt
        const pollingProgress = Math.min(95, 10 + (attempt / 120) * 85);
        updateTask(taskId, { progress: pollingProgress });

        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Geração cancelada', 'AbortError')); }, { once: true });
        });

        const pollResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'fetch_apiframe_video',
            params: { estabelecimentoId: estabId, taskId: started.taskId },
          }),
          signal,
        });

        if (!pollResp.ok) {
          const errData = await pollResp.json().catch(() => ({ error: `HTTP ${pollResp.status}` }));
          throw new Error(errData.error || `Erro ${pollResp.status}`);
        }

        const pollData = await pollResp.json();
        const pollResult = pollData.result;
        if (pollResult?.error) throw new Error(pollResult.error);

        if (pollResult?.done && pollResult?.videoUrl) {
          clearInterval(progressInterval);
          progressIntervals.current.delete(taskId);
          updateTask(taskId, { status: 'done', progress: 100, videoUrl: pollResult.videoUrl });
          toast.success(`🎬 Transição "${params.clipAName} → ${params.clipBName}" finalizada!`);
          return taskId;
        }
      }

      throw new Error('Timeout: a geração demorou mais de 10 minutos.');
    } catch (err: any) {
      clearInterval(progressInterval);
      progressIntervals.current.delete(taskId);
      if (err?.name === 'AbortError') {
        updateTask(taskId, { status: 'error', error: 'Cancelado' });
      } else {
        const msg = err?.message || 'Erro desconhecido';
        updateTask(taskId, { status: 'error', error: msg });
        toast.error('Erro na transição: ' + msg.substring(0, 120));
      }
    } finally {
      abortControllers.current.delete(taskId);
    }
    return taskId;
  }, [updateTask]);

  const cancelTask = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) controller.abort();
    const interval = progressIntervals.current.get(id);
    if (interval) clearInterval(interval);
    progressIntervals.current.delete(id);
  }, []);

  const dismissTask = useCallback((id: string) => {
    cancelTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, [cancelTask]);

  const minimizeTask = useCallback((id: string) => {
    updateTask(id, { minimized: true });
  }, [updateTask]);

  const maximizeTask = useCallback((id: string) => {
    updateTask(id, { minimized: false });
  }, [updateTask]);

  return { tasks, startGeneration, cancelTask, dismissTask, minimizeTask, maximizeTask, updateTask };
}

export default BridgeGenerationManager;
