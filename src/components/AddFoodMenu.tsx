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
    { icon: Keyboard, label: 'Digitar', gradient: 'from-blue-500 to-indigo-500', action: onOpenTyped },
    { icon: Search, label: 'Buscar', gradient: 'from-violet-500 to-purple-500', action: onOpenSearch },
    { icon: Camera, label: 'Foto', gradient: 'from-emerald-500 to-teal-500', action: onOpenPhoto },
    { icon: Barcode, label: 'Código', gradient: 'from-amber-500 to-orange-500', action: onOpenBarcode },
    { icon: Droplets, label: 'Líquido', gradient: 'from-cyan-500 to-blue-500', action: onOpenLiquid },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Menu flutuante */}
      <div className={cn(
        "fixed bottom-28 left-4 right-4 z-50 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
      )}>
        <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-floating p-5 mx-auto max-w-sm border border-border/30">
          <p className="text-xs font-semibold text-muted-foreground text-center mb-4 uppercase tracking-wider">Adicionar registro</p>
          <div className="grid grid-cols-5 gap-3">
            {actions.map((item, i) => (
              <button
                key={item.label}
                onClick={() => handleAction(item.action)}
                className="flex flex-col items-center gap-2 group animate-scale-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md transition-all duration-200 group-hover:scale-105 group-active:scale-95",
                  item.gradient
                )}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAB Premium */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full shadow-floating transition-all duration-300 active:scale-90",
            isOpen 
              ? "bg-card border border-border/50 rotate-45" 
              : "gradient-primary hover:shadow-xl"
          )}
        >
          {isOpen ? (
            <X className="h-7 w-7 text-muted-foreground" />
          ) : (
            <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
          )}
        </button>
        
        {/* Pulse ring quando fechado */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full gradient-primary opacity-30 animate-ping" />
        )}
      </div>
    </>
  );
}