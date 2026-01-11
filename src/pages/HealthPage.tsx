import { useMemo } from 'react';
import { Heart, Scale, Ruler, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { BottomNav } from '@/components/BottomNav';
import { differenceInYears, parseISO } from 'date-fns';

interface BMICategory {
  min: number;
  max: number;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const bmiCategories: BMICategory[] = [
  { min: 0, max: 18.5, label: 'Abaixo do peso', color: 'text-blue-600', bgColor: 'bg-blue-500', description: 'Pode indicar desnutrição ou problemas de saúde.' },
  { min: 18.5, max: 25, label: 'Peso normal', color: 'text-emerald-600', bgColor: 'bg-emerald-500', description: 'Faixa ideal para a maioria das pessoas.' },
  { min: 25, max: 30, label: 'Sobrepeso', color: 'text-yellow-600', bgColor: 'bg-yellow-500', description: 'Risco moderado para problemas de saúde.' },
  { min: 30, max: 35, label: 'Obesidade Grau I', color: 'text-orange-600', bgColor: 'bg-orange-500', description: 'Risco aumentado para doenças crônicas.' },
  { min: 35, max: 40, label: 'Obesidade Grau II', color: 'text-red-500', bgColor: 'bg-red-500', description: 'Risco alto para problemas de saúde.' },
  { min: 40, max: 100, label: 'Obesidade Grau III', color: 'text-red-700', bgColor: 'bg-red-700', description: 'Risco muito alto. Busque orientação médica.' },
];

export function HealthPage() {
  const { profile } = useProfile();

  const weight = profile?.weight_kg || 0;
  const heightCm = profile?.height_cm || 0;
  const heightM = heightCm / 100;
  const gender = profile?.gender;
  const birthDate = profile?.birth_date;

  const age = useMemo(() => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), parseISO(birthDate));
  }, [birthDate]);

  const bmi = useMemo(() => {
    if (heightM <= 0 || weight <= 0) return null;
    return weight / (heightM * heightM);
  }, [weight, heightM]);

  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    return bmiCategories.find(cat => bmi >= cat.min && bmi < cat.max) || bmiCategories[bmiCategories.length - 1];
  }, [bmi]);

  const idealWeightRange = useMemo(() => {
    if (heightM <= 0) return null;
    const minIdeal = 18.5 * heightM * heightM;
    const maxIdeal = 24.9 * heightM * heightM;
    return { min: minIdeal, max: maxIdeal };
  }, [heightM]);

  const weightDifference = useMemo(() => {
    if (!idealWeightRange || weight <= 0) return null;
    if (weight < idealWeightRange.min) {
      return { type: 'below', amount: idealWeightRange.min - weight };
    } else if (weight > idealWeightRange.max) {
      return { type: 'above', amount: weight - idealWeightRange.max };
    }
    return { type: 'ideal', amount: 0 };
  }, [weight, idealWeightRange]);

  // Cálculo da taxa metabólica basal (TMB) - Fórmula de Mifflin-St Jeor
  const bmr = useMemo(() => {
    if (weight <= 0 || heightCm <= 0 || !age) return null;
    if (gender === 'male') {
      return 10 * weight + 6.25 * heightCm - 5 * age + 5;
    } else if (gender === 'female') {
      return 10 * weight + 6.25 * heightCm - 5 * age - 161;
    }
    // Default para quando não tem gênero
    return 10 * weight + 6.25 * heightCm - 5 * age - 78;
  }, [weight, heightCm, age, gender]);

  const bmiPercentage = useMemo(() => {
    if (!bmi) return 0;
    // Escala de 15 a 40 para o indicador visual
    const minBmi = 15;
    const maxBmi = 40;
    const percentage = ((bmi - minBmi) / (maxBmi - minBmi)) * 100;
    return Math.max(0, Math.min(100, percentage));
  }, [bmi]);

  const hasCompleteProfile = weight > 0 && heightCm > 0;

  if (!hasCompleteProfile) {
    return (
      <div className="min-h-screen gradient-hero pb-20">
        <header className="sticky top-0 z-30 glass border-b border-border/50 px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Saúde
          </h1>
        </header>

        <div className="px-4 py-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Info className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Complete seu perfil</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Para ver sua análise de saúde, precisamos do seu peso e altura. Vá até o Perfil e complete seus dados.
          </p>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-4 py-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Saúde
        </h1>
        <p className="text-xs text-muted-foreground">Análise do seu peso</p>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Card principal do IMC */}
        <div className="card-feature">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-semibold">Índice de Massa Corporal (IMC)</span>
          </div>

          <div className="text-center mb-4">
            <p className={`text-5xl font-bold ${bmiCategory?.color}`}>
              {bmi?.toFixed(1)}
            </p>
            <p className={`text-lg font-medium mt-1 ${bmiCategory?.color}`}>
              {bmiCategory?.label}
            </p>
          </div>

          {/* Barra de IMC */}
          <div className="relative h-3 rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 via-yellow-500 via-orange-500 to-red-600 mb-2">
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-foreground shadow-lg"
              style={{ left: `calc(${bmiPercentage}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>15</span>
            <span>18.5</span>
            <span>25</span>
            <span>30</span>
            <span>35</span>
            <span>40</span>
          </div>

          <p className="text-sm text-muted-foreground text-center mt-4">
            {bmiCategory?.description}
          </p>
        </div>

        {/* Status do peso */}
        <div className={`card-compact ${
          weightDifference?.type === 'ideal' 
            ? 'bg-emerald-500/10 border-emerald-500/20' 
            : weightDifference?.type === 'below'
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-orange-500/10 border-orange-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {weightDifference?.type === 'ideal' ? (
              <CheckCircle className="h-8 w-8 text-emerald-500 flex-shrink-0" />
            ) : weightDifference?.type === 'below' ? (
              <TrendingUp className="h-8 w-8 text-blue-500 flex-shrink-0" />
            ) : (
              <TrendingDown className="h-8 w-8 text-orange-500 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold">
                {weightDifference?.type === 'ideal' && 'Você está no peso ideal! 🎉'}
                {weightDifference?.type === 'below' && 'Abaixo do peso ideal'}
                {weightDifference?.type === 'above' && 'Acima do peso ideal'}
              </p>
              {weightDifference?.type !== 'ideal' && (
                <p className="text-sm text-muted-foreground">
                  {weightDifference?.type === 'below' 
                    ? `Precisa ganhar ${weightDifference.amount.toFixed(1)} kg`
                    : `Precisa perder ${weightDifference?.amount.toFixed(1)} kg`
                  }
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-compact text-center">
            <Scale className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Peso atual</p>
            <p className="text-xl font-bold">{weight} kg</p>
          </div>
          <div className="card-compact text-center">
            <Ruler className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Altura</p>
            <p className="text-xl font-bold">{heightCm} cm</p>
          </div>
        </div>

        {/* Faixa de peso ideal */}
        {idealWeightRange && (
          <div className="card-compact">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold">Faixa de peso ideal</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-emerald-600">
                {idealWeightRange.min.toFixed(1)} - {idealWeightRange.max.toFixed(1)} kg
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Baseado na sua altura de {heightCm} cm
            </p>
          </div>
        )}

        {/* TMB */}
        {bmr && (
          <div className="card-compact">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold">Taxa Metabólica Basal</span>
            </div>
            <p className="text-3xl font-bold text-center">{Math.round(bmr)} kcal/dia</p>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Calorias que seu corpo queima em repouso
            </p>
          </div>
        )}

        {/* Tabela de referência */}
        <div className="card-compact">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Tabela de IMC</span>
          </div>
          <div className="space-y-2">
            {bmiCategories.map((cat) => (
              <div 
                key={cat.label} 
                className={`flex items-center justify-between p-2 rounded-lg ${
                  bmiCategory?.label === cat.label ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${cat.bgColor}`} />
                  <span className="text-sm">{cat.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {cat.min} - {cat.max === 100 ? '40+' : cat.max}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Aviso */}
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              O IMC é uma estimativa e não considera fatores como massa muscular, idade ou distribuição de gordura. 
              Consulte um profissional de saúde para uma avaliação completa.
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
