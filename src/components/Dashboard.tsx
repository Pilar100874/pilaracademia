import { useState } from 'react';
import { Flame, Loader2, Droplets, Dumbbell, Scale, TrendingDown, TrendingUp, ChevronDown, Minus, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DaySelector } from '@/components/DaySelector';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroSummary } from '@/components/MacroSummary';
import { RecentFoodList } from '@/components/RecentFoodList';
import { AddFoodMenu } from '@/components/AddFoodMenu';
import { RepeatYesterdayDialog } from '@/components/RepeatYesterdayDialog';
import { PhotoCapture } from '@/components/PhotoCapture';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { ProductSearch } from '@/components/ProductSearch';
import { AddLiquidDialog } from '@/components/AddLiquidDialog';
import { EditLiquidDialog } from '@/components/EditLiquidDialog';
import { TypedFoodDialog } from '@/components/TypedFoodDialog';
import { VoiceFoodDialog } from '@/components/VoiceFoodDialog';
import { FoodEntryItemDB } from '@/components/FoodEntryItemDB';
import { BottomNav } from '@/components/BottomNav';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { WeightReminderPopup } from '@/components/WeightReminderPopup';
import { WeightTracker } from '@/components/WeightTracker';
import { ExerciseTracker } from '@/components/ExerciseTracker';
import { LiquidTracker } from '@/components/LiquidTracker';
import { GlycemiaTracker } from '@/components/GlycemiaTracker';
import { BodyPlanShortcut } from '@/components/BodyPlanShortcut';
import { AdherenceCard } from '@/components/AdherenceCard';
import { AdherenceHistoryChart } from '@/components/AdherenceHistoryChart';
import { SmartAlertsCard } from '@/components/SmartAlertsCard';
import { DailyMenuDialog } from '@/components/DailyMenuDialog';
import { WeeklyCheckinCard } from '@/components/WeeklyCheckinCard';
import { useAdherenceScore } from '@/hooks/useAdherenceScore';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { useLiquidEntries } from '@/hooks/useLiquidEntries';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { useProfile } from '@/hooks/useProfile';
import { useWeightHistory } from '@/hooks/useWeightHistory';
import { useGlycemiaEntries, getGlycemiaStatus } from '@/hooks/useGlycemiaEntries';
import { BarcodeProduct, NutritionData } from '@/types/nutrition';
import { FoodEntryDB } from '@/types/profile';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { StreakBadge } from '@/components/StreakBadge';

type ModalType = 'photo' | 'barcode' | 'manual' | 'search' | 'liquid' | 'typed' | 'voice' | 'repeat' | null;

interface LiquidEntryData {
  id: string;
  amount_ml: number;
  type: string;
  consumed_at: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const isViewingToday = isToday(selectedDate);
  
  const { entries, isLoading, addEntry, updateEntry, deleteEntry, getTodaySummary, refetch: refetchFood } = useFoodEntries(selectedDate);
  const { entries: liquidEntriesData, addLiquidEntry, updateLiquidEntry, deleteLiquidEntry, getTodayTotal, refetch: refetchLiquids, liquidTypes } = useLiquidEntries(selectedDate);
  const { profile, getGoals, isProfileComplete } = useProfile();
  const { getTodayTotalBurned } = useExerciseEntries(selectedDate);
  const { entries: weightEntries } = useWeightHistory();
  const { getLatestReading } = useGlycemiaEntries(selectedDate);
  
  const [activeModal, setActiveModal] = useState<ModalType>(() => {
    const saved = sessionStorage.getItem('activeModal');
    if (saved && ['photo', 'barcode'].includes(saved)) {
      sessionStorage.removeItem('activeModal');
      return saved as ModalType;
    }
    return null;
  });
  
  // Persist modal state for camera/barcode so it survives page unload on mobile
  const openModal = (modal: ModalType) => {
    if (modal === 'photo' || modal === 'barcode') {
      sessionStorage.setItem('activeModal', modal);
    }
    setActiveModal(modal);
  };
  const closeModal = () => {
    sessionStorage.removeItem('activeModal');
    setActiveModal(null);
    // Sync Dashboard's food list with anything that may have been added
    // by sub-dialogs that use their own useFoodEntries() instance.
    refetchFood();
  };
  const [editingLiquid, setEditingLiquid] = useState<LiquidEntryData | null>(null);
  const [deletingLiquid, setDeletingLiquid] = useState<LiquidEntryData | null>(null);
  const [editingTypedEntry, setEditingTypedEntry] = useState<FoodEntryDB | null>(null);
  const [editingVoiceEntry, setEditingVoiceEntry] = useState<FoodEntryDB | null>(null);
  const [editingPhotoEntry, setEditingPhotoEntry] = useState<FoodEntryDB | null>(null);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const goals = getGoals();
  const { consumed } = getTodaySummary();
  const caloriesBurned = getTodayTotalBurned();
  
  // Calcular total de líquidos
  const liquidFromEntries = getTodayTotal();
  const liquidFromFood = entries
    .filter(e => e.is_liquid === true && e.liquid_ml)
    .reduce((sum, e) => sum + (e.liquid_ml || 0), 0);
  const todayLiquid = liquidFromEntries + liquidFromFood;
  
  const dailyLiquidGoal = goals.liquid_ml || profile?.daily_liquid_ml || 2000;
  const netCalories = consumed.calories - caloriesBurned;

  // Adherence score & smart alerts (Leva 1)
  const adherence = useAdherenceScore({
    consumed: { calories: consumed.calories, protein: consumed.protein, carbs: consumed.carbs, fat: consumed.fat },
    goals: { calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat, liquid_ml: dailyLiquidGoal },
    liquidMl: todayLiquid,
    caloriesBurned,
    hasWorkout: caloriesBurned > 0,
  });
  const smartAlerts = useSmartAlerts({
    adherence,
    consumed: { calories: consumed.calories, protein: consumed.protein },
    goals: { calories: goals.calories, protein: goals.protein },
    liquidMl: todayLiquid,
    liquidGoal: dailyLiquidGoal,
    hasAnyEntry: entries.length > 0 || todayLiquid > 0 || caloriesBurned > 0,
  });

  // Weight data
  const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1]?.weight_kg : (profile?.weight_kg || 0);
  const previousWeight = weightEntries.length >= 2 ? weightEntries[weightEntries.length - 2]?.weight_kg : currentWeight;
  const weightDiff = weightEntries.length >= 2 ? currentWeight - previousWeight : 0;
  const chartData = weightEntries.slice(-7).map((e) => ({ peso: Number(e.weight_kg) }));

  const formatLiquid = (ml: number) => {
    if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
    return `${Math.round(ml)}ml`;
  };

  const getTrendIcon = () => {
    if (Math.abs(weightDiff) < 0.3) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (weightDiff < 0) return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <TrendingUp className="h-3 w-3 text-amber-500" />;
  };

  // Handlers
  const handlePhotoAnalyzed = async (name: string, nutrition: NutritionData, imageUrl: string, isLiquid?: boolean, liquidMl?: number, grams?: number) => {
    try {
      await addEntry({ 
        name, nutrition, imageUrl, 
        quantity: isLiquid ? (liquidMl || 250) : (grams || 300), 
        unit: isLiquid ? 'ml' : 'g', 
        source: 'photo', 
        isLiquid: isLiquid || false, 
        liquidMl: liquidMl || 0 
      });
    } catch { /* silently fail */ }
    closeModal();
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
    } catch { /* silently fail */ }
    closeModal();
  };

  const handleUpdateEntry = async (id: string, updates: Partial<FoodEntryDB>) => {
    try { await updateEntry(id, updates); } catch { /* silently fail */ }
  };

  const handleDeleteEntry = async (id: string) => {
    try { await deleteEntry(id); } catch { /* silently fail */ }
  };

  const handleAddLiquid = async (ml: number, type: string) => {
    try {
      await addLiquidEntry(ml, type);
      refetchLiquids();
    } catch (err) { console.error('Error adding liquid:', err); }
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
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl px-4 pt-4 pb-3 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="text-lg font-bold">
              Olá, {profile?.name?.split(' ')[0] || 'Usuário'} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge />
            {!isViewingToday && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setSelectedDate(new Date())}
              >
                Hoje
              </Button>
            )}
          </div>
        </div>
        
        {/* Day Selector */}
        <DaySelector 
          selectedDate={selectedDate} 
          onSelectDate={setSelectedDate} 
        />
      </header>

      <div className="px-4 space-y-4 pt-4">
        {/* Profile warning */}
        {!isProfileComplete() && isViewingToday && (
          <button 
            onClick={() => navigate('/profile')} 
            className="w-full rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-left animate-fade-in"
          >
            <p className="text-sm font-medium text-amber-600">⚠️ Complete seu perfil para metas precisas</p>
          </button>
        )}

        {/* Body analysis plan shortcut */}
        {isViewingToday && <BodyPlanShortcut />}

        {/* Smart alerts (derived from active plan + today's data) */}
        {isViewingToday && <SmartAlertsCard alerts={smartAlerts} />}

        {/* Adherence score */}
        {isViewingToday && <AdherenceCard score={adherence} />}

        {/* Adherence trend (last 7 days) */}
        {isViewingToday && <AdherenceHistoryChart days={7} />}

        {/* AI daily menu CTA */}
        {isViewingToday && (
          <button
            onClick={() => setMenuOpen(true)}
            className="w-full rounded-md border border-border bg-card p-3 text-left flex items-center gap-3 hover:bg-muted/30 transition-colors"
          >
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Flame className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Cardápio do dia pela IA</p>
              <p className="text-xs text-muted-foreground">
                Refeições prontas que batem suas metas
              </p>
            </div>
            <span className="text-xs text-primary font-medium">Gerar</span>
          </button>
        )}

        {/* Weekly check-in (Leva 2) */}
        {isViewingToday && <WeeklyCheckinCard />}

        {/* Main Calorie Card */}
        <div className="card-feature">
          <div className="flex items-center justify-center mb-4">
            <CalorieRing 
              consumed={consumed.calories}
              burned={caloriesBurned}
              goal={goals.calories}
              size={160}
              strokeWidth={14}
            />
          </div>
          
          {/* Macro Summary */}
          <MacroSummary 
            consumed={{ 
              protein: consumed.protein, 
              carbs: consumed.carbs, 
              fat: consumed.fat 
            }}
            goals={{
              protein: goals.protein,
              carbs: goals.carbs,
              fat: goals.fat,
            }}
          />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          {/* Exercise */}
          <button 
            onClick={() => navigate('/exercises')}
            className="card-compact flex flex-col items-center gap-1 py-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
              <Dumbbell className="h-4 w-4 text-rose-500" />
            </div>
            <span className="text-base font-bold num-display text-rose-500">
              {caloriesBurned > 0 ? `-${caloriesBurned}` : '0'}
            </span>
            <span className="text-[9px] text-muted-foreground">kcal</span>
          </button>

          {/* Liquids */}
          <button 
            onClick={() => openModal('liquid')}
            className="card-compact flex flex-col items-center gap-1 py-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10">
              <Droplets className="h-4 w-4 text-sky-500" />
            </div>
            <span className="text-base font-bold num-display text-sky-500">
              {formatLiquid(todayLiquid)}
            </span>
            <span className="text-[9px] text-muted-foreground">{formatLiquid(dailyLiquidGoal)}</span>
          </button>

          {/* Weight */}
          <button 
            onClick={() => setShowWeightInput(true)}
            className="card-compact flex flex-col items-center gap-1 py-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
              <Scale className="h-4 w-4 text-violet-500" />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-base font-bold num-display">
                {currentWeight}
              </span>
              {weightEntries.length >= 2 && (
                <span className="flex items-center text-xs">
                  {getTrendIcon()}
                </span>
              )}
            </div>
            <span className="text-[9px] text-muted-foreground">kg</span>
          </button>

          {/* Glycemia */}
          <button 
            onClick={() => {}}
            className="card-compact flex flex-col items-center gap-1 py-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            {(() => {
              const latestReading = getLatestReading();
              if (latestReading) {
                const status = getGlycemiaStatus(latestReading.glucose_mg_dl, latestReading.measurement_type);
                return (
                  <>
                    <span className={`text-base font-bold num-display ${status.color}`}>
                      {latestReading.glucose_mg_dl}
                    </span>
                    <span className="text-[9px] text-muted-foreground">mg/dL</span>
                  </>
                );
              }
              return (
                <>
                  <span className="text-base font-bold num-display text-muted-foreground">--</span>
                  <span className="text-[9px] text-muted-foreground">glicemia</span>
                </>
              );
            })()}
          </button>
        </div>

        {/* Liquid Tracker */}
        <LiquidTracker selectedDate={selectedDate} onDataChange={refetchLiquids} />

        {/* Weight Tracker */}
        <WeightTracker dailyCalorieDeficit={goals.calories - netCalories} showInputInitially={showWeightInput} onInputToggled={setShowWeightInput} />

        {/* Exercise Tracker */}
        <ExerciseTracker selectedDate={selectedDate} onDataChange={() => {}} />

        {/* Glycemia Tracker */}
        <GlycemiaTracker selectedDate={selectedDate} />

        {/* Recently Logged Section */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            {isViewingToday ? 'Registros recentes' : 'Registros do dia'}
          </h2>
          
          <RecentFoodList 
            entries={entries}
            onUpdate={handleUpdateEntry}
            onDelete={handleDeleteEntry}
            onEditTyped={setEditingTypedEntry}
            onEditVoice={setEditingVoiceEntry}
            onEditPhotoBarcode={setEditingPhotoEntry}
          />
        </div>

        {/* Edit dialog for photo/barcode entries */}
        {editingPhotoEntry && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center animate-fade-in">
            <div className="bg-card w-full max-w-lg rounded-t-3xl p-4 pb-8 max-h-[90vh] overflow-y-auto animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Editar registro</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setEditingPhotoEntry(null)}
                >
                  Fechar
                </Button>
              </div>
              <FoodEntryItemDB
                entry={editingPhotoEntry}
                initialEditing
                onUpdate={(id, updates) => {
                  handleUpdateEntry(id, updates);
                  setEditingPhotoEntry(null);
                }}
                onDelete={(id) => {
                  handleDeleteEntry(id);
                  setEditingPhotoEntry(null);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddFoodMenu 
        onOpenPhoto={() => openModal('photo')} 
        onOpenBarcode={() => openModal('barcode')} 
        onOpenSearch={() => openModal('search')} 
        onOpenLiquid={() => openModal('liquid')}
        onOpenTyped={() => openModal('typed')}
        onOpenRepeat={() => openModal('repeat')}
      />

      <RepeatYesterdayDialog
        open={activeModal === 'repeat'}
        onOpenChange={(o) => (o ? openModal('repeat') : closeModal())}
        selectedDate={selectedDate}
      />
      
      {activeModal === 'photo' && (
        <PhotoCapture 
          onFoodAnalyzed={handlePhotoAnalyzed} 
          onClose={closeModal} 
          selectedDate={selectedDate} 
        />
      )}
      
      {activeModal === 'barcode' && (
        <BarcodeScanner 
          onProductFound={handleBarcodeProduct} 
          onClose={() => { closeModal(); refetchFood(); }} 
          selectedDate={selectedDate} 
        />
      )}
      
      <ProductSearch 
        isOpen={activeModal === 'search'} 
        onClose={() => { closeModal(); refetchFood(); }} 
        selectedDate={selectedDate} 
      />
      
      <AddLiquidDialog 
        open={activeModal === 'liquid'} 
        onOpenChange={(open) => !open && closeModal()} 
        onAddLiquid={handleAddLiquid} 
      />
      
      <VoiceFoodDialog
        open={activeModal === 'voice' || !!editingVoiceEntry}
        onOpenChange={(open) => {
          if (!open) {
            closeModal();
            setEditingVoiceEntry(null);
          }
        }}
        isEditing={!!editingVoiceEntry}
        initialName={editingVoiceEntry?.name || ''}
        initialItems={
          editingVoiceEntry?.original_items && editingVoiceEntry.original_items.length > 0
            ? editingVoiceEntry.original_items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                quantityGrams: 0,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
              }))
            : editingVoiceEntry 
              ? [{
                  name: editingVoiceEntry.name,
                  quantity: editingVoiceEntry.unit === 'porção' ? '' : `${editingVoiceEntry.quantity}${editingVoiceEntry.unit}`,
                  quantityGrams: editingVoiceEntry.quantity,
                  calories: editingVoiceEntry.calories,
                  protein: editingVoiceEntry.protein,
                  carbs: editingVoiceEntry.carbs,
                  fat: editingVoiceEntry.fat,
                }]
              : undefined
        }
        onSave={async (data) => {
          const originalItems = data.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
          }));

          if (editingVoiceEntry) {
            await updateEntry(editingVoiceEntry.id, {
              name: data.name,
              calories: Math.round(data.total.calories),
              protein: Math.round(data.total.protein * 10) / 10,
              carbs: Math.round(data.total.carbs * 10) / 10,
              fat: Math.round(data.total.fat * 10) / 10,
              saturated_fat: Math.round((data.total.saturatedFat || 0) * 10) / 10,
              trans_fat: Math.round((data.total.transFat || 0) * 10) / 10,
              fiber: Math.round((data.total.fiber || 0) * 10) / 10,
              sodium: Math.round(data.total.sodium || 0),
              original_items: originalItems,
            });
            setEditingVoiceEntry(null);
          } else {
            await addEntry({
              name: data.name,
              nutrition: {
                calories: Math.round(data.total.calories),
                protein: Math.round(data.total.protein * 10) / 10,
                carbs: Math.round(data.total.carbs * 10) / 10,
                fat: Math.round(data.total.fat * 10) / 10,
                saturatedFat: Math.round((data.total.saturatedFat || 0) * 10) / 10,
                transFat: Math.round((data.total.transFat || 0) * 10) / 10,
                fiber: Math.round((data.total.fiber || 0) * 10) / 10,
                sodium: Math.round(data.total.sodium || 0),
              },
              quantity: 1,
              unit: 'porção',
              source: 'voice',
              originalItems: originalItems,
            });
            closeModal();
          }
          refetchFood();
        }}
      />

      <TypedFoodDialog 
        open={activeModal === 'typed' || !!editingTypedEntry} 
        onOpenChange={(open) => {
          if (!open) {
            closeModal();
            setEditingTypedEntry(null);
          }
        }}
        isEditing={!!editingTypedEntry}
        initialName={editingTypedEntry?.name || ''}
        initialItems={
          editingTypedEntry?.original_items && editingTypedEntry.original_items.length > 0
            ? editingTypedEntry.original_items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                quantityGrams: 0,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
              }))
            : editingTypedEntry 
              ? [{
                  name: editingTypedEntry.name,
                  quantity: editingTypedEntry.unit === 'porção' ? '' : `${editingTypedEntry.quantity}${editingTypedEntry.unit}`,
                  quantityGrams: editingTypedEntry.quantity,
                  calories: editingTypedEntry.calories,
                  protein: editingTypedEntry.protein,
                  carbs: editingTypedEntry.carbs,
                  fat: editingTypedEntry.fat,
                }]
              : undefined
        }
        onSave={async (data) => {
          const originalItems = data.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
          }));

          if (editingTypedEntry) {
            await updateEntry(editingTypedEntry.id, {
              name: data.name,
              calories: Math.round(data.total.calories),
              protein: Math.round(data.total.protein * 10) / 10,
              carbs: Math.round(data.total.carbs * 10) / 10,
              fat: Math.round(data.total.fat * 10) / 10,
              saturated_fat: Math.round((data.total.saturatedFat || 0) * 10) / 10,
              trans_fat: Math.round((data.total.transFat || 0) * 10) / 10,
              fiber: Math.round((data.total.fiber || 0) * 10) / 10,
              sodium: Math.round(data.total.sodium || 0),
              original_items: originalItems,
            });
            setEditingTypedEntry(null);
          } else {
            await addEntry({
              name: data.name,
              nutrition: {
                calories: Math.round(data.total.calories),
                protein: Math.round(data.total.protein * 10) / 10,
                carbs: Math.round(data.total.carbs * 10) / 10,
                fat: Math.round(data.total.fat * 10) / 10,
                saturatedFat: Math.round((data.total.saturatedFat || 0) * 10) / 10,
                transFat: Math.round((data.total.transFat || 0) * 10) / 10,
                fiber: Math.round((data.total.fiber || 0) * 10) / 10,
                sodium: Math.round(data.total.sodium || 0),
              },
              quantity: 1,
              unit: 'porção',
              source: 'manual',
              originalItems: originalItems,
            });
            closeModal();
          }
          refetchFood();
        }}
      />
      
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
      
      <ConfirmDeleteDialog
        open={!!deletingLiquid}
        onOpenChange={(open) => !open && setDeletingLiquid(null)}
        itemName={deletingLiquid ? `${deletingLiquid.amount_ml}ml de ${liquidTypes[deletingLiquid.type as keyof typeof liquidTypes] || deletingLiquid.type}` : ''}
        onConfirm={async () => {
          if (deletingLiquid) {
            await deleteLiquidEntry(deletingLiquid.id);
            refetchLiquids();
            setDeletingLiquid(null);
          }
        }}
      />
      
      <DailyMenuDialog
        open={menuOpen}
        onOpenChange={setMenuOpen}
        selectedDate={selectedDate}
      />
      
      <BottomNav />
    </div>
  );
}
