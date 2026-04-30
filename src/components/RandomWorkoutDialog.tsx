import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError } from '@/components/FieldError';
import { useFieldError, validateRequired } from '@/lib/formValidation';

import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
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

export function RandomWorkoutDialog({ open, onOpenChange }: RandomWorkoutDialogProps) {
  const { exercises } = useExerciseLibrary();
  const { createPlan, addExercise } = useWorkoutPlans();

  const [name, setName] = useState('');
  const [count, setCount] = useState('10');
  const [minPercent, setMinPercent] = useState('20');
  const [bodyKeys, setBodyKeys] = useState<Set<BodyAnalysisKey>>(new Set());
  const [aestheticKeys, setAestheticKeys] = useState<Set<AestheticAnalysisKey>>(new Set());
  const [mobilityKeys, setMobilityKeys] = useState<Set<MobilityAnalysisKey>>(new Set());
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
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

  const pool = useMemo(() => {
    if (bodyKeys.size === 0 && aestheticKeys.size === 0 && mobilityKeys.size === 0) return [];
    return exercises.filter((ex) => matchScore(ex) > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, bodyKeys, aestheticKeys, mobilityKeys, min]);

  const toggleBody = (k: BodyAnalysisKey) => {
    clearIf('classif');
    setBodyKeys((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };
  const toggleAesthetic = (k: AestheticAnalysisKey) => {
    clearIf('classif');
    setAestheticKeys((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };
  const toggleMobility = (k: MobilityAnalysisKey) => {
    clearIf('classif');
    setMobilityKeys((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const reset = () => {
    setName('');
    setCount('10');
    setMinPercent('20');
    setBodyKeys(new Set());
    setAestheticKeys(new Set());
    setMobilityKeys(new Set());
    setSelectedDays([]);
  };

  const handleGenerate = async () => {
    const n = parseInt(count, 10);
    const first = validateRequired([
      { key: 'name', ref: nameRef, valid: !!name.trim(), message: 'Dê um nome para o treino' },
      { key: 'count', ref: countRef, valid: !!n && n >= 1, message: 'Informe uma quantidade válida' },
      {
        key: 'classif',
        ref: classifRef,
        valid: bodyKeys.size + aestheticKeys.size + mobilityKeys.size > 0,
        message: 'Selecione ao menos uma classificação',
      },
    ]);
    if (first) {
      setError(first.key, first.message);
      return;
    }
    clearError();
    if (!pool.length) return toast.error('Nenhum exercício corresponde à classificação selecionada. Aguarde a análise dos vídeos terminar ou diminua o % mínimo.');

    // Weighted random by score (higher % = mais provável de ser sorteado)
    const remaining = pool.map((ex) => ({ ex, score: matchScore(ex) }));
    const picked: typeof exercises = [];
    const target = Math.min(n, remaining.length);
    for (let i = 0; i < target; i++) {
      const total = remaining.reduce((s, r) => s + r.score, 0);
      if (total <= 0) break;
      let r = Math.random() * total;
      let idx = 0;
      for (let j = 0; j < remaining.length; j++) {
        r -= remaining[j].score;
        if (r <= 0) {
          idx = j;
          break;
        }
      }
      picked.push(remaining[idx].ex);
      remaining.splice(idx, 1);
    }

    setGenerating(true);
    try {
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
      toast.success(`Treino gerado com ${picked.length} exercício(s)!`);
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

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="space-y-5">
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

            <div className="space-y-2" ref={classifRef}>
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Áreas trabalhadas
                </Label>
                {totalSelected > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                    {totalSelected} selecionada{totalSelected !== 1 ? 's' : ''} · {pool.length} compatíveis
                  </span>
                )}
              </div>
              <FieldError message={errorOf('classif')} />

              <div
                className={`rounded-md border ${errorOf('classif') ? 'border-destructive' : 'border-border/70'} divide-y divide-border/60 bg-muted/20`}
              >
                <section className="p-3 space-y-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Corpo
                  </p>
                  {BODY_GROUPS.map((g) => (
                    <div key={g.group} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">{g.group}</p>
                      <div className="grid grid-cols-1 gap-1">
                        {g.items.map((it) => (
                          <label
                            key={it.key}
                            className="flex items-center gap-2 cursor-pointer py-1 pl-1 rounded hover:bg-background/60 transition-colors"
                          >
                            <Checkbox
                              checked={bodyKeys.has(it.key)}
                              onCheckedChange={() => toggleBody(it.key)}
                            />
                            <span className="text-sm">{it.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>

                <section className="p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Estética
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {AESTHETIC_ITEMS.map((it) => (
                      <label
                        key={it.key}
                        className="flex items-center gap-2 cursor-pointer py-1 pl-1 rounded hover:bg-background/60 transition-colors"
                      >
                        <Checkbox
                          checked={aestheticKeys.has(it.key)}
                          onCheckedChange={() => toggleAesthetic(it.key)}
                        />
                        <span className="text-sm">{it.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="p-3 space-y-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Mobilidade & flexibilidade
                  </p>
                  {MOBILITY_GROUPS.map((mg) => (
                    <div key={mg.group} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">{mg.group}</p>
                      <div className="grid grid-cols-1 gap-1">
                        {mg.items.map((it) => (
                          <label
                            key={it.key}
                            className="flex items-center gap-2 cursor-pointer py-1 pl-1 rounded hover:bg-background/60 transition-colors"
                          >
                            <Checkbox
                              checked={mobilityKeys.has(it.key)}
                              onCheckedChange={() => toggleMobility(it.key)}
                            />
                            <span className="text-sm">{it.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
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
                <Shuffle className="h-4 w-4 mr-2" />
                Gerar treino
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
