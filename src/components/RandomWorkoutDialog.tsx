import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExerciseCategories } from '@/hooks/useExerciseCategories';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { Shuffle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RandomWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function RandomWorkoutDialog({ open, onOpenChange }: RandomWorkoutDialogProps) {
  const { categories } = useExerciseCategories();
  const { exercises } = useExerciseLibrary();
  const { createPlan, addExercise } = useWorkoutPlans();

  const [name, setName] = useState('');
  const [count, setCount] = useState('10');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);

  // Build hierarchy: top-level categories with children grouped under them
  const topLevel = useMemo(
    () => categories.filter((c) => !c.parent_id),
    [categories]
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string, typeof categories>();
    for (const c of categories) {
      if (c.parent_id) {
        const arr = map.get(c.parent_id) ?? [];
        arr.push(c);
        map.set(c.parent_id, arr);
      }
    }
    return map;
  }, [categories]);

  const availableCount = useMemo(() => {
    if (!selectedCategories.length) return 0;
    const set = new Set(selectedCategories);
    return exercises.filter((ex) =>
      ex.category_ids.some((cid) => set.has(cid))
    ).length;
  }, [exercises, selectedCategories]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const reset = () => {
    setName('');
    setCount('10');
    setSelectedCategories([]);
    setSelectedDays([]);
  };

  const handleGenerate = async () => {
    const n = parseInt(count, 10);
    if (!name.trim()) {
      toast.error('Dê um nome para o treino');
      return;
    }
    if (!n || n < 1) {
      toast.error('Quantidade inválida');
      return;
    }
    if (!selectedCategories.length) {
      toast.error('Selecione ao menos uma categoria');
      return;
    }

    const set = new Set(selectedCategories);
    const pool = exercises.filter((ex) =>
      ex.category_ids.some((cid) => set.has(cid))
    );

    if (!pool.length) {
      toast.error('Nenhum exercício na(s) categoria(s) selecionada(s)');
      return;
    }

    // Shuffle (Fisher-Yates) then take up to n
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const picked = shuffled.slice(0, Math.min(n, shuffled.length));

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
            Gerar treino aleatório
          </DialogTitle>
          <DialogDescription>
            Sorteia exercícios das categorias escolhidas.
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

            <div className="space-y-2">
              <Label htmlFor="rand-count">Quantidade de exercícios</Label>
              <Input
                id="rand-count"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
                placeholder="10"
              />
              {selectedCategories.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {availableCount} exercício(s) disponível(eis) na seleção
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categorias</Label>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma categoria criada ainda.
                </p>
              ) : (
                <div className="border rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
                  {topLevel.map((parent) => {
                    const children = childrenByParent.get(parent.id) ?? [];
                    return (
                      <div key={parent.id} className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedCategories.includes(parent.id)}
                            onCheckedChange={() => toggleCategory(parent.id)}
                          />
                          <span className="text-sm font-medium">{parent.name}</span>
                        </label>
                        {children.length > 0 && (
                          <div className="pl-6 space-y-1">
                            {children.map((child) => (
                              <label key={child.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={selectedCategories.includes(child.id)}
                                  onCheckedChange={() => toggleCategory(child.id)}
                                />
                                <span className="text-sm text-muted-foreground">{child.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
