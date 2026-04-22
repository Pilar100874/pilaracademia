import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { Edit, ChevronRight, Dumbbell, Play } from 'lucide-react';
import { VideoThumbnail } from '@/components/VideoThumbnail';

const DAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface WorkoutPlanCardProps {
  plan: WorkoutPlan;
  onEdit: () => void;
  onStart?: () => void;
  compact?: boolean;
}

export function WorkoutPlanCard({ plan, onEdit, onStart, compact }: WorkoutPlanCardProps) {
  const exerciseCount = plan.exercises?.length || 0;

  if (compact) {
    return (
      <div
        onClick={onStart || onEdit}
        className="flex items-center justify-between p-3 rounded-lg bg-card border cursor-pointer hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{plan.name}</p>
            <p className="text-sm text-muted-foreground">
              {exerciseCount} exercício{exerciseCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exerciseCount > 0 && (
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
            </div>
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold truncate">{plan.name}</h3>
              <Badge variant="secondary" className="shrink-0">
                {exerciseCount} exercício{exerciseCount !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Days of week pills */}
            <div className="flex gap-1 mb-3">
              {DAYS_SHORT.map((day, index) => (
                <span
                  key={index}
                  className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                    plan.days_of_week.includes(index)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Exercise preview */}
            {plan.exercises && plan.exercises.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {plan.exercises.slice(0, 4).map((exercise) => (
                  <div
                    key={exercise.id}
                    className="shrink-0 w-12 h-12 rounded-lg bg-muted overflow-hidden"
                  >
                    {exercise.image_url ? (
                      <img
                        src={exercise.image_url}
                        alt={exercise.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {plan.exercises.length > 4 && (
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">
                      +{plan.exercises.length - 4}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {exerciseCount > 0 && onStart && (
              <Button size="icon" variant="default" onClick={onStart} title="Iniciar treino">
                <Play className="h-4 w-4 ml-0.5" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={onEdit} title="Editar">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
