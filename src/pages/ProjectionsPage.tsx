import { useState, useEffect } from 'react';
import { format, subDays, addDays, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Target, Scale, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';

interface DayData {
  date: string;
  calories: number;
  burned: number;
  net: number;
}

export function ProjectionsPage() {
  const { user } = useAuth();
  const { profile, getGoals } = useProfile();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [historyData, setHistoryData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const goals = getGoals();
  const currentWeight = profile?.weight_kg || 70;

  useEffect(() => {
    if (user) fetchHistoryData();
  }, [user]);

  const fetchHistoryData = async () => {
    if (!user) return;
    setIsLoading(true);

    // Buscar últimos 14 dias para calcular média
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

    // Agrupar por dia
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

  // Calcular média de déficit/superávit
  const avgDailyBalance = historyData.length > 0 
    ? historyData.reduce((sum, d) => sum + (d.net - goals.calories), 0) / historyData.length 
    : 0;

  // 7700 kcal = 1 kg
  const dailyWeightChange = avgDailyBalance / 7700;
  const weeklyProjection = dailyWeightChange * 7;
  const monthlyProjection = dailyWeightChange * 30;

  const projectedWeightWeek = currentWeight + weeklyProjection;
  const projectedWeightMonth = currentWeight + monthlyProjection;

  // Dados para o gráfico de projeção
  const generateProjectionData = () => {
    const data = [];
    const today = new Date();
    const days = period === 'week' ? 7 : 30;

    for (let i = 0; i <= days; i++) {
      const date = addDays(today, i);
      const projectedWeight = currentWeight + (dailyWeightChange * i);
      data.push({
        date: format(date, 'dd/MM'),
        peso: Number(projectedWeight.toFixed(1)),
        label: i === 0 ? 'Hoje' : format(date, 'dd/MM'),
      });
    }
    return data;
  };

  const projectionData = generateProjectionData();
  const isLosingWeight = dailyWeightChange < 0;

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-4 py-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Projeções
        </h1>
        <p className="text-xs text-muted-foreground">Baseado nos últimos {historyData.length} dias</p>
      </header>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Card de resumo */}
            <div className={`card-feature ${isLosingWeight ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-orange-500 to-red-500'} text-white`}>
              <div className="flex items-center gap-2 mb-2">
                {isLosingWeight ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                <span className="font-semibold">
                  {isLosingWeight ? 'Você está perdendo peso! 🎉' : 'Você está ganhando peso'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 rounded-lg bg-white/10">
                  <p className="text-xs opacity-80">Média diária</p>
                  <p className="text-2xl font-bold num-display">{(dailyWeightChange * 1000).toFixed(0)}g</p>
                  <p className="text-xs opacity-80">/dia</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/10">
                  <p className="text-xs opacity-80">Déficit médio</p>
                  <p className="text-2xl font-bold num-display">{Math.round(avgDailyBalance)}</p>
                  <p className="text-xs opacity-80">kcal/dia</p>
                </div>
              </div>
            </div>

            {/* Projeções */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-compact">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Em 1 semana</span>
                </div>
                <p className="text-xl font-bold num-display">{projectedWeightWeek.toFixed(1)} kg</p>
                <p className={`text-sm font-medium ${weeklyProjection < 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {weeklyProjection > 0 ? '+' : ''}{(weeklyProjection * 1000).toFixed(0)}g
                </p>
              </div>

              <div className="card-compact">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Em 1 mês</span>
                </div>
                <p className="text-xl font-bold num-display">{projectedWeightMonth.toFixed(1)} kg</p>
                <p className={`text-sm font-medium ${monthlyProjection < 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {monthlyProjection > 0 ? '+' : ''}{monthlyProjection.toFixed(1)}kg
                </p>
              </div>
            </div>

            {/* Seletor de período */}
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

            {/* Gráfico de projeção */}
            <div className="card-compact">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-semibold">Projeção de peso</span>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projectionData}>
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
                      stroke={isLosingWeight ? '#10b981' : '#f97316'}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dica */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Dica:</strong> Para {isLosingWeight ? 'manter' : 'melhorar'} seus resultados, 
                {isLosingWeight 
                  ? ' continue mantendo o déficit calórico consistente.' 
                  : ' tente aumentar a atividade física ou reduzir a ingestão calórica.'}
              </p>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
