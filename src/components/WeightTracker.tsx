import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scale, TrendingUp, TrendingDown, Minus, ChartLine } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useWeightHistory } from '@/hooks/useWeightHistory';
import { useProfile } from '@/hooks/useProfile';
import { WeightProjectionDialog } from './WeightProjectionDialog';

export function WeightTracker() {
  const { entries, addWeightEntry } = useWeightHistory();
  const { profile, updateProfile } = useProfile();
  const [showInput, setShowInput] = useState(false);
  const [showProjection, setShowProjection] = useState(false);
  const [weight, setWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Peso atual sempre vem do último registro do histórico
  const currentWeight = entries.length > 0 ? entries[entries.length - 1]?.weight_kg : (profile?.weight_kg || 0);
  const previousWeight = entries.length >= 2 ? entries[entries.length - 2]?.weight_kg : currentWeight;
  const weightDiff = entries.length >= 2 ? currentWeight - previousWeight : 0;

  const chartData = entries.slice(-7).map((e) => ({ peso: Number(e.weight_kg) }));

  const handleSubmit = async () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w < 30 || w > 300) return;
    setIsSubmitting(true);
    try {
      await addWeightEntry(w);
      await updateProfile({ weight_kg: w });
      setWeight('');
      setShowInput(false);
    } catch { /* silently fail */ }
    finally { setIsSubmitting(false); }
  };

  const getTrendIcon = () => {
    if (Math.abs(weightDiff) < 0.3) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (weightDiff < 0) return <TrendingDown className="h-3 w-3 text-emerald-500" />;
    return <TrendingUp className="h-3 w-3 text-amber-500" />;
  };

  return (
    <>
      <div className="card-compact">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
              <Scale className="h-5 w-5 text-violet-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Peso atual</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xl num-display">{currentWeight}</span>
                <span className="text-sm text-muted-foreground">kg</span>
                {entries.length >= 2 && (
                  <span className="flex items-center text-xs gap-0.5">
                    {getTrendIcon()}
                    {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)}
                  </span>
                )}
                {/* Botão de projeção ao lado do peso */}
                {entries.length >= 2 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 ml-1" 
                    onClick={() => setShowProjection(true)}
                    title="Ver projeções"
                  >
                    <ChartLine className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mini chart */}
          {chartData.length >= 2 && (
            <button 
              onClick={() => setShowProjection(true)}
              className="w-16 h-8 hover:opacity-70 transition-opacity cursor-pointer shrink-0"
              title="Ver projeções"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </button>
          )}

          <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => setShowInput(!showInput)}>
            {showInput ? '✕' : 'Atualizar'}
          </Button>
        </div>

        {showInput && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50 animate-fade-in">
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Novo peso (kg)"
              className="flex-1 h-10"
              step={0.1}
            />
            <Button onClick={handleSubmit} disabled={isSubmitting} className="h-10">
              {isSubmitting ? '...' : 'Salvar'}
            </Button>
          </div>
        )}
      </div>

      <WeightProjectionDialog
        open={showProjection}
        onOpenChange={setShowProjection}
        entries={entries}
        currentWeight={currentWeight}
        goalWeight={profile?.weight_kg && profile.goal === 'lose' ? profile.weight_kg - 5 : undefined}
      />
    </>
  );
}
