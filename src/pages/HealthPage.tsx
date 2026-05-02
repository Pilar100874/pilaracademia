import { useMemo } from 'react';
import { Heart, Scale, Ruler, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown, Activity, Sparkles, ChevronRight, HeartPulse } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { BottomNav } from '@/components/BottomNav';
import { differenceInYears, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

interface BMICategory {
  min: number;
  max: number;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const bmiCategories: BMICategory[] = [
  { min: 0, max: 18.5, label: 'Abaixo do peso', color: 'text-sky-600', bgColor: 'bg-sky-500', description: 'Pode indicar desnutrição ou problemas de saúde.' },
  { min: 18.5, max: 25, label: 'Peso normal', color: 'text-green-600', bgColor: 'bg-green-500', description: 'Faixa ideal para a maioria das pessoas.' },
  { min: 25, max: 30, label: 'Sobrepeso', color: 'text-amber-600', bgColor: 'bg-amber-500', description: 'Risco moderado para problemas de saúde.' },
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

  const bmr = useMemo(() => {
    if (weight <= 0 || heightCm <= 0 || !age) return null;
    if (gender === 'male') {
      return 10 * weight + 6.25 * heightCm - 5 * age + 5;
    } else if (gender === 'female') {
      return 10 * weight + 6.25 * heightCm - 5 * age - 161;
    }
    return 10 * weight + 6.25 * heightCm - 5 * age - 78;
  }, [weight, heightCm, age, gender]);

  // FC máxima — fórmula de Tanaka (208 - 0.7 × idade), mais precisa que 220 - idade.
  const hrMax = useMemo(() => {
    if (!age) return null;
    return Math.round(208 - 0.7 * age);
  }, [age]);

  // FC de repouso estimada (média adulto saudável). Usa Karvonen para reserva de FC.
  const restingHr = 70;

  const hrZones = useMemo(() => {
    if (!hrMax) return null;
    const reserve = hrMax - restingHr;
    const zone = (lo: number, hi: number) => ({
      min: Math.round(restingHr + reserve * lo),
      max: Math.round(restingHr + reserve * hi),
    });
    return [
      { label: 'Z1 — Recuperação', desc: 'Aquecimento, recuperação ativa', range: zone(0.50, 0.60), color: 'bg-sky-500', text: 'text-sky-600' },
      { label: 'Z2 — Aeróbico leve', desc: 'Queima de gordura, base aeróbica', range: zone(0.60, 0.70), color: 'bg-green-500', text: 'text-green-600' },
      { label: 'Z3 — Aeróbico', desc: 'Resistência cardiovascular', range: zone(0.70, 0.80), color: 'bg-amber-500', text: 'text-amber-600' },
      { label: 'Z4 — Limiar', desc: 'Performance, limiar anaeróbico', range: zone(0.80, 0.90), color: 'bg-orange-500', text: 'text-orange-600' },
      { label: 'Z5 — Máximo', desc: 'HIIT, esforço máximo (curto)', range: zone(0.90, 1.00), color: 'bg-red-500', text: 'text-red-600' },
    ];
  }, [hrMax]);

  const bmiPercentage = useMemo(() => {
    if (!bmi) return 0;
    const minBmi = 15;
    const maxBmi = 40;
    const percentage = ((bmi - minBmi) / (maxBmi - minBmi)) * 100;
    return Math.max(0, Math.min(100, percentage));
  }, [bmi]);

  const hasCompleteProfile = weight > 0 && heightCm > 0;

  if (!hasCompleteProfile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-4">
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
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Saúde
        </h1>
        <p className="text-xs text-muted-foreground">Análise do seu peso</p>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Atalho para análise corporal por IA */}
        <Link
          to="/body-analysis"
          className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition"
        >
          <div className="h-10 w-10 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              Análise corporal por IA <Sparkles className="h-3.5 w-3.5 text-primary" />
            </p>
            <p className="text-xs text-muted-foreground">
              Envie a foto do seu relatório de bioimpedância — gera plano completo, calorias, nutrientes e treino.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>

        {/* Card principal do IMC */}
        <div className="card-feature">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-semibold">Índice de Massa Corporal</span>
          </div>

          <div className="text-center mb-4">
            <p className={`text-5xl font-extrabold ${bmiCategory?.color}`}>
              {bmi?.toFixed(1)}
            </p>
            <p className={`text-lg font-medium mt-1 ${bmiCategory?.color}`}>
              {bmiCategory?.label}
            </p>
          </div>

          {/* Barra de IMC */}
          <div className="relative h-3 rounded-full bg-gradient-to-r from-sky-500 via-green-500 via-amber-500 via-orange-500 to-red-600 mb-2">
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-card border-2 border-foreground shadow-lg transition-all"
              style={{ left: `calc(${bmiPercentage}% - 10px)` }}
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
            ? 'bg-green-500/10' 
            : weightDifference?.type === 'below'
              ? 'bg-sky-500/10'
              : 'bg-orange-500/10'
        }`}>
          <div className="flex items-center gap-3">
            {weightDifference?.type === 'ideal' ? (
              <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
            ) : weightDifference?.type === 'below' ? (
              <TrendingUp className="h-8 w-8 text-sky-500 flex-shrink-0" />
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
            <p className="text-2xl font-bold">{weight} kg</p>
          </div>
          <div className="card-compact text-center">
            <Ruler className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Altura</p>
            <p className="text-2xl font-bold">{heightCm} cm</p>
          </div>
        </div>

        {/* Faixa de peso ideal */}
        {idealWeightRange && (
          <div className="card-compact">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold">Faixa de peso ideal</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-green-600">
                {idealWeightRange.min.toFixed(1)} - {idealWeightRange.max.toFixed(1)} kg
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Baseado na sua altura de {heightCm} cm
            </p>
          </div>
        )}

        {/* Zonas de Frequência Cardíaca */}
        {hrZones && hrMax && (
          <div className="card-compact">
            <div className="flex items-center gap-2 mb-1">
              <HeartPulse className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-semibold">Zonas de Frequência Cardíaca</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              FC máxima estimada: <span className="font-semibold text-foreground">{hrMax} bpm</span> · método Karvonen (FC repouso ~{restingHr} bpm)
            </p>
            <div className="space-y-2">
              {hrZones.map((z) => (
                <div key={z.label} className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${z.color}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{z.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{z.desc}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums ${z.text} shrink-0 ml-2`}>
                    {z.range.min}–{z.range.max} bpm
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Use no cardio: Z2 para queima de gordura, Z4–Z5 para HIIT. Ajuste se conhecer sua FC de repouso real.
            </p>
          </div>
        )}

        {/* TMB */}
        {bmr && (
          <div className="card-compact">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-rose-500" />
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
                className={`flex items-center justify-between p-2 rounded-xl ${
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
        <div className="p-4 rounded-2xl bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
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
