import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

/** Cabeçalho compacto padrão das páginas da clínica (mesmo padrão do Grade Master). */
export function ClinicPageHeader({ icon: Icon, title, subtitle }: Props) {
  return (
    <div className="border-b bg-card/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <span className="text-xs text-muted-foreground hidden sm:inline">· {subtitle}</span>
        )}
      </div>
    </div>
  );
}
