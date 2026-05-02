import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { activityLabels, goalLabels, calculateAge, calculateBMR, calculateTDEE, calculateDailyCalories } from '@/types/profile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Step = 0 | 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile, isLoading } = useProfile();
  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [goal, setGoal] = useState('');

  // If onboarding already done, leave.
  useEffect(() => {
    if (!isLoading && profile?.onboarding_completed) {
      navigate('/', { replace: true });
    } else if (profile) {
      setName(profile.name || '');
      setBirthDate(profile.birth_date || '');
      setGender((profile.gender as any) || '');
      setHeightCm(profile.height_cm?.toString() || '');
      setWeightKg(profile.weight_kg?.toString() || '');
      setActivityLevel(profile.activity_level || '');
      setGoal(profile.goal || '');
    }
  }, [profile, isLoading, navigate]);

  const totalSteps = 5;

  const canAdvance = (() => {
    switch (step) {
      case 0: return true;
      case 1: return name.trim().length >= 2 && !!gender && !!birthDate;
      case 2: return Number(heightCm) > 80 && Number(weightKg) > 20;
      case 3: return !!activityLevel && !!goal;
      case 4: return true;
      default: return false;
    }
  })();

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({
        name,
        birth_date: birthDate,
        gender: gender as 'male' | 'female',
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        activity_level: activityLevel as any,
        goal: goal as any,
        onboarding_completed: true,
      } as any);
      toast.success('Tudo pronto!');
      navigate('/', { replace: true });
    } catch (e) {
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    if (!user) return;
    try {
      await updateProfile({ onboarding_completed: true } as any);
      navigate('/', { replace: true });
    } catch {
      navigate('/', { replace: true });
    }
  };

  // Preview de calorias no passo 4
  const preview = (() => {
    if (gender && weightKg && heightCm && birthDate && activityLevel && goal) {
      const age = calculateAge(birthDate);
      const bmr = calculateBMR(gender as 'male' | 'female', Number(weightKg), Number(heightCm), age);
      const tdee = calculateTDEE(bmr, activityLevel as any);
      const cal = calculateDailyCalories(tdee, goal as any);
      return { bmr: Math.round(bmr), tdee: Math.round(tdee), cal };
    }
    return null;
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Passo {step + 1} de {totalSteps}
          </span>
          {step < totalSteps - 1 && (
            <button
              type="button"
              onClick={skip}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Pular por agora
            </button>
          )}
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-8 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {step === 0 && (
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h1 className="page-title">Bem-vindo ao Pilar Academia</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Em menos de 2 minutos vamos personalizar sua experiência. Você poderá registrar
                  refeições, treinos, peso, exames de sangue e bioimpedância — tudo em um só lugar,
                  com sugestões inteligentes pensadas para o seu corpo.
                </p>
                <ul className="space-y-2 pt-2">
                  {[
                    'Cardápio diário personalizado',
                    'Análise corporal e ajuste de nutrientes',
                    'Histórico de exames com gráficos de evolução',
                    'Treinos e acompanhamento de progresso',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h1 className="page-title">Quem é você?</h1>
                <p className="text-sm text-muted-foreground">
                  Esses dados nos ajudam a calcular suas necessidades.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Como devemos te chamar"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label>Sexo biológico</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {[
                        { v: 'male', l: 'Masculino' },
                        { v: 'female', l: 'Feminino' },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setGender(opt.v as any)}
                          className={cn(
                            'rounded-md border px-3 py-2.5 text-sm transition-colors',
                            gender === opt.v
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
                          )}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Usado apenas para fórmulas metabólicas (BMR/TDEE).
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="bdate">Data de nascimento</Label>
                    <Input
                      id="bdate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h1 className="page-title">Suas medidas</h1>
                <p className="text-sm text-muted-foreground">
                  Você poderá atualizar seu peso a qualquer momento.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <Label htmlFor="height">Altura (cm)</Label>
                    <Input
                      id="height"
                      inputMode="numeric"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 175"
                      className="mt-1.5"
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Peso atual (kg)</Label>
                    <Input
                      id="weight"
                      inputMode="decimal"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
                      placeholder="Ex: 75"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h1 className="page-title">Estilo de vida e objetivo</h1>

                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Nível de atividade</Label>
                    <div className="space-y-1.5 mt-1.5">
                      {Object.entries(activityLabels).map(([k, l]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setActivityLevel(k)}
                          className={cn(
                            'w-full text-left rounded-md border px-3 py-2.5 text-sm transition-colors',
                            activityLevel === k
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card hover:border-foreground/30',
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Objetivo</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {Object.entries(goalLabels).map(([k, l]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setGoal(k)}
                          className={cn(
                            'rounded-md border px-2 py-2.5 text-xs transition-colors',
                            goal === k
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h1 className="page-title">Tudo pronto, {name.split(' ')[0] || 'pronto'}!</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Calculamos suas necessidades com base nos seus dados.
                </p>

                {preview && (
                  <div className="rounded-md border border-border bg-card p-4 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">Calorias diárias</span>
                      <span className="text-2xl font-semibold">{preview.cal} <span className="text-xs text-muted-foreground">kcal</span></span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>Metabolismo basal (BMR)</span>
                      <span>{preview.bmr} kcal</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>Gasto total estimado (TDEE)</span>
                      <span>{preview.tdee} kcal</span>
                    </div>
                  </div>
                )}

                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground/80">Próximos passos sugeridos:</strong> envie
                    sua bioimpedância e exames de sangue na aba <em>Corpo</em> para que a IA
                    personalize ainda mais suas recomendações.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav buttons */}
      <div className="px-5 pb-6 pt-2 max-w-md mx-auto w-full">
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
              className="flex-1"
              disabled={saving}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}
              disabled={!canAdvance}
              className="flex-1"
            >
              Continuar
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button type="button" onClick={handleFinish} disabled={saving} className="flex-1">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Começar
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
