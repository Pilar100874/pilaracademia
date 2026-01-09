import { useState } from 'react';
import { Flame, Apple, Target } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { NutritionCard } from '@/components/NutritionCard';
import { FoodEntryItem } from '@/components/FoodEntryItem';
import { AddFoodMenu } from '@/components/AddFoodMenu';
import { PhotoCapture } from '@/components/PhotoCapture';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { ManualEntryForm } from '@/components/ManualEntryForm';
import { useNutrition } from '@/hooks/useNutrition';
import { BarcodeProduct, NutritionData } from '@/types/nutrition';

type ModalType = 'photo' | 'barcode' | 'manual' | null;

const Index = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const { addEntry, removeEntry, getTodaySummary } = useNutrition();

  const summary = getTodaySummary();
  const calorieProgress = (summary.consumed.calories / summary.goals.calories) * 100;
  const remainingCalories = Math.max(0, summary.goals.calories - summary.consumed.calories);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handlePhotoAnalyzed = (name: string, nutrition: NutritionData, imageUrl: string) => {
    addEntry({
      name,
      nutrition,
      imageUrl,
      quantity: 1,
      unit: 'porção',
      source: 'photo',
    });
    setActiveModal(null);
  };

  const handleBarcodeProduct = (product: BarcodeProduct, portionGrams: number) => {
    addEntry({
      name: product.name,
      nutrition: product.nutrition,
      imageUrl: product.imageUrl,
      quantity: portionGrams,
      unit: 'g',
      source: 'barcode',
    });
    setActiveModal(null);
  };

  const handleManualEntry = (name: string, nutrition: NutritionData, quantity: number, unit: string) => {
    addEntry({
      name,
      nutrition,
      quantity,
      unit,
      source: 'manual',
    });
    setActiveModal(null);
  };

  return (
    <div className="min-h-screen gradient-hero pb-24">
      {/* Header */}
      <header className="px-5 pt-8 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Olá! 👋</h1>
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
        </div>
      </header>

      {/* Main Progress Card */}
      <section className="px-5 py-4">
        <div className="rounded-3xl gradient-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-medium">Calorias de hoje</span>
              </div>
              <div className="mt-2">
                <span className="text-4xl font-bold">{summary.consumed.calories}</span>
                <span className="text-lg text-muted-foreground"> / {summary.goals.calories}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {remainingCalories > 0 
                  ? `Restam ${remainingCalories} kcal`
                  : 'Meta atingida! 🎉'
                }
              </p>
            </div>
            <ProgressRing
              progress={calorieProgress}
              size={100}
              strokeWidth={8}
              color={calorieProgress > 100 ? 'destructive' : 'primary'}
            >
              <div className="text-center">
                <span className="text-xl font-bold">{Math.round(calorieProgress)}%</span>
              </div>
            </ProgressRing>
          </div>
        </div>
      </section>

      {/* Macros Grid */}
      <section className="px-5 py-2">
        <div className="grid grid-cols-2 gap-3">
          <NutritionCard
            label="Proteína"
            value={summary.consumed.protein}
            goal={summary.goals.protein}
            unit="g"
            color="accent"
          />
          <NutritionCard
            label="Carboidratos"
            value={summary.consumed.carbs}
            goal={summary.goals.carbs}
            unit="g"
            color="blue"
          />
          <NutritionCard
            label="Gordura"
            value={summary.consumed.fat}
            goal={summary.goals.fat}
            unit="g"
            color="pink"
          />
          <div className="rounded-2xl bg-secondary/50 p-4 flex flex-col items-center justify-center text-center">
            <Apple className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium text-muted-foreground">
              {summary.entries.length} refeições
            </span>
          </div>
        </div>
      </section>

      {/* Today's Meals */}
      <section className="px-5 py-4">
        <h2 className="text-lg font-semibold mb-3">Refeições de Hoje</h2>
        
        {summary.entries.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center">
            <Apple className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              Nenhuma refeição registrada
            </p>
            <p className="text-sm text-muted-foreground/70">
              Toque no + para adicionar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.entries.map((entry) => (
              <FoodEntryItem
                key={entry.id}
                entry={entry}
                onDelete={removeEntry}
              />
            ))}
          </div>
        )}
      </section>

      {/* FAB Menu */}
      <AddFoodMenu
        onOpenPhoto={() => setActiveModal('photo')}
        onOpenBarcode={() => setActiveModal('barcode')}
        onOpenManual={() => setActiveModal('manual')}
      />

      {/* Modals */}
      {activeModal === 'photo' && (
        <PhotoCapture
          onFoodAnalyzed={handlePhotoAnalyzed}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'barcode' && (
        <BarcodeScanner
          onProductFound={handleBarcodeProduct}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'manual' && (
        <ManualEntryForm
          onSubmit={handleManualEntry}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};

export default Index;
