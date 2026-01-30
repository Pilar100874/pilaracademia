import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Camera, Barcode, X, Search, Droplets, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddFoodMenuProps {
  onOpenPhoto: () => void;
  onOpenBarcode: () => void;
  onOpenSearch: () => void;
  onOpenLiquid: () => void;
  onOpenTyped: () => void;
}

export function AddFoodMenu({ onOpenPhoto, onOpenBarcode, onOpenSearch, onOpenLiquid, onOpenTyped }: AddFoodMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const actions = [
    { icon: Keyboard, label: 'Digitar', gradient: 'from-blue-500 to-blue-600', action: onOpenTyped },
    { icon: Search, label: 'Buscar', gradient: 'from-violet-500 to-violet-600', action: onOpenSearch },
    { icon: Camera, label: 'Foto', gradient: 'from-emerald-500 to-emerald-600', action: onOpenPhoto },
    { icon: Barcode, label: 'Código', gradient: 'from-amber-500 to-amber-600', action: onOpenBarcode },
    { icon: Droplets, label: 'Líquido', gradient: 'from-cyan-500 to-cyan-600', action: onOpenLiquid },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setIsOpen(false)} />}

      {/* Menu em grid para mobile */}
      <div className={cn(
        "fixed bottom-24 left-4 right-4 z-50 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <div className="bg-card rounded-3xl shadow-floating p-4 mx-auto max-w-sm border border-border/30">
          <p className="text-xs font-medium text-muted-foreground text-center mb-3">Adicionar registro</p>
          <div className="grid grid-cols-5 gap-2">
            {actions.map((item, i) => (
              <button
                key={item.label}
                onClick={() => handleAction(item.action)}
                className={cn(
                  "flex flex-col items-center gap-2 p-2 rounded-2xl transition-all active:scale-95 hover:bg-muted/50 animate-scale-in",
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md", item.gradient)}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-floating transition-all duration-300 active:scale-95",
            isOpen ? "bg-card rotate-45 border border-border/50" : "gradient-primary"
          )}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6 text-white" />}
        </button>
      </div>
    </>
  );
}