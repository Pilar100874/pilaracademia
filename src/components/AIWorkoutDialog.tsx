import { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/FieldError';
import { useFieldError, validateRequired } from '@/lib/formValidation';
import { WizardStepper, WizardFooter } from '@/components/WizardShell';

import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useExerciseCategories } from '@/hooks/useExerciseCategories';
import { ExtrasPicker } from '@/components/ExtrasPicker';
import { useExerciseExtras } from '@/hooks/useExerciseExtras';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { useBloodExams } from '@/hooks/useBloodExams';
import { useCurrentBodyPlan } from '@/hooks/useCurrentBodyPlan';
import { buildBloodExamHealthContext } from '@/lib/bloodExamContext';
import { Sparkles, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AIWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  initialName?: string;
  initialCount?: number;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const EXAMPLES = [
  'Sequência com foco em glúteos e flexibilidade para chegar no espacate',
  'Exercícios para pessoa com problema na lombar',
  'Treino de mobilidade de quadril e ombro para iniciante',
  'Foco em abdômen inferior e definição',
];

const STEPS = [
  { key: 'objective', label: 'Objetivo' },
  { key: 'categories', label: 'Categorias' },
  { key: 'schedule', label: 'Agenda' },
];

export function AIWorkoutDialog({ open, onOpenChange, initialPrompt, initialName, initialCount }: AIWorkoutDialogProps) {
  const { allExercises: exercises, globalExercises, exercises: personalOnly } = useExerciseLibrary();
  const { categories } = useExerciseCategories();
  const { createPlan, addExercise } = useWorkoutPlans();
  const { extras } = useExerciseExtras();
  const { list: bloodExamsQ } = useBloodExams();
  const planInfo = useCurrentBodyPlan();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName || '');
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [count, setCount] = useState(initialCount ? String(initialCount) : '8');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [allowRepeat, setAllowRepeat] = useState(true);
  const [varyCategories, setVaryCategories] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [filterNoExtras, setFilterNoExtras] = useState(false);
  const [extraCounts, setExtraCounts] = useState<Record<string, string>>({});
  const [source, setSource] = useState<'all' | 'mine' | 'global'>('all');
  const [useBodyPlan, setUseBodyPlan] = useState(false);
  const [generating, setGenerating] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const countRef = useRef<HTMLInputElement>(null);
  const { errorOf, setError, clearError, clearIf } = useFieldError();

  const lastSeed = useRef<string>('');
  if (open) {
    const seed = `${initialPrompt || ''}|${initialName || ''}|${initialCount || ''}`;
    if (lastSeed.current !== seed) {
      lastSeed.current = seed;
      if (initialPrompt && prompt !== initialPrompt) setPrompt(initialPrompt);
      if (initialName && name !== initialName) setName(initialName);
      if (initialCount && count !== String(initialCount)) setCount(String(initialCount));
    }
  } else if (lastSeed.current) {
    lastSeed.current = '';
  }

  const reset = () => {
    setStep(0);
    setName('');
    setPrompt('');
    setCount('8');
    setSelectedDays([]);
    setAllowRepeat(true);
    setVaryCategories(false);
    setSelectedCategoryIds([]);
    setSelectedExtraIds([]);
    setFilterNoExtras(false);
    setExtraCounts({});
    setSource('all');
    setUseBodyPlan(false);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const sortedCategories = useMemo(() => {
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
    return result;
  }, [categories]);

  const sourceFiltered =
    source === 'mine' ? personalOnly : source === 'global' ? globalExercises : exercises;

  const filteredExercises = sourceFiltered.filter((ex) => {
    const matchesCat =
      selectedCategoryIds.length === 0 ||
      (ex.category_ids || []).some((id) => selectedCategoryIds.includes(id));
    const matchesNoExtras = !filterNoExtras || !ex.extra_ids || ex.extra_ids.length === 0;
    return matchesCat && matchesNoExtras;
  });

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      const n = parseInt(count, 10);
      const first = validateRequired([
        { key: 'name', ref: nameRef, valid: !!name.trim(), message: 'Dê um nome para o treino' },
        ...(useBodyPlan ? [] : [{ key: 'prompt', ref: promptRef, valid: !!prompt.trim() && prompt.trim().length >= 5, message: 'Descreva o objetivo (mín. 5 caracteres)' }]),
        { key: 'count', ref: countRef, valid: !!n && n >= 1, message: 'Quantidade inválida' },
      ]);
      if (first) { setError(first.key, first.message); return false; }
      clearError();
      return true;
    }
    if (s === 1) {
      if (varyCategories && selectedCategoryIds.length < 2) {
        toast.error('Selecione pelo menos 2 categorias para variar entre os dias.');
        return false;
      }
      if (!filteredExercises.length) {
        toast.error(selectedCategoryIds.length
          ? 'Nenhum exercício na biblioteca para as categorias selecionadas.'
          : 'Sua biblioteca está vazia.');
        return false;
      }
      const totalQuota = selectedExtraIds.reduce(
        (sum, id) => sum + (parseInt(extraCounts[id] || '0', 10) || 0),
        0
      );
      const nVal = parseInt(count, 10) || 0;
      if (totalQuota > nVal) {
        toast.error('Soma de equipamentos ultrapassa a quantidade de exercícios.');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleGenerate = async () => {
    if (!validateStep(0) || !validateStep(1)) { setStep(0); return; }
    const n = parseInt(count, 10);

    if (varyCategories && selectedDays.length > 1 && selectedCategoryIds.length < 2) {
      toast.error('Variar categorias entre dias exige pelo menos 2 categorias.');
      return;
    }

    setGenerating(true);
    try {
      const healthContext = buildBloodExamHealthContext(bloodExamsQ.data) || undefined;
      let bodyPlanContext: string | undefined;
      if (useBodyPlan && planInfo?.plan) {
        const p = planInfo.plan;
        const ti = p.training_intent;
        const lines: string[] = ['INTENÇÃO DE TREINO (da análise corporal):'];
        if (p.goal?.primary) lines.push(`- Objetivo principal: ${p.goal.primary}`);
        if (p.classification?.body_profile) lines.push(`- Perfil corporal: ${p.classification.body_profile}`);
        if (ti?.focus) lines.push(`- Foco: ${ti.focus}`);
        if (ti?.split) lines.push(`- Divisão: ${ti.split}`);
        if (ti?.frequency_per_week) lines.push(`- Frequência sugerida: ${ti.frequency_per_week}x/semana`);
        if (ti?.session_minutes) lines.push(`- Duração por sessão: ~${ti.session_minutes}min`);
        if (ti?.intensity) lines.push(`- Intensidade: ${ti.intensity}`);
        if (ti?.priority_muscle_groups?.length) lines.push(`- Grupos prioritários: ${ti.priority_muscle_groups.join(', ')}`);
        if (ti?.volume_note) lines.push(`- Volume: ${ti.volume_note}`);
        if (planInfo.currentPhase?.training) lines.push(`- Fase atual (semana ${planInfo.currentWeek}): ${planInfo.currentPhase.training}`);
        bodyPlanContext = lines.join('\n');
      }
      const byId = new Map(exercises.map((ex) => [ex.id, ex] as const));

      const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const sortedDays = [...selectedDays].sort();
      const dayBuckets: { days: number[]; suffix: string; categoryId?: string }[] =
        sortedDays.length > 1
          ? sortedDays.map((d, i) => ({
              days: [d],
              suffix: ` (${dayLabels[d]})`,
              categoryId: varyCategories
                ? selectedCategoryIds[i % selectedCategoryIds.length]
                : undefined,
            }))
          : [{ days: selectedDays, suffix: '' }];

      const usedIds = new Set<string>();
      let totalCreated = 0;
      let lastRationale: string | undefined;

      for (const bucket of dayBuckets) {
        let pool = filteredExercises;
        if (bucket.categoryId) {
          pool = pool.filter((ex) => (ex.category_ids || []).includes(bucket.categoryId!));
        }
        const available = allowRepeat ? pool : pool.filter((ex) => !usedIds.has(ex.id));

        if (!available.length) {
          toast.message(`Sem exercícios para ${bucket.suffix.trim() || 'os dias seguintes'}`, {
            description: varyCategories
              ? 'Adicione mais exercícios à categoria selecionada.'
              : 'Ative "Repetir" ou amplie as categorias.',
          });
          continue;
        }

        // Pre-pin extras: pick EXACTLY the requested count for each chosen extra (consecutive at start).
        const pinned: typeof exercises = [];
        const pinnedIds = new Set<string>();
        const shortages: { name: string; want: number; have: number }[] = [];

        for (const extraId of selectedExtraIds) {
          const want = parseInt(extraCounts[extraId] || '0', 10);
          if (!want || want <= 0) continue;
          const candidates = available.filter(
            (ex) => (ex.extra_ids || []).includes(extraId) && !pinnedIds.has(ex.id)
          );
          const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, want);
          shuffled.forEach((ex) => {
            pinned.push(ex);
            pinnedIds.add(ex.id);
          });
          if (shuffled.length < want) {
            const extraName = extras.find((e) => e.id === extraId)?.name || 'equipamento';
            shortages.push({ name: extraName, want, have: shuffled.length });
          }
        }

        if (shortages.length > 0) {
          const lines = shortages
            .map((s) => `${s.name}: pediu ${s.want}, tem ${s.have}`)
            .join(' • ');
          toast.error(`Exercícios insuficientes${bucket.suffix}`, { description: lines });
          continue;
        }

        const remainingCount = Math.max(n - pinned.length, 0);
        let aiPicked: typeof exercises = [];

        if (remainingCount > 0) {
          // Para preencher o restante, usar APENAS exercícios SEM equipamento extra vinculado,
          // para não estourar a quota de outros equipamentos.
          const libraryAvailable = available.filter(
            (ex) => !pinnedIds.has(ex.id) && (!ex.extra_ids || ex.extra_ids.length === 0)
          );

          if (libraryAvailable.length < remainingCount) {
            toast.error(`Não há exercícios sem equipamento suficientes${bucket.suffix}`, {
              description: `Faltam ${remainingCount - libraryAvailable.length}. Reduza a quantidade total ou cadastre mais exercícios sem equipamento.`,
            });
            continue;
          }

          const library = libraryAvailable.map((ex) => ({
            id: ex.id,
            name: ex.name,
            body: ex.body_analysis ?? null,
            aesthetic: ex.aesthetic_analysis ?? null,
            mobility: ex.mobility_analysis ?? null,
          }));

          const { data, error } = await supabase.functions.invoke('compose-workout-from-text', {
            body: { prompt: prompt.trim(), count: remainingCount, library, health_context: healthContext, body_plan_context: bodyPlanContext },
          });

          if (error) {
            const msg = (data as { error?: string } | null)?.error || error.message;
            toast.error(msg || 'Erro ao gerar treino com IA');
            continue;
          }

          const ids: string[] = Array.isArray(data?.exercise_ids) ? data.exercise_ids : [];
          aiPicked = ids.map((id) => byId.get(id)).filter(Boolean) as typeof exercises;
          if (data?.rationale) lastRationale = data.rationale;
        }

        const picked = [...pinned, ...aiPicked];
        if (!picked.length) continue;

        const planObjective = useBodyPlan
          ? (bodyPlanContext || 'Treino sugerido a partir da análise corporal')
          : prompt.trim();

        const plan = await createPlan.mutateAsync({
          name: (name.trim() + bucket.suffix).slice(0, 80),
          days_of_week: bucket.days,
          objective: planObjective || null,
          ai_rationale: lastRationale || null,
          _silent: true,
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
              _silent: true,
            })
          )
        );

        if (!allowRepeat) picked.forEach((ex) => usedIds.add(ex.id));
        totalCreated++;
      }

      if (totalCreated === 0) {
        toast.error('Não foi possível gerar nenhum treino.');
        return;
      }

      toast.success(totalCreated > 1 ? `${totalCreated} treinos criados!` : 'Treino criado!');
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar treino');
    } finally {
      setGenerating(false);
    }
  };

  const totalDays = selectedDays.length;

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
            Em 3 passos a IA monta a sequência usando os exercícios da sua biblioteca.
          </DialogDescription>
        </DialogHeader>

        <WizardStepper steps={STEPS} current={step} onJump={(i) => i < step && setStep(i)} />

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {step === 0 && (
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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Origem dos exercícios</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { key: 'all', label: 'Todos', count: exercises.length },
                    { key: 'mine', label: 'Meus', count: personalOnly.length },
                    { key: 'global', label: 'Globais', count: globalExercises.length },
                  ] as const).map((opt) => {
                    const active = source === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSource(opt.key)}
                        className={`h-9 rounded-md border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-input hover:bg-accent'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className={`text-[10px] ${active ? 'opacity-80' : 'text-muted-foreground'}`}>
                          ({opt.count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {!useBodyPlan && (
                <div className="space-y-1.5">
                  <Label htmlFor="ai-prompt" className="text-xs font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Objetivo do treino
                  </Label>
                  <Textarea
                    id="ai-prompt"
                    ref={promptRef}
                    value={prompt}
                    onChange={(e) => { setPrompt(e.target.value); clearIf('prompt'); }}
                    placeholder="Ex.: Quero uma sequência com foco em glúteos e flexibilidade"
                    rows={4}
                    className="resize-none text-sm leading-relaxed"
                    aria-invalid={!!errorOf('prompt')}
                  />
                  <FieldError message={errorOf('prompt')} />
                  <div className="flex flex-wrap gap-1.5 pt-1">
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
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="ai-count" className="text-xs font-medium">
                  Quantidade de exercícios por treino
                </Label>
                <Input
                  id="ai-count"
                  ref={countRef}
                  inputMode="numeric"
                  value={count}
                  onChange={(e) => { setCount(e.target.value.replace(/\D/g, '')); clearIf('count'); }}
                  placeholder="8"
                  aria-invalid={!!errorOf('count')}
                />
                <FieldError message={errorOf('count')} />
              </div>

              {planInfo?.plan?.training_intent?.focus && (
                <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useBodyPlan}
                      onChange={(e) => setUseBodyPlan(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-input accent-primary"
                    />
                    <span className="text-xs leading-snug flex-1">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        Usar intenção da Análise Corporal
                      </span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">
                        {planInfo.plan.training_intent?.focus
                          ? `Foco: ${planInfo.plan.training_intent.focus}${planInfo.plan.training_intent.frequency_per_week ? ` · ${planInfo.plan.training_intent.frequency_per_week}x/sem` : ''}${planInfo.plan.training_intent.intensity ? ` · ${planInfo.plan.training_intent.intensity}` : ''}`
                          : 'A IA seguirá a periodização e foco do seu plano atual.'}
                      </span>
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="font-serif text-lg leading-tight">Escolha as categorias</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  A IA usará apenas exercícios das categorias selecionadas. Deixe vazio para usar toda a biblioteca.
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{filteredExercises.length} exercícios disponíveis</span>
                {selectedCategoryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryIds([])}
                    className="text-primary hover:underline"
                  >
                    Limpar seleção
                  </button>
                )}
              </div>

              {sortedCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma categoria criada ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
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
              )}

              <div className="space-y-1.5 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Equipamentos extras
                  </p>
                  {(selectedExtraIds.length > 0 || filterNoExtras) && (
                    <button
                      type="button"
                      onClick={() => { setSelectedExtraIds([]); setExtraCounts({}); setFilterNoExtras(false); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Quantos exercícios devem usar cada equipamento? Eles entram em sequência no início do treino.
                </p>
                <ExtrasPicker
                  selectedIds={selectedExtraIds}
                  onToggle={(id) => {
                    if (filterNoExtras) return;
                    setSelectedExtraIds((prev) => {
                      if (prev.includes(id)) {
                        setExtraCounts((c) => {
                          const next = { ...c };
                          delete next[id];
                          return next;
                        });
                        return prev.filter((x) => x !== id);
                      }
                      setExtraCounts((c) => ({ ...c, [id]: c[id] ?? '1' }));
                      return [...prev, id];
                    });
                  }}
                  noneSelected={filterNoExtras}
                  onToggleNone={() => {
                    setFilterNoExtras((v) => {
                      const next = !v;
                      if (next) { setSelectedExtraIds([]); setExtraCounts({}); }
                      return next;
                    });
                  }}
                  allowCreate={false}
                  compact
                  emptyHint="Nenhum equipamento cadastrado."
                  renderAdornment={(extra, active) =>
                    active ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={extraCounts[extra.id] ?? ''}
                        onChange={(e) =>
                          setExtraCounts((c) => ({
                            ...c,
                            [extra.id]: e.target.value.replace(/\D/g, '').slice(0, 2),
                          }))
                        }
                        placeholder="qtd"
                        className="h-6 w-10 rounded border border-border/70 bg-background text-[11px] text-center px-1 focus:outline-none focus:border-primary"
                        aria-label={`Quantidade de exercícios com ${extra.name}`}
                      />
                    ) : null
                  }
                />
                {(() => {
                  const totalQuota = selectedExtraIds.reduce(
                    (s, id) => s + (parseInt(extraCounts[id] || '0', 10) || 0),
                    0
                  );
                  const nVal = parseInt(count, 10) || 0;
                  if (totalQuota > nVal) {
                    return (
                      <p className="text-[10px] text-destructive">
                        A soma dos equipamentos ({totalQuota}) ultrapassa a quantidade de exercícios ({nVal}).
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="font-serif text-lg leading-tight">Em quais dias?</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Selecionar mais de um dia cria <strong>um treino para cada</strong>.
                </p>
              </div>

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

              {totalDays > 1 && (
                <div className="space-y-2 p-3 rounded-md border border-border bg-muted/20">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowRepeat}
                      onChange={(e) => setAllowRepeat(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-input accent-primary"
                    />
                    <span className="text-xs leading-snug">
                      Permitir repetir exercícios entre os dias
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={varyCategories}
                      onChange={(e) => {
                        setVaryCategories(e.target.checked);
                        if (e.target.checked && step === 2) {
                          // user must have selected categories — if not, push them back
                          if (selectedCategoryIds.length < 2) {
                            toast.message('Volte ao passo Categorias e selecione ao menos 2.', { duration: 3000 });
                          }
                        }
                      }}
                      className="h-4 w-4 mt-0.5 rounded border-input accent-primary"
                    />
                    <span className="text-xs leading-snug">
                      Variar categoria por dia (não repetir a do dia anterior)
                      {varyCategories && (
                        <span className="block text-[10px] text-muted-foreground mt-0.5">
                          {selectedCategoryIds.length >= 2
                            ? `Rotação entre ${selectedCategoryIds.length} categorias selecionadas.`
                            : 'Selecione ao menos 2 categorias no passo anterior.'}
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              )}

              {(() => {
                const ctx = buildBloodExamHealthContext(bloodExamsQ.data);
                if (!ctx) return null;
                return (
                  <p className="text-[10px] leading-snug text-muted-foreground p-2.5 rounded-md bg-muted/30 border border-border/60">
                    <span className="font-semibold text-foreground/80">Exame de sangue considerado:</span>{' '}
                    a IA ajusta intensidade com base nos seus marcadores.
                  </p>
                );
              })()}
            </div>
          )}
        </div>

        <WizardFooter
          current={step}
          total={STEPS.length}
          onCancel={() => onOpenChange(false)}
          onBack={goBack}
          onNext={goNext}
          onFinish={handleGenerate}
          finishDisabled={generating}
          finishLabel={
            generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar treino
              </>
            )
          }
        />
      </DialogContent>
    </Dialog>
  );
}
