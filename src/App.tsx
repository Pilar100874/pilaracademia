import { useState, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/pages/AuthPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { ProjectionsPage } from "@/pages/ProjectionsPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { HealthPage } from "@/pages/HealthPage";
import { WorkoutsPage } from "@/pages/WorkoutsPage";
import ExerciseLibraryPage from "@/pages/ExerciseLibraryPage";
import { Dashboard } from "@/components/Dashboard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SplashScreen } from "@/components/SplashScreen";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import ClinicLayout from "@/pages/clinic/ClinicLayout";
import ClinicOverviewPage from "@/pages/clinic/ClinicOverviewPage";
import StudentsPage from "@/pages/clinic/StudentsPage";
import EquipmentPage from "@/pages/clinic/EquipmentPage";
import SkillLevelsPage from "@/pages/clinic/SkillLevelsPage";
import SequencesPage from "@/pages/clinic/SequencesPage";
import LiveSessionPage from "@/pages/clinic/LiveSessionPage";
import CreateClinicPage from "@/pages/clinic/CreateClinicPage";
import AppointmentsPage from "@/pages/clinic/AppointmentsPage";
import StudentEvolutionPage from "@/pages/clinic/StudentEvolutionPage";
import ReportsPage from "@/pages/clinic/ReportsPage";
import BookableSlotsPage from "@/pages/clinic/BookableSlotsPage";
import StationPage from "@/pages/StationPage";
import MyPilatesPage from "@/pages/MyPilatesPage";
import BookClassPage from "@/pages/BookClassPage";
import OnboardingPage from "@/pages/OnboardingPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import MasterPage from "@/pages/master/MasterPage";
import { useMustChangePassword } from "@/hooks/useMustChangePassword";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { data: mustChange, isLoading: flagLoading } = useMustChangePassword();
  if (isLoading || flagLoading) return <div className="min-h-screen flex items-center justify-center gradient-hero"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (mustChange && window.location.pathname !== '/trocar-senha') return <Navigate to="/trocar-senha" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const redirectTo = `${from?.pathname ?? "/"}${from?.search ?? ""}`;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center gradient-hero"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (user) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public station tablet route */}
      <Route path="/estacao/:token" element={<StationPage />} />

      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/projections" element={<ProtectedRoute><ProjectionsPage /></ProtectedRoute>} />
      <Route path="/health" element={<ProtectedRoute><HealthPage /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path="/workouts" element={<ProtectedRoute><WorkoutsPage /></ProtectedRoute>} />
      <Route path="/exercises" element={<ProtectedRoute><ExerciseLibraryPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/meu-pilates" element={<ProtectedRoute><MyPilatesPage /></ProtectedRoute>} />
      <Route path="/meu-pilates/agendar" element={<ProtectedRoute><BookClassPage /></ProtectedRoute>} />
      <Route path="/trocar-senha" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

      {/* Clinic panel */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/clinica/criar" element={<ProtectedRoute><CreateClinicPage /></ProtectedRoute>} />
      <Route path="/clinica" element={<ProtectedRoute><ClinicLayout /></ProtectedRoute>}>
        <Route index element={<ClinicOverviewPage />} />
        <Route path="agenda" element={<AppointmentsPage />} />
        <Route path="grades" element={<BookableSlotsPage />} />
        <Route path="alunos" element={<StudentsPage />} />
        <Route path="evolucao" element={<StudentEvolutionPage />} />
        <Route path="equipamentos" element={<EquipmentPage />} />
        <Route path="niveis" element={<SkillLevelsPage />} />
        <Route path="sequencias" element={<SequencesPage />} />
        <Route path="aula" element={<LiveSessionPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
      </Route>

      {/* Master admin panel */}
      <Route path="/master" element={<ProtectedRoute><MasterPage /></ProtectedRoute>} />

      <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
            <InstallPrompt />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
