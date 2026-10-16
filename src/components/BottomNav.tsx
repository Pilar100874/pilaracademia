import { NavLink } from 'react-router-dom';
import { Home, ScanLine, Dumbbell, Heart, User, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HelpMenu } from '@/components/HelpMenu';

const navItems = [
  { to: '/', icon: Home, label: 'Hoje' },
  { to: '/menu', icon: Utensils, label: 'Cardápio' },
  { to: '/products', icon: ScanLine, label: 'Produtos' },
  { to: '/workouts', icon: Dumbbell, label: 'Treinos' },
  { to: '/health', icon: Heart, label: 'Saúde' },
  { to: '/profile', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-1 pb-safe overflow-hidden bg-card border-t border-border/50">
      <div className="flex items-center justify-around h-16 w-full max-w-full lg:h-auto lg:gap-1 lg:w-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-2xl transition-all min-w-0 flex-1 lg:flex-row lg:flex-none lg:gap-2 lg:px-4 lg:py-2 lg:rounded-full",
                isActive 
                  ? "text-primary lg:bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground lg:hover:bg-muted/60"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all lg:p-0",
                  isActive && "bg-primary/10 lg:bg-transparent"
                )}>
                  <item.icon className={cn("h-5 w-5 lg:h-4 lg:w-4", isActive && "text-primary")} />
                </div>
                <span className="text-[9px] font-medium lg:text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <HelpMenu inline />
      </div>
    </nav>

  );
}
