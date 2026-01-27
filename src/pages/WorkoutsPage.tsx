import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkoutPlans, WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { Plus, Dumbbell, Loader2 } from 'lucide-react';
import { WorkoutPlanDialog } from '@/components/WorkoutPlanDialog';
import { WorkoutPlanCard } from '@/components/WorkoutPlanCard';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function WorkoutsPage() {
  const { workoutPlans, isLoading } = useWorkoutPlans();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);

  const handleEdit = (plan: WorkoutPlan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
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
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Meus Treinos</h1>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Treino
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-4">
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
              {workoutPlans.map((plan) => (
                <WorkoutPlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={() => handleEdit(plan)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <WorkoutPlanDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        editingPlan={editingPlan}
      />

      <BottomNav />
    </div>
  );
}
