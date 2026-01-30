import { useState } from 'react';
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
    { icon: Keyboard, label: 'Digitar', color: 'bg-violet-500', action: onOpenTyped },
    { icon: Search, label: 'Buscar', color: 'bg-sky-500', action: onOpenSearch },
    { icon: Camera, label: 'Foto', color: 'bg-green-500', action: onOpenPhoto },
    { icon: Barcode, label: 'Código', color: 'bg-amber-500', action: onOpenBarcode },
    { icon: Droplets, label: 'Líquido', color: 'bg-cyan-500', action: onOpenLiquid },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Menu em grid */}
      <div className={cn(
        "fixed bottom-24 left-4 right-4 z-50 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <div className="bg-card rounded-3xl shadow-floating p-4 mx-auto max-w-sm">
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
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
                  item.color
                )}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-medium text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-floating transition-all duration-300 active:scale-95",
            isOpen 
              ? "bg-card rotate-45 shadow-lg" 
              : "bg-primary shadow-lg shadow-primary/30"
          )}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Plus className="h-6 w-6 text-primary-foreground" />
          )}
        </button>
      </div>
    </>
  );
}
