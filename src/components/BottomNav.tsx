import { NavLink } from 'react-router-dom';
import { Home, Calendar, Heart, User, Activity, Building2, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRoles } from '@/hooks/useUserRoles';

export function BottomNav() {
  const { isStaff, isStudent } = useUserRoles();

  const navItems = [
    { to: '/', icon: Home, label: 'Hoje' },
    { to: '/history', icon: Calendar, label: 'Histórico' },
    ...(isStudent ? [{ to: '/meu-pilates', icon: Activity, label: 'Pilates' }] : []),
    ...(isStaff ? [{ to: '/clinica', icon: Building2, label: 'Clínica' }] : []),
    ...(isStaff ? [{ to: '/marketing', icon: Megaphone, label: 'Marketing' }] : []),
    { to: '/health', icon: Heart, label: 'Saúde' },
    { to: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border px-1 pb-safe overflow-hidden">
      <div className="flex items-center justify-around h-16 w-full max-w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors duration-300 min-w-0 flex-1",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-[18px] w-[18px] transition-transform duration-300", isActive && "scale-105")} strokeWidth={1.5} />
                <span className="text-[9px] uppercase tracking-[0.16em] font-medium">{item.label}</span>
                <span
                  className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 h-px bg-foreground transition-all duration-300",
                    isActive ? "w-8 opacity-100" : "w-0 opacity-0"
                  )}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
