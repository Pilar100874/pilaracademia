import { useState } from 'react';
import { Flame, Apple, Loader2, TrendingDown, TrendingUp, Droplets, Clock, Layers, Trash2, Pencil, ChevronLeft, ChevronRight, Calendar, Utensils } from 'lucide-react';
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
import { TypedFoodDialog } from '@/components/TypedFoodDialog';
import { VoiceFoodDialog } from '@/components/VoiceFoodDialog';
import { BottomNav } from '@/components/BottomNav';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { useLiquidEntries } from '@/hooks/useLiquidEntries';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { useProfile } from '@/hooks/useProfile';
import { BarcodeProduct, NutritionData } from '@/types/nutrition';
import { FoodEntryDB } from '@/types/profile';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

import { useNavigate } from 'react-router-dom';

type ModalType = 'photo' | 'barcode' | 'manual' | 'search' | 'liquid' | 'typed' | 'voice' | null;
type SortType = 'time' | 'type';

interface LiquidEntryData {
  id: string;
  amount_ml: number;
  type: string;
  consumed_at: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const isViewingToday = isToday(selectedDate);
  
  const { entries, isLoading, addEntry, updateEntry, deleteEntry, getTodaySummary, refetch: refetchFood } = useFoodEntries(selectedDate);
  const { entries: liquidEntriesData, addLiquidEntry, updateLiquidEntry, deleteLiquidEntry, getTodayTotal, refetch: refetchLiquids, liquidTypes } = useLiquidEntries(selectedDate);
  const { profile, getGoals, isProfileComplete } = useProfile();
  const { getTodayTotalBurned } = useExerciseEntries(selectedDate);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [sortType, setSortType] = useState<SortType>('type');
  const [editingLiquid, setEditingLiquid] = useState<LiquidEntryData | null>(null);
  const [deletingLiquid, setDeletingLiquid] = useState<LiquidEntryData | null>(null);
  const [editingTypedEntry, setEditingTypedEntry] = useState<FoodEntryDB | null>(null);
  const [editingVoiceEntry, setEditingVoiceEntry] = useState<FoodEntryDB | null>(null);

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
  const dailyCalorieDeficit = goals.calories - netCalories; // positive = deficit, negative = surplus
  const dailyWeightChange = ((netCalories - goals.calories) / 7700 * 1000);
  const isDeficit = dailyWeightChange < 0;

  const formattedDate = format(selectedDate, "EEEE, d 'de' MMM", { locale: ptBR });
  
  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    // Don't allow going to future
    if (!isToday(selectedDate)) {
      setSelectedDate(nextDay);
    }
  };
  const goToToday = () => setSelectedDate(new Date());

  const handlePhotoAnalyzed = async (name: string, nutrition: NutritionData, imageUrl: string, isLiquid?: boolean, liquidMl?: number, grams?: number) => {
    try {
      // Add food entry - save grams in quantity field
      await addEntry({ 
        name, 
        nutrition, 
        imageUrl, 
        quantity: isLiquid ? (liquidMl || 250) : (grams || 300), 
        unit: isLiquid ? 'ml' : 'g', 
        source: 'photo', 
        isLiquid: isLiquid || false, 
        liquidMl: liquidMl || 0 
      });
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

  // Helper function to get liquid type info
  const getLiquidTypeInfo = (type: string) => {
    const labels: Record<string, { label: string; icon: string }> = {
      water: { label: 'Água', icon: '💧' },
      juice: { label: 'Suco', icon: '🧃' },
      coffee: { label: 'Café', icon: '☕' },
      tea: { label: 'Chá', icon: '🍵' },
      soda: { label: 'Refrigerante', icon: '🥤' },
      milk: { label: 'Leite', icon: '🥛' },
      other: { label: 'Outro', icon: '🍶' },
    };
    return labels[type] || labels.other;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
          <p className="text-sm text-white/80">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header Premium - Estilo Teal como referência */}
      <header className="gradient-header text-white px-4 pt-6 pb-8 rounded-b-[2.5rem]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm">Olá,</p>
            <h1 className="text-xl font-bold">{profile?.name?.split(' ')[0] || 'Usuário'} 👋</h1>
          </div>
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <Utensils className="h-5 w-5 text-white" />
          </div>
        </div>
        
        {/* Date navigation */}
        <div className="flex items-center justify-between bg-white/10 rounded-2xl p-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-white hover:bg-white/20 rounded-xl" 
            onClick={goToPreviousDay}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="text-sm font-medium capitalize gap-2 h-9 px-3 text-white hover:bg-white/20 rounded-xl">
                <Calendar className="h-4 w-4" />
                {isViewingToday ? 'Hoje' : formattedDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                initialFocus
              />
              {!isViewingToday && (
                <div className="p-2 border-t">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { goToToday(); setCalendarOpen(false); }}>
                    Voltar para hoje
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-white hover:bg-white/20 rounded-xl" 
            onClick={goToNextDay}
            disabled={isViewingToday}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Card Principal - Calorias */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-white/80">
                <Flame className="h-4 w-4" />
                <span className="text-xs font-medium">
                  Balanço {isViewingToday ? 'do dia' : 'deste dia'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl num-display">{Math.round(netCalories)}</span>
                <span className="text-sm text-white/60">/ {goals.calories} kcal</span>
              </div>
              
              {/* Info rápida */}
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  🍽️ {Math.round(consumed.calories)}
                </span>
                {caloriesBurned > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-400"></span>
                    🏃 -{caloriesBurned}
                  </span>
                )}
              </div>

              {/* Projeção de peso */}
              <div className={`mt-4 p-3 rounded-2xl ${isDeficit ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  {isDeficit ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  {isDeficit ? 'Perda estimada:' : 'Ganho estimado:'}
                  <span className="font-bold">{Math.abs(dailyWeightChange).toFixed(0)}g</span>
                </p>
              </div>
            </div>
            
            <div className="ml-4">
              <ProgressRing progress={calorieProgress} size={90} strokeWidth={8} color={calorieProgress > 100 ? 'destructive' : 'primary'}>
                <span className="text-xl font-bold text-white">{Math.round(calorieProgress)}%</span>
              </ProgressRing>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-center text-sm font-semibold">
              {remainingCalories > 0 ? `🎯 Restam ${Math.round(remainingCalories)} kcal` : '🎉 Meta atingida!'}
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 space-y-4 -mt-4">
        {/* Alerta perfil incompleto */}
        {!isProfileComplete() && isViewingToday && (
          <button onClick={() => navigate('/profile')} className="w-full card-compact bg-amber-50 border-amber-200 text-left animate-fade-in">
            <p className="text-sm font-medium text-amber-700">⚠️ Complete seu perfil para metas personalizadas</p>
          </button>
        )}
        
        {/* Aviso de data passada */}
        {!isViewingToday && (
          <div className="card-compact bg-amber-50 border-amber-200 text-center">
            <p className="text-sm font-medium text-amber-700">
              📅 Visualizando {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 text-xs h-8 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={goToToday}
            >
              <Calendar className="h-3.5 w-3.5" />
              Voltar para hoje
            </Button>
          </div>
        )}

        {/* Exercícios */}
        <ExerciseTracker />

        {/* Info Líquidos */}
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
            <div className="card-compact">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-water shadow-md">
                  <Droplets className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Líquidos</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold num-display text-sky-500">{formatLiquid(todayLiquid)}</span>
                    <span className="text-sm text-muted-foreground">/ {formatLiquid(dailyLiquidGoal)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${isComplete ? 'text-emerald-500' : 'text-sky-500'}`}>
                    {isComplete ? '🎉 Meta!' : `Faltam ${formatLiquid(remainingLiquid)}`}
                  </p>
                  <div className="w-20 h-2 mt-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Peso */}
        <WeightTracker dailyCalorieDeficit={dailyCalorieDeficit} />

        {/* Nutrientes */}
        <NutritionProgressGrid consumed={consumed} goals={goals} />

        {/* Consumo do dia - Header com toggle de ordenação */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center">
              <Apple className="h-4 w-4 text-white" />
            </div>
            {isViewingToday ? 'Consumo do dia' : 'Consumo deste dia'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs rounded-xl"
            onClick={() => setSortType(sortType === 'type' ? 'time' : 'type')}
          >
            {sortType === 'type' ? (
              <>
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Por tipo
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Por horário
              </>
            )}
          </Button>
        </div>

        {entries.length === 0 ? (
          <div className="card-compact text-center py-8">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Utensils className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isViewingToday ? 'Nenhum registro hoje' : 'Nenhum registro neste dia'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Toque no + para adicionar</p>
          </div>
        ) : sortType === 'type' ? (
          <div className="space-y-4">
            {/* Refeições */}
            {mealEntries.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5 px-1">
                  <Apple className="h-3.5 w-3.5" />
                  Refeições ({mealEntries.length})
                </p>
                <div className="space-y-2">
                  {mealEntries.map((entry) => (
                    <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} onEditTyped={setEditingTypedEntry} onEditVoice={setEditingVoiceEntry} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Líquidos */}
            {totalLiquidItems > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5 px-1">
                  <Droplets className="h-3.5 w-3.5" />
                  Líquidos ({totalLiquidItems})
                </p>
                <div className="space-y-2">
                  {/* food_entries que são líquidos */}
                  {liquidFoodEntries.map((entry) => (
                    <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} onEditTyped={setEditingTypedEntry} onEditVoice={setEditingVoiceEntry} />
                  ))}
                  {/* liquid_entries normais */}
                  {liquidEntriesData.map((entry) => {
                    const typeInfo = getLiquidTypeInfo(entry.type);
                    return (
                      <div key={entry.id} className="card-compact flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center text-lg">
                            {typeInfo.icon}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{typeInfo.label}</p>
                            <p className="text-xs text-muted-foreground">{entry.amount_ml}ml</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl" onClick={() => setEditingLiquid(entry)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl" onClick={() => setDeletingLiquid(entry)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {allEntriesByTime.map((entry) => (
              <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} onEditTyped={setEditingTypedEntry} onEditVoice={setEditingVoiceEntry} />
            ))}
          </div>
        )}
        
        <WeightProjection 
          consumedCalories={consumed.calories}
          burnedCalories={caloriesBurned}
          goalCalories={goals.calories}
          currentWeight={profile?.weight_kg || 70}
        />
      </div>

      {/* Modals - usando props corretas */}
      {activeModal === 'photo' && (
        <PhotoCapture 
          onFoodAnalyzed={handlePhotoAnalyzed}
          onClose={() => setActiveModal(null)} 
          selectedDate={selectedDate}
        />
      )}
      
      {activeModal === 'barcode' && (
        <BarcodeScanner 
          onProductFound={handleBarcodeProduct}
          onClose={() => setActiveModal(null)} 
          selectedDate={selectedDate}
        />
      )}
      
      {activeModal === 'manual' && (
        <ManualEntryForm 
          onSubmit={handleManualEntry}
          onClose={() => setActiveModal(null)} 
          selectedDate={selectedDate}
        />
      )}
      
      {activeModal === 'search' && (
        <ProductSearch 
          isOpen={true}
          onClose={() => setActiveModal(null)} 
          selectedDate={selectedDate}
        />
      )}
      
      <AddLiquidDialog 
        open={activeModal === 'liquid'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onAddLiquid={handleAddLiquid}
      />
      
      <TypedFoodDialog 
        open={activeModal === 'typed'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSave={(data) => {
          addEntry({ 
            name: data.name, 
            nutrition: data.total, 
            quantity: 1, 
            unit: 'porção', 
            source: 'manual' 
          });
          setActiveModal(null);
        }}
      />
      
      <VoiceFoodDialog 
        open={activeModal === 'voice'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSave={(data) => {
          addEntry({ 
            name: data.name, 
            nutrition: data.total, 
            quantity: 1, 
            unit: 'porção', 
            source: 'voice' 
          });
          setActiveModal(null);
        }}
      />
      
      {/* Edit typed entry dialog */}
      {editingTypedEntry && (
        <TypedFoodDialog 
          open={!!editingTypedEntry}
          onOpenChange={(open) => !open && setEditingTypedEntry(null)}
          onSave={(data) => {
            updateEntry(editingTypedEntry.id, { 
              name: data.name, 
              calories: data.total.calories,
              protein: data.total.protein,
              carbs: data.total.carbs,
              fat: data.total.fat,
            });
            setEditingTypedEntry(null);
          }}
          isEditing
        />
      )}
      
      {/* Edit voice entry dialog */}
      {editingVoiceEntry && (
        <VoiceFoodDialog 
          open={!!editingVoiceEntry}
          onOpenChange={(open) => !open && setEditingVoiceEntry(null)}
          onSave={(data) => {
            updateEntry(editingVoiceEntry.id, { 
              name: data.name, 
              calories: data.total.calories,
              protein: data.total.protein,
              carbs: data.total.carbs,
              fat: data.total.fat,
            });
            setEditingVoiceEntry(null);
          }}
          isEditing
        />
      )}
      
      <EditLiquidDialog 
        open={!!editingLiquid}
        onOpenChange={(open) => !open && setEditingLiquid(null)}
        entry={editingLiquid}
        liquidTypes={liquidTypes}
        onSave={async (id, ml) => { 
          await updateLiquidEntry(id, ml); 
          setEditingLiquid(null); 
        }}
      />
      
      <ConfirmDeleteDialog 
        open={!!deletingLiquid}
        onOpenChange={(open) => !open && setDeletingLiquid(null)}
        onConfirm={() => {
          if (deletingLiquid) {
            deleteLiquidEntry(deletingLiquid.id);
            setDeletingLiquid(null);
          }
        }}
        title="Remover líquido?"
        description="Esta ação não pode ser desfeita."
      />
      
      <WeightReminderPopup />
      
      <AddFoodMenu 
        onOpenPhoto={() => setActiveModal('photo')}
        onOpenBarcode={() => setActiveModal('barcode')}
        onOpenSearch={() => setActiveModal('search')}
        onOpenLiquid={() => setActiveModal('liquid')}
        onOpenTyped={() => setActiveModal('typed')}
      />
      <BottomNav />
    </div>
  );
}