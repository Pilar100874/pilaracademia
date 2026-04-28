// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useState, useEffect } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Target, Scale, Calendar, Flame, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';

interface DayData {
  date: string;
  calories: number;
  burned: number;
  net: number;
}

const KCAL_PER_KG = 7700;

export function ProjectionsPage() {
  const { user } = useAuth();
  const { profile, getGoals } = useProfile();
  const { entries: todayFood } = useFoodEntries();
  const { entries: todayExercise } = useExerciseEntries();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [historyData, setHistoryData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const goals = getGoals();
  const currentWeight = profile?.weight_kg || 70;

  // Cálculo baseado nas calorias de HOJE
  const todayConsumed = todayFood.reduce((sum, e) => sum + (e.calories || 0), 0);
  const todayBurned = todayExercise.reduce((sum, e) => sum + (e.calories_burned || 0), 0);
  const todayNet = todayConsumed - todayBurned;
  const todayBalance = todayNet - goals.calories;
  const todayDailyChange = todayBalance / KCAL_PER_KG;
  const todayWeeklyProjection = todayDailyChange * 7;
  const todayMonthlyProjection = todayDailyChange * 30;
  const todayIsDeficit = todayBalance < 0;

  useEffect(() => {
    if (user) fetchHistoryData();
  }, [user]);

  const fetchHistoryData = async () => {
    if (!user) return;
    setIsLoading(true);

    const daysToFetch = 14;
    const startDate = subDays(new Date(), daysToFetch);
    
    const [foodRes, exerciseRes] = await Promise.all([
      supabase
        .from('food_entries')
        .select('calories, consumed_at')
        .eq('user_id', user.id)
        .gte('consumed_at', startDate.toISOString())
        .order('consumed_at', { ascending: true }),
      supabase
        .from('exercise_entries')
        .select('calories_burned, performed_at')
        .eq('user_id', user.id)
        .gte('performed_at', startDate.toISOString())
        .order('performed_at', { ascending: true }),
    ]);

    const dailyData: Record<string, { calories: number; burned: number }> = {};
    
    (foodRes.data || []).forEach((entry) => {
      const day = format(new Date(entry.consumed_at), 'yyyy-MM-dd');
      if (!dailyData[day]) dailyData[day] = { calories: 0, burned: 0 };
      dailyData[day].calories += entry.calories || 0;
    });

    (exerciseRes.data || []).forEach((entry) => {
      const day = format(new Date(entry.performed_at), 'yyyy-MM-dd');
      if (!dailyData[day]) dailyData[day] = { calories: 0, burned: 0 };
      dailyData[day].burned += entry.calories_burned || 0;
    });

    const result = Object.entries(dailyData).map(([date, data]) => ({
      date,
      calories: data.calories,
      burned: data.burned,
      net: data.calories - data.burned,
    }));

    setHistoryData(result);
    setIsLoading(false);
  };

  // Cálculo baseado no HISTÓRICO
  const avgDailyBalance = historyData.length > 0 
    ? historyData.reduce((sum, d) => sum + (d.net - goals.calories), 0) / historyData.length 
    : 0;

  const historyDailyWeightChange = avgDailyBalance / KCAL_PER_KG;
  const historyWeeklyProjection = historyDailyWeightChange * 7;
  const historyMonthlyProjection = historyDailyWeightChange * 30;
  const historyIsLosingWeight = historyDailyWeightChange < 0;

  const generateProjectionData = (dailyChange: number) => {
    const data = [];
    const today = new Date();
    const days = period === 'week' ? 7 : 30;

    for (let i = 0; i <= days; i++) {
      const date = addDays(today, i);
      const projectedWeight = currentWeight + (dailyChange * i);
      data.push({
        date: format(date, 'dd/MM'),
        peso: Number(projectedWeight.toFixed(1)),
        label: i === 0 ? 'Hoje' : format(date, 'dd/MM'),
      });
    }
    return data;
  };

  const historyProjectionData = generateProjectionData(historyDailyWeightChange);
  const todayProjectionData = generateProjectionData(todayDailyChange);

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-4 py-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Projeções
        </h1>
      </header>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-11">
              <TabsTrigger value="today" className="flex items-center gap-1.5 text-xs">
                <Flame className="h-4 w-4" />
                Calorias de Hoje
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs">
                <History className="h-4 w-4" />
                Histórico ({historyData.length}d)
              </TabsTrigger>
            </TabsList>

            {/* Tab: Projeção baseada nas calorias de HOJE */}
            <TabsContent value="today" className="space-y-4 mt-0">
              <div className={`card-feature ${todayIsDeficit ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-orange-500 to-red-500'} text-white`}>
                <div className="flex items-center gap-2 mb-2">
                  {todayIsDeficit ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                  <span className="font-semibold">
                    {todayIsDeficit ? 'Se manter esse ritmo hoje 🎉' : 'Atenção ao consumo hoje'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 rounded-lg bg-white/10">
                    <p className="text-xs opacity-80">Balanço hoje</p>
                    <p className="text-2xl font-bold num-display">{todayBalance > 0 ? '+' : ''}{Math.round(todayBalance)}</p>
                    <p className="text-xs opacity-80">kcal</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/10">
                    <p className="text-xs opacity-80">Consumo líquido</p>
                    <p className="text-2xl font-bold num-display">{Math.round(todayNet)}</p>
                    <p className="text-xs opacity-80">kcal</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card-compact">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Em 1 semana</span>
                  </div>
                  <p className="text-xl font-bold num-display">{(currentWeight + todayWeeklyProjection).toFixed(1)} kg</p>
                  <p className={`text-sm font-medium ${todayWeeklyProjection < 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                    {todayWeeklyProjection > 0 ? '+' : ''}{(todayWeeklyProjection * 1000).toFixed(0)}g
                  </p>
                </div>

                <div className="card-compact">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Em 1 mês</span>
                  </div>
                  <p className="text-xl font-bold num-display">{(currentWeight + todayMonthlyProjection).toFixed(1)} kg</p>
                  <p className={`text-sm font-medium ${todayMonthlyProjection < 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                    {todayMonthlyProjection > 0 ? '+' : ''}{todayMonthlyProjection.toFixed(1)}kg
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant={period === 'week' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setPeriod('week')}
                >
                  1 Semana
                </Button>
                <Button 
                  variant={period === 'month' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setPeriod('month')}
                >
                  1 Mês
                </Button>
              </div>

              <div className="card-compact">
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-semibold">Se mantiver esse ritmo</span>
                </div>
                
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={todayProjectionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <ReferenceLine 
                        y={currentWeight} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="5 5" 
                        label={{ value: 'Atual', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="peso" 
                        stroke={todayIsDeficit ? '#10b981' : '#f97316'}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Nota:</strong> Esta projeção assume que você manterá o mesmo padrão de consumo de hoje todos os dias.
                </p>
              </div>
            </TabsContent>

            {/* Tab: Projeção baseada no HISTÓRICO */}
            <TabsContent value="history" className="space-y-4 mt-0">
              <div className={`card-feature ${historyIsLosingWeight ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-orange-500 to-red-500'} text-white`}>
                <div className="flex items-center gap-2 mb-2">
                  {historyIsLosingWeight ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                  <span className="font-semibold">
                    {historyIsLosingWeight ? 'Você está perdendo peso! 🎉' : 'Você está ganhando peso'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 rounded-lg bg-white/10">
                    <p className="text-xs opacity-80">Média diária</p>
                    <p className="text-2xl font-bold num-display">{(historyDailyWeightChange * 1000).toFixed(0)}g</p>
                    <p className="text-xs opacity-80">/dia</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/10">
                    <p className="text-xs opacity-80">Déficit médio</p>
                    <p className="text-2xl font-bold num-display">{Math.round(avgDailyBalance)}</p>
                    <p className="text-xs opacity-80">kcal/dia</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card-compact">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Em 1 semana</span>
                  </div>
                  <p className="text-xl font-bold num-display">{(currentWeight + historyWeeklyProjection).toFixed(1)} kg</p>
                  <p className={`text-sm font-medium ${historyWeeklyProjection < 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                    {historyWeeklyProjection > 0 ? '+' : ''}{(historyWeeklyProjection * 1000).toFixed(0)}g
                  </p>
                </div>

                <div className="card-compact">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Em 1 mês</span>
                  </div>
                  <p className="text-xl font-bold num-display">{(currentWeight + historyMonthlyProjection).toFixed(1)} kg</p>
                  <p className={`text-sm font-medium ${historyMonthlyProjection < 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                    {historyMonthlyProjection > 0 ? '+' : ''}{historyMonthlyProjection.toFixed(1)}kg
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant={period === 'week' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setPeriod('week')}
                >
                  1 Semana
                </Button>
                <Button 
                  variant={period === 'month' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setPeriod('month')}
                >
                  1 Mês
                </Button>
              </div>

              <div className="card-compact">
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-semibold">Projeção baseada no histórico</span>
                </div>
                
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyProjectionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <ReferenceLine 
                        y={currentWeight} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="5 5" 
                        label={{ value: 'Atual', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="peso" 
                        stroke={historyIsLosingWeight ? '#10b981' : '#f97316'}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Dica:</strong> Para {historyIsLosingWeight ? 'manter' : 'melhorar'} seus resultados, 
                  {historyIsLosingWeight 
                    ? ' continue mantendo o déficit calórico consistente.' 
                    : ' tente aumentar a atividade física ou reduzir a ingestão calórica.'}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
