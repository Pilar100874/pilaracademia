import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { NutritionData } from '@/types/nutrition';

interface ManualEntryFormProps {
  onSubmit: (name: string, nutrition: NutritionData, quantity: number, unit: string) => void;
  onClose: () => void;
}

export function ManualEntryForm({ onSubmit, onClose }: ManualEntryFormProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  const [transFat, setTransFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sodium, setSodium] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('porção');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !calories) return;

    const nutrition: NutritionData = {
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      saturatedFat: Number(saturatedFat) || 0,
      transFat: Number(transFat) || 0,
      fiber: Number(fiber) || 0,
      sodium: Number(sodium) || 0,
    };

    onSubmit(name.trim(), nutrition, Number(quantity) || 1, unit);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-elevated animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Adicionar Manualmente</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do alimento *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Arroz integral" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade</label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.1" step="0.1" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unidade</label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, ml, porção..." />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Informação Nutricional</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Calorias (kcal) *</label>
                <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="0" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Proteína (g)</label>
                <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Carboidratos (g)</label>
                <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Gordura Total (g)</label>
                <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">G. Saturada (g)</label>
                <Input type="number" value={saturatedFat} onChange={(e) => setSaturatedFat(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">G. Trans (g)</label>
                <Input type="number" value={transFat} onChange={(e) => setTransFat(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Fibra (g)</label>
                <Input type="number" value={fiber} onChange={(e) => setFiber(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Sódio (mg)</label>
                <Input type="number" value={sodium} onChange={(e) => setSodium(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          <Button type="submit" variant="gradient" size="lg" className="w-full mt-6">
            Adicionar
          </Button>
        </form>
      </div>
    </div>
  );
}
