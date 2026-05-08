import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError } from '@/components/FieldError';
import { useFieldError, validateRequired } from '@/lib/formValidation';
import { WizardStepper, WizardFooter } from '@/components/WizardShell';

import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useExerciseCategories } from '@/hooks/useExerciseCategories';
import { ExtrasPicker } from '@/components/ExtrasPicker';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { Shuffle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  BODY_GROUPS,
  AESTHETIC_ITEMS,
  MOBILITY_GROUPS,
  BodyAnalysisKey,
  AestheticAnalysisKey,
  MobilityAnalysisKey,
} from '@/lib/exerciseAnalysis';

interface RandomWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STEPS = [
  { key: 'basic', label: 'Básico' },
  { key: 'classif', label: 'Classificação' },
  { key: 'cats', label: 'Categorias' },
  { key: 'schedule', label: 'Agenda' },
];

export function RandomWorkoutDialog({ open, onOpenChange }: RandomWorkoutDialogProps) {
  const { allExercises: exercises } = useExerciseLibrary();
  const { categories } = useExerciseCategories();
  const { createPlan, addExercise } = useWorkoutPlans();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [count, setCount] = useState('10');
  const [minPercent, setMinPercent] = useState('20');
  const [bodyKeys, setBodyKeys] = useState<Set<BodyAnalysisKey>>(new Set());
  const [aestheticKeys, setAestheticKeys] = useState<Set<AestheticAnalysisKey>>(new Set());
  const [mobilityKeys, setMobilityKeys] = useState<Set<MobilityAnalysisKey>>(new Set());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [extraCounts, setExtraCounts] = useState<Record<string, string>>({});
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [allowRepeat, setAllowRepeat] = useState(true);
  const [varyCategories, setVaryCategories] = useState(false);
  const [generating, setGenerating] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLInputElement>(null);
  const classifRef = useRef<HTMLDivElement>(null);
  const { errorOf, setError, clearError, clearIf } = useFieldError();

  const min = useMemo(() => {
    const n = parseInt(minPercent, 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  }, [minPercent]);

  const matchScore = (ex: typeof exercises[number]): number => {
    let score = 0;
    for (const k of bodyKeys) {
      const v = ex.body_analysis?.[k];
      if (typeof v === 'number' && v >= min) score += v;
    }
    for (const k of aestheticKeys) {
      const v = ex.aesthetic_analysis?.[k];
      if (typeof v === 'number' && v >= min) score += v;
    }
    for (const k of mobilityKeys) {
      const v = ex.mobility_analysis?.[k];
      if (typeof v === 'number' && v >= min) score += v;
    }
    return score;
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

  // Pool by classification (and optional category filter)
  const pool = useMemo(() => {
    if (bodyKeys.size === 0 && aestheticKeys.size === 0 && mobilityKeys.size === 0) return [];
    let p = exercises.filter((ex) => matchScore(ex) > 0);
    if (selectedCategoryIds.length > 0) {
      p = p.filter((ex) => (ex.category_ids || []).some((id) => selectedCategoryIds.includes(id)));
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, bodyKeys, aestheticKeys, mobilityKeys, min, selectedCategoryIds]);

  const toggleBody = (k: BodyAnalysisKey) => {
    clearIf('classif');
    setBodyKeys((prev) => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next; });
  };
  const toggleAesthetic = (k: AestheticAnalysisKey) => {
    clearIf('classif');
    setAestheticKeys((prev) => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next; });
  };
  const toggleMobility = (k: MobilityAnalysisKey) => {
    clearIf('classif');
    setMobilityKeys((prev) => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next; });
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) => prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]);
  };

  const reset = () => {
    setStep(0);
    setName('');
    setCount('10');
    setMinPercent('20');
    setBodyKeys(new Set());
    setAestheticKeys(new Set());
    setMobilityKeys(new Set());
    setSelectedCategoryIds([]);
    setSelectedExtraIds([]);
    setSelectedDays([]);
    setAllowRepeat(true);
    setVaryCategories(false);
  };

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      const n = parseInt(count, 10);
      const first = validateRequired([
        { key: 'name', ref: nameRef, valid: !!name.trim(), message: 'Dê um nome para o treino' },
        { key: 'count', ref: countRef, valid: !!n && n >= 1, message: 'Quantidade inválida' },
      ]);
      if (first) { setError(first.key, first.message); return false; }
      clearError();
      return true;
    }
    if (s === 1) {
      const total = bodyKeys.size + aestheticKeys.size + mobilityKeys.size;
      if (total === 0) {
        setError('classif', 'Selecione ao menos uma classificação');
        toast.error('Selecione ao menos uma classificação');
        return false;
      }
      return true;
    }
    if (s === 2) {
      if (varyCategories && selectedCategoryIds.length < 2) {
        toast.error('Variar categorias exige ao menos 2 selecionadas.');
        return false;
      }
      if (!pool.length) {
        toast.error('Nenhum exercício corresponde aos filtros. Reduza o % mínimo ou amplie a seleção.');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => { if (validateStep(step)) setStep((s) => Math.min(STEPS.length - 1, s + 1)); };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleGenerate = async () => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!validateStep(i)) { setStep(i); return; }
    }
    const n = parseInt(count, 10);

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

    const samplePicks = (basePool: typeof exercises, excludeIds: Set<string>): typeof exercises => {
      const remaining = basePool
        .filter((ex) => !excludeIds.has(ex.id))
        .map((ex) => ({ ex, score: matchScore(ex) }));
      const out: typeof exercises = [];
      const target = Math.min(n, remaining.length);
      for (let i = 0; i < target; i++) {
        const total = remaining.reduce((s, r) => s + r.score, 0);
        if (total <= 0) break;
        let r = Math.random() * total;
        let idx = 0;
        for (let j = 0; j < remaining.length; j++) {
          r -= remaining[j].score;
          if (r <= 0) { idx = j; break; }
        }
        out.push(remaining[idx].ex);
        remaining.splice(idx, 1);
      }
      return out;
    };

    setGenerating(true);
    try {
      const usedIds = new Set<string>();
      let totalCreated = 0;

      for (const bucket of dayBuckets) {
        let basePool = pool;
        if (bucket.categoryId) {
          basePool = basePool.filter((ex) => (ex.category_ids || []).includes(bucket.categoryId!));
        }
        const picked = samplePicks(basePool, allowRepeat ? new Set() : usedIds);
        if (!picked.length) {
          toast.message(`Sem exercícios para ${bucket.suffix.trim() || 'os dias seguintes'}`, {
            description: varyCategories
              ? 'Adicione mais exercícios à categoria selecionada.'
              : 'Ative "Repetir" ou amplie a seleção.',
          });
          continue;
        }

        const plan = await createPlan.mutateAsync({
          name: (name.trim() + bucket.suffix).slice(0, 80),
          days_of_week: bucket.days,
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
        if (!allowRepeat) picked.forEach((ex) => usedIds.add(ex.id));
        totalCreated++;
      }

      if (totalCreated === 0) {
        toast.error('Não foi possível gerar nenhum treino.');
        return;
      }
      toast.success(totalCreated > 1 ? `${totalCreated} treinos gerados!` : 'Treino gerado!');
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar treino');
    } finally {
      setGenerating(false);
    }
  };

  const totalSelected = bodyKeys.size + aestheticKeys.size + mobilityKeys.size;
  const totalDays = selectedDays.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent
        className="max-w-md w-[calc(100vw-1rem)] max-h-[92vh] sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Shuffle className="h-4 w-4" />
            </span>
            Gerar por classificação
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Sorteia exercícios analisados pela IA cuja % atinja o mínimo.
          </DialogDescription>
        </DialogHeader>

        <WizardStepper steps={STEPS} current={step} onJump={(i) => i < step && setStep(i)} />

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rand-name" className="text-xs font-medium">Nome do treino</Label>
                <Input
                  id="rand-name"
                  ref={nameRef}
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearIf('name'); }}
                  placeholder="Ex.: Treino A"
                  aria-invalid={!!errorOf('name')}
                />
                <FieldError message={errorOf('name')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rand-count" className="text-xs font-medium">Qtd. exercícios</Label>
                  <Input
                    id="rand-count"
                    ref={countRef}
                    inputMode="numeric"
                    value={count}
                    onChange={(e) => { setCount(e.target.value.replace(/\D/g, '')); clearIf('count'); }}
                    placeholder="10"
                    aria-invalid={!!errorOf('count')}
                  />
                  <FieldError message={errorOf('count')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rand-min" className="text-xs font-medium">% mínimo</Label>
                  <Input
                    id="rand-min"
                    inputMode="numeric"
                    value={minPercent}
                    onChange={(e) => setMinPercent(e.target.value.replace(/\D/g, ''))}
                    placeholder="20"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4" ref={classifRef}>
              <div className="space-y-1">
                <p className="font-serif text-lg leading-tight">Áreas trabalhadas</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Marque as classificações dos exercícios que devem ser sorteados.
                </p>
              </div>
              {totalSelected > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {totalSelected} selecionada{totalSelected !== 1 ? 's' : ''}
                </p>
              )}
              <FieldError message={errorOf('classif')} />

              <div className={`rounded-md border ${errorOf('classif') ? 'border-destructive' : 'border-border/70'} divide-y divide-border/60 bg-muted/20`}>
                <section className="p-3 space-y-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Corpo</p>
                  {BODY_GROUPS.map((g) => (
                    <div key={g.group} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">{g.group}</p>
                      <div className="grid grid-cols-1 gap-1">
                        {g.items.map((it) => (
                          <label key={it.key} className="flex items-center gap-2 cursor-pointer py-1 pl-1 rounded hover:bg-background/60 transition-colors">
                            <Checkbox checked={bodyKeys.has(it.key)} onCheckedChange={() => toggleBody(it.key)} />
                            <span className="text-sm">{it.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>

                <section className="p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Estética</p>
                  <div className="grid grid-cols-1 gap-1">
                    {AESTHETIC_ITEMS.map((it) => (
                      <label key={it.key} className="flex items-center gap-2 cursor-pointer py-1 pl-1 rounded hover:bg-background/60 transition-colors">
                        <Checkbox checked={aestheticKeys.has(it.key)} onCheckedChange={() => toggleAesthetic(it.key)} />
                        <span className="text-sm">{it.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="p-3 space-y-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mobilidade & flexibilidade</p>
                  {MOBILITY_GROUPS.map((mg) => (
                    <div key={mg.group} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">{mg.group}</p>
                      <div className="grid grid-cols-1 gap-1">
                        {mg.items.map((it) => (
                          <label key={it.key} className="flex items-center gap-2 cursor-pointer py-1 pl-1 rounded hover:bg-background/60 transition-colors">
                            <Checkbox checked={mobilityKeys.has(it.key)} onCheckedChange={() => toggleMobility(it.key)} />
                            <span className="text-sm">{it.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="font-serif text-lg leading-tight">Restringir por categorias</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Opcional. Use para limitar o sorteio a categorias específicas (ex.: equipamentos disponíveis).
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{pool.length} exercícios compatíveis</span>
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

              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Equipamentos extras
                  </p>
                  {selectedExtraIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedExtraIds([])}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <ExtrasPicker
                  selectedIds={selectedExtraIds}
                  onToggle={(id) =>
                    setSelectedExtraIds((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    )
                  }
                  allowCreate={false}
                  compact
                  emptyHint="Nenhum equipamento cadastrado."
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="font-serif text-lg leading-tight">Em quais dias?</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Mais de um dia cria <strong>um treino para cada</strong>.
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
                    <Checkbox
                      checked={allowRepeat}
                      onCheckedChange={(v) => setAllowRepeat(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-xs leading-snug">Permitir repetir exercícios entre os dias</span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={varyCategories}
                      onCheckedChange={(v) => setVaryCategories(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-xs leading-snug">
                      Variar categoria por dia (não repetir a do dia anterior)
                      {varyCategories && (
                        <span className="block text-[10px] text-muted-foreground mt-0.5">
                          {selectedCategoryIds.length >= 2
                            ? `Rotação entre ${selectedCategoryIds.length} categorias.`
                            : 'Volte ao passo Categorias e selecione ao menos 2.'}
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              )}
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
                <Shuffle className="h-4 w-4 mr-2" />
                Gerar treino
              </>
            )
          }
        />
      </DialogContent>
    </Dialog>
  );
}
