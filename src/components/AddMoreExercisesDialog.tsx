import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWorkoutPlans, WorkoutPlan, WorkoutExercise } from '@/hooks/useWorkoutPlans';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { LazyVideoPreview } from '@/components/LazyVideoPreview';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: WorkoutPlan;
  exercises: WorkoutExercise[];
}

const NEW_GROUP = '__new__';

type NewItem = {
  name: string; image_urls: string[]; sets: number; reps: number;
  video_type: WorkoutExercise['video_type']; video_url: string | null;
  video_start_seconds: number | null; video_end_seconds: number | null;
  exercise_library_id: string | null; group_name: string | null; ai_reason: string | null;
};

export function AddMoreExercisesDialog({ open, onOpenChange, plan, exercises }: Props) {
  const { workoutPlans, addExercise, updateExercise, updatePlan, reorderExercises } = useWorkoutPlans();
  const { allExercises } = useExerciseLibrary();
  const [tab, setTab] = useState<'plan' | 'ai'>('plan');
  const [busy, setBusy] = useState(false);

  // De outro treino
  const [sourceId, setSourceId] = useState<string>('');
  const [picked, setPicked] = useState<string[]>([]);
  const [groupChoice, setGroupChoice] = useState<string>('');
  const [newGroup, setNewGroup] = useState('');

  // Novo objetivo
  const [objective, setObjective] = useState('');
  const [count, setCount] = useState('4');

  useEffect(() => {
    if (!open) {
      setSourceId(''); setPicked([]); setGroupChoice(''); setNewGroup('');
      setObjective(''); setCount('4'); setBusy(false);
    }
  }, [open]);

  const otherPlans = useMemo(
    () => workoutPlans.filter((p) => p.id !== plan.id && (p.exercises?.length ?? 0) > 0),
    [workoutPlans, plan.id]
  );
  const source = otherPlans.find((p) => p.id === sourceId);
  const existingGroups = useMemo(
    () => [...new Set(exercises.map((e) => e.group_name).filter(Boolean) as string[])],
    [exercises]
  );

  /** Insere os novos no lugar certo, reordena e (re)gera os motivos de toda a sequência. */
  const finalize = async (items: NewItem[], objectiveText: string) => {
    const created: WorkoutExercise[] = [];
    for (const it of items) {
      const ex = await addExercise.mutateAsync({
        workout_plan_id: plan.id, ...it, order_index: 9999, _silent: true,
      });
      created.push(ex as unknown as WorkoutExercise);
    }
    // Ordem final: cada novo entra logo após o último exercício do mesmo grupo; senão, no fim.
    const ordered: WorkoutExercise[] = [...exercises];
    for (const c of created) {
      let at = -1;
      if (c.group_name) ordered.forEach((e, i) => { if (e.group_name === c.group_name) at = i; });
      if (at >= 0) ordered.splice(at + 1, 0, c); else ordered.push(c);
    }
    await reorderExercises.mutateAsync(ordered.map((e, i) => ({ id: e.id, order_index: i })));

    // Sempre cria o motivo do treino e de cada exercício.
    const { data, error } = await supabase.functions.invoke('compose-workout-from-text', {
      body: {
        mode: 'explain',
        prompt: objectiveText || plan.name,
        items: ordered.map((e) => ({ name: e.name, group: e.group_name ?? null })),
      },
    });
    if (error || data?.error) {
      toast.error((data as { error?: string } | null)?.error || 'Exercícios adicionados, mas não foi possível gerar os motivos.');
      return;
    }
    const reasons: string[] = Array.isArray(data?.reasons) ? data.reasons : [];
    await Promise.all(ordered.map((e, i) => reasons[i] && reasons[i] !== e.ai_reason
      ? updateExercise.mutateAsync({ id: e.id, ai_reason: reasons[i] })
      : Promise.resolve()));
    await updatePlan.mutateAsync({
      id: plan.id, name: plan.name, days_of_week: plan.days_of_week,
      objective: objectiveText || plan.objective || null,
      ai_rationale: data?.rationale || plan.ai_rationale || null,
    });
  };

  const handleFromPlan = async () => {
    if (!source || !picked.length) { toast.error('Escolha os exercícios.'); return; }
    const group = groupChoice === NEW_GROUP ? newGroup.trim() : groupChoice;
    if (!group) { toast.error('Escolha em qual grupo adicionar.'); return; }
    setBusy(true);
    try {
      const list = (source.exercises ?? []).filter((e) => picked.includes(e.id));
      await finalize(list.map((e) => ({
        name: e.name, image_urls: e.image_urls || [], sets: e.sets, reps: e.reps,
        video_type: e.video_type, video_url: e.video_url,
        video_start_seconds: e.video_start_seconds, video_end_seconds: e.video_end_seconds,
        exercise_library_id: e.exercise_library_id ?? null, group_name: group, ai_reason: null,
      })), plan.objective || '');
      toast.success(`${list.length} exercício(s) adicionados em "${group}"`);
      onOpenChange(false);
    } catch (e) {
      console.error(e); toast.error('Erro ao adicionar exercícios');
    } finally { setBusy(false); }
  };

  const handleFromObjective = async () => {
    const text = objective.trim();
    const n = Math.max(1, Math.min(20, parseInt(count || '0', 10) || 0));
    if (!text) { toast.error('Descreva o novo objetivo.'); return; }
    const used = new Set(exercises.map((e) => e.exercise_library_id).filter(Boolean));
    const pool = allExercises.filter((ex) => !used.has(ex.id));
    if (!pool.length) { toast.error('Não há exercícios disponíveis na biblioteca.'); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('compose-workout-from-text', {
        body: {
          prompt: text, count: n,
          library: pool.map((ex) => ({
            id: ex.id, name: ex.name, body: ex.body_analysis ?? null,
            aesthetic: ex.aesthetic_analysis ?? null, mobility: ex.mobility_analysis ?? null,
            is_global: !!ex.is_global,
          })),
        },
      });
      if (error || data?.error) {
        toast.error((data as { error?: string } | null)?.error || 'Erro ao gerar com IA'); return;
      }
      const byId = new Map(pool.map((ex) => [ex.id, ex] as const));
      const items = (Array.isArray(data?.items) ? data.items : []) as { id: string; group: string; reason: string }[];
      const list = items.map((it) => ({ it, ex: byId.get(it.id) })).filter((x) => x.ex);
      if (!list.length) { toast.error('A IA não encontrou exercícios para esse objetivo.'); return; }
      const merged = [plan.objective?.trim(), text].filter(Boolean).join(' + ');
      await finalize(list.map(({ it, ex }) => ({
        name: ex!.name, image_urls: ex!.image_urls || [], sets: ex!.default_sets || 3, reps: ex!.default_reps || 12,
        video_type: ex!.video_type, video_url: ex!.video_url,
        video_start_seconds: ex!.video_start_seconds, video_end_seconds: ex!.video_end_seconds,
        exercise_library_id: ex!.id, group_name: it.group || text.slice(0, 40), ai_reason: it.reason || null,
      })), merged);
      toast.success(`${list.length} exercício(s) adicionados`);
      onOpenChange(false);
    } catch (e) {
      console.error(e); toast.error('Erro ao gerar com IA');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent
        className="max-w-lg lg:max-w-3xl w-[calc(100vw-1rem)] sm:w-full min-w-0 max-h-[92vh] overflow-y-auto p-4 sm:p-6 lg:p-8"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader><DialogTitle>Adicionar mais exercícios</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'plan' | 'ai')}>
          <TabsList className="w-full">
            <TabsTrigger value="plan" className="flex-1"><Copy className="h-4 w-4 mr-1" />De outro treino</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1"><Sparkles className="h-4 w-4 mr-1" />Novo objetivo</TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="space-y-4 pt-3">
            {otherPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Você não tem outros treinos com exercícios.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Treino de origem</Label>
                  <div className="flex flex-wrap gap-2">
                    {otherPlans.map((p) => (
                      <button key={p.id} type="button"
                        onClick={() => { setSourceId(p.id); setPicked([]); }}
                        className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${sourceId === p.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border hover:bg-muted'}`}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {source && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Exercícios</Label>
                      <button type="button" className="text-xs text-primary underline"
                        onClick={() => setPicked(picked.length === source.exercises!.length ? [] : source.exercises!.map((e) => e.id))}>
                        {picked.length === source.exercises!.length ? 'Desmarcar todos' : 'Marcar todos'}
                      </button>
                    </div>
                    <div className="space-y-1 max-h-56 overflow-y-auto rounded-md border border-border p-2">
                      {source.exercises!.map((e) => (
                        <label key={e.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                          <Checkbox checked={picked.includes(e.id)}
                            onCheckedChange={(c) => setPicked((prev) => c ? [...prev, e.id] : prev.filter((x) => x !== e.id))} />
                          <LazyVideoPreview
                            videoType={e.video_type}
                            videoUrl={e.video_url}
                            startSeconds={e.video_start_seconds}
                            endSeconds={e.video_end_seconds}
                            className="w-10 h-14 rounded-md overflow-hidden bg-muted shrink-0"
                            iconSize="sm"
                          />
                          <span className="text-sm break-words min-w-0">{e.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {source && picked.length > 0 && (
                  <div className="space-y-2">
                    <Label>Em qual grupo quer adicionar?</Label>
                    <div className="flex flex-wrap gap-2">
                      {existingGroups.map((g) => (
                        <button key={g} type="button" onClick={() => setGroupChoice(g)}
                          className={`px-3 py-1.5 rounded-full border text-sm ${groupChoice === g ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border hover:bg-muted'}`}>
                          {g}
                        </button>
                      ))}
                      <button type="button" onClick={() => setGroupChoice(NEW_GROUP)}
                        className={`px-3 py-1.5 rounded-full border text-sm ${groupChoice === NEW_GROUP ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border hover:bg-muted'}`}>
                        + Novo grupo
                      </button>
                    </div>
                    {groupChoice === NEW_GROUP && (
                      <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="Ex.: Core, Alongamento final" maxLength={40} />
                    )}
                  </div>
                )}

                <Button className="w-full" onClick={handleFromPlan} disabled={busy || !picked.length}>
                  {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Adicionar {picked.length ? `(${picked.length})` : ''}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label>O que mais quer trabalhar?</Label>
              <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3}
                placeholder="Ex.: incluir fortalecimento de core e alongamento de posterior" className="resize-none text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Quantos exercícios a mais?</Label>
              <Input inputMode="numeric" value={count} className="w-24"
                onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            </div>
            <Button className="w-full" onClick={handleFromObjective} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Gerar e adicionar
            </Button>
          </TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground">A IA sempre atualiza o motivo do treino e de cada exercício na sequência.</p>
      </DialogContent>
    </Dialog>
  );
}
