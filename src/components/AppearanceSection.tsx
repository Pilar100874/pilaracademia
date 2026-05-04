import { Sun, Moon, Monitor, LayoutDashboard } from 'lucide-react';
import { useAppearance, ThemeMode, DashStyle } from '@/contexts/AppearanceContext';

const themeOptions: { value: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

const dashOptions: { value: DashStyle; label: string; description: string }[] = [
  { value: 'depth', label: 'Profundidade', description: 'Cards 4D com sombras e relevo' },
  { value: 'flat', label: 'Plano', description: 'Visual limpo, sem sombras' },
  { value: 'minimal', label: 'Minimalista', description: 'Apenas linhas, sem caixas' },
];

export function AppearanceSection() {
  const { theme, setTheme, dashStyle, setDashStyle } = useAppearance();

  return (
    <div className="card-compact space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <LayoutDashboard className="h-5 w-5 text-primary" />
        </div>
        <h2 className="font-semibold">Aparência</h2>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tema</label>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`rounded-xl p-3 flex flex-col items-center gap-1.5 text-xs font-medium transition-all border ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/40 border-border hover:bg-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dash style */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Estilo dos cards do início</label>
        <p className="text-xs text-muted-foreground -mt-1">
          Aplica aos cartões de calorias, macros, água, peso e glicemia da tela Hoje.
        </p>
        <div className="grid grid-cols-1 gap-2">
          {dashOptions.map((opt) => {
            const active = dashStyle === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDashStyle(opt.value)}
                className={`rounded-xl p-3 text-left transition-all border ${
                  active
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted/40 border-border hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{opt.label}</span>
                  {active && <span className="text-xs text-primary font-semibold">Ativo</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
