import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Plus, Check, Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentBodyPlan } from '@/hooks/useCurrentBodyPlan';
import { useBloodExams } from '@/hooks/useBloodExams';
import { buildBloodExamContext } from '@/lib/bloodExamContext';
import { useFoodPreferences, buildFoodPreferencesContext } from '@/hooks/useFoodPreferences';
import { toast } from 'sonner';

interface MenuItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
interface Meal {
  name: string;
  time_hint?: string;
  items: MenuItem[];
}
interface Menu {
  meals: Meal[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  tips?: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onAdded?: () => void;
}

export function DailyMenuDialog({ open, onOpenChange, selectedDate, onAdded }: Props) {
  const { getGoals } = useProfile();
  const planInfo = useCurrentBodyPlan();
  const { list: bloodExamsQ } = useBloodExams();
  const { data: foodPrefs } = useFoodPreferences();
  const { addEntry } = useFoodEntries(selectedDate);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [addedMeals, setAddedMeals] = useState<Set<number>>(new Set());

  const generate = async () => {
    setLoading(true);
    setMenu(null);
    setAddedMeals(new Set());
    try {
      const goals = getGoals();
      const { data, error } = await supabase.functions.invoke('generate-daily-menu', {
        body: {
          goals: {
            calories: goals.calories,
            protein: goals.protein,
            carbs: goals.carbs,
            fat: goals.fat,
            fiber: goals.fiber,
          },
          profile: {
            goal: planInfo?.plan?.goal?.primary,
            body_profile: planInfo?.plan?.classification?.body_profile,
            diet_rules: planInfo?.plan?.diet_rules,
          },
          preferences: { meal_count: 4, style: 'brasileiro' },
          blood_exam_context: buildBloodExamContext(bloodExamsQ.data) || undefined,
          food_preferences_context: buildFoodPreferencesContext(foodPrefs) || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMenu((data as any).menu as Menu);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao gerar cardápio');
    } finally {
      setLoading(false);
    }
  };

  const addMeal = async (meal: Meal, idx: number) => {
    try {
      // Aggregate the meal as a single entry with original_items breakdown
      const totals = meal.items.reduce(
        (acc, it) => ({
          calories: acc.calories + (it.calories || 0),
          protein: acc.protein + (it.protein || 0),
          carbs: acc.carbs + (it.carbs || 0),
          fat: acc.fat + (it.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );
      await addEntry({
        name: meal.name,
        nutrition: {
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein),
          carbs: Math.round(totals.carbs),
          fat: Math.round(totals.fat),
        },
        quantity: 1,
        unit: 'porção',
        source: 'manual',
        originalItems: meal.items.map((it) => ({
          name: it.name,
          quantity: `${it.quantity}${it.unit}`,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
        })),
      });
      setAddedMeals((prev) => new Set(prev).add(idx));
      onAdded?.();
      toast.success(`${meal.name} adicionada ao dia`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao adicionar refeição');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Cardápio do dia pela IA
          </DialogTitle>
          <DialogDescription>
            Refeições montadas para bater suas metas de nutrientes automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!menu && !loading && (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Gere um cardápio sugerido com base no seu plano ativo. Você pode adicionar cada refeição com 1 toque.
            </p>
            <Button onClick={generate} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Gerar cardápio
            </Button>
          </div>
        )}

        {loading && (
          <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Montando seu cardápio…</p>
          </div>
        )}

        {menu && (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 grid grid-cols-4 gap-2 text-center">
              <Tot label="kcal" v={menu.totals.calories} />
              <Tot label="P (g)" v={menu.totals.protein} />
              <Tot label="C (g)" v={menu.totals.carbs} />
              <Tot label="G (g)" v={menu.totals.fat} />
            </div>

            {menu.meals.map((meal, idx) => {
              const added = addedMeals.has(idx);
              const totals = meal.items.reduce(
                (acc, it) => ({
                  c: acc.c + (it.calories || 0),
                  p: acc.p + (it.protein || 0),
                }),
                { c: 0, p: 0 },
              );
              return (
                <div key={idx} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-sm font-semibold">{meal.name}</p>
                    {meal.time_hint && (
                      <p className="text-[11px] text-muted-foreground">{meal.time_hint}</p>
                    )}
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5 mb-2">
                    {meal.items.map((it, j) => (
                      <li key={j}>
                        • {it.name} — {it.quantity}
                        {it.unit}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {Math.round(totals.c)} kcal · {Math.round(totals.p)}g P
                    </p>
                    <Button
                      size="sm"
                      variant={added ? 'secondary' : 'default'}
                      onClick={() => !added && addMeal(meal, idx)}
                      disabled={added}
                      className="gap-1.5 h-7 text-xs"
                    >
                      {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {added ? 'Adicionado' : 'Adicionar ao dia'}
                    </Button>
                  </div>
                </div>
              );
            })}

            {menu.tips && menu.tips.length > 0 && (
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Dicas</p>
                <ul className="text-xs space-y-0.5">
                  {menu.tips.map((t, i) => (
                    <li key={i}>• {t}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={generate} variant="outline" className="w-full gap-2" disabled={loading}>
              <Sparkles className="h-4 w-4" />
              Gerar outro cardápio
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Tot({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{Math.round(v)}</p>
    </div>
  );
}
