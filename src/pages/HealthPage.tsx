import { useMemo } from 'react';
import { Heart, Scale, Ruler, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown, Activity, Sparkles, HeartPulse, Upload, FileText } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { BottomNav } from '@/components/BottomNav';
import { differenceInYears, parseISO } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BioimpedanceTab } from '@/components/BioimpedanceTab';
import { BloodExamsTab } from '@/components/BloodExamsTab';
import { WatchSyncCard } from '@/components/WatchSyncCard';
import { useBodyAnalyses } from '@/hooks/useBodyAnalyses';
import type { BodyAnalysisRow, ExtractedBioimpedance } from '@/types/bodyAnalysis';

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
  const { list } = useBodyAnalyses();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = tabParam === 'blood' ? 'blood' : tabParam === 'bioimpedance' ? 'bioimpedance' : 'overview';

  const latestBio = list.data?.[0] as BodyAnalysisRow | undefined;
  const latestExtracted = (latestBio?.extracted || {}) as ExtractedBioimpedance;

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

  // TMB: prefere o valor medido pela bioimpedância; senão calcula (Mifflin-St Jeor).
  const bmr = useMemo(() => {
    if (latestExtracted.bmr_kcal != null && Number.isFinite(latestExtracted.bmr_kcal)) {
      return { value: latestExtracted.bmr_kcal, source: 'bioimpedance' as const };
    }
    if (weight <= 0 || heightCm <= 0 || !age) return null;
    const value = gender === 'male'
      ? 10 * weight + 6.25 * heightCm - 5 * age + 5
      : gender === 'female'
        ? 10 * weight + 6.25 * heightCm - 5 * age - 161
        : 10 * weight + 6.25 * heightCm - 5 * age - 78;
    return { value, source: 'estimate' as const };
  }, [latestExtracted.bmr_kcal, weight, heightCm, age, gender]);

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
      { label: 'Z1 — Bem leve', desc: 'Aquecimento e recuperação', range: zone(0.50, 0.60), color: 'bg-sky-500', text: 'text-sky-600' },
      { label: 'Z2 — Leve', desc: 'Queima de gordura, dá pra conversar', range: zone(0.60, 0.70), color: 'bg-green-500', text: 'text-green-600' },
      { label: 'Z3 — Moderado', desc: 'Respiração mais forte, ainda confortável', range: zone(0.70, 0.80), color: 'bg-amber-500', text: 'text-amber-600' },
      { label: 'Z4 — Forte', desc: 'Puxado, fica difícil falar', range: zone(0.80, 0.90), color: 'bg-orange-500', text: 'text-orange-600' },
      { label: 'Z5 — Máximo', desc: 'Tiros intensos e curtos', range: zone(0.90, 1.00), color: 'bg-red-500', text: 'text-red-600' },
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

  const setTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'overview') next.delete('tab');
    else next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="px-5 pt-6 pb-4 border-b border-border bg-background">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Saúde
        </p>
        <h1 className="page-title mt-1">Sua saúde em um só lugar</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Indicadores do corpo, bioimpedância e exames de sangue — tudo explicado sem jargão.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="px-5 py-5">
        <TabsList className="w-full grid grid-cols-3 mb-5">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="bioimpedance">Bioimpedância</TabsTrigger>
          <TabsTrigger value="blood">Exames</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5 mt-0">
          <WatchSyncCard />
          {!hasCompleteProfile ? (
            <div className="rounded-md border border-dashed border-border bg-card p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Info className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-base font-semibold">Complete seu perfil</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Para ver sua análise de saúde, precisamos do seu peso e altura. Vá até o Perfil e complete seus dados.
              </p>
            </div>
          ) : (
            <>
              {/* Status do peso — cartão de destaque */}
              <div className={`rounded-md border border-border p-4 ${
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
                <div className="rounded-md border border-border bg-card p-4 text-center">
                  <Scale className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Peso atual</p>
                  <p className="text-2xl font-bold">{weight} kg</p>
                </div>
                <div className="rounded-md border border-border bg-card p-4 text-center">
                  <Ruler className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Altura</p>
                  <p className="text-2xl font-bold">{heightCm} cm</p>
                </div>
              </div>

              {/* Card principal do IMC */}
              <div className="rounded-md border border-border bg-card p-4">
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

              {/* Faixa de peso ideal */}
              {idealWeightRange && (
                <div className="rounded-md border border-border bg-card p-4">
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

              {/* TMB */}
              {bmr && (
                <div className="rounded-md border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-semibold">Gasto em repouso</span>
                  </div>
                  <p className="text-3xl font-bold text-center">{Math.round(bmr.value)} kcal/dia</p>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {bmr.source === 'bioimpedance'
                      ? 'Medido na sua última bioimpedância'
                      : 'Calorias que seu corpo queima em repouso (estimativa)'}
                  </p>
                </div>
              )}

              {/* Zonas de Frequência Cardíaca */}
              {hrZones && hrMax && (
                <div className="rounded-md border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <HeartPulse className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-semibold">Zonas de Frequência Cardíaca</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    FC máxima estimada: <span className="font-semibold text-foreground">{hrMax} bpm</span> · método Karvonen (FC repouso ~{restingHr} bpm)
                  </p>
                  <div className="space-y-2">
                    {hrZones.map((z) => (
                      <div key={z.label} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
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
                    No cardio: fique na Z2 para queimar gordura; use Z4–Z5 em tiros curtos e intensos. Ajuste se souber sua frequência cardíaca de repouso real.
                  </p>
                </div>
              )}

              {/* Tabela de referência */}
              <div className="rounded-md border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Tabela de IMC</span>
                </div>
                <div className="space-y-2">
                  {bmiCategories.map((cat) => (
                    <div
                      key={cat.label}
                      className={`flex items-center justify-between p-2 rounded-md ${
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
              <div className="rounded-md border border-border bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    O IMC é uma estimativa e não considera fatores como massa muscular, idade ou distribuição de gordura.
                    Consulte um profissional de saúde para uma avaliação completa.
                  </p>
                </div>
              </div>
            </>
          )}
              <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </TabsContent>

        <TabsContent value="bioimpedance" className="mt-0">
          <BioimpedanceTab />
        </TabsContent>

        <TabsContent value="blood" className="mt-0">
          <BloodExamsTab />
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
}
