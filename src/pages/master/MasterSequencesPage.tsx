// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Plus, Trash2, ListOrdered, Loader2, GripVertical, Library, Pencil, Check, X, Search, Dumbbell, Clock, Layers, Play, Maximize2, PlayCircle, ChevronLeft, ChevronRight, CheckCircle2, Filter, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { useConfirm } from '@/components/ConfirmProvider';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { ExercisePickerDialog } from '@/components/ExercisePickerDialog';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SKILL_LEVELS = ['Iniciante', 'Intermediário', 'Avançado'];
const CATEGORIES = ['Reformer', 'Cadillac', 'Chair', 'Barrel', 'Mat', 'Bola', 'Faixa', 'Funcional', 'Outros'];

type GlobalSequence = {
  id: string; name: string; description: string | null;
  estimated_minutes: number | null; equipment_type: string | null;
  skill_level_label: string | null;
};

type GlobalItem = {
  id: string; sequence_id: string; name: string;
  image_urls: string[] | null; sets: number; reps: number;
  notes: string | null; order_index: number;
  exercise_library_id: string | null;
  video_url: string | null; video_type: string | null;
  video_start_seconds: number | null; video_end_seconds: number | null;
};

const levelColor = (lv?: string | null) => {
  if (lv === 'Iniciante') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (lv === 'Intermediário') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
  if (lv === 'Avançado') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200';
  return 'bg-muted text-muted-foreground';
};

function SortableRow({ item, idx, onRemove, onEdit, onZoomImages, onPlayVideo }: {
  item: GlobalItem; idx: number;
  onRemove: () => void;
  onEdit: (p: Partial<GlobalItem>) => void;
  onZoomImages: (images: string[]) => void;
  onPlayVideo: (item: GlobalItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(item.sets);
  const [reps, setReps] = useState(item.reps);
  const [notes, setNotes] = useState(item.notes ?? '');
  const hasImages = (item.image_urls?.length ?? 0) > 0;
  const hasVideo = !!item.video_url;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-stretch gap-3 rounded-2xl border-2 bg-card overflow-hidden hover:border-primary/60 hover:shadow-md transition-all"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none flex items-center justify-center px-2 bg-muted/40 hover:bg-muted text-muted-foreground"
        aria-label="Arrastar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => {
          if (hasVideo) onPlayVideo(item);
          else if (hasImages) onZoomImages(item.image_urls as string[]);
        }}
        className={`relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 bg-muted/40 flex items-center justify-center overflow-hidden ${hasImages || hasVideo ? 'cursor-pointer group/img' : ''}`}
        title={hasVideo ? 'Reproduzir vídeo' : hasImages ? 'Ampliar imagem' : undefined}
      >
        {hasVideo && item.video_type === 'upload' ? (
          <VideoThumbnail
            videoType={item.video_type}
            videoUrl={item.video_url}
            startSeconds={item.video_start_seconds}
            endSeconds={item.video_end_seconds}
            className="w-full h-full"
            objectFit="contain"
            autoplayPreview
          />
        ) : hasImages ? (
          <>
            <img src={item.image_urls![0]} alt={item.name} className="h-full w-full object-contain" />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center">
              {hasVideo ? (
                <Play className="h-6 w-6 text-white drop-shadow opacity-90" />
              ) : (
                <Maximize2 className="h-5 w-5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
              )}
            </div>
            {(item.image_urls?.length ?? 0) > 1 && (
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1.5 rounded">
                +{(item.image_urls?.length ?? 1) - 1}
              </span>
            )}
          </>
        ) : hasVideo ? (
          <VideoThumbnail
            videoType={item.video_type}
            videoUrl={item.video_url}
            startSeconds={item.video_start_seconds}
            endSeconds={item.video_end_seconds}
            className="w-full h-full"
            objectFit="contain"
          />
        ) : (
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="absolute top-1 left-1 h-6 w-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow z-10">
          {idx + 1}
        </div>
      </button>

      <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center gap-1">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{item.name}</p>
        {editing ? (
          <div className="flex items-center gap-1 flex-wrap">
            <Input className="h-7 w-14 text-xs" type="number" value={sets} onChange={(e) => setSets(parseInt(e.target.value) || 0)} />
            <span className="text-xs text-muted-foreground">×</span>
            <Input className="h-7 w-14 text-xs" type="number" value={reps} onChange={(e) => setReps(parseInt(e.target.value) || 0)} />
            <Input className="h-7 flex-1 min-w-[120px] text-xs" placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {item.sets} × {item.reps}
            </span>
            {hasVideo && (
              <button
                type="button"
                onClick={() => onPlayVideo(item)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-500/20 transition-colors"
              >
                <Play className="h-3 w-3 fill-current" />
                Vídeo
              </button>
            )}
            {item.notes && (
              <span className="text-[11px] text-muted-foreground line-clamp-1">{item.notes}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-1 pr-2">
        {editing ? (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { onEdit({ sets, reps, notes }); setEditing(false); }}>
              <Check className="h-4 w-4 text-emerald-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------ Simulator Modal ------------ */
function SimulateDialog({
  sequence, items, open, onOpenChange,
}: {
  sequence: GlobalSequence | null;
  items: GlobalItem[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const current = items[index];

  const reset = () => { setIndex(0); setDone(new Set()); };

  const next = () => {
    if (!current) return;
    setDone(prev => new Set(prev).add(current.id));
    if (index < items.length - 1) setIndex(index + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Simulação · {sequence?.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Pré-visualize como o aluno vai ver este template.
          </p>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-2" />
            <p className="text-sm">Adicione exercícios para simular.</p>
          </div>
        ) : current && (
          <div className="grid md:grid-cols-[1.4fr_1fr]">
            {/* media */}
            <div className="bg-black flex items-center justify-center min-h-[260px] md:min-h-[420px] relative">
              {current.video_url ? (
                <ExerciseVideoPlayer
                  videoUrl={current.video_url}
                  videoType={(current.video_type as any) || undefined}
                  startSeconds={current.video_start_seconds ?? undefined}
                  endSeconds={current.video_end_seconds ?? undefined}
                  autoPlay
                />
              ) : (current.image_urls?.length ?? 0) > 0 ? (
                <img src={current.image_urls![0]} alt={current.name} className="max-h-[420px] w-full object-contain" />
              ) : (
                <Dumbbell className="h-16 w-16 text-white/40" />
              )}
              <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">
                {index + 1} / {items.length}
              </div>
            </div>

            {/* info */}
            <div className="p-5 space-y-4 flex flex-col">
              <div>
                <h3 className="font-bold text-lg leading-tight">{current.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    <Layers className="h-3 w-3" /> {current.sets} séries
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    × {current.reps} reps
                  </span>
                </div>
                {current.notes && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{current.notes}</p>
                )}
              </div>

              {/* steps */}
              <div className="flex-1 overflow-auto -mx-1 px-1">
                <p className="text-[11px] uppercase font-semibold text-muted-foreground mb-2">Roteiro</p>
                <div className="space-y-1.5">
                  {items.map((it, i) => {
                    const isCurrent = i === index;
                    const isDone = done.has(it.id);
                    return (
                      <button
                        key={it.id}
                        onClick={() => setIndex(i)}
                        className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          isCurrent ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                      >
                        <span className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                          isCurrent ? 'bg-primary-foreground text-primary' :
                          isDone ? 'bg-emerald-500 text-white' : 'bg-muted-foreground/20'
                        }`}>
                          {isDone && !isCurrent ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                        </span>
                        <span className="flex-1 truncate font-medium">{it.name}</span>
                        <span className="text-[10px] opacity-70">{it.sets}×{it.reps}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* nav */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                {index === items.length - 1 ? (
                  <Button size="sm" onClick={() => { setDone(prev => new Set(prev).add(current.id)); }}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Finalizar
                  </Button>
                ) : (
                  <Button size="sm" onClick={next}>
                    Próximo <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function MasterSequencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('__all__');
  const [filterLevel, setFilterLevel] = useState('__all__');

  const emptyForm = { name: '', description: '', estimated_minutes: '', equipment_type: '', skill_level_label: '' };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [videoItem, setVideoItem] = useState<GlobalItem | null>(null);

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['global-sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sequences')
        .select('id,name,description,estimated_minutes,equipment_type,skill_level_label')
        .eq('is_global', true)
        .order('name');
      if (error) throw error;
      return data as GlobalSequence[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['global-sequence-items', selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sequence_items')
        .select('*')
        .eq('sequence_id', selected!)
        .order('order_index');
      if (error) throw error;
      return data as GlobalItem[];
    },
  });

  const { data: library = [] } = useQuery({
    queryKey: ['global-library-for-pick'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_library')
        .select('id,name,image_urls,default_sets,default_reps,video_url,video_type,video_start_seconds,video_end_seconds,category_id,is_global')
        .eq('is_global', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: globalCategories = [] } = useQuery({
    queryKey: ['global-categories-for-pick'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_categories')
        .select('id,name,is_global')
        .eq('is_global', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (!name) throw new Error('Nome obrigatório');
      const { data, error } = await supabase.from('exercise_sequences').insert({
        name,
        description: form.description.trim() || null,
        estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : null,
        equipment_type: form.equipment_type || null,
        skill_level_label: form.skill_level_label || null,
        is_global: true,
        clinic_id: null,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Template criado');
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['global-sequences'] });
      if (data?.id) setSelected(data.id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_sequences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (selected) setSelected(null);
      qc.invalidateQueries({ queryKey: ['global-sequences'] });
      toast.success('Template removido');
    },
  });

  const updateSequence = useMutation({
    mutationFn: async (patch: { name: string; description: string | null; estimated_minutes: number | null; equipment_type: string | null; skill_level_label: string | null }) => {
      if (!selected) throw new Error('Nenhum template selecionado');
      const { error } = await supabase.from('exercise_sequences').update(patch).eq('id', selected);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-sequences'] });
      toast.success('Template atualizado');
      setEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addItems = useMutation({
    mutationFn: async (libIds: string[]) => {
      if (!selected) throw new Error('inválido');
      let nextIdx = (items.reduce((m, i) => Math.max(m, i.order_index), -1)) + 1;
      const rows = libIds.map((id) => {
        const lib = library.find((l: any) => l.id === id);
        if (!lib) return null;
        return {
          sequence_id: selected,
          exercise_library_id: lib.id,
          name: lib.name,
          image_urls: lib.image_urls ?? [],
          video_url: lib.video_url,
          video_type: lib.video_type,
          video_start_seconds: lib.video_start_seconds,
          video_end_seconds: lib.video_end_seconds,
          sets: lib.default_sets ?? 3,
          reps: lib.default_reps ?? 12,
          order_index: nextIdx++,
        };
      }).filter(Boolean) as any[];
      if (!rows.length) return;
      const { error } = await supabase.from('exercise_sequence_items').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['global-sequence-items', selected] });
      toast.success(`${vars.length} exercício${vars.length === 1 ? '' : 's'} adicionado${vars.length === 1 ? '' : 's'}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_sequence_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['global-sequence-items', selected] }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<GlobalItem> & { id: string }) => {
      const { error } = await supabase.from('exercise_sequence_items').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['global-sequence-items', selected] }),
  });

  const reorder = useMutation({
    mutationFn: async (newOrder: GlobalItem[]) => {
      await Promise.all(newOrder.map((it, idx) =>
        supabase.from('exercise_sequence_items').update({ order_index: idx }).eq('id', it.id)
      ));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['global-sequence-items', selected] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex(i => i.id === active.id);
    const newIdx = items.findIndex(i => i.id === over.id);
    const newOrder = arrayMove(items, oldIdx, newIdx);
    qc.setQueryData(['global-sequence-items', selected], newOrder);
    reorder.mutate(newOrder);
  };

  const selectedSeq = sequences.find(s => s.id === selected) ?? null;

  const filteredSequences = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sequences.filter(s => {
      if (q && !(s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))) return false;
      if (filterCategory !== '__all__' && (s.equipment_type ?? '') !== filterCategory) return false;
      if (filterLevel !== '__all__' && (s.skill_level_label ?? '') !== filterLevel) return false;
      return true;
    });
  }, [sequences, search, filterCategory, filterLevel]);

  const hasFilters = filterCategory !== '__all__' || filterLevel !== '__all__' || !!search;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-brand/30 via-brand/10 to-background p-5 sm:p-7">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-brand/30 blur-3xl" />
          <div className="relative flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="icon" onClick={() => navigate('/master')} className="shrink-0 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="h-3 w-3" /> Master
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight flex items-center gap-2 leading-none">
                Templates de Treinos
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl">
                Sequências globais que todas as clínicas podem importar. Crie, categorize e simule antes de publicar.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="rounded-full shadow-lg">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Novo template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo template global</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Reabilitação ombro - iniciante" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Categoria</Label>
                      <Select value={form.equipment_type || '__none__'} onValueChange={(v) => setForm({ ...form, equipment_type: v === '__none__' ? '' : v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nenhuma —</SelectItem>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nível</Label>
                      <Select value={form.skill_level_label || '__none__'} onValueChange={(v) => setForm({ ...form, skill_level_label: v === '__none__' ? '' : v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nenhum —</SelectItem>
                          {SKILL_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div>
                    <Label>Duração estimada (min)</Label>
                    <Input type="number" value={form.estimated_minutes} onChange={e => setForm({ ...form, estimated_minutes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={() => create.mutate()} disabled={create.isPending}>
                    {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters bar */}
        <Card className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-0 bg-muted/40 focus-visible:bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as categorias</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Nível" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os níveis</SelectItem>
                {SKILL_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={() => { setSearch(''); setFilterCategory('__all__'); setFilterLevel('__all__'); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Templates grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSequences.length === 0 ? (
          <Card className="p-12 text-center">
            <ListOrdered className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {hasFilters ? 'Nenhum template corresponde aos filtros.' : 'Nenhum template criado ainda.'}
            </p>
            {!hasFilters && (
              <Button onClick={() => setOpen(true)} className="mt-4" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Criar primeiro template
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSequences.map(s => {
              const isActive = selected === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelected(isActive ? null : s.id)}
                  className={`group relative flex flex-col rounded-3xl border-2 bg-card overflow-hidden transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
                    isActive ? 'border-primary ring-4 ring-primary/20' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="relative h-32 bg-gradient-to-br from-brand/40 via-brand/15 to-primary/5 flex items-center justify-center overflow-hidden">
                    <ListOrdered className="h-14 w-14 text-primary/60 group-hover:scale-110 transition-transform" />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-background text-destructive hover:text-destructive backdrop-blur"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (await confirm({ title: 'Excluir sequência', description: `Excluir "${s.name}"?`, destructive: true })) remove.mutate(s.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {s.skill_level_label && (
                      <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold ${levelColor(s.skill_level_label)}`}>
                        {s.skill_level_label}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col">
                    <p className="font-bold text-sm leading-tight line-clamp-2">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{s.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {s.equipment_type && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          <Dumbbell className="h-3 w-3" /> {s.equipment_type}
                        </span>
                      )}
                      {s.estimated_minutes && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          <Clock className="h-3 w-3" /> {s.estimated_minutes}min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Editor for selected template */}
        {selectedSeq && (
          <Card className="p-4 sm:p-6 space-y-4 border-2 border-primary/40 shadow-lg">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Layers className="h-5 w-5 text-primary" />
                  <h2 className="font-black text-xl truncate">{selectedSeq.name}</h2>
                  {selectedSeq.skill_level_label && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${levelColor(selectedSeq.skill_level_label)}`}>
                      {selectedSeq.skill_level_label}
                    </span>
                  )}
                  {selectedSeq.equipment_type && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {selectedSeq.equipment_type}
                    </span>
                  )}
                </div>
                {selectedSeq.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedSeq.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {items.length} exercício{items.length === 1 ? '' : 's'}
                  {selectedSeq.estimated_minutes ? ` · ${selectedSeq.estimated_minutes} min estimados` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSimulateOpen(true)}
                  disabled={items.length === 0}
                >
                  <PlayCircle className="h-4 w-4 mr-1.5" /> Simular
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditForm({
                      name: selectedSeq.name ?? '',
                      description: selectedSeq.description ?? '',
                      estimated_minutes: selectedSeq.estimated_minutes ? String(selectedSeq.estimated_minutes) : '',
                      equipment_type: selectedSeq.equipment_type ?? '',
                      skill_level_label: selectedSeq.skill_level_label ?? '',
                    });
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" onClick={() => setPickerOpen(true)}>
                  <Library className="h-4 w-4 mr-1.5" /> Adicionar exercícios
                </Button>
              </div>
            </div>

            {/* Edit template dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Editar template</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Categoria</Label>
                      <Select value={editForm.equipment_type || '__none__'} onValueChange={(v) => setEditForm({ ...editForm, equipment_type: v === '__none__' ? '' : v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nenhuma —</SelectItem>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nível</Label>
                      <Select value={editForm.skill_level_label || '__none__'} onValueChange={(v) => setEditForm({ ...editForm, skill_level_label: v === '__none__' ? '' : v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nenhum —</SelectItem>
                          {SKILL_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                  <div>
                    <Label>Duração estimada (min)</Label>
                    <Input type="number" value={editForm.estimated_minutes} onChange={e => setEditForm({ ...editForm, estimated_minutes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => updateSequence.mutate({
                      name: editForm.name.trim(),
                      description: editForm.description.trim() || null,
                      estimated_minutes: editForm.estimated_minutes ? parseInt(editForm.estimated_minutes) : null,
                      equipment_type: editForm.equipment_type || null,
                      skill_level_label: editForm.skill_level_label || null,
                    })}
                    disabled={updateSequence.isPending || !editForm.name.trim()}
                  >
                    {updateSequence.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar alterações
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum exercício neste template ainda.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setPickerOpen(true)}>
                  <Library className="h-4 w-4 mr-1.5" />
                  Adicionar da biblioteca
                </Button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <SortableRow
                        key={it.id}
                        item={it}
                        idx={idx}
                        onRemove={() => removeItem.mutate(it.id)}
                        onEdit={(patch) => updateItem.mutate({ id: it.id, ...patch })}
                        onZoomImages={(imgs) => setZoomImages(imgs)}
                        onPlayVideo={(item) => setVideoItem(item)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Card>
        )}
      </div>

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={library as any}
        categories={globalCategories as any}
        title="Adicionar exercícios da biblioteca global"
        onConfirm={async (picks) => {
          await addItems.mutateAsync(picks.map((p) => p.id));
        }}
      />

      <ImageZoomDialog
        images={zoomImages}
        open={zoomImages.length > 0}
        onOpenChange={(open) => !open && setZoomImages([])}
      />

      <Dialog open={!!videoItem} onOpenChange={(o) => !o && setVideoItem(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-4">
          <DialogHeader>
            <DialogTitle className="text-base">{videoItem?.name}</DialogTitle>
          </DialogHeader>
          {videoItem?.video_url && (
            <ExerciseVideoPlayer
              videoUrl={videoItem.video_url}
              videoType={(videoItem.video_type as any) || undefined}
              startSeconds={videoItem.video_start_seconds ?? undefined}
              endSeconds={videoItem.video_end_seconds ?? undefined}
              autoPlay
            />
          )}
        </DialogContent>
      </Dialog>

      <SimulateDialog
        sequence={selectedSeq}
        items={items}
        open={simulateOpen}
        onOpenChange={setSimulateOpen}
      />
    </div>
  );
}
