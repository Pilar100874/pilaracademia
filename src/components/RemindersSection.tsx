import { useEffect, useState } from 'react';
import { Bell, BellOff, Droplet, Scale, Dumbbell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  loadReminderSettings,
  saveReminderSettings,
  requestNotificationPermission,
  startRemindersLoop,
  type ReminderSettings,
} from '@/lib/reminders';

export function RemindersSection() {
  const [settings, setSettings] = useState<ReminderSettings>(() => loadReminderSettings());
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const supported = typeof Notification !== 'undefined';

  useEffect(() => {
    if (settings.enabled && permission === 'granted') startRemindersLoop();
  }, [settings.enabled, permission]);

  const update = (patch: Partial<ReminderSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveReminderSettings(next);
  };

  const enable = async () => {
    if (!supported) {
      toast.error('Seu navegador não suporta notificações.');
      return;
    }
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === 'granted') {
      update({ enabled: true });
      toast.success('Notificações ativadas');
      startRemindersLoop();
    } else {
      toast.error('Permissão negada. Habilite nas configurações do navegador.');
    }
  };

  const disable = () => {
    update({ enabled: false });
    toast.success('Notificações desativadas');
  };

  return (
    <div className="card-compact space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
          <Bell className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Lembretes</h2>
          <p className="text-xs text-muted-foreground">Notificações locais opt-in</p>
        </div>
        {settings.enabled && permission === 'granted' ? (
          <Button size="sm" variant="ghost" onClick={disable}>
            <BellOff className="h-4 w-4 mr-1" />
            Desativar
          </Button>
        ) : (
          <Button size="sm" onClick={enable}>
            Ativar
          </Button>
        )}
      </div>

      {settings.enabled && permission === 'granted' && (
        <div className="space-y-3 pt-2 border-t border-border">
          <ReminderRow
            icon={Droplet}
            colorClass="text-sky-500"
            bgClass="bg-sky-500/10"
            label="Hidratação"
            desc="A cada 2h, das 8h às 22h"
            checked={settings.water}
            onChange={(v) => update({ water: v })}
          />
          <ReminderRow
            icon={Scale}
            colorClass="text-violet-500"
            bgClass="bg-violet-500/10"
            label="Pesagem semanal"
            desc="Domingo às 9h"
            checked={settings.weeklyWeight}
            onChange={(v) => update({ weeklyWeight: v })}
          />
          <ReminderRow
            icon={Dumbbell}
            colorClass="text-emerald-500"
            bgClass="bg-emerald-500/10"
            label="Treino"
            desc="Diário às 18h"
            checked={settings.workout}
            onChange={(v) => update({ workout: v })}
          />
        </div>
      )}

      {!supported && (
        <p className="text-xs text-muted-foreground">
          Notificações não são suportadas neste navegador.
        </p>
      )}
      {supported && permission === 'denied' && (
        <p className="text-xs text-muted-foreground">
          Permissão bloqueada. Habilite as notificações nas configurações do navegador.
        </p>
      )}
    </div>
  );
}

function ReminderRow({
  icon: Icon,
  colorClass,
  bgClass,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: typeof Droplet;
  colorClass: string;
  bgClass: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgClass}`}>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
