import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Users, Dumbbell, Layers, ListOrdered, Activity, ArrowLeft, Home, CalendarDays, TrendingUp, BarChart3, CalendarPlus, Library, LogOut, GraduationCap, ShieldCheck, DoorOpen, MoreHorizontal, Menu, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationsBell } from '@/components/NotificationsBell';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SetupWizard, setupWizardCompleted } from '@/components/clinic/SetupWizard';

const baseNavItems = [
  { to: '/clinica', icon: CalendarDays, label: 'Grade Master', end: true, primary: true },
  { to: '/clinica/visao', icon: Activity, label: 'Visão' },
  { to: '/clinica/agenda', icon: CalendarPlus, label: 'Agenda', primary: true },
  { to: '/clinica/grades', icon: CalendarPlus, label: 'Horários' },
  { to: '/clinica/salas', icon: DoorOpen, label: 'Salas' },
  { to: '/clinica/alunos', icon: Users, label: 'Alunos', primary: true },
  { to: '/clinica/equipe', icon: GraduationCap, label: 'Equipe', adminOnly: true },
  { to: '/clinica/permissoes', icon: ShieldCheck, label: 'Permissões', adminOnly: true },
  { to: '/clinica/evolucao', icon: TrendingUp, label: 'Evolução' },
  { to: '/clinica/sequencias', icon: ListOrdered, label: 'Sequências', primary: true },
  { to: '/clinica/exercicios', icon: Library, label: 'Exercícios' },
  { to: '/clinica/equipamentos', icon: Dumbbell, label: 'Equipamentos' },
  { to: '/clinica/niveis', icon: Layers, label: 'Níveis' },
  { to: '/clinica/aula', icon: Activity, label: 'Aula' },
  { to: '/clinica/relatorios', icon: BarChart3, label: 'Relatórios' },
];

export default function ClinicLayout() {
  const { isLoading, isStaff, isAdmin, activeClinic, activeClinicId } = useUserRoles();
  const navigate = useNavigate();
  const navItems = baseNavItems.filter((item) => !item.adminOnly || isAdmin);
  const primaryItems = navItems.filter((i) => i.primary).slice(0, 4);
  const [moreOpen, setMoreOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('clinic.sidebar.collapsed') === '1';
  });
  useEffect(() => {
    localStorage.setItem('clinic.sidebar.collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  // Open wizard automatically on first visit (per clinic, admin only)
  useEffect(() => {
    if (!isLoading && isAdmin && activeClinicId && !setupWizardCompleted(activeClinicId)) {
      setWizardOpen(true);
    }
  }, [isLoading, isAdmin, activeClinicId]);

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

  const FullNavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="grid grid-cols-1 gap-1 p-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition active:scale-[0.98]',
            isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-foreground'
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          <span className="font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop (lg+) */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
        <div className="p-4 border-b flex items-center gap-3">
          {activeClinic.logo_url ? (
            <img src={activeClinic.logo_url} alt={activeClinic.name} className="h-12 w-12 rounded-lg object-contain bg-muted/30 shrink-0" />
          ) : null}
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Clínica</div>
            <div className="font-bold truncate">{activeClinic.name}</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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

      {/* Sidebar mini-icon (tablet md..lg) */}
      <aside className="hidden md:flex lg:hidden w-16 flex-col border-r bg-card items-center py-3 gap-1">
        {activeClinic.logo_url ? (
          <img src={activeClinic.logo_url} alt={activeClinic.name} className="h-10 w-10 rounded-lg object-contain bg-muted/30 mb-2" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <Home className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 w-full flex flex-col items-center gap-1 overflow-y-auto px-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) => cn(
                'h-11 w-11 flex items-center justify-center rounded-xl transition',
                isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
            </NavLink>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={handleLogout} title="Sair">
          <LogOut className="h-5 w-5" />
        </Button>
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
            <span className="truncate text-sm">{activeClinic.name}</span>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => setWizardOpen(true)} title="Assistente de configuração">
                <Sparkles className="h-5 w-5" />
              </Button>
            )}
            <NotificationsBell />
          </div>
        </header>
        <header className="hidden md:flex items-center justify-end gap-2 p-3 border-b bg-card sticky top-0 z-30">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Assistente
            </Button>
          )}
          <NotificationsBell />
        </header>

        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>

        {/* Mobile bottom nav: 4 primários + Mais */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 pb-safe">
          <div className="flex items-stretch h-16 px-1">
            {primaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 rounded-xl mx-0.5 transition',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn('p-1.5 rounded-xl transition', isActive && 'bg-primary/10')}>
                      <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                    </div>
                    <span className="text-[10px] font-medium truncate max-w-full px-1">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 text-muted-foreground rounded-xl mx-0.5"
                  aria-label="Mais opções"
                >
                  <div className="p-1.5 rounded-xl">
                    <MoreHorizontal className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-medium">Mais</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0">
                <SheetHeader className="p-4 pb-2 text-left">
                  <SheetTitle className="flex items-center gap-3">
                    {activeClinic.logo_url && (
                      <img src={activeClinic.logo_url} alt="" className="h-9 w-9 rounded-lg object-contain bg-muted/30" />
                    )}
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Clínica</div>
                      <div className="truncate">{activeClinic.name}</div>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <FullNavList onNavigate={() => setMoreOpen(false)} />
                <div className="p-3 border-t space-y-1">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setMoreOpen(false); navigate('/'); }}>
                    <Home className="h-4 w-4 mr-2" />
                    Meu app pessoal
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </main>

      {wizardOpen && activeClinicId && (
        <SetupWizard
          clinicId={activeClinicId}
          onClose={() => setWizardOpen(false)}
          onCompleted={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}
