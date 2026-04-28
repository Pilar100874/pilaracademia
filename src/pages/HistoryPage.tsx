// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Flame, Droplets, Dumbbell, Apple, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';

interface DaySummary {
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  liquidMl: number;
  exerciseCalories: number;
  weight: number | null;
  foodEntries: Array<{ id: string; name: string; calories: number; consumed_at: string; is_liquid?: boolean }>;
  liquidEntries: Array<{ id: string; amount_ml: number; type: string; consumed_at: string }>;
  exerciseEntries: Array<{ id: string; name: string; calories_burned: number; performed_at: string }>;
}

export function HistoryPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDaySummary(selectedDate);
  }, [user, selectedDate]);

  const fetchDaySummary = async (date: Date) => {
    if (!user) return;
    setIsLoading(true);

    const dayStart = startOfDay(date).toISOString();
    const dayEnd = endOfDay(date).toISOString();

    const [foodRes, liquidRes, exerciseRes, weightRes] = await Promise.all([
      supabase
        .from('food_entries')
        .select('id, name, calories, protein, carbs, fat, consumed_at, is_liquid')
        .eq('user_id', user.id)
        .gte('consumed_at', dayStart)
        .lte('consumed_at', dayEnd)
        .order('consumed_at', { ascending: true }),
      supabase
        .from('liquid_entries')
        .select('id, amount_ml, type, consumed_at')
        .eq('user_id', user.id)
        .gte('consumed_at', dayStart)
        .lte('consumed_at', dayEnd)
        .order('consumed_at', { ascending: true }),
      supabase
        .from('exercise_entries')
        .select('id, name, calories_burned, performed_at')
        .eq('user_id', user.id)
        .gte('performed_at', dayStart)
        .lte('performed_at', dayEnd)
        .order('performed_at', { ascending: true }),
      supabase
        .from('weight_history')
        .select('weight_kg')
        .eq('user_id', user.id)
        .gte('recorded_at', dayStart)
        .lte('recorded_at', dayEnd)
        .order('recorded_at', { ascending: false })
        .limit(1),
    ]);

    const foodEntries = foodRes.data || [];
    const liquidEntries = liquidRes.data || [];
    const exerciseEntries = exerciseRes.data || [];

    setSummary({
      date,
      calories: foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0),
      protein: foodEntries.reduce((sum, e) => sum + (e.protein || 0), 0),
      carbs: foodEntries.reduce((sum, e) => sum + (e.carbs || 0), 0),
      fat: foodEntries.reduce((sum, e) => sum + (e.fat || 0), 0),
      liquidMl: liquidEntries.reduce((sum, e) => sum + (e.amount_ml || 0), 0),
      exerciseCalories: exerciseEntries.reduce((sum, e) => sum + (e.calories_burned || 0), 0),
      weight: weightRes.data?.[0]?.weight_kg || null,
      foodEntries,
      liquidEntries,
      exerciseEntries,
    });

    setIsLoading(false);
  };

  const goToPreviousDay = () => setSelectedDate((d) => subDays(d, 1));
  const goToNextDay = () => {
    if (!isSameDay(selectedDate, new Date())) {
      setSelectedDate((d) => new Date(d.getTime() + 86400000));
    }
  };

  const isToday = isSameDay(selectedDate, new Date());
  const netCalories = (summary?.calories || 0) - (summary?.exerciseCalories || 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-lg font-bold capitalize">
              {isToday ? 'Hoje' : format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextDay} disabled={isToday}>
            <ChevronRight className={`h-5 w-5 ${isToday ? 'opacity-30' : ''}`} />
          </Button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : summary ? (
          <>
            {/* Cards resumo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-compact">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Balanço</span>
                </div>
                <p className="text-2xl font-bold num-display">{netCalories}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  🍽️ {summary.calories} - 🏃 {summary.exerciseCalories}
                </p>
              </div>

              <div className="card-compact">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="h-4 w-4 text-sky-500" />
                  <span className="text-xs text-muted-foreground">Líquidos</span>
                </div>
                <p className="text-2xl font-bold num-display text-sky-500">{(summary.liquidMl / 1000).toFixed(1)}L</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.liquidEntries.length} registro(s)</p>
              </div>

              {summary.weight && (
                <div className="card-compact col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="h-4 w-4 text-violet-500" />
                    <span className="text-xs text-muted-foreground">Peso registrado</span>
                  </div>
                  <p className="text-2xl font-bold num-display text-violet-500">{summary.weight} kg</p>
                </div>
              )}
            </div>

            {/* Macros */}
            <div className="card-compact">
              <p className="text-sm font-semibold mb-3">Macros</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-orange-500/10">
                  <p className="text-xl font-bold text-orange-500">{Math.round(summary.protein)}g</p>
                  <p className="text-xs text-muted-foreground">Proteína</p>
                </div>
                <div className="p-3 rounded-2xl bg-sky-500/10">
                  <p className="text-xl font-bold text-sky-500">{Math.round(summary.carbs)}g</p>
                  <p className="text-xs text-muted-foreground">Carbos</p>
                </div>
                <div className="p-3 rounded-2xl bg-violet-500/10">
                  <p className="text-xl font-bold text-violet-500">{Math.round(summary.fat)}g</p>
                  <p className="text-xs text-muted-foreground">Gorduras</p>
                </div>
              </div>
            </div>

            {/* Refeições do dia */}
            {summary.foodEntries.filter(e => !e.is_liquid).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Apple className="h-4 w-4 text-primary" />
                  Refeições ({summary.foodEntries.filter(e => !e.is_liquid).length})
                </h3>
                <div className="space-y-2">
                  {summary.foodEntries.filter(e => !e.is_liquid).map((entry) => (
                    <div key={entry.id} className="entry-card">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.consumed_at), 'HH:mm')}
                        </p>
                      </div>
                      <p className="font-semibold text-sm text-primary">{entry.calories} kcal</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Líquidos do dia */}
            {(summary.liquidEntries.length > 0 || summary.foodEntries.filter(e => e.is_liquid).length > 0) && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-sky-500" />
                  Líquidos ({summary.liquidEntries.length + summary.foodEntries.filter(e => e.is_liquid).length})
                </h3>
                <div className="space-y-2">
                  {summary.liquidEntries.map((entry) => (
                    <div key={`liquid-${entry.id}`} className="entry-card">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm capitalize">{entry.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.consumed_at), 'HH:mm')}
                        </p>
                      </div>
                      <p className="font-semibold text-sm text-sky-500">{entry.amount_ml}ml</p>
                    </div>
                  ))}
                  {summary.foodEntries.filter(e => e.is_liquid).map((entry) => (
                    <div key={entry.id} className="entry-card">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.consumed_at), 'HH:mm')}
                        </p>
                      </div>
                      <p className="font-semibold text-sm">{entry.calories} kcal</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exercícios do dia */}
            {summary.exerciseEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-rose-500" />
                  Exercícios ({summary.exerciseEntries.length})
                </h3>
                <div className="space-y-2">
                  {summary.exerciseEntries.map((entry) => (
                    <div key={entry.id} className="entry-card">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.performed_at), 'HH:mm')}
                        </p>
                      </div>
                      <p className="font-semibold text-sm text-rose-500">-{entry.calories_burned} kcal</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.foodEntries.length === 0 && summary.liquidEntries.length === 0 && summary.exerciseEntries.length === 0 && (
              <div className="card-compact text-center py-8">
                <p className="text-muted-foreground">Nenhum registro neste dia</p>
              </div>
            )}
          </>
        ) : null}
      </div>

      <BottomNav />
    </div>
  );
}
