import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Users, Dumbbell, Layers, ListOrdered, Activity, ArrowLeft, Home, CalendarDays, TrendingUp, BarChart3, CalendarPlus, Library, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationsBell } from '@/components/NotificationsBell';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const navItems = [
  { to: '/clinica', icon: Activity, label: 'Visão', end: true },
  { to: '/clinica/agenda', icon: CalendarDays, label: 'Agenda' },
  { to: '/clinica/grades', icon: CalendarPlus, label: 'Grades' },
  { to: '/clinica/alunos', icon: Users, label: 'Alunos' },
  { to: '/clinica/evolucao', icon: TrendingUp, label: 'Evolução' },
  { to: '/clinica/sequencias', icon: ListOrdered, label: 'Sequências' },
  { to: '/clinica/exercicios', icon: Library, label: 'Exercícios' },
  { to: '/clinica/equipamentos', icon: Dumbbell, label: 'Equipamentos' },
  { to: '/clinica/niveis', icon: Layers, label: 'Níveis' },
  { to: '/clinica/aula', icon: Activity, label: 'Aula' },
  { to: '/clinica/relatorios', icon: BarChart3, label: 'Relatórios' },
];

export default function ClinicLayout() {
  const { isLoading, isStaff, activeClinic } = useUserRoles();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sessão encerrada');
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff || !activeClinic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-muted-foreground">Você ainda não faz parte de uma clínica.</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/clinica/criar')}>Criar minha clínica</Button>
          <Button variant="outline" onClick={() => navigate('/')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="p-4 border-b flex items-center gap-3">
          {activeClinic.logo_url ? (
            <img src={activeClinic.logo_url} alt={activeClinic.name} className="h-12 w-12 rounded-lg object-contain bg-muted/30 shrink-0" />
          ) : null}
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Clínica</div>
            <div className="font-bold truncate">{activeClinic.name}</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition',
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-1">
          <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/')}>
            <Home className="h-4 w-4 mr-2" />
            Meu app pessoal
          </Button>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between p-3 border-b bg-card sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="font-semibold truncate flex-1 text-center px-2 flex items-center justify-center gap-2">
            {activeClinic.logo_url && <img src={activeClinic.logo_url} alt="" className="h-7 w-7 rounded object-contain" />}
            <span className="truncate">{activeClinic.name}</span>
          </div>
          <div className="flex items-center">
            <NotificationsBell />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </header>
        <header className="hidden md:flex items-center justify-end p-3 border-b bg-card sticky top-0 z-30">
          <NotificationsBell />
        </header>

        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <Outlet />
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t">
          <div className="flex items-center justify-around h-16 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 min-w-0 flex-1',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-medium truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
