import { useState } from 'react';
import { Flame, Apple, User, Loader2 } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { FoodEntryItemDB } from '@/components/FoodEntryItemDB';
import { AddFoodMenu } from '@/components/AddFoodMenu';
import { PhotoCapture } from '@/components/PhotoCapture';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { ManualEntryForm } from '@/components/ManualEntryForm';
import { LiquidTracker } from '@/components/LiquidTracker';
import { WeightTracker } from '@/components/WeightTracker';
import { ExerciseTracker } from '@/components/ExerciseTracker';
import { NutritionProgressGrid } from '@/components/NutritionProgressGrid';
import { WeightReminderPopup } from '@/components/WeightReminderPopup';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { useLiquidEntries } from '@/hooks/useLiquidEntries';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { useProfile } from '@/hooks/useProfile';
import { BarcodeProduct, NutritionData } from '@/types/nutrition';
import { FoodEntryDB } from '@/types/profile';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type ModalType = 'photo' | 'barcode' | 'manual' | null;

export function Dashboard() {
  const navigate = useNavigate();
  const { entries, isLoading, addEntry, updateEntry, deleteEntry, getTodaySummary } = useFoodEntries();
  const { addLiquidEntry } = useLiquidEntries();
  const { getTodayTotalBurned } = useExerciseEntries();
  const { profile, getGoals, isProfileComplete } = useProfile();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const goals = getGoals();
  const { consumed } = getTodaySummary();
  const caloriesBurned = getTodayTotalBurned();
  
  // Calorias líquidas = consumidas - queimadas com exercício
  const netCalories = consumed.calories - caloriesBurned;
  const calorieProgress = (netCalories / goals.calories) * 100;
  const remainingCalories = Math.max(0, goals.calories - netCalories);

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const handlePhotoAnalyzed = async (name: string, nutrition: NutritionData, imageUrl: string, isLiquid?: boolean, liquidMl?: number) => {
    try {
      await addEntry({ 
        name, 
        nutrition, 
        imageUrl, 
        quantity: 1, 
        unit: 'porção', 
        source: 'photo',
        isLiquid: isLiquid || false,
        liquidMl: liquidMl || 0
      });
      
      if (isLiquid && liquidMl && liquidMl > 0) {
        await addLiquidEntry(liquidMl, 'other');
      }
      
      toast.success('Refeição adicionada!');
    } catch { toast.error('Erro ao adicionar'); }
    setActiveModal(null);
  };

  const handleBarcodeProduct = async (product: BarcodeProduct, portionGrams: number, isLiquid?: boolean, liquidMl?: number) => {
    try {
      await addEntry({ 
        name: product.name, 
        nutrition: product.nutrition, 
        imageUrl: product.imageUrl, 
        quantity: portionGrams, 
        unit: isLiquid ? 'ml' : 'g', 
        source: 'barcode',
        isLiquid: isLiquid || false,
        liquidMl: liquidMl || 0
      });
      
      if (isLiquid && liquidMl && liquidMl > 0) {
        await addLiquidEntry(liquidMl, 'other');
      }
      
      toast.success('Produto adicionado!');
    } catch { toast.error('Erro ao adicionar'); }
    setActiveModal(null);
  };

  const handleManualEntry = async (name: string, nutrition: NutritionData, quantity: number, unit: string) => {
    try {
      await addEntry({ name, nutrition, quantity, unit, source: 'manual' });
      toast.success('Alimento adicionado!');
    } catch { toast.error('Erro ao adicionar'); }
    setActiveModal(null);
  };

  const handleUpdateEntry = async (id: string, updates: Partial<FoodEntryDB>) => {
    try { await updateEntry(id, updates); toast.success('Atualizado!'); } catch { toast.error('Erro'); }
  };

  const handleDeleteEntry = async (id: string) => {
    try { await deleteEntry(id); toast.success('Removido!'); } catch { toast.error('Erro'); }
  };

  if (isLoading) {
    return <div className="min-h-screen gradient-hero flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <header className="px-5 pt-8 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Olá, {profile?.name?.split(' ')[0] || 'Usuário'}! 👋</h1>
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="rounded-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><User className="h-5 w-5 text-primary" /></div>
          </Button>
        </div>
        {!isProfileComplete() && (
          <button onClick={() => navigate('/profile')} className="mt-4 w-full rounded-xl bg-accent/10 p-3 text-left">
            <p className="text-sm font-medium text-accent">⚠️ Complete seu perfil para metas personalizadas</p>
          </button>
        )}
      </header>

      {/* Calorias */}
      <section className="px-5 py-4">
        <div className="rounded-3xl gradient-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-muted-foreground"><Flame className="h-4 w-4" /><span className="text-sm font-medium">Balanço Calórico</span></div>
              <div className="mt-2">
                <span className="text-4xl font-bold">{Math.round(netCalories)}</span>
                <span className="text-lg text-muted-foreground"> / {goals.calories}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                <p>🍽️ Consumido: {Math.round(consumed.calories)} kcal</p>
                {caloriesBurned > 0 && <p>🏃 Exercícios: -{caloriesBurned} kcal</p>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground font-medium">
                {remainingCalories > 0 ? `Restam ${Math.round(remainingCalories)} kcal` : 'Meta atingida! 🎉'}
              </p>
            </div>
            <ProgressRing progress={calorieProgress} size={100} strokeWidth={8} color={calorieProgress > 100 ? 'destructive' : 'primary'}>
              <span className="text-xl font-bold">{Math.round(calorieProgress)}%</span>
            </ProgressRing>
          </div>
        </div>
      </section>

      {/* Todos os Nutrientes com Percentual */}
      <section className="px-5 py-2">
        <NutritionProgressGrid consumed={consumed} goals={goals} />
      </section>

      {/* Exercícios */}
      <section className="px-5 py-2">
        <ExerciseTracker />
      </section>

      {/* Peso e Hidratação lado a lado */}
      <section className="px-5 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <WeightTracker />
          <LiquidTracker />
        </div>
      </section>

      {/* Refeições */}
      <section className="px-5 py-4">
        <h2 className="text-lg font-semibold mb-3">Refeições de Hoje</h2>
        {entries.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center">
            <Apple className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">Nenhuma refeição registrada</p>
          </div>
        ) : (
          <div className="space-y-3">{entries.map((entry) => <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} />)}</div>
        )}
      </section>

      <AddFoodMenu onOpenPhoto={() => setActiveModal('photo')} onOpenBarcode={() => setActiveModal('barcode')} onOpenManual={() => setActiveModal('manual')} />
      {activeModal === 'photo' && <PhotoCapture onFoodAnalyzed={handlePhotoAnalyzed} onClose={() => setActiveModal(null)} />}
      {activeModal === 'barcode' && <BarcodeScanner onProductFound={handleBarcodeProduct} onClose={() => setActiveModal(null)} />}
      {activeModal === 'manual' && <ManualEntryForm onSubmit={handleManualEntry} onClose={() => setActiveModal(null)} />}
      <WeightReminderPopup />
    </div>
  );
}
