import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkoutPlans, WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { Plus, Dumbbell, Loader2, Library } from 'lucide-react';
import { WorkoutPlanDialog } from '@/components/WorkoutPlanDialog';
import { WorkoutPlanCard } from '@/components/WorkoutPlanCard';
import { WorkoutViewerDialog } from '@/components/WorkoutViewerDialog';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function WorkoutsPage() {
  const navigate = useNavigate();
  const { workoutPlans, isLoading } = useWorkoutPlans();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);

  const handleEdit = (plan: WorkoutPlan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleStart = (plan: WorkoutPlan) => {
    setViewingPlan(plan);
    setViewerOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPlan(null);
  };

  // Group plans by day of week
  const plansByDay = DAYS_OF_WEEK.map((day, index) => ({
    day,
    dayIndex: index,
    plans: workoutPlans.filter((plan) => plan.days_of_week.includes(index)),
  }));

  const todayIndex = new Date().getDay();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-3 sm:px-4 py-3">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold truncate">Meus Treinos</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => navigate('/exercises')}>
              <Library className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Biblioteca</span>
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Novo</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-3 sm:p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : workoutPlans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhum treino cadastrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro treino com exercícios personalizados
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Treino
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Today's workout highlight */}
            {plansByDay[todayIndex].plans.length > 0 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-primary">📅</span>
                    Treino de Hoje ({DAYS_OF_WEEK[todayIndex]})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plansByDay[todayIndex].plans.map((plan) => (
                    <WorkoutPlanCard
                      key={plan.id}
                      plan={plan}
                      onEdit={() => handleEdit(plan)}
                      onStart={() => handleStart(plan)}
                      compact
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* All workout plans */}
            <div className="space-y-3">
              <h2 className="font-semibold text-muted-foreground">
                Todos os Treinos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {workoutPlans.map((plan) => (
                  <WorkoutPlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => handleEdit(plan)}
                    onStart={() => handleStart(plan)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      <WorkoutPlanDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        editingPlan={editingPlan}
      />

      {viewingPlan && (
        <WorkoutViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          plan={viewingPlan}
        />
      )}

      <BottomNav />
    </div>
  );
}
