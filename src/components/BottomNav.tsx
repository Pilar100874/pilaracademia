import { NavLink } from 'react-router-dom';
import { Home, Calendar, Heart, User, Activity, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRoles } from '@/hooks/useUserRoles';

export function BottomNav() {
  const { isStaff, isStudent } = useUserRoles();

  const navItems = [
    { to: '/', icon: Home, label: 'Hoje' },
    { to: '/history', icon: Calendar, label: 'Histórico' },
    ...(isStudent ? [{ to: '/meu-pilates', icon: Activity, label: 'Pilates' }] : []),
    ...(isStaff ? [{ to: '/clinica', icon: Building2, label: 'Clínica' }] : []),
    { to: '/health', icon: Heart, label: 'Saúde' },
    { to: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 px-1 pb-safe overflow-hidden">
      <div className="flex items-center justify-around h-16 w-full max-w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-2xl transition-all min-w-0 flex-1",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn("p-1.5 rounded-xl transition-all", isActive && "bg-primary/10")}>
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                </div>
                <span className="text-[9px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
