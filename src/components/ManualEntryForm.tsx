import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Info } from 'lucide-react';
import { NutritionData } from '@/types/nutrition';

interface ManualEntryFormProps {
  onSubmit: (name: string, nutrition: NutritionData, quantity: number, unit: string) => void;
  onClose: () => void;
}

const REFERENCE_OPTIONS = [
  { value: '100', label: 'por 100g/ml' },
  { value: '200', label: 'por 200g/ml' },
  { value: '250', label: 'por 250g/ml' },
  { value: '1', label: 'por porção/unidade' },
];

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
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('g');
  const [referenceQuantity, setReferenceQuantity] = useState('100');
  const [customReference, setCustomReference] = useState('');

  const getReferenceValue = () => {
    if (referenceQuantity === 'custom') {
      return Number(customReference) || 100;
    }
    return Number(referenceQuantity) || 100;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !calories) return;

    const reference = getReferenceValue();
    const consumedQty = Number(quantity) || reference;
    
    // Calcular valores proporcionais baseados na quantidade consumida vs referência
    const multiplier = consumedQty / reference;

    const nutrition: NutritionData = {
      calories: Math.round((Number(calories) || 0) * multiplier),
      protein: Math.round(((Number(protein) || 0) * multiplier) * 10) / 10,
      carbs: Math.round(((Number(carbs) || 0) * multiplier) * 10) / 10,
      fat: Math.round(((Number(fat) || 0) * multiplier) * 10) / 10,
      saturatedFat: Math.round(((Number(saturatedFat) || 0) * multiplier) * 10) / 10,
      transFat: Math.round(((Number(transFat) || 0) * multiplier) * 10) / 10,
      fiber: Math.round(((Number(fiber) || 0) * multiplier) * 10) / 10,
      sodium: Math.round((Number(sodium) || 0) * multiplier),
    };

    onSubmit(name.trim(), nutrition, consumedQty, unit);
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

          {/* Referência das informações nutricionais */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Referência nutricional</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Os valores abaixo são referentes a qual quantidade?
            </p>
            <div className="flex gap-2">
              <Select value={referenceQuantity} onValueChange={setReferenceQuantity}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFERENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">Outro valor</SelectItem>
                </SelectContent>
              </Select>
              {referenceQuantity === 'custom' && (
                <Input
                  type="number"
                  value={customReference}
                  onChange={(e) => setCustomReference(e.target.value)}
                  placeholder="g/ml"
                  className="w-24"
                />
              )}
            </div>
          </div>

          {/* Informações nutricionais */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-1">Informação Nutricional</p>
            <p className="text-xs text-muted-foreground mb-3">
              Valores para {referenceQuantity === 'custom' ? customReference : referenceQuantity}{referenceQuantity === '1' ? ' porção' : 'g/ml'}
            </p>
            
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

          {/* Quantidade consumida */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Quanto você consumiu?</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Quantidade</label>
                <Input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  min="1" 
                  step="1"
                  placeholder={getReferenceValue().toString()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Unidade</label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">gramas (g)</SelectItem>
                    <SelectItem value="ml">mililitros (ml)</SelectItem>
                    <SelectItem value="porção">porção</SelectItem>
                    <SelectItem value="unidade">unidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Preview do cálculo */}
            {calories && Number(quantity) !== getReferenceValue() && (
              <div className="mt-3 p-2 rounded-lg bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground">
                  {quantity}{unit} = <span className="font-semibold text-primary">
                    {Math.round((Number(calories) || 0) * (Number(quantity) / getReferenceValue()))} kcal
                  </span>
                </p>
              </div>
            )}
          </div>

          <Button type="submit" variant="gradient" size="lg" className="w-full mt-6">
            Adicionar
          </Button>
        </form>
      </div>
    </div>
  );
}
