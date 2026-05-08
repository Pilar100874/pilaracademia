import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { Edit, ChevronRight, ChevronLeft, Dumbbell, Play, Trash2, Share2 } from 'lucide-react';
import { LazyVideoPreview } from '@/components/LazyVideoPreview';
import { getFreshMediaUrl } from '@/lib/mediaUrl';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { summarizeWorkout } from '@/lib/exerciseAnalysis';
import { ClassificationBadges } from '@/components/ClassificationBadges';
import { ShareWorkoutDialog } from '@/components/ShareWorkoutDialog';

const DAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface WorkoutPlanCardProps {
  plan: WorkoutPlan;
  onEdit: () => void;
  onStart?: () => void;
  compact?: boolean;
}

export function WorkoutPlanCard({ plan, onEdit, onStart, compact }: WorkoutPlanCardProps) {
  const exerciseCount = plan.exercises?.length || 0;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { deletePlan } = useWorkoutPlans();

  const summary = useMemo(
    () => summarizeWorkout(plan.exercises ?? [], 3),
    [plan.exercises]
  );

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    deletePlan.mutate(plan.id, {
      onSuccess: () => setConfirmOpen(false),
    });
  };

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [plan.exercises?.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
  };

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
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{plan.name}</h3>
              <Badge variant="secondary" className="shrink-0">
                {exerciseCount} exercício{exerciseCount !== 1 ? 's' : ''}
              </Badge>
            </div>
            {plan.objective && (
              <p className="text-xs text-muted-foreground italic mb-2 line-clamp-2">
                {plan.objective}
              </p>
            )}

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

            {/* Exercise preview with arrows */}
            {plan.exercises && plan.exercises.length > 0 && (
              <div className="relative">
                <div
                  ref={scrollerRef}
                  className="flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {plan.exercises.map((exercise) => {
                    const firstImg = getFreshMediaUrl(exercise.image_urls?.[0] ?? exercise.image_url);
                    return (
                      <div
                        key={exercise.id}
                        className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted overflow-hidden relative [&_.absolute]:hidden"
                      >
                        {exercise.video_url && exercise.video_type ? (
                          <LazyVideoPreview
                            videoType={exercise.video_type}
                            videoUrl={exercise.video_url}
                            startSeconds={exercise.video_start_seconds}
                            endSeconds={exercise.video_end_seconds}
                            iconSize="sm"
                            className="w-full h-full"
                          />
                        ) : firstImg ? (
                          <img
                            src={firstImg}
                            alt={exercise.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="h-7 w-7 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {canScrollLeft && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); scrollBy(-1); }}
                    aria-label="Anterior"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/95 backdrop-blur border shadow-md flex items-center justify-center text-foreground hover:bg-background transition"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {canScrollRight && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); scrollBy(1); }}
                    aria-label="Próximo"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/95 backdrop-blur border shadow-md flex items-center justify-center text-foreground hover:bg-background transition"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Resumo das classificações da IA — abaixo das imagens */}
            {summary.analyzedCount > 0 && (() => {
              const toRec = (arr: { key: string; value: number }[]) =>
                arr.reduce<Record<string, number>>((acc, it) => {
                  acc[it.key] = it.value;
                  return acc;
                }, {});
              const body = toRec(summary.body);
              const mobility = toRec(summary.mobility);
              const aesthetic = toRec(summary.aesthetic);
              if (
                Object.keys(body).length === 0 &&
                Object.keys(mobility).length === 0 &&
                Object.keys(aesthetic).length === 0
              )
                return null;
              return (
                <ClassificationBadges
                  body={body}
                  mobility={mobility}
                  aesthetic={aesthetic}
                  perDimension={3}
                  className="mt-3"
                />
              );
            })()}
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
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); setShareOpen(true); }}
              title="Compartilhar treino"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDelete}
              title="Excluir treino"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir treino"
        itemName={plan.name}
        onConfirm={confirmDelete}
        isDeleting={deletePlan.isPending}
      />

      <ShareWorkoutDialog open={shareOpen} onOpenChange={setShareOpen} plan={plan} />
    </Card>
  );
}

