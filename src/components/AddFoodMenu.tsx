import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Camera, Barcode, Edit3, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddFoodMenuProps {
  onOpenPhoto: () => void;
  onOpenBarcode: () => void;
  onOpenManual: () => void;
  onOpenSearch: () => void;
}

export function AddFoodMenu({ onOpenPhoto, onOpenBarcode, onOpenManual, onOpenSearch }: AddFoodMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const actions = [
    { icon: Search, label: 'Buscar', color: 'bg-violet-500', action: onOpenSearch },
    { icon: Camera, label: 'Foto', color: 'bg-emerald-500', action: onOpenPhoto },
    { icon: Barcode, label: 'Código', color: 'bg-amber-500', action: onOpenBarcode },
    { icon: Edit3, label: 'Manual', color: 'bg-sky-500', action: onOpenManual },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/30 z-40 animate-fade-in" onClick={() => setIsOpen(false)} />}

      {/* Menu horizontal na parte inferior */}
      <div className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex gap-2 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {actions.map((item, i) => (
          <button
            key={item.label}
            onClick={() => handleAction(item.action)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl px-5 py-3 shadow-floating bg-card transition-all active:scale-95 animate-scale-in",
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", item.color)}>
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
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
