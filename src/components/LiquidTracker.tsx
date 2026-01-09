import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Droplets, Plus, Trash2, ChevronDown, Pencil, Check, X } from 'lucide-react';
import { useLiquidEntries } from '@/hooks/useLiquidEntries';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';

const QUICK_OPTIONS = [
  { label: '🥛', ml: 250, title: '1 copo' },
  { label: '🥤', ml: 500, title: '500ml' },
  { label: '🍶', ml: 1000, title: '1L' },
];

export function LiquidTracker() {
  const { entries, addLiquidEntry, updateLiquidEntry, deleteLiquidEntry, getTodayTotal } = useLiquidEntries();
  const { profile } = useProfile();
  const [showButtons, setShowButtons] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const dailyGoal = profile?.daily_liquid_ml || 2000;
  const todayTotal = getTodayTotal();
  const progress = Math.min((todayTotal / dailyGoal) * 100, 100);
  const remaining = Math.max(0, dailyGoal - todayTotal);

  const handleQuickAdd = async (ml: number) => {
    try {
      await addLiquidEntry(ml, 'water');
      toast.success(`💧 +${ml}ml`);
    } catch { toast.error('Erro'); }
  };

  const handleEdit = (id: string, currentAmount: number) => {
    setEditingId(id);
    setEditAmount(currentAmount.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const amount = parseInt(editAmount);
    if (amount <= 0) { toast.error('Valor inválido'); return; }
    try {
      await updateLiquidEntry(editingId, amount);
      toast.success('Atualizado');
      setEditingId(null);
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLiquidEntry(id);
      toast.success('Removido');
    } catch { toast.error('Erro ao remover'); }
  };

  return (
    <div className="card-compact overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-water flex-shrink-0">
            <Droplets className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Água</p>
            <p className="text-lg num-display text-sky-500">{(todayTotal / 1000).toFixed(1)}L</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => setShowButtons(!showButtons)}>
          <Plus className={`h-4 w-4 transition-transform ${showButtons ? 'rotate-45' : ''}`} />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-1">
        <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground truncate">{remaining > 0 ? `Faltam ${Math.ceil(remaining / 250)} copos` : '✅ Meta!'}</p>
        {entries.length > 0 && (
          <button 
            onClick={() => setShowEntries(!showEntries)} 
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0"
          >
            {entries.length}
            <ChevronDown className={`h-3 w-3 transition-transform ${showEntries ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {showButtons && (
        <div className="flex gap-1 pt-2 border-t border-border/50 mt-2 animate-fade-in">
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt.ml}
              onClick={() => handleQuickAdd(opt.ml)}
              className="quick-btn flex-1 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20"
              title={opt.title}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {showEntries && entries.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1 animate-fade-in max-h-40 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-secondary/50 text-sm gap-2">
              {editingId === entry.id ? (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <span>💧</span>
                    <Input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="h-7 w-20 text-sm"
                      autoFocus
                    />
                    <span className="text-xs text-muted-foreground">ml</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSaveEdit}>
                      <Check className="h-3 w-3 text-green-500" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <span>💧</span>
                    <span className="font-medium">{entry.amount_ml}ml</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.consumed_at), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                      onClick={() => handleEdit(entry.id, entry.amount_ml)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
