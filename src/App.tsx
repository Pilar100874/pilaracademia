import { useState, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { AuthPage } from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { ProjectionsPage } from "@/pages/ProjectionsPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { HealthPage } from "@/pages/HealthPage";
import { WorkoutsPage } from "@/pages/WorkoutsPage";
import ExerciseLibraryPage from "@/pages/ExerciseLibraryPage";
import BodyAnalysisPage from "@/pages/BodyAnalysisPage";
import BioimpedancePage from "@/pages/BioimpedancePage";
import OnboardingPage from "@/pages/OnboardingPage";
import InsightsPage from "@/pages/InsightsPage";
import FoodPreferencesPage from "@/pages/FoodPreferencesPage";
import SharedSummaryPage from "@/pages/SharedSummaryPage";
import HelpPage from "@/pages/HelpPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import MovementAnalysisAccessPage from "@/pages/MovementAnalysisAccessPage";
import WeeklyMenuPage from "@/pages/WeeklyMenuPage";
import { Dashboard } from "@/components/Dashboard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { SplashScreen } from "@/components/SplashScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const location = useLocation();

  if (isLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to onboarding if not completed yet (and not already there)
  if (profile && profile.onboarding_completed !== true && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projections"
        element={
          <ProtectedRoute>
            <ProjectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/health"
        element={
          <ProtectedRoute>
            <HealthPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/menu"
        element={
          <ProtectedRoute>
            <WeeklyMenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workouts"
        element={
          <ProtectedRoute>
            <WorkoutsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exercises"
        element={
          <ProtectedRoute>
            <ExerciseLibraryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/body-analysis"
        element={
          <ProtectedRoute>
            <BodyAnalysisPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bioimpedance"
        element={
          <ProtectedRoute>
            <BioimpedancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <InsightsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/food-preferences"
        element={
          <ProtectedRoute>
            <FoodPreferencesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ajuda"
        element={
          <ProtectedRoute>
            <HelpPage />
          </ProtectedRoute>
        }
      />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route
        path="/admin/movement-analysis"
        element={
          <ProtectedRoute>
            <MovementAnalysisAccessPage />
          </ProtectedRoute>
        }
      />
      <Route path="/r/:token" element={<SharedSummaryPage />} />
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
              <InstallPrompt />
              <UpdatePrompt />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};


export default App;
