import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  const toggleBody = (k: BodyAnalysisKey) =>
    setBodyKeys((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const toggleAesthetic = (k: AestheticAnalysisKey) =>
    setAestheticKeys((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const toggleMobility = (k: MobilityAnalysisKey) =>
    setMobilityKeys((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

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
    if (!name.trim()) return toast.error('Dê um nome para o treino');
    if (!n || n < 1) return toast.error('Quantidade inválida');
    if (bodyKeys.size === 0 && aestheticKeys.size === 0 && mobilityKeys.size === 0) {
      return toast.error('Selecione ao menos uma classificação');
    }
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-primary" />
            Gerar treino por classificação
          </DialogTitle>
          <DialogDescription>
            Escolha o tipo de treino — o sistema sorteia exercícios analisados pela IA cuja % atinja o mínimo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rand-name">Nome do treino</Label>
              <Input
                id="rand-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Treino A"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rand-count">Qtd. exercícios</Label>
                <Input
                  id="rand-count"
                  inputMode="numeric"
                  value={count}
                  onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rand-min">% mínimo</Label>
                <Input
                  id="rand-min"
                  inputMode="numeric"
                  value={minPercent}
                  onChange={(e) => setMinPercent(e.target.value.replace(/\D/g, ''))}
                  placeholder="20"
                />
              </div>
            </div>

            {(bodyKeys.size > 0 || aestheticKeys.size > 0 || mobilityKeys.size > 0) && (
              <p className="text-xs text-muted-foreground">
                {pool.length} exercício(s) compatível(eis) na biblioteca
              </p>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Áreas trabalhadas
              </Label>
              <div className="border rounded-md p-3 space-y-3 max-h-72 overflow-y-auto">
                {BODY_GROUPS.map((g) => (
                  <div key={g.group} className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {g.group}
                    </p>
                    {g.items.map((it) => (
                      <label key={it.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={bodyKeys.has(it.key)}
                          onCheckedChange={() => toggleBody(it.key)}
                        />
                        <span className="text-sm">{it.label}</span>
                      </label>
                    ))}
                  </div>
                ))}
                <div className="space-y-1.5 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Análise estética
                  </p>
                  {AESTHETIC_ITEMS.map((it) => (
                    <label key={it.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={aestheticKeys.has(it.key)}
                        onCheckedChange={() => toggleAesthetic(it.key)}
                      />
                      <span className="text-sm">{it.label}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Mobilidade e flexibilidade
                  </p>
                  {MOBILITY_GROUPS.map((mg) => (
                    <div key={mg.group} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">{mg.group}</p>
                      {mg.items.map((it) => (
                        <label key={it.key} className="flex items-center gap-2 cursor-pointer pl-1">
                          <Checkbox
                            checked={mobilityKeys.has(it.key)}
                            onCheckedChange={() => toggleMobility(it.key)}
                          />
                          <span className="text-sm">{it.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
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
