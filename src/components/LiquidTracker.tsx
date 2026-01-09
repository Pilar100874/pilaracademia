import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Droplets, Plus, Trash2, ChevronDown, Pencil, Check, X, Clock } from 'lucide-react';
import { useLiquidEntries } from '@/hooks/useLiquidEntries';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';

const QUICK_OPTIONS = [
  { label: '🥛 200ml', ml: 200 },
  { label: '🥤 300ml', ml: 300 },
  { label: '🍶 500ml', ml: 500 },
  { label: '💧 1L', ml: 1000 },
];

export function LiquidTracker() {
  const { entries, addLiquidEntry, updateLiquidEntry, deleteLiquidEntry, getTodayTotal } = useLiquidEntries();
  const { profile } = useProfile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ id: string; amount: number } | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  const dailyGoal = profile?.daily_liquid_ml || 2000;
  const todayTotal = getTodayTotal();
  const progress = Math.min((todayTotal / dailyGoal) * 100, 100);
  const remaining = Math.max(0, dailyGoal - todayTotal);

  const handleQuickAdd = async (ml: number) => {
    try {
      await addLiquidEntry(ml, 'water');
      toast.success(`💧 +${ml}ml`);
      setShowAddDialog(false);
    } catch { toast.error('Erro'); }
  };

  const handleCustomAdd = async () => {
    const ml = parseInt(customAmount);
    if (ml <= 0) { toast.error('Valor inválido'); return; }
    await handleQuickAdd(ml);
    setCustomAmount('');
  };

  const handleEdit = (id: string, currentAmount: number) => {
    setEditingEntry({ id, amount: currentAmount });
    setEditAmount(currentAmount.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const amount = parseInt(editAmount);
    if (amount <= 0) { toast.error('Valor inválido'); return; }
    try {
      await updateLiquidEntry(editingEntry.id, amount);
      toast.success('Atualizado');
      setEditingEntry(null);
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLiquidEntry(id);
      toast.success('Removido');
    } catch { toast.error('Erro ao remover'); }
  };

  return (
    <>
      <div className="space-y-2">
        {/* Header colapsável */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-card shadow-card hover:shadow-soft transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-water">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Água</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold num-display text-sky-500">{(todayTotal / 1000).toFixed(1)}L</span>
                <span className="text-xs text-muted-foreground">/ {(dailyGoal / 1000).toFixed(1)}L</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={(e) => { e.stopPropagation(); setShowAddDialog(true); }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Lista de entradas */}
        {isExpanded && (
          <div className="space-y-2 animate-fade-in pl-2">
            {entries.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Nenhum registro hoje
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-card">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                    <span className="text-lg">💧</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{entry.amount_ml}ml</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(entry.consumed_at), 'HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                      onClick={() => handleEdit(entry.id, entry.amount_ml)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Dialog para adicionar */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-sky-500" />
              Adicionar Água
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt.ml}
                  onClick={() => handleQuickAdd(opt.ml)}
                  className="p-4 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 font-medium transition-colors text-center"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Quantidade personalizada</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="ml"
                  className="flex-1"
                />
                <Button onClick={handleCustomAdd} disabled={!customAmount}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Quantidade
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Quantidade (ml)</label>
              <Input 
                type="number" 
                value={editAmount} 
                onChange={(e) => setEditAmount(e.target.value)} 
                placeholder="ml" 
                className="h-12 text-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingEntry(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSaveEdit}>
                <Check className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
