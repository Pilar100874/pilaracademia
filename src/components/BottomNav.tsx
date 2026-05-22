import { NavLink } from 'react-router-dom';
import { Home, Calendar, Dumbbell, Heart, User, Activity, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HelpMenu } from '@/components/HelpMenu';

const navItems = [
  { to: '/', icon: Home, label: 'Hoje' },
  { to: '/menu', icon: Utensils, label: 'Cardápio' },
  { to: '/workouts', icon: Dumbbell, label: 'Treinos' },
  { to: '/health', icon: Heart, label: 'Saúde' },
  { to: '/bioimpedance', icon: Activity, label: 'Corpo' },
  { to: '/profile', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-1 pb-safe overflow-hidden bg-card border-t border-border/50">
      <div className="flex items-center justify-around h-16 w-full max-w-full md:h-auto md:gap-1 md:w-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-2xl transition-all min-w-0 flex-1 md:flex-row md:flex-none md:gap-2 md:px-4 md:py-2 md:rounded-full",
                isActive 
                  ? "text-primary md:bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground md:hover:bg-muted/60"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all md:p-0",
                  isActive && "bg-primary/10 md:bg-transparent"
                )}>
                  <item.icon className={cn("h-5 w-5 md:h-4 md:w-4", isActive && "text-primary")} />
                </div>
                <span className="text-[9px] font-medium md:text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <HelpMenu inline />
      </div>
    </nav>

  );
}
