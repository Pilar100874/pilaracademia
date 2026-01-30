import { NavLink } from 'react-router-dom';
import { Home, Calendar, TrendingUp, User, Package, Heart, Dumbbell } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Hoje' },
  { to: '/history', icon: Calendar, label: 'Histórico' },
  { to: '/workouts', icon: Dumbbell, label: 'Treinos' },
  { to: '/health', icon: Heart, label: 'Saúde' },
  { to: '/products', icon: Package, label: 'Produtos' },
  { to: '/profile', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe">
      <div className="mx-auto max-w-md bg-card/95 backdrop-blur-xl rounded-t-3xl border border-border/30 border-b-0 shadow-floating px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all duration-200 ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2 rounded-xl transition-all duration-200 ${isActive ? 'gradient-primary shadow-sm' : 'hover:bg-muted/50'}`}>
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                  </div>
                  <span className={`text-[10px] font-semibold ${isActive ? 'text-primary' : ''}`}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}