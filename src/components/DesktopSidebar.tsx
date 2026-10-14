import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  Dumbbell,
  Heart,
  User,
  Activity,
  Utensils,
  Library,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HelpMenu } from '@/components/HelpMenu';
import { useAccountKind } from '@/hooks/useAccountKind';
import { UsersRound } from 'lucide-react';

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
  const { restricted, isGestor } = useAccountKind();
  const primary = primaryNav.filter((i) => !(restricted && i.to === '/exercises'));
  const secondary = isGestor
    ? [{ to: '/gestor', icon: UsersRound as typeof Home, label: 'Meus usuários' }, ...secondaryNav]
    : secondaryNav;

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
      className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60 flex-col border-r border-border/60 bg-gradient-to-b from-card/95 to-background/95 backdrop-blur-xl"
      aria-label="Navegação principal"
    >
      <button
        onClick={() => navigate('/')}
        className="text-left px-6 pt-7 pb-6 border-b border-border/50"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
          Pilar
        </p>
        <h1 className="mt-0.5 text-xl font-bold tracking-tight">Academia</h1>
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div className="space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
            Plano do dia
          </p>
          {primary.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </div>

        <div className="space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
            Conta & dados
          </p>
          {secondary.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </div>
      </nav>

      <div className="px-4 pb-5 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
          v1 · 2026
        </p>
        <HelpMenu inline className="!flex-none !p-0 !gap-0 !w-9 !h-9 !rounded-full hover:bg-foreground/[0.05]" />
      </div>
    </aside>
  );
}
