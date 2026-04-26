import { useState } from 'react';
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
import { ArrowLeft, Plus, Trash2, ListOrdered, Loader2, GripVertical, Library, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
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
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
      <button {...attributes} {...listeners} className="cursor-grab touch-none">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</div>
      {item.image_urls?.[0] && <img src={item.image_urls[0]} alt="" className="h-10 w-10 rounded object-cover" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.name}</div>
        {editing ? (
          <div className="flex items-center gap-1 mt-1">
            <Input className="h-7 w-14 text-xs" type="number" value={sets} onChange={(e) => setSets(parseInt(e.target.value) || 0)} />
            <span className="text-xs">×</span>
            <Input className="h-7 w-14 text-xs" type="number" value={reps} onChange={(e) => setReps(parseInt(e.target.value) || 0)} />
            <Input className="h-7 flex-1 text-xs" placeholder="Obs." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">{item.sets}×{item.reps}{item.notes ? ` · ${item.notes}` : ''}</div>
        )}
      </div>
      {editing ? (
        <>
          <Button variant="ghost" size="icon" onClick={() => { onEdit({ sets, reps, notes }); setEditing(false); }}><Check className="h-4 w-4 text-emerald-500" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
        </>
      ) : (
        <>
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
        </>
      )}
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/master')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListOrdered className="h-6 w-6 text-primary" /> Templates de Treinos
            </h1>
            <p className="text-sm text-muted-foreground">
              Crie sequências globais para que as clínicas possam importá-las.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo template</Button>
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

        <div className="grid md:grid-cols-[320px_1fr] gap-4">
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : sequences.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Nenhum template criado ainda.
              </Card>
            ) : (
              sequences.map(s => (
                <Card
                  key={s.id}
                  className={`p-3 cursor-pointer ${selected === s.id ? 'border-primary' : ''}`}
                  onClick={() => setSelected(s.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{s.name}</div>
                      {s.description && <div className="text-xs text-muted-foreground line-clamp-1">{s.description}</div>}
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir "${s.name}"?`)) remove.mutate(s.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          <Card className="p-4 min-h-[300px]">
            {!selectedSeq ? (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Selecione um template à esquerda para gerenciar seus exercícios.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">{selectedSeq.name}</h2>
                    {selectedSeq.description && <p className="text-sm text-muted-foreground">{selectedSeq.description}</p>}
                  </div>
                  <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Library className="h-4 w-4 mr-2" /> Adicionar exercício</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader><DialogTitle>Biblioteca global</DialogTitle></DialogHeader>
                      <ScrollArea className="max-h-[60vh] pr-3">
                        <div className="space-y-1">
                          {library.map((l: any) => (
                            <button
                              key={l.id}
                              className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted text-left"
                              onClick={() => { addItem.mutate(l.id); setPickerOpen(false); }}
                            >
                              {l.image_urls?.[0] && <img src={l.image_urls[0]} className="h-10 w-10 rounded object-cover" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm truncate">{l.name}</div>
                                <div className="text-xs text-muted-foreground">{l.default_sets}×{l.default_reps}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>

                {items.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Nenhum exercício neste template ainda.</div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1">
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
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
