import { NavLink } from 'react-router-dom';
import { Home, Calendar, TrendingUp, User, Package, Heart } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Hoje' },
  { to: '/history', icon: Calendar, label: 'Histórico' },
  { to: '/projections', icon: TrendingUp, label: 'Projeções' },
  { to: '/health', icon: Heart, label: 'Saúde' },
  { to: '/products', icon: Package, label: 'Produtos' },
  { to: '/profile', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50 px-1 pb-safe">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg transition-colors ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[9px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
