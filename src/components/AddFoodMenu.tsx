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
    { icon: Keyboard, label: 'Digitar', color: 'bg-blue-500', action: onOpenTyped },
    { icon: Search, label: 'Buscar', color: 'bg-violet-500', action: onOpenSearch },
    { icon: Camera, label: 'Foto', color: 'bg-emerald-500', action: onOpenPhoto },
    { icon: Barcode, label: 'Código', color: 'bg-amber-500', action: onOpenBarcode },
    { icon: Droplets, label: 'Líquido', color: 'bg-cyan-500', action: onOpenLiquid },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={() => setIsOpen(false)} />}

      {/* Menu em grid para mobile */}
      <div className={cn(
        "fixed bottom-20 left-4 right-4 z-50 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <div className="bg-card rounded-2xl shadow-floating p-3 mx-auto max-w-sm">
          <div className="grid grid-cols-5 gap-1">
            {actions.map((item, i) => (
              <button
                key={item.label}
                onClick={() => handleAction(item.action)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95 hover:bg-muted/50 animate-scale-in",
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", item.color)}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-floating transition-all duration-300 active:scale-95",
            isOpen ? "bg-card rotate-45" : "gradient-primary"
          )}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6 text-white" />}
        </button>
      </div>
    </>
  );
}
