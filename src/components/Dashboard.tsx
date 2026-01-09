import { useState } from 'react';
import { Flame, Apple, Loader2, TrendingDown, TrendingUp, Droplets } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { FoodEntryItemDB } from '@/components/FoodEntryItemDB';
import { AddFoodMenu } from '@/components/AddFoodMenu';
import { PhotoCapture } from '@/components/PhotoCapture';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { ManualEntryForm } from '@/components/ManualEntryForm';
import { ProductSearch } from '@/components/ProductSearch';
import { AddLiquidDialog } from '@/components/AddLiquidDialog';
import { WeightTracker } from '@/components/WeightTracker';
import { ExerciseTracker } from '@/components/ExerciseTracker';
import { NutritionProgressGrid } from '@/components/NutritionProgressGrid';
import { WeightReminderPopup } from '@/components/WeightReminderPopup';
import { WeightProjection } from '@/components/WeightProjection';
import { BottomNav } from '@/components/BottomNav';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { useLiquidEntries } from '@/hooks/useLiquidEntries';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { useProfile } from '@/hooks/useProfile';
import { BarcodeProduct, NutritionData } from '@/types/nutrition';
import { FoodEntryDB } from '@/types/profile';

import { useNavigate } from 'react-router-dom';

type ModalType = 'photo' | 'barcode' | 'manual' | 'search' | 'liquid' | null;

export function Dashboard() {
  const navigate = useNavigate();
  const { entries, isLoading, addEntry, updateEntry, deleteEntry, getTodaySummary } = useFoodEntries();
  const { addLiquidEntry, getTodayTotal, refetch: refetchLiquids } = useLiquidEntries();
  const { profile, getGoals, isProfileComplete } = useProfile();
  const { getTodayTotalBurned } = useExerciseEntries();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const goals = getGoals();
  const { consumed } = getTodaySummary();
  const caloriesBurned = getTodayTotalBurned();
  const todayLiquid = getTodayTotal();
  const dailyLiquidGoal = profile?.daily_liquid_ml || 2000;
  const netCalories = consumed.calories - caloriesBurned;
  const calorieProgress = (netCalories / goals.calories) * 100;
  const remainingCalories = Math.max(0, goals.calories - netCalories);
  const dailyWeightChange = ((netCalories - goals.calories) / 7700 * 1000);
  const isDeficit = dailyWeightChange < 0;

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  const handlePhotoAnalyzed = async (name: string, nutrition: NutritionData, imageUrl: string, isLiquid?: boolean, liquidMl?: number) => {
    try {
      const entry = await addEntry({ name, nutrition, imageUrl, quantity: liquidMl || 1, unit: isLiquid ? 'ml' : 'porção', source: 'photo', isLiquid: isLiquid || false, liquidMl: liquidMl || 0 });
      if (isLiquid && liquidMl && liquidMl > 0 && entry) {
        await addLiquidEntry(liquidMl, 'other');
        refetchLiquids();
      }
    } catch { /* silently fail */ }
    setActiveModal(null);
  };

  const handleBarcodeProduct = async (product: BarcodeProduct, portionGrams: number, isLiquid?: boolean, liquidMl?: number) => {
    try {
      const entry = await addEntry({ name: product.name, nutrition: product.nutrition, imageUrl: product.imageUrl, quantity: portionGrams, unit: isLiquid ? 'ml' : 'g', source: 'barcode', isLiquid: isLiquid || false, liquidMl: liquidMl || 0 });
      if (isLiquid && liquidMl && liquidMl > 0 && entry) {
        await addLiquidEntry(liquidMl, 'other');
        refetchLiquids();
      }
    } catch { /* silently fail */ }
    setActiveModal(null);
  };

  const handleManualEntry = async (name: string, nutrition: NutritionData, quantity: number, unit: string) => {
    try {
      await addEntry({ name, nutrition, quantity, unit, source: 'manual' });
    } catch { /* silently fail */ }
    setActiveModal(null);
  };

  const handleUpdateEntry = async (id: string, updates: Partial<FoodEntryDB>) => {
    try { 
      await updateEntry(id, updates); 
    } catch { /* silently fail */ }
  };

  const handleDeleteEntry = async (id: string) => {
    try { 
      await deleteEntry(id); 
    } catch { /* silently fail */ }
  };

  const handleAddLiquid = async (ml: number, type: string) => {
    try {
      await addLiquidEntry(ml, type);
      refetchLiquids();
    } catch { /* silently fail */ }
  };

  // Separar entries em refeições e líquidos
  const mealEntries = entries.filter(e => !e.is_liquid);
  const liquidEntries = entries.filter(e => e.is_liquid);

  if (isLoading) {
    return <div className="min-h-screen gradient-hero flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen gradient-hero pb-28">
      {/* Header compacto */}
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Olá, {profile?.name?.split(' ')[0] || 'Usuário'} 👋</h1>
            <p className="text-xs text-muted-foreground capitalize">{today}</p>
          </div>
        </div>
      </header>

      <div className="px-4 space-y-3 pt-4">
        {/* Alerta perfil incompleto */}
        {!isProfileComplete() && (
          <button onClick={() => navigate('/profile')} className="w-full rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-left animate-fade-in">
            <p className="text-sm font-medium text-amber-600">⚠️ Complete seu perfil</p>
          </button>
        )}

        {/* Card Principal - Calorias */}
        <div className="card-feature gradient-calories text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 opacity-90">
                <Flame className="h-4 w-4" />
                <span className="text-xs font-medium">Balanço do dia</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl num-display">{Math.round(netCalories)}</span>
                <span className="text-sm opacity-80">/ {goals.calories} kcal</span>
              </div>
              
              {/* Info rápida */}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-90">
                <span>🍽️ {Math.round(consumed.calories)}</span>
                {caloriesBurned > 0 && <span>🏃 -{caloriesBurned}</span>}
                <span className={`font-semibold flex items-center gap-0.5 ${isDeficit ? 'text-emerald-200' : 'text-amber-200'}`}>
                  {isDeficit ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {dailyWeightChange.toFixed(0)}g
                </span>
              </div>

              <p className="mt-2 text-sm font-semibold">
                {remainingCalories > 0 ? `Restam ${Math.round(remainingCalories)} kcal` : '🎉 Meta atingida!'}
              </p>
            </div>
            <ProgressRing progress={calorieProgress} size={80} strokeWidth={6} color={calorieProgress > 100 ? 'destructive' : 'primary'}>
              <span className="text-lg font-bold text-white">{Math.round(calorieProgress)}%</span>
            </ProgressRing>
          </div>
          
          <WeightProjection 
            consumedCalories={consumed.calories}
            burnedCalories={caloriesBurned}
            goalCalories={goals.calories}
            currentWeight={profile?.weight_kg || 70}
          />
        </div>

        {/* Exercícios */}
        <ExerciseTracker />

        {/* Info Líquidos no Balanço */}
        <div className="card-compact flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-water">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Líquidos</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold num-display text-sky-500">{(todayLiquid / 1000).toFixed(1)}L</span>
                <span className="text-xs text-muted-foreground">/ {(dailyLiquidGoal / 1000).toFixed(1)}L</span>
              </div>
            </div>
          </div>
          <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${Math.min((todayLiquid / dailyLiquidGoal) * 100, 100)}%` }} />
          </div>
        </div>

        {/* Peso */}
        <WeightTracker />

        {/* Nutrientes */}
        <NutritionProgressGrid consumed={consumed} goals={goals} />

        {/* Refeições */}
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Apple className="h-4 w-4 text-primary" />
            Refeições
          </h2>
          {mealEntries.length === 0 ? (
            <div className="card-compact text-center py-6">
              <p className="text-sm text-muted-foreground">Nenhuma refeição</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mealEntries.slice(0, 5).map((entry) => (
                <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} />
              ))}
              {mealEntries.length > 5 && (
                <p className="text-xs text-center text-muted-foreground">+{mealEntries.length - 5} mais</p>
              )}
            </div>
          )}
        </div>

        {/* Líquidos (produtos) */}
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-sky-500" />
            Bebidas
          </h2>
          {liquidEntries.length === 0 ? (
            <div className="card-compact text-center py-6">
              <p className="text-sm text-muted-foreground">Nenhuma bebida registrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {liquidEntries.slice(0, 5).map((entry) => (
                <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} />
              ))}
              {liquidEntries.length > 5 && (
                <p className="text-xs text-center text-muted-foreground">+{liquidEntries.length - 5} mais</p>
              )}
            </div>
          )}
        </div>
      </div>

      <AddFoodMenu 
        onOpenPhoto={() => setActiveModal('photo')} 
        onOpenBarcode={() => setActiveModal('barcode')} 
        onOpenManual={() => setActiveModal('manual')} 
        onOpenSearch={() => setActiveModal('search')} 
        onOpenLiquid={() => setActiveModal('liquid')}
      />
      {activeModal === 'photo' && <PhotoCapture onFoodAnalyzed={handlePhotoAnalyzed} onClose={() => setActiveModal(null)} />}
      {activeModal === 'barcode' && <BarcodeScanner onProductFound={handleBarcodeProduct} onClose={() => setActiveModal(null)} />}
      {activeModal === 'manual' && <ManualEntryForm onSubmit={handleManualEntry} onClose={() => setActiveModal(null)} />}
      <ProductSearch isOpen={activeModal === 'search'} onClose={() => setActiveModal(null)} />
      <AddLiquidDialog open={activeModal === 'liquid'} onOpenChange={(open) => !open && setActiveModal(null)} onAddLiquid={handleAddLiquid} />
      <WeightReminderPopup />
      <BottomNav />
    </div>
  );
}
