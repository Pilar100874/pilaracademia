import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Scale } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

const REMINDER_STORAGE_KEY = 'weight_reminder_last_shown';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function WeightReminderPopup() {
  const { profile, updateProfile, isProfileComplete } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Só mostrar se o perfil estiver completo
    if (!isProfileComplete() || !profile?.weight_kg) return;

    const lastShown = localStorage.getItem(REMINDER_STORAGE_KEY);
    const now = Date.now();

    if (!lastShown || now - parseInt(lastShown, 10) >= ONE_WEEK_MS) {
      // Aguardar 3 segundos antes de mostrar o popup
      const timer = setTimeout(() => {
        setWeight(String(profile.weight_kg));
        setIsOpen(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [profile, isProfileComplete]);

  const handleClose = () => {
    localStorage.setItem(REMINDER_STORAGE_KEY, String(Date.now()));
    setIsOpen(false);
  };

  const handleUpdate = async () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      toast.error('Peso inválido');
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile({ weight_kg: weightNum });
      toast.success('Peso atualizado! Metas recalculadas.');
      handleClose();
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = () => {
    handleClose();
    toast.info('Lembrete adiado por 1 semana');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-elevated animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Atualizar Peso</h2>
              <p className="text-xs text-muted-foreground">Lembrete semanal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Manter seu peso atualizado ajuda a calcular suas metas de calorias, macros e hidratação com precisão.
        </p>

        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium">Seu peso atual (kg)</label>
          <Input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min={30}
            max={300}
            step={0.1}
            placeholder="Ex: 70"
          />
          {profile?.weight_kg && (
            <p className="text-xs text-muted-foreground">
              Peso anterior: {profile.weight_kg}kg
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleSkip}>
            Manter atual
          </Button>
          <Button variant="gradient" className="flex-1" onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? 'Salvando...' : 'Atualizar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
