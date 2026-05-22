import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  Dumbbell,
  Heart,
  User,
  Activity,
  Utensils,
  HelpCircle,
  Library,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { HelpMenu } from '@/components/HelpMenu';

const primaryNav = [
  { to: '/', icon: Home, label: 'Hoje' },
  { to: '/menu', icon: Utensils, label: 'Cardápio' },
  { to: '/workouts', icon: Dumbbell, label: 'Treinos' },
  { to: '/exercises', icon: Library, label: 'Exercícios' },
  { to: '/health', icon: Heart, label: 'Saúde' },
  { to: '/bioimpedance', icon: Activity, label: 'Corpo' },
];

const secondaryNav = [
  { to: '/history', icon: Calendar, label: 'Histórico' },
  { to: '/insights', icon: Sparkles, label: 'Insights' },
  { to: '/products', icon: ScanLine, label: 'Produtos' },
  { to: '/profile', icon: User, label: 'Perfil' },
];

function SidebarLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Home;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          isActive
            ? 'text-foreground bg-foreground/[0.04]'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full transition-all',
              isActive ? 'bg-primary' : 'bg-transparent',
            )}
          />
          <Icon
            className={cn(
              'h-[18px] w-[18px] shrink-0 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
            )}
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function DesktopSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  // Hide on auth/onboarding/public flows
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/reset-password')
  ) {
    return null;
  }

  return (
    <aside
      className="hidden md:flex fixed inset-y-0 left-0 z-30 w-60 flex-col border-r border-border/60 bg-gradient-to-b from-card/95 to-background/95 backdrop-blur-xl"
      aria-label="Navegação principal"
    >
      {/* Brand */}
      <button
        onClick={() => navigate('/')}
        className="text-left px-6 pt-7 pb-6 border-b border-border/50"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
          Pilar
        </p>
        <h1 className="mt-0.5 text-xl font-bold tracking-tight">
          Academia
        </h1>
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div className="space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
            Plano do dia
          </p>
          {primaryNav.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </div>

        <div className="space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
            Conta & dados
          </p>
          {secondaryNav.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </div>
      </nav>

      {/* Help */}
      <div className="px-3 pb-5 pt-3 border-t border-border/50">
        <button
          onClick={() => setHelpOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03] transition-all"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
          <span>Ajuda desta tela</span>
        </button>
        {/* Reuse HelpMenu sheet via hidden trigger if needed */}
        {helpOpen && (
          <div className="hidden">
            <HelpMenu inline />
          </div>
        )}
        {/* Simpler: open via window event-less — fallback re-uses HelpMenu by rendering it always but only its sheet here */}
      </div>
    </aside>
  );
}
