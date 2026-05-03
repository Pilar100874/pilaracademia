import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { activityLabels, goalLabels, calculateAge, calculateBMR, calculateTDEE, calculateDailyCalories, calculateAllNutrients } from '@/types/profile';
import { ArrowLeft, User, Scale, Ruler, Calendar, Activity, Target, Loader2, CheckCircle, Sparkles, UtensilsCrossed, Share2, ChevronRight, TrendingUp, FileText, Shield, Trash2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { DataExportSection } from '@/components/DataExportSection';
import { ShareSummaryDialog } from '@/components/ShareSummaryDialog';
import { RemindersSection } from '@/components/RemindersSection';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { useIsMaster } from '@/hooks/useIsMaster';


export function ProfilePage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile, isLoading, updateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState<string>('');
  const [goal, setGoal] = useState<string>('');

  const [previewNutrients, setPreviewNutrients] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    saturatedFat: number;
    transFat: number;
    fiber: number;
    sodium: number;
  } | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBirthDate(profile.birth_date || '');
      setGender((profile.gender as 'male' | 'female') || '');
      setHeightCm(profile.height_cm?.toString() || '');
      setWeightKg(profile.weight_kg?.toString() || '');
      setActivityLevel(profile.activity_level || '');
      setGoal(profile.goal || '');
    }
  }, [profile]);

  useEffect(() => {
    if (gender && weightKg && heightCm && birthDate && activityLevel && goal) {
      const age = calculateAge(birthDate);
      const bmr = calculateBMR(gender as 'male' | 'female', Number(weightKg), Number(heightCm), age);
      const tdee = calculateTDEE(bmr, activityLevel as any);
      const calories = calculateDailyCalories(tdee, goal as any);
      const nutrients = calculateAllNutrients(calories, goal as any);
      
      setPreviewNutrients({ calories, ...nutrients });
    } else {
      setPreviewNutrients(null);
    }
  }, [gender, weightKg, heightCm, birthDate, activityLevel, goal]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        birth_date: birthDate || null,
        gender: gender as 'male' | 'female' || null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        activity_level: activityLevel as any || null,
        goal: goal as any || null,
      });
      navigate('/');
    } catch (error) {
      // silently fail
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl px-4 py-4 flex items-center gap-4 shadow-soft">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Meu Perfil</h1>
      </header>

      <div className="px-4 py-4 space-y-4 animate-slide-up">
        {/* Personal Info */}
        <div className="card-compact space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold">Informações Pessoais</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="h-12 rounded-xl" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data de nascimento
              </label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="h-12 rounded-xl" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sexo biológico</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`rounded-xl p-3 text-center font-medium transition-all ${
                    gender === 'male' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  Masculino
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`rounded-xl p-3 text-center font-medium transition-all ${
                    gender === 'female' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  Feminino
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Body Measurements */}
        <div className="card-compact space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Scale className="h-5 w-5 text-violet-500" />
            </div>
            <h2 className="font-semibold">Medidas Corporais</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Altura (cm)
              </label>
              <Input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="170" min={100} max={250} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Peso (kg)
              </label>
              <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="70" min={30} max={300} step={0.1} className="h-12 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Activity Level */}
        <div className="card-compact space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
              <Activity className="h-5 w-5 text-sky-500" />
            </div>
            <h2 className="font-semibold">Nível de Atividade</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(activityLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActivityLevel(key)}
                className={`w-full rounded-xl p-3 text-left text-sm font-medium transition-all ${
                  activityLevel === key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div className="card-compact space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
              <Target className="h-5 w-5 text-rose-500" />
            </div>
            <h2 className="font-semibold">Objetivo</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(goalLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setGoal(key)}
                className={`w-full rounded-xl p-3 text-left text-sm font-medium transition-all ${
                  goal === key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Calculations */}
        {previewNutrients && (
          <div className="card-compact space-y-4 animate-scale-in bg-primary/5">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Suas Metas Diárias</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{previewNutrients.calories}</p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
              <div className="rounded-xl bg-orange-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-orange-500">{previewNutrients.protein}g</p>
                <p className="text-xs text-muted-foreground">proteína</p>
              </div>
              <div className="rounded-xl bg-sky-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-sky-500">{previewNutrients.carbs}g</p>
                <p className="text-xs text-muted-foreground">carboidratos</p>
              </div>
              <div className="rounded-xl bg-violet-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-violet-500">{previewNutrients.fat}g</p>
                <p className="text-xs text-muted-foreground">gordura total</p>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Calculado com fórmula Mifflin-St Jeor + recomendações ANVISA/OMS
            </p>
          </div>
        )}


        <Button 
          size="lg" 
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" 
          onClick={handleSave} 
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar Perfil'}
        </Button>

        {/* Quick links */}
        <div className="card-compact divide-y divide-border">
          <button
            type="button"
            onClick={() => navigate('/insights')}
            className="w-full flex items-center gap-3 py-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Insights</p>
              <p className="text-xs text-muted-foreground">Correlações entre peso, exames e adesão</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/food-preferences')}
            className="w-full flex items-center gap-3 py-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <UtensilsCrossed className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Preferências alimentares</p>
              <p className="text-xs text-muted-foreground">Restrições, gostos e observações para a IA</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="w-full flex items-center gap-3 py-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
              <Share2 className="h-5 w-5 text-sky-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Compartilhar com profissional</p>
              <p className="text-xs text-muted-foreground">PDF ou link temporário para médico/nutri</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <RemindersSection />

        <DataExportSection />

        <ShareSummaryDialog open={shareOpen} onOpenChange={setShareOpen} />

        {/* Legal */}
        <div className="card-compact divide-y divide-border">
          <button
            type="button"
            onClick={() => navigate('/termos')}
            className="w-full flex items-center gap-3 py-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Termos de Uso</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/privacidade')}
            className="w-full flex items-center gap-3 py-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Política de Privacidade</p>
              <p className="text-xs text-muted-foreground">Como tratamos seus dados (LGPD)</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <Button variant="outline" size="lg" className="w-full h-12 rounded-xl" onClick={handleSignOut}>
          Sair da conta
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir minha conta
        </Button>

        <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
      </div>

      <BottomNav />
    </div>
  );
}
