import { useState } from 'react';
import { Flame, Apple, Loader2, TrendingDown, TrendingUp, Droplets, ArrowDownUp, Clock, Layers, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ProgressRing';
import { FoodEntryItemDB } from '@/components/FoodEntryItemDB';
import { AddFoodMenu } from '@/components/AddFoodMenu';
import { PhotoCapture } from '@/components/PhotoCapture';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { ManualEntryForm } from '@/components/ManualEntryForm';
import { ProductSearch } from '@/components/ProductSearch';
import { AddLiquidDialog } from '@/components/AddLiquidDialog';
import { EditLiquidDialog } from '@/components/EditLiquidDialog';
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
type SortType = 'time' | 'type';

interface LiquidEntryData {
  id: string;
  amount_ml: number;
  type: string;
  consumed_at: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { entries, isLoading, addEntry, updateEntry, deleteEntry, getTodaySummary, refetch: refetchFood } = useFoodEntries();
  const { entries: liquidEntriesData, addLiquidEntry, updateLiquidEntry, deleteLiquidEntry, getTodayTotal, refetch: refetchLiquids, liquidTypes } = useLiquidEntries();
  const { profile, getGoals, isProfileComplete } = useProfile();
  const { getTodayTotalBurned } = useExerciseEntries();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [sortType, setSortType] = useState<SortType>('type');
  const [editingLiquid, setEditingLiquid] = useState<LiquidEntryData | null>(null);

  const goals = getGoals();
  const { consumed } = getTodaySummary();
  const caloriesBurned = getTodayTotalBurned();
  
  // Calcular total de líquidos: liquid_entries + food_entries com is_liquid=true
  const liquidFromEntries = getTodayTotal(); // from liquid_entries
  const liquidFromFood = entries
    .filter(e => e.is_liquid === true && e.liquid_ml)
    .reduce((sum, e) => sum + (e.liquid_ml || 0), 0);
  const todayLiquid = liquidFromEntries + liquidFromFood;
  
  const dailyLiquidGoal = profile?.daily_liquid_ml || 2000;
  const netCalories = consumed.calories - caloriesBurned;
  const calorieProgress = (netCalories / goals.calories) * 100;
  const remainingCalories = Math.max(0, goals.calories - netCalories);
  const dailyWeightChange = ((netCalories - goals.calories) / 7700 * 1000);
  const isDeficit = dailyWeightChange < 0;

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  const handlePhotoAnalyzed = async (name: string, nutrition: NutritionData, imageUrl: string, isLiquid?: boolean, liquidMl?: number) => {
    try {
      // Add food entry only - liquid tracking comes from is_liquid + liquid_ml fields
      await addEntry({ 
        name, 
        nutrition, 
        imageUrl, 
        quantity: liquidMl || 1, 
        unit: isLiquid ? 'ml' : 'porção', 
        source: 'photo', 
        isLiquid: isLiquid || false, 
        liquidMl: liquidMl || 0 
      });
      // Note: Don't add separate liquid_entry - it's already tracked via food_entries.is_liquid
    } catch { /* silently fail */ }
    setActiveModal(null);
  };

  const handleBarcodeProduct = async (product: BarcodeProduct, portionGrams: number, isLiquid?: boolean, liquidMl?: number) => {
    try {
      // Add food entry only - liquid tracking comes from is_liquid + liquid_ml fields
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
      // Note: Don't add separate liquid_entry - it's already tracked via food_entries.is_liquid
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
      // Add only to liquid_entries for daily tracking (single source of truth)
      await addLiquidEntry(ml, type);
      refetchLiquids();
    } catch (err) { 
      console.error('Error adding liquid:', err);
    }
  };

  // Separar entries em refeições (food_entries não são líquidos)
  const mealEntries = entries.filter(e => e.is_liquid !== true);
  
  // food_entries que são líquidos
  const liquidFoodEntries = entries.filter(e => e.is_liquid === true);
  
  // Total de itens líquidos (liquid_entries + food_entries líquidos)
  const totalLiquidItems = liquidEntriesData.length + liquidFoodEntries.length;
  
  // All entries sorted by time (for 'time' sort mode) - combining food and liquid entries
  const allEntriesByTime = [...entries].sort((a, b) => 
    new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
  );

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
              </div>

              {/* Projeção de peso */}
              <div className={`mt-2 p-2 rounded-lg ${isDeficit ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                <p className="text-xs font-medium flex items-center gap-1">
                  {isDeficit ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {isDeficit ? 'Perda estimada hoje:' : 'Ganho estimado hoje:'}
                  <span className="font-bold">{Math.abs(dailyWeightChange).toFixed(0)}g</span>
                </p>
                <p className="text-[10px] opacity-80 mt-0.5">
                  {isDeficit 
                    ? `Déficit de ${Math.abs(Math.round(netCalories - goals.calories))} kcal`
                    : `Excesso de ${Math.round(netCalories - goals.calories)} kcal`
                  }
                </p>
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
        {(() => {
          const remainingLiquid = Math.max(0, dailyLiquidGoal - todayLiquid);
          const progressPercent = Math.min((todayLiquid / dailyLiquidGoal) * 100, 100);
          const isComplete = todayLiquid >= dailyLiquidGoal;
          
          // Formatar líquidos: ml se < 1000, L se >= 1000
          const formatLiquid = (ml: number) => {
            if (ml >= 1000) {
              return `${(ml / 1000).toFixed(1)}L`;
            }
            return `${Math.round(ml)}ml`;
          };
          
          return (
            <div className="card-compact flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-water">
                  <Droplets className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">Líquidos</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold num-display text-sky-500">{formatLiquid(todayLiquid)}</span>
                    <span className="text-xs text-muted-foreground">/ {formatLiquid(dailyLiquidGoal)}</span>
                  </div>
                  <p className={`text-xs font-medium ${isComplete ? 'text-emerald-500' : 'text-sky-500'}`}>
                    {isComplete ? '🎉 Meta atingida!' : `Faltam ${formatLiquid(remainingLiquid)}`}
                  </p>
                </div>
              </div>
              <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          );
        })()}

        {/* Peso */}
        <WeightTracker />

        {/* Nutrientes */}
        <NutritionProgressGrid consumed={consumed} goals={goals} />

        {/* Consumo do dia - Header com toggle de ordenação */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Apple className="h-4 w-4 text-primary" />
            Consumo do dia
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setSortType(sortType === 'type' ? 'time' : 'type')}
          >
            {sortType === 'type' ? (
              <>
                <Layers className="h-3 w-3 mr-1" />
                Por tipo
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Por horário
              </>
            )}
          </Button>
        </div>

        {entries.length === 0 ? (
          <div className="card-compact text-center py-6">
            <p className="text-sm text-muted-foreground">Nenhum registro hoje</p>
          </div>
        ) : sortType === 'type' ? (
          <div className="space-y-4">
            {/* Refeições */}
            {mealEntries.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Apple className="h-3 w-3" />
                  Refeições ({mealEntries.length})
                </p>
                <div className="space-y-2">
                  {mealEntries.slice(0, 5).map((entry) => (
                    <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} />
                  ))}
                  {mealEntries.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground">+{mealEntries.length - 5} mais</p>
                  )}
                </div>
              </div>
            )}

            {/* Líquidos - from liquid_entries + food_entries com is_liquid */}
            {totalLiquidItems > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-sky-500" />
                  Líquidos ({totalLiquidItems})
                </p>
                <div className="space-y-2">
                  {/* Liquid entries from liquid_entries table */}
                  {liquidEntriesData.slice(0, 5).map((entry) => (
                    <div key={`liquid-${entry.id}`} className="group flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card transition-all duration-200 hover:shadow-soft animate-scale-in overflow-hidden">
                      <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-500/10">
                        <Droplets className="h-6 w-6 text-sky-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate text-sm">{liquidTypes[entry.type as keyof typeof liquidTypes] || entry.type}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(entry.consumed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(entry.consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="inline-flex items-center rounded-md bg-sky-500/10 px-1.5 py-0.5 text-xs font-medium text-sky-600">
                            <Droplets className="h-3 w-3 mr-0.5" />
                            {entry.amount_ml}ml
                          </span>
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                            0 kcal
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => setEditingLiquid(entry)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteLiquidEntry(entry.id).then(() => refetchLiquids())}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Liquid entries from food_entries with is_liquid=true - show full nutrition */}
                  {liquidFoodEntries.slice(0, Math.max(0, 5 - liquidEntriesData.length)).map((entry) => (
                    <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} />
                  ))}
                  
                  {totalLiquidItems > 5 && (
                    <p className="text-xs text-center text-muted-foreground">+{totalLiquidItems - 5} mais</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {allEntriesByTime.slice(0, 10).map((entry) => (
              <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} />
            ))}
            {allEntriesByTime.length > 10 && (
              <p className="text-xs text-center text-muted-foreground">+{allEntriesByTime.length - 10} mais</p>
            )}
          </div>
        )}
      </div>

      <AddFoodMenu 
        onOpenPhoto={() => setActiveModal('photo')} 
        onOpenBarcode={() => setActiveModal('barcode')} 
        onOpenSearch={() => setActiveModal('search')} 
        onOpenLiquid={() => setActiveModal('liquid')}
      />
      {activeModal === 'photo' && <PhotoCapture onFoodAnalyzed={handlePhotoAnalyzed} onClose={() => setActiveModal(null)} />}
      {activeModal === 'barcode' && <BarcodeScanner onProductFound={handleBarcodeProduct} onClose={() => { setActiveModal(null); refetchFood(); }} />}
      <ProductSearch isOpen={activeModal === 'search'} onClose={() => { setActiveModal(null); refetchFood(); }} />
      <AddLiquidDialog open={activeModal === 'liquid'} onOpenChange={(open) => !open && setActiveModal(null)} onAddLiquid={handleAddLiquid} />
      <EditLiquidDialog 
        entry={editingLiquid}
        liquidTypes={liquidTypes}
        open={!!editingLiquid}
        onOpenChange={(open) => !open && setEditingLiquid(null)}
        onSave={async (id, amountMl) => {
          await updateLiquidEntry(id, amountMl);
          refetchLiquids();
        }}
      />
      <WeightReminderPopup />
      <BottomNav />
    </div>
  );
}
