import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FieldError } from '@/components/FieldError';
import { useFieldError } from '@/lib/formValidation';

interface FoodItem {
  id: string;
  food: string;
  quantity: string;
}

interface AnalyzedItem {
  name: string;
  quantity: string;
  quantityGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface TypedFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    items: AnalyzedItem[];
    total: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      saturatedFat: number;
      transFat: number;
      fiber: number;
      sodium: number;
    };
  }) => void;
  initialItems?: AnalyzedItem[];
  initialName?: string;
  isEditing?: boolean;
}

export function TypedFoodDialog({
  open,
  onOpenChange,
  onSave,
  initialItems,
  initialName,
  isEditing = false,
}: TypedFoodDialogProps) {
  const [items, setItems] = useState<FoodItem[]>([{ id: '1', food: '', quantity: '' }]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customName, setCustomName] = useState('');
  const [originalItemsState, setOriginalItemsState] = useState<FoodItem[]>([]);

  const itemRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { errorOf, setError, clearError, clearIf } = useFieldError();

  // Atualizar estado quando abrir para edição
  useEffect(() => {
    if (open) {
      if (initialItems && initialItems.length > 0) {
        const loadedItems = initialItems.map((item, i) => ({
          id: `${i}`,
          food: item.name,
          quantity: item.quantity,
        }));
        setItems(loadedItems);
        setOriginalItemsState(loadedItems);
      } else {
        setItems([{ id: '1', food: '', quantity: '' }]);
        setOriginalItemsState([]);
      }
      setCustomName(initialName || '');
    }
  }, [open, initialItems, initialName]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), food: '', quantity: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: 'food' | 'quantity', value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Check if items have changed from original
  const hasItemsChanged = () => {
    if (!isEditing || !initialItems) return true;
    
    const validItems = items.filter(item => item.food.trim() && item.quantity.trim());
    
    // Different number of items
    if (validItems.length !== originalItemsState.length) return true;
    
    // Check each item
    for (let i = 0; i < validItems.length; i++) {
      const current = validItems[i];
      const original = originalItemsState[i];
      if (!original) return true;
      if (current.food.trim() !== original.food.trim() || 
          current.quantity.trim() !== original.quantity.trim()) {
        return true;
      }
    }
    
    return false;
  };

  const handleAnalyze = async () => {
    const validItems = items.filter(item => item.food.trim() && item.quantity.trim());

    if (validItems.length === 0) {
      // Foca no primeiro item incompleto
      const target = items.find(it => !it.food.trim()) || items.find(it => !it.quantity.trim()) || items[0];
      const field = target.food.trim() ? 'qty' : 'food';
      const el = itemRefs.current[`${target.id}-${field}`];
      if (el) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { el.scrollIntoView(); }
        setTimeout(() => { try { el.focus({ preventScroll: true }); } catch { el.focus(); } }, 80);
      }
      setError(
        `${target.id}-${field}`,
        field === 'food' ? 'Informe o alimento' : 'Informe a quantidade'
      );
      return;
    }
    clearError();

    // If editing and nothing changed, just close without re-analyzing
    if (isEditing && !hasItemsChanged() && customName.trim() === (initialName || '')) {
      onOpenChange(false);
      return;
    }

    // If editing and only the name changed, keep original nutrition values
    if (isEditing && !hasItemsChanged() && initialItems && initialItems.length > 0) {
      const entryName = customName.trim() || 'Alimentos digitados';
      
      // Calculate totals from initial items (original values)
      const total = initialItems.reduce((acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        saturatedFat: 0,
        transFat: 0,
        fiber: 0,
        sodium: 0,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, saturatedFat: 0, transFat: 0, fiber: 0, sodium: 0 });

      onSave({
        name: entryName,
        items: initialItems,
        total,
      });

      setItems([{ id: '1', food: '', quantity: '' }]);
      setCustomName('');
      onOpenChange(false);
      toast.success('Registro atualizado!');
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-text', {
        body: { 
          items: validItems.map(item => ({
            food: item.food.trim(),
            quantity: item.quantity.trim(),
          }))
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao analisar alimentos');
      }

      const result = data.data;
      const entryName = customName.trim() || 'Alimentos digitados';

      onSave({
        name: entryName,
        items: result.items,
        total: result.total,
      });

      // Reset form
      setItems([{ id: '1', food: '', quantity: '' }]);
      setCustomName('');
      onOpenChange(false);
      toast.success('Alimentos registrados com sucesso!');
    } catch (error) {
      console.error('Error analyzing foods:', error);
      toast.error('Erro ao analisar alimentos. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    if (!isEditing) {
      setItems([{ id: '1', food: '', quantity: '' }]);
      setCustomName('');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-base">
            {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEditing ? 'Editar Alimentos' : 'Digitar Alimentos'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 -mx-1 px-1">
          {/* Custom name input */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Nome do registro (opcional)
            </label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex: Almoço, Lanche..."
              className="h-11 text-base"
            />
          </div>

          {/* Food items */}
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground">
              Alimentos e quantidades
            </label>
            
            {items.map((item) => (
              <div key={item.id} className="space-y-2 p-3 rounded-xl bg-muted/30 animate-fade-in">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.food}
                      onChange={(e) => updateItem(item.id, 'food', e.target.value)}
                      placeholder="Alimento (ex: Fraldinha)"
                      className="h-11 text-base"
                    />
                    <Input
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      placeholder="Quantidade (ex: 150g)"
                      className="h-11 text-base"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-11"
              onClick={addItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar alimento
            </Button>
          </div>

          {/* Help text */}
          <p className="text-[11px] text-muted-foreground text-center">
            Ex: 150g, 2 colheres, 1 xícara, 1 filé
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          <Button
            variant="outline"
            className="flex-1 h-12 text-base"
            onClick={handleClose}
            disabled={isAnalyzing}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-12 text-base"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
