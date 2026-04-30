import { useState, useRef } from 'react';
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
import { FieldError } from '@/components/FieldError';
import { useFieldError, validateRequired } from '@/lib/formValidation';

import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useExerciseCategories } from '@/hooks/useExerciseCategories';
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
  const { allExercises: exercises, globalExercises, exercises: personalOnly } = useExerciseLibrary();
  const { categories } = useExerciseCategories();
  const { createPlan, addExercise } = useWorkoutPlans();

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState('8');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [source, setSource] = useState<'all' | 'mine' | 'global'>('all');
  const [generating, setGenerating] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const countRef = useRef<HTMLInputElement>(null);
  const { errorOf, setError, clearError, clearIf } = useFieldError();

  const reset = () => {
    setName('');
    setPrompt('');
    setCount('8');
    setSelectedDays([]);
    setSelectedCategoryIds([]);
    setSource('all');
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Sort: parents first (alpha), then their children indented
  const sortedCategories = (() => {
    const parents = categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
    const result: { id: string; name: string; isChild: boolean; parentName?: string }[] = [];
    for (const p of parents) {
      result.push({ id: p.id, name: p.name, isChild: false });
      const children = categories
        .filter((c) => c.parent_id === p.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const c of children) {
        result.push({ id: c.id, name: c.name, isChild: true, parentName: p.name });
      }
    }
    // orphan children (parent deleted)
    const orphans = categories.filter(
      (c) => c.parent_id && !parents.find((p) => p.id === c.parent_id)
    );
    for (const o of orphans) result.push({ id: o.id, name: o.name, isChild: false });
    return result;
  })();

  // Filter by source (mine / global / all)
  const sourceFiltered =
    source === 'mine'
      ? personalOnly
      : source === 'global'
        ? globalExercises
        : exercises;

  // Filter exercises by selected categories (any match)
  const filteredExercises =
    selectedCategoryIds.length === 0
      ? sourceFiltered
      : sourceFiltered.filter((ex) =>
          (ex.category_ids || []).some((id) => selectedCategoryIds.includes(id))
        );


  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const handleGenerate = async () => {
    const n = parseInt(count, 10);
    const first = validateRequired([
      { key: 'name', ref: nameRef, valid: !!name.trim(), message: 'Dê um nome para o treino' },
      { key: 'prompt', ref: promptRef, valid: !!prompt.trim() && prompt.trim().length >= 5, message: 'Descreva o objetivo do treino (mín. 5 caracteres)' },
      { key: 'count', ref: countRef, valid: !!n && n >= 1, message: 'Informe uma quantidade válida' },
    ]);
    if (first) {
      setError(first.key, first.message);
      return;
    }
    clearError();
    if (!filteredExercises.length)
      return toast.error(
        selectedCategoryIds.length
          ? 'Nenhum exercício na biblioteca para as categorias selecionadas.'
          : 'Sua biblioteca está vazia. Adicione exercícios antes.'
      );

    setGenerating(true);
    try {
      // Compacta a biblioteca para enviar à IA.
      const library = filteredExercises.map((ex) => ({
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
        className="max-w-md w-[calc(100vw-1rem)] max-h-[92vh] sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            Gerar treino com IA
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Descreva seu objetivo — a IA monta a sequência usando os exercícios da sua biblioteca.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="ai-name" className="text-xs font-medium">Nome do treino</Label>
              <Input
                id="ai-name"
                ref={nameRef}
                value={name}
                onChange={(e) => { setName(e.target.value); clearIf('name'); }}
                placeholder="Ex.: Treino glúteos e flexibilidade"
                aria-invalid={!!errorOf('name')}
              />
              <FieldError message={errorOf('name')} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Objetivo do treino
                </Label>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                  {selectedCategoryIds.length > 0
                    ? `${filteredExercises.length}/${exercises.length} filtrados`
                    : `${exercises.length} na biblioteca`}
                </span>
              </div>

              <div className="rounded-md border border-border/70 divide-y divide-border/60 bg-muted/20">
                <section className="p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Descreva
                  </p>
                  <Textarea
                    id="ai-prompt"
                    ref={promptRef}
                    value={prompt}
                    onChange={(e) => { setPrompt(e.target.value); clearIf('prompt'); }}
                    placeholder="Ex.: Quero uma sequência com foco em glúteos e flexibilidade para chegar no espacate"
                    rows={4}
                    className="resize-none text-sm leading-relaxed bg-background"
                    aria-invalid={!!errorOf('prompt')}
                  />
                  <FieldError message={errorOf('prompt')} />
                </section>

                <section className="p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Sugestões
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setPrompt(ex)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-border/70 bg-background hover:bg-accent hover:border-primary/40 text-foreground/80 transition-colors"
                      >
                        {ex.length > 42 ? ex.slice(0, 42) + '…' : ex}
                      </button>
                    ))}
                  </div>
                </section>

                {sortedCategories.length > 0 && (
                  <section className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Categorias (opcional)
                      </p>
                      {selectedCategoryIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryIds([])}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Restringe a IA aos exercícios dessas categorias (ex.: equipamentos disponíveis).
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {sortedCategories.map((c) => {
                        const active = selectedCategoryIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCategory(c.id)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                              active
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border/70 hover:bg-accent hover:border-primary/40 text-foreground/80'
                            } ${c.isChild ? 'ml-3' : ''}`}
                            title={c.isChild && c.parentName ? `${c.parentName} › ${c.name}` : c.name}
                          >
                            {c.isChild ? `↳ ${c.name}` : c.name}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-count" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Quantidade de exercícios
                    </Label>
                    <Input
                      id="ai-count"
                      ref={countRef}
                      inputMode="numeric"
                      value={count}
                      onChange={(e) => { setCount(e.target.value.replace(/\D/g, '')); clearIf('count'); }}
                      placeholder="8"
                      className="bg-background"
                      aria-invalid={!!errorOf('count')}
                    />
                    <FieldError message={errorOf('count')} />
                  </div>
                </section>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Dias da semana (opcional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`h-9 flex-1 min-w-[40px] rounded-md border text-sm font-medium transition-colors ${
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
        </div>

        <DialogFooter className="gap-2 sm:gap-2 px-5 py-3 border-t border-border/60 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={generating} className="flex-1 sm:flex-none">
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
