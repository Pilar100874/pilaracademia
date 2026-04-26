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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Plus, Trash2, ListOrdered, Loader2, GripVertical, Library, Pencil, Check, X, Search, Dumbbell, Clock, Layers, Play, Maximize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type GlobalSequence = {
  id: string; name: string; description: string | null;
  estimated_minutes: number | null; equipment_type: string | null;
};

type GlobalItem = {
  id: string; sequence_id: string; name: string;
  image_urls: string[] | null; sets: number; reps: number;
  notes: string | null; order_index: number;
  exercise_library_id: string | null;
  video_url: string | null; video_type: string | null;
  video_start_seconds: number | null; video_end_seconds: number | null;
};

function SortableRow({ item, idx, onRemove, onEdit }: {
  item: GlobalItem; idx: number; onRemove: () => void; onEdit: (p: Partial<GlobalItem>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(item.sets);
  const [reps, setReps] = useState(item.reps);
  const [notes, setNotes] = useState(item.notes ?? '');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-stretch gap-3 rounded-xl border bg-card overflow-hidden hover:border-primary/50 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none flex items-center justify-center px-2 bg-muted/40 hover:bg-muted text-muted-foreground"
        aria-label="Arrastar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 bg-muted/40 flex items-center justify-center">
        {item.image_urls?.[0] ? (
          <img src={item.image_urls[0]} alt={item.name} className="h-full w-full object-contain" />
        ) : (
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="absolute top-1 left-1 h-6 w-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow">
          {idx + 1}
        </div>
      </div>

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

export default function MasterSequencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '', estimated_minutes: '' });

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['global-sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sequences')
        .select('id,name,description,estimated_minutes,equipment_type')
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
        .select('id,name,image_urls,default_sets,default_reps,video_url,video_type,video_start_seconds,video_end_seconds')
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
        is_global: true,
        clinic_id: null,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Template criado');
      setOpen(false);
      setForm({ name: '', description: '', estimated_minutes: '' });
      qc.invalidateQueries({ queryKey: ['global-sequences'] });
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

  const addItem = useMutation({
    mutationFn: async (libId: string) => {
      const lib = library.find((l: any) => l.id === libId);
      if (!lib || !selected) throw new Error('inválido');
      const nextIdx = (items.reduce((m, i) => Math.max(m, i.order_index), -1)) + 1;
      const { error } = await supabase.from('exercise_sequence_items').insert({
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
        order_index: nextIdx,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['global-sequence-items', selected] }),
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

  const selectedSeq = sequences.find(s => s.id === selected);

  const filteredSequences = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sequences;
    return sequences.filter(s => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
  }, [sequences, search]);

  const filteredLibrary = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return library;
    return (library as any[]).filter(l => l.name.toLowerCase().includes(q));
  }, [library, pickerSearch]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/master')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <ListOrdered className="h-6 w-6 text-primary" />
              Templates de Treinos
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Crie sequências globais para que as clínicas possam importá-las.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Novo template</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo template global</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Reabilitação ombro - iniciante" />
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

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Templates grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSequences.length === 0 ? (
          <Card className="p-12 text-center">
            <ListOrdered className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum template criado ainda.</p>
            <Button onClick={() => setOpen(true)} className="mt-4" size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Criar primeiro template
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSequences.map(s => {
              const isActive = selected === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelected(isActive ? null : s.id)}
                  className={`group flex flex-col rounded-xl border bg-card overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                    isActive ? 'border-primary ring-2 ring-primary/40' : 'hover:border-primary/40'
                  }`}
                >
                  <div className="relative h-28 bg-gradient-to-br from-primary/15 via-primary/5 to-background flex items-center justify-center">
                    <ListOrdered className="h-10 w-10 text-primary/70" />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-1.5 right-1.5 h-7 w-7 bg-background/70 hover:bg-background text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir "${s.name}"?`)) remove.mutate(s.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="font-semibold text-sm leading-tight line-clamp-2">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {s.estimated_minutes && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          <Clock className="h-3 w-3" /> {s.estimated_minutes}min
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        Global
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Editor for selected template */}
        {selectedSeq && (
          <Card className="p-4 sm:p-5 space-y-4 border-primary/40">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-lg truncate">{selectedSeq.name}</h2>
                </div>
                {selectedSeq.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedSeq.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {items.length} exercício{items.length === 1 ? '' : 's'}
                </p>
              </div>
              <Dialog open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (!o) setPickerSearch(''); }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Library className="h-4 w-4 mr-1.5" /> Adicionar exercício
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Biblioteca global</DialogTitle></DialogHeader>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar exercícios..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="max-h-[60vh] pr-3">
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                      {filteredLibrary.map((l: any) => (
                        <button
                          key={l.id}
                          className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:border-primary/50 hover:bg-muted/40 text-left transition-colors"
                          onClick={() => { addItem.mutate(l.id); setPickerOpen(false); setPickerSearch(''); }}
                        >
                          <div className="h-12 w-12 rounded bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
                            {l.image_urls?.[0] ? (
                              <img src={l.image_urls[0]} className="h-full w-full object-contain" />
                            ) : (
                              <Dumbbell className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{l.name}</div>
                            <div className="text-xs text-muted-foreground">{l.default_sets}×{l.default_reps}</div>
                          </div>
                          <Plus className="h-4 w-4 text-primary shrink-0" />
                        </button>
                      ))}
                      {filteredLibrary.length === 0 && (
                        <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                          Nenhum exercício encontrado.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
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
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
