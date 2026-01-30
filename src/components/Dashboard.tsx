import { useState } from 'react';
import { Flame, Apple, Loader2, TrendingDown, TrendingUp, Droplets, Clock, Layers, Trash2, Pencil, ChevronLeft, ChevronRight, Calendar, Utensils, Sparkles, Target, Zap } from 'lucide-react';
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
  
  const liquidFromEntries = getTodayTotal();
  const liquidFromFood = entries
    .filter(e => e.is_liquid === true && e.liquid_ml)
    .reduce((sum, e) => sum + (e.liquid_ml || 0), 0);
  const todayLiquid = liquidFromEntries + liquidFromFood;
  
  const dailyLiquidGoal = profile?.daily_liquid_ml || 2000;
  const netCalories = consumed.calories - caloriesBurned;
  const calorieProgress = (netCalories / goals.calories) * 100;
  const remainingCalories = Math.max(0, goals.calories - netCalories);
  const dailyCalorieDeficit = goals.calories - netCalories;
  const dailyWeightChange = ((netCalories - goals.calories) / 7700 * 1000);
  const isDeficit = dailyWeightChange < 0;

  const formattedDate = format(selectedDate, "EEEE, d 'de' MMM", { locale: ptBR });
  
  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    if (!isToday(selectedDate)) {
      setSelectedDate(nextDay);
    }
  };
  const goToToday = () => setSelectedDate(new Date());

  const handlePhotoAnalyzed = async (name: string, nutrition: NutritionData, imageUrl: string, isLiquid?: boolean, liquidMl?: number, grams?: number) => {
    try {
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
    } catch (err) { 
      console.error('Error adding liquid:', err);
    }
  };

  const mealEntries = entries.filter(e => e.is_liquid !== true);
  const liquidFoodEntries = entries.filter(e => e.is_liquid === true);
  const totalLiquidItems = liquidEntriesData.length + liquidFoodEntries.length;
  const allEntriesByTime = [...entries].sort((a, b) => 
    new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
  );

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

  // Liquid progress
  const remainingLiquid = Math.max(0, dailyLiquidGoal - todayLiquid);
  const liquidProgressPercent = Math.min((todayLiquid / dailyLiquidGoal) * 100, 100);
  const isLiquidComplete = todayLiquid >= dailyLiquidGoal;
  
  const formatLiquid = (ml: number) => {
    if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
    return `${Math.round(ml)}ml`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center shadow-lg">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white/30 animate-pulse" />
          </div>
          <p className="text-white/90 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-32">
      {/* Header Hero Premium */}
      <header className="relative overflow-hidden">
        {/* Background com gradiente */}
        <div className="absolute inset-0 gradient-header" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        
        <div className="relative px-5 pt-8 pb-6">
          {/* Top bar com saudação */}
          <div className="flex items-center justify-between mb-6">
            <div className="animate-fade-in">
              <p className="text-white/60 text-sm font-medium">Olá,</p>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {profile?.name?.split(' ')[0] || 'Usuário'}
                <span className="text-2xl">👋</span>
              </h1>
            </div>
            <button 
              onClick={() => navigate('/profile')}
              className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 hover:bg-white/25 transition-all active:scale-95"
            >
              <Sparkles className="h-5 w-5 text-white" />
            </button>
          </div>
          
          {/* Navegação de data elegante */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/15 rounded-xl" 
              onClick={goToPreviousDay}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-10 px-5 text-white font-semibold bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 gap-2"
                >
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
              className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/15 rounded-xl" 
              onClick={goToNextDay}
              disabled={isViewingToday}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Card Principal de Calorias - Hero Style */}
          <div className="relative bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 shadow-2xl animate-scale-in overflow-hidden">
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative flex items-start justify-between">
              <div className="flex-1 space-y-4">
                {/* Label */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                  <Flame className="h-4 w-4 text-amber-300" />
                  <span className="text-xs font-semibold text-white/90">Balanço calórico</span>
                </div>
                
                {/* Números principais */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white tracking-tight">{Math.round(netCalories)}</span>
                    <span className="text-lg text-white/50 font-medium">/ {goals.calories}</span>
                  </div>
                  <p className="text-white/60 text-sm mt-1">calorias consumidas</p>
                </div>
                
                {/* Stats rápidos */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/20">
                    <span className="text-lg">🍽️</span>
                    <span className="text-sm font-semibold text-white">{Math.round(consumed.calories)}</span>
                  </div>
                  {caloriesBurned > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-400/20">
                      <Zap className="h-4 w-4 text-rose-300" />
                      <span className="text-sm font-semibold text-white">-{caloriesBurned}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress Ring Grande */}
              <div className="relative">
                <ProgressRing 
                  progress={calorieProgress} 
                  size={110} 
                  strokeWidth={10} 
                  color={calorieProgress > 100 ? 'destructive' : 'primary'}
                >
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white">{Math.round(calorieProgress)}%</span>
                  </div>
                </ProgressRing>
              </div>
            </div>
            
            {/* Footer do card */}
            <div className="relative mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${isDeficit ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                  {isDeficit ? <TrendingDown className="h-4 w-4 text-emerald-300" /> : <TrendingUp className="h-4 w-4 text-amber-300" />}
                  <span className="text-sm font-semibold text-white">
                    {isDeficit ? '-' : '+'}{Math.abs(dailyWeightChange).toFixed(0)}g hoje
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-white">
                  <Target className="h-4 w-4 text-white/60" />
                  <span className="text-sm font-semibold">
                    {remainingCalories > 0 ? `${Math.round(remainingCalories)} restantes` : '🎉 Meta!'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 space-y-4 -mt-2">
        {/* Alerta perfil incompleto */}
        {!isProfileComplete() && isViewingToday && (
          <button 
            onClick={() => navigate('/profile')} 
            className="w-full rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 p-4 text-left animate-fade-in shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">Complete seu perfil</p>
                <p className="text-xs text-amber-600">Receba metas personalizadas</p>
              </div>
            </div>
          </button>
        )}
        
        {/* Aviso data passada */}
        {!isViewingToday && (
          <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 p-4 text-center animate-fade-in">
            <p className="text-sm font-semibold text-blue-800">
              📅 Visualizando {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 text-xs h-8 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100 rounded-xl"
              onClick={goToToday}
            >
              <Calendar className="h-3.5 w-3.5" />
              Voltar para hoje
            </Button>
          </div>
        )}

        {/* Quick Stats Row - Líquidos e Exercícios em cards menores */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card Líquidos Compacto */}
          <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200/50 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl gradient-water flex items-center justify-center shadow-sm">
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-sky-600">Líquidos</p>
                <p className="text-lg font-bold text-sky-800">{formatLiquid(todayLiquid)}</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-sky-200/50 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all" style={{ width: `${liquidProgressPercent}%` }} />
            </div>
            <p className={`text-xs font-medium mt-2 ${isLiquidComplete ? 'text-emerald-600' : 'text-sky-600'}`}>
              {isLiquidComplete ? '🎉 Meta atingida!' : `Faltam ${formatLiquid(remainingLiquid)}`}
            </p>
          </div>
          
          {/* Card Exercícios Compacto - apenas visual */}
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200/50 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl gradient-exercise flex items-center justify-center shadow-sm">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-rose-600">Queimadas</p>
                <p className="text-lg font-bold text-rose-800">-{caloriesBurned} kcal</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-rose-200/50 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-500 transition-all" style={{ width: `${Math.min((caloriesBurned / 500) * 100, 100)}%` }} />
            </div>
            <p className="text-xs font-medium mt-2 text-rose-600">
              {caloriesBurned > 0 ? 'Continue assim! 💪' : 'Movimente-se!'}
            </p>
          </div>
        </div>

        {/* Exercícios Expandível */}
        <ExerciseTracker />

        {/* Peso */}
        <WeightTracker dailyCalorieDeficit={dailyCalorieDeficit} />

        {/* Nutrientes */}
        <NutritionProgressGrid consumed={consumed} goals={goals} />

        {/* Consumo do dia */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                <Apple className="h-4 w-4 text-white" />
              </div>
              {isViewingToday ? 'Consumo do dia' : 'Consumo deste dia'}
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs rounded-xl border-border/50"
              onClick={() => setSortType(sortType === 'type' ? 'time' : 'type')}
            >
              {sortType === 'type' ? (
                <>
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  Tipo
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Horário
                </>
              )}
            </Button>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/30 text-center py-10 px-6">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Utensils className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-muted-foreground">
                {isViewingToday ? 'Nenhum registro hoje' : 'Nenhum registro neste dia'}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">Toque no + para adicionar sua primeira refeição</p>
            </div>
          ) : sortType === 'type' ? (
            <div className="space-y-5">
              {mealEntries.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
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
              
              {totalLiquidItems > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <Droplets className="h-3.5 w-3.5" />
                    Líquidos ({totalLiquidItems})
                  </p>
                  <div className="space-y-2">
                    {liquidFoodEntries.map((entry) => (
                      <FoodEntryItemDB key={entry.id} entry={entry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} onEditTyped={setEditingTypedEntry} onEditVoice={setEditingVoiceEntry} />
                    ))}
                    {liquidEntriesData.map((entry) => {
                      const typeInfo = getLiquidTypeInfo(entry.type);
                      return (
                        <div key={entry.id} className="rounded-2xl bg-card border border-border/30 p-4 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center text-xl">
                              {typeInfo.icon}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{typeInfo.label}</p>
                              <p className="text-xs text-muted-foreground">{entry.amount_ml}ml</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl" onClick={() => setEditingLiquid(entry)}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl" onClick={() => setDeletingLiquid(entry)}>
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
        </div>
        
        <WeightProjection 
          consumedCalories={consumed.calories}
          burnedCalories={caloriesBurned}
          goalCalories={goals.calories}
          currentWeight={profile?.weight_kg || 70}
        />
      </div>

      {/* Modals */}
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