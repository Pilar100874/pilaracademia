import { NavLink } from 'react-router-dom';
import { Home, Calendar, Dumbbell, Heart, TrendingUp, User, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const leftItems = [
  { to: '/', icon: Home, label: 'Hoje' },
  { to: '/history', icon: Calendar, label: 'Histórico' },
  { to: '/exercises', icon: Flame, label: 'Exercícios' },
];

const rightItems = [
  { to: '/workouts', icon: Dumbbell, label: 'Treinos' },
  { to: '/health', icon: Heart, label: 'Saúde' },
  { to: '/profile', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 px-2 pb-safe">
      <div className="flex items-center h-16">
        {/* Left items - 35% */}
        <div className="flex items-center justify-around" style={{ width: '35%' }}>
          {leftItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-2xl transition-all",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all",
                    isActive && "bg-primary/10"
                  )}>
                    <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  </div>
                  <span className="text-[9px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Center spacer for FAB - 30% */}
        <div style={{ width: '30%' }} />

        {/* Right items - 35% */}
        <div className="flex items-center justify-around" style={{ width: '35%' }}>
          {rightItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-2xl transition-all",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all",
                    isActive && "bg-primary/10"
                  )}>
                    <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  </div>
                  <span className="text-[9px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
