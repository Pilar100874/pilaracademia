import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Copy } from 'lucide-react';
import { subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedDate: Date;
}

interface Row {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
  is_liquid: boolean;
  liquid_ml: number;
  saturated_fat: number;
  trans_fat: number;
  fiber: number;
  sodium: number;
  image_url: string | null;
  product_id: string | null;
  original_items: any;
}

export function RepeatYesterdayDialog({ open, onOpenChange, selectedDate }: Props) {
  const { user } = useAuth();
  const { addEntry, refetch } = useFoodEntries(selectedDate);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    setSelected(new Set());
    const yesterday = subDays(selectedDate, 1);
    const start = new Date(yesterday); start.setHours(0, 0, 0, 0);
    const end = new Date(yesterday); end.setHours(23, 59, 59, 999);
    supabase
      .from('food_entries')
      .select('id,name,calories,protein,carbs,fat,quantity,unit,is_liquid,liquid_ml,saturated_fat,trans_fat,fiber,sodium,image_url,product_id,original_items')
      .eq('user_id', user.id)
      .gte('consumed_at', start.toISOString())
      .lte('consumed_at', end.toISOString())
      .order('consumed_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error('Erro ao carregar refeições');
        else {
          const list = (data as Row[]) || [];
          setRows(list);
          setSelected(new Set(list.map((r) => r.id)));
        }
        setLoading(false);
      });
  }, [open, user, selectedDate]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const chosen = rows.filter((r) => selected.has(r.id));
      for (const r of chosen) {
        await addEntry({
          name: r.name,
          imageUrl: r.image_url || undefined,
          quantity: Number(r.quantity) || 1,
          unit: r.unit || 'g',
          source: 'manual',
          isLiquid: r.is_liquid,
          liquidMl: Number(r.liquid_ml) || 0,
          productId: r.product_id || undefined,
          originalItems: r.original_items || undefined,
          nutrition: {
            calories: Number(r.calories) || 0,
            protein: Number(r.protein) || 0,
            carbs: Number(r.carbs) || 0,
            fat: Number(r.fat) || 0,
            saturatedFat: Number(r.saturated_fat) || 0,
            transFat: Number(r.trans_fat) || 0,
            fiber: Number(r.fiber) || 0,
            sodium: Number(r.sodium) || 0,
          },
        });
      }
      toast.success(`${chosen.length} ${chosen.length === 1 ? 'refeição copiada' : 'refeições copiadas'}`);
      await refetch();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao copiar refeições');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Repetir refeições de ontem</DialogTitle>
          <DialogDescription>
            Selecione o que copiar para o dia atual. As quantidades e nutrientes são preservados.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Copy}
            title="Nada para copiar"
            description="Você não registrou refeições no dia anterior."
            variant="compact"
          />
        ) : (
          <>
            <div className="space-y-2">
              {rows.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-card p-3 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(Number(r.calories))} kcal · {Math.round(Number(r.protein))}g P · {Math.round(Number(r.carbs))}g C · {Math.round(Number(r.fat))}g G
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={selected.size === 0 || submitting}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar {selected.size} {selected.size === 1 ? 'item' : 'itens'}
                </>
              )}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
