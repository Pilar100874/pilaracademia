import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Camera, Barcode, Edit3, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddFoodMenuProps {
  onOpenPhoto: () => void;
  onOpenBarcode: () => void;
  onOpenManual: () => void;
}

export function AddFoodMenu({ onOpenPhoto, onOpenBarcode, onOpenManual }: AddFoodMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Menu Items */}
      <div
        className={cn(
          "absolute bottom-16 right-0 flex flex-col gap-3 transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <button
          onClick={() => handleAction(onOpenPhoto)}
          className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-elevated transition-all hover:scale-105 animate-scale-in"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium whitespace-nowrap">Tirar Foto</span>
        </button>

        <button
          onClick={() => handleAction(onOpenBarcode)}
          className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-elevated transition-all hover:scale-105 animate-scale-in"
          style={{ animationDelay: '50ms' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Barcode className="h-5 w-5 text-accent" />
          </div>
          <span className="font-medium whitespace-nowrap">Código de Barras</span>
        </button>

        <button
          onClick={() => handleAction(onOpenManual)}
          className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-elevated transition-all hover:scale-105 animate-scale-in"
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Edit3 className="h-5 w-5 text-secondary-foreground" />
          </div>
          <span className="font-medium whitespace-nowrap">Manual</span>
        </button>
      </div>

      {/* FAB Button */}
      <Button
        variant="fab"
        size="fab"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "transition-transform duration-300",
          isOpen && "rotate-45"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
