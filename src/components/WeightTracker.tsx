import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scale, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useWeightHistory } from '@/hooks/useWeightHistory';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function WeightTracker() {
  const { entries, addWeightEntry } = useWeightHistory();
  const { profile, updateProfile } = useProfile();
  const [showInput, setShowInput] = useState(false);
  const [weight, setWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentWeight = profile?.weight_kg || 0;
  const lastEntry = entries[entries.length - 1];
  const previousWeight = entries.length >= 2 ? entries[entries.length - 2]?.weight_kg : currentWeight;
  const weightDiff = currentWeight - previousWeight;

  const chartData = entries.map((entry) => ({
    date: format(new Date(entry.recorded_at), 'dd/MM', { locale: ptBR }),
    peso: Number(entry.weight_kg),
  }));

  const handleSubmit = async () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      toast.error('Peso inválido (30-300kg)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Adicionar ao histórico
      await addWeightEntry(weightNum);
      
      // Atualizar perfil (isso recalcula todas as metas)
      await updateProfile({ weight_kg: weightNum });
      
      toast.success('Peso atualizado! Metas recalculadas.');
      setWeight('');
      setShowInput(false);
    } catch {
      toast.error('Erro ao salvar peso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTrendIcon = () => {
    if (weightDiff > 0.5) return <TrendingUp className="h-4 w-4 text-orange-500" />;
    if (weightDiff < -0.5) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
            <Scale className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold">Peso</h3>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{currentWeight}kg</span>
              {entries.length >= 2 && (
                <span className="flex items-center gap-1 text-xs">
                  {getTrendIcon()}
                  {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)}kg
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInput(!showInput)}
        >
          {showInput ? <X className="h-4 w-4" /> : 'Atualizar'}
        </Button>
      </div>

      {showInput && (
        <div className="flex gap-2 mb-3">
          <Input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Novo peso (kg)"
            min={30}
            max={300}
            step={0.1}
            className="flex-1"
          />
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '...' : 'Salvar'}
          </Button>
        </div>
      )}

      {chartData.length >= 2 && (
        <div className="h-24 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={['dataMin - 2', 'dataMax + 2']} 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value}kg`, 'Peso']}
              />
              <Line 
                type="monotone" 
                dataKey="peso" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length < 2 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Registre seu peso regularmente para ver o gráfico de evolução
        </p>
      )}
    </div>
  );
}
