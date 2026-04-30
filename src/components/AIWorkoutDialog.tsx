import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AIWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const EXAMPLES = [
  'Sequência com foco em glúteos e flexibilidade para chegar no espacate',
  'Exercícios para pessoa com problema na lombar',
  'Treino de mobilidade de quadril e ombro para iniciante',
  'Foco em abdômen inferior e definição',
];

export function AIWorkoutDialog({ open, onOpenChange }: AIWorkoutDialogProps) {
  const { exercises } = useExerciseLibrary();
  const { createPlan, addExercise } = useWorkoutPlans();

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState('8');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);

  const reset = () => {
    setName('');
    setPrompt('');
    setCount('8');
    setSelectedDays([]);
  };

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const handleGenerate = async () => {
    const n = parseInt(count, 10);
    if (!name.trim()) return toast.error('Dê um nome para o treino');
    if (!prompt.trim() || prompt.trim().length < 5)
      return toast.error('Descreva o objetivo do treino');
    if (!n || n < 1) return toast.error('Quantidade inválida');
    if (!exercises.length)
      return toast.error('Sua biblioteca está vazia. Adicione exercícios antes.');

    setGenerating(true);
    try {
      // Compacta a biblioteca para enviar à IA.
      const library = exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        body: ex.body_analysis ?? null,
        aesthetic: ex.aesthetic_analysis ?? null,
        mobility: ex.mobility_analysis ?? null,
      }));

      const { data, error } = await supabase.functions.invoke('compose-workout-from-text', {
        body: { prompt: prompt.trim(), count: n, library },
      });

      if (error) {
        const msg = (data as { error?: string } | null)?.error || error.message;
        toast.error(msg || 'Erro ao gerar treino com IA');
        return;
      }

      const ids: string[] = Array.isArray(data?.exercise_ids) ? data.exercise_ids : [];
      if (!ids.length) {
        toast.error('A IA não conseguiu sugerir exercícios.');
        return;
      }

      const byId = new Map(exercises.map((ex) => [ex.id, ex] as const));
      const picked = ids.map((id) => byId.get(id)).filter(Boolean) as typeof exercises;

      if (!picked.length) {
        toast.error('Os exercícios sugeridos não foram encontrados na biblioteca.');
        return;
      }

      const plan = await createPlan.mutateAsync({
        name: name.trim(),
        days_of_week: selectedDays,
      });

      await Promise.all(
        picked.map((ex, idx) =>
          addExercise.mutateAsync({
            workout_plan_id: plan.id,
            name: ex.name,
            image_urls: ex.image_urls || [],
            sets: ex.default_sets || 3,
            reps: ex.default_reps || 12,
            order_index: idx,
            video_type: ex.video_type,
            video_url: ex.video_url,
            video_start_seconds: ex.video_start_seconds,
            video_end_seconds: ex.video_end_seconds,
            exercise_library_id: ex.id,
          })
        )
      );

      toast.success(`Treino criado com ${picked.length} exercício(s)!`);
      if (data?.rationale) {
        // Mostra a justificativa rapidamente como feedback adicional.
        setTimeout(() => toast.message('Sugestão da IA', { description: data.rationale }), 100);
      }
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar treino');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="max-w-md max-h-[90vh] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar treino com IA
          </DialogTitle>
          <DialogDescription>
            Descreva seu objetivo e a IA monta a sequência usando os exercícios da sua biblioteca.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ai-name">Nome do treino</Label>
              <Input
                id="ai-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Treino glúteos e flexibilidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Descreva o objetivo</Label>
              <Textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex.: Quero uma sequência com foco em glúteos e flexibilidade para chegar no espacate"
                rows={4}
                className="resize-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="text-[11px] px-2 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted text-muted-foreground transition-colors"
                  >
                    {ex.length > 38 ? ex.slice(0, 38) + '…' : ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-count">Quantidade de exercícios</Label>
              <Input
                id="ai-count"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
                placeholder="8"
              />
              <p className="text-[11px] text-muted-foreground">
                {exercises.length} exercício(s) disponíveis na sua biblioteca.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Dias da semana (opcional)</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`h-9 w-12 rounded-md border text-sm transition-colors ${
                      selectedDays.includes(idx)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-accent'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar treino
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
