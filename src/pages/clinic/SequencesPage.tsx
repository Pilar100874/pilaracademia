import { useState, useEffect, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useMyClinicPermissions } from '@/hooks/useClinicPermissions';
import { useSequences, useSequenceItems, useEquipment, useSkillLevels, type SequenceItem } from '@/hooks/useClinicData';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useExerciseCategories } from '@/hooks/useExerciseCategories';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ListOrdered, GripVertical, Library, Pencil, Check, X, MessageCircle, Play, Maximize2, Dumbbell, LayoutTemplate, Search, Clock, Filter, Layers } from 'lucide-react';
import { ShareSequenceDialog } from '@/components/ShareSequenceDialog';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { ExercisePickerDialog } from '@/components/ExercisePickerDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ===== Sortable Row =====
function SortableItemRow({ item, idx, onRemove, onEdit, onZoomImages, onPlayVideo }: {
  item: SequenceItem; idx: number;
  onRemove: () => void;
  onEdit: (patch: Partial<SequenceItem>) => void;
  onZoomImages: (images: string[]) => void;
  onPlayVideo: (item: SequenceItem) => void;
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
    <div ref={setNodeRef} style={style} className="group flex items-stretch gap-2 rounded-xl bg-card border overflow-hidden hover:border-primary/50 transition-colors">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none flex items-center justify-center px-1.5 bg-muted/40 hover:bg-muted text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => {
          if (hasVideo) onPlayVideo(item);
          else if (hasImages) onZoomImages(item.image_urls as string[]);
        }}
        className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 bg-muted/40 flex items-center justify-center overflow-hidden ${hasImages || hasVideo ? 'cursor-pointer group/img' : ''}`}
        title={hasVideo ? 'Reproduzir vídeo' : hasImages ? 'Ampliar imagem' : undefined}
      >
        {hasVideo && item.video_type === 'upload' ? (
          <VideoThumbnail
            videoType={item.video_type}
            videoUrl={item.video_url}
            startSeconds={item.video_start_seconds ?? null}
            endSeconds={item.video_end_seconds ?? null}
            className="w-full h-full"
            objectFit="contain"
            iconSize="sm"
            autoplayPreview
          />
        ) : hasImages ? (
          <>
            <img src={item.image_urls![0]} alt={item.name} className="h-full w-full object-contain" />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center">
              {hasVideo ? (
                <Play className="h-5 w-5 text-white drop-shadow opacity-90" />
              ) : (
                <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
              )}
            </div>
            {(item.image_urls?.length ?? 0) > 1 && (
              <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/60 text-white px-1 rounded">
                +{(item.image_urls?.length ?? 1) - 1}
              </span>
            )}
          </>
        ) : hasVideo ? (
          <VideoThumbnail
            videoType={item.video_type}
            videoUrl={item.video_url}
            startSeconds={item.video_start_seconds ?? null}
            endSeconds={item.video_end_seconds ?? null}
            className="w-full h-full"
            objectFit="contain"
            iconSize="sm"
          />
        ) : (
          <Dumbbell className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow z-10">
          {idx + 1}
        </div>
      </button>
      <div className="flex-1 min-w-0 py-1.5 pr-1 flex flex-col justify-center">
        <div className="text-sm font-medium truncate">{item.name}</div>
        {editing ? (
          <div className="flex items-center gap-1 mt-1">
            <Input className="h-7 w-14 text-xs" type="number" value={sets} onChange={(e) => setSets(parseInt(e.target.value) || 0)} />
            <span className="text-xs">×</span>
            <Input className="h-7 w-14 text-xs" type="number" value={reps} onChange={(e) => setReps(parseInt(e.target.value) || 0)} />
            <Input className="h-7 flex-1 text-xs" placeholder="Obs." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {item.sets}×{item.reps}
            </span>
            {hasVideo && (
              <button
                type="button"
                onClick={() => onPlayVideo(item)}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-500/20"
              >
                <Play className="h-2.5 w-2.5 fill-current" />
                Vídeo
              </button>
            )}
            {item.notes && <span className="text-[10px] text-muted-foreground line-clamp-1">{item.notes}</span>}
          </div>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col items-center justify-center pr-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { onEdit({ sets, reps, notes }); setEditing(false); }}><Check className="h-4 w-4 text-emerald-500" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center pr-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
}

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function ImportGlobalTemplateButton({ clinicId, onImported }: { clinicId: string | null; onImported: (newId: string) => void }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['global-templates-list'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sequences')
        .select('id,name,description,estimated_minutes')
        .eq('is_global', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
  const importIt = useMutation({
    mutationFn: async (sequenceId: string) => {
      if (!clinicId) throw new Error('clínica');
      const { data, error } = await supabase.rpc('copy_global_sequence_to_clinic', {
        _sequence_id: sequenceId, _clinic_id: clinicId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (newId) => {
      toast.success('Template importado');
      qc.invalidateQueries({ queryKey: ['sequences', clinicId] });
      setOpen(false);
      if (newId) onImported(newId);
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao importar'),
  });
  if (!clinicId) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Download className="h-4 w-4 mr-1" />Importar template</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Templates globais</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-1 py-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-6">Carregando...</div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Nenhum template global disponível.</div>
            ) : templates.map((t: any) => (
              <button
                key={t.id}
                disabled={importIt.isPending}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted transition disabled:opacity-50"
                onClick={() => importIt.mutate(t.id)}
              >
                <div className="font-medium">{t.name}</div>
                {t.description && <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>}
                {t.estimated_minutes && <div className="text-xs text-muted-foreground mt-1">~{t.estimated_minutes} min</div>}
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function SequencesPage() {
  const { activeClinicId } = useUserRoles();
  const { data: myPerms } = useMyClinicPermissions();
  const canCreateSequences = myPerms?.can_create_sequences ?? false;
  const { user } = useAuth();
  const { data: sequences = [], create, update, remove } = useSequences(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: levels = [] } = useSkillLevels(activeClinicId);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: items = [], addItem, removeItem, updateItem, reorderItems, addFromLibrary } = useSequenceItems(selected);
  const { exercises: library } = useExerciseLibrary();
  const { categories } = useExerciseCategories();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const emptyForm = { name: '', description: '', equipment_id: '', skill_level_id: '', estimated_minutes: '' };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', sets: 3, reps: 12, notes: '' });
  const [libOpen, setLibOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [videoItem, setVideoItem] = useState<SequenceItem | null>(null);

  // Filters for the sidebar list
  const [search, setSearch] = useState('');
  const [filterEquip, setFilterEquip] = useState<string>('__all__');
  const [filterLevel, setFilterLevel] = useState<string>('__all__');

  const filteredSequences = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sequences.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !(s.description ?? '').toLowerCase().includes(q)) return false;
      if (filterEquip !== '__all__' && s.equipment_id !== filterEquip) return false;
      if (filterLevel !== '__all__' && s.skill_level_id !== filterLevel) return false;
      return true;
    });
  }, [sequences, search, filterEquip, filterLevel]);

  // Local order for optimistic dnd
  const [localOrder, setLocalOrder] = useState<SequenceItem[]>([]);
  useEffect(() => { setLocalOrder(items); }, [items]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = localOrder.findIndex((i) => i.id === active.id);
    const newIdx = localOrder.findIndex((i) => i.id === over.id);
    const next = arrayMove(localOrder, oldIdx, newIdx);
    setLocalOrder(next);
    reorderItems.mutate(next.map((i) => i.id));
  };

  const handleCreate = async () => {
    if (!user) return;
    const created = await create.mutateAsync({
      name: form.name,
      description: form.description,
      equipment_id: form.equipment_id || null,
      equipment_type: equipment.find((e) => e.id === form.equipment_id)?.equipment_type || null,
      skill_level_id: form.skill_level_id || null,
      estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : null,
      created_by: user.id,
    });
    setForm(emptyForm);
    setOpen(false);
    setSelected(created.id);
  };

  const openEditDialog = () => {
    if (!currentSeq) return;
    setEditForm({
      name: currentSeq.name ?? '',
      description: currentSeq.description ?? '',
      equipment_id: currentSeq.equipment_id ?? '',
      skill_level_id: currentSeq.skill_level_id ?? '',
      estimated_minutes: currentSeq.estimated_minutes ? String(currentSeq.estimated_minutes) : '',
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentSeq) return;
    await update.mutateAsync({
      id: currentSeq.id,
      name: editForm.name,
      description: editForm.description || null,
      equipment_id: editForm.equipment_id || null,
      equipment_type: equipment.find((e) => e.id === editForm.equipment_id)?.equipment_type || null,
      skill_level_id: editForm.skill_level_id || null,
      estimated_minutes: editForm.estimated_minutes ? parseInt(editForm.estimated_minutes) : null,
    } as any);
    setEditOpen(false);
  };

  const handleAddItem = async () => {
    await addItem.mutateAsync({ name: itemForm.name, sets: itemForm.sets, reps: itemForm.reps, notes: itemForm.notes });
    setItemForm({ name: '', sets: 3, reps: 12, notes: '' });
    setItemOpen(false);
  };

  const currentSeq = sequences.find((s) => s.id === selected);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Sequências de exercícios</h1>
          <p className="text-sm text-muted-foreground">Monte grades por equipamento e nível.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ImportGlobalTemplateButton clinicId={activeClinicId} onImported={(id) => setSelected(id)} />
          {canCreateSequences && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova sequência</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova sequência</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="text-sm">Nome</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Reformer Iniciante A" /></div>
              <div>
                <label className="text-sm">Equipamento</label>
                <Select value={form.equipment_id} onValueChange={(v) => setForm({ ...form, equipment_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.equipment_type})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">Nível</label>
                <Select value={form.skill_level_id} onValueChange={(v) => setForm({ ...form, skill_level_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm">Duração estimada (min)</label><Input type="number" value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} /></div>
              <div><label className="text-sm">Descrição</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={handleCreate} disabled={!form.name.trim()} className="w-full">Criar</Button>
            </div>
          </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-[340px_1fr] gap-4">
        {/* Sidebar list with filters */}
        <Card className="p-3 max-h-[78vh] flex flex-col gap-3 bg-gradient-to-b from-card to-muted/20">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar sequência..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-background"
            />
          </div>

          {/* Filters */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Filter className="h-3 w-3" /> Filtros
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Select value={filterEquip} onValueChange={setFilterEquip}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Equipamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos equipamentos</SelectItem>
                  {equipment.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos níveis</SelectItem>
                  {levels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(filterEquip !== '__all__' || filterLevel !== '__all__' || search) && (
              <button
                onClick={() => { setFilterEquip('__all__'); setFilterLevel('__all__'); setSearch(''); }}
                className="text-[10px] text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Count */}
          <div className="text-[11px] text-muted-foreground px-0.5">
            {filteredSequences.length} de {sequences.length} sequência{sequences.length === 1 ? '' : 's'}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5">
            {filteredSequences.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <ListOrdered className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {sequences.length === 0 ? 'Nenhuma sequência.' : 'Nenhum resultado.'}
              </div>
            ) : filteredSequences.map((s) => {
              const lv = levels.find((l) => l.id === s.skill_level_id);
              const eq = equipment.find((e) => e.id === s.equipment_id);
              const isActive = selected === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30'
                      : 'bg-background border-transparent hover:border-border hover:bg-muted/60'
                  }`}
                >
                  <div className={`font-medium text-sm leading-tight line-clamp-2 ${isActive ? 'text-primary' : ''}`}>{s.name}</div>
                  <div className="flex gap-1 mt-1.5 flex-wrap items-center">
                    {eq && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5 font-normal">
                        <Dumbbell className="h-2.5 w-2.5" /> {eq.name}
                      </Badge>
                    )}
                    {lv && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1.5 font-normal"
                        style={{ borderColor: lv.color || undefined, color: lv.color || undefined }}
                      >
                        {lv.name}
                      </Badge>
                    )}
                    {s.estimated_minutes && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" /> {s.estimated_minutes}min
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          {!currentSeq ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione uma sequência para visualizar e editar.</p>
            </Card>
          ) : (
            <>
              <Card className="p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-5 w-5 text-primary shrink-0" />
                        <h2 className="text-xl font-bold truncate">{currentSeq.name}</h2>
                      </div>
                      {currentSeq.description && <p className="text-sm text-muted-foreground mt-1">{currentSeq.description}</p>}
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {(() => {
                          const eq = equipment.find((e) => e.id === currentSeq.equipment_id);
                          const lv = levels.find((l) => l.id === currentSeq.skill_level_id);
                          return (
                            <>
                              {eq && (
                                <Badge variant="secondary" className="gap-1">
                                  <Dumbbell className="h-3 w-3" /> {eq.name}
                                </Badge>
                              )}
                              {lv && (
                                <Badge
                                  variant="outline"
                                  style={{ borderColor: lv.color || undefined, color: lv.color || undefined }}
                                >
                                  {lv.name}
                                </Badge>
                              )}
                              {currentSeq.estimated_minutes && (
                                <Badge variant="outline" className="gap-1">
                                  <Clock className="h-3 w-3" /> {currentSeq.estimated_minutes} min
                                </Badge>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {activeClinicId && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShareOpen(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <MessageCircle className="h-4 w-4 mr-1.5" />
                          WhatsApp
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={openEditDialog}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { if (confirm('Excluir sequência?')) { remove.mutate(currentSeq.id); setSelected(null); } }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Edit sequence dialog */}
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar sequência</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm">Nome</label>
                      <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm">Equipamento</label>
                      <Select
                        value={editForm.equipment_id || '__none__'}
                        onValueChange={(v) => setEditForm({ ...editForm, equipment_id: v === '__none__' ? '' : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem equipamento</SelectItem>
                          {equipment.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.name} ({e.equipment_type})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm">Nível</label>
                      <Select
                        value={editForm.skill_level_id || '__none__'}
                        onValueChange={(v) => setEditForm({ ...editForm, skill_level_id: v === '__none__' ? '' : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem nível</SelectItem>
                          {levels.map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm">Duração estimada (min)</label>
                      <Input
                        type="number"
                        value={editForm.estimated_minutes}
                        onChange={(e) => setEditForm({ ...editForm, estimated_minutes: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm">Descrição</label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
                      <Button onClick={handleUpdate} disabled={!editForm.name.trim() || update.isPending}>
                        Salvar alterações
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {activeClinicId && currentSeq && (
                <ShareSequenceDialog
                  open={shareOpen}
                  onOpenChange={setShareOpen}
                  clinicId={activeClinicId}
                  sequenceId={currentSeq.id}
                  sequenceName={currentSeq.name}
                />
              )}

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="font-semibold">Exercícios ({localOrder.length}) <span className="text-xs text-muted-foreground font-normal">— arraste para reordenar</span></h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setTemplateOpen(true)}>
                      <LayoutTemplate className="h-3.5 w-3.5 mr-1" />De template
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setLibOpen(true)}>
                      <Library className="h-3.5 w-3.5 mr-1" />Da biblioteca
                    </Button>
                    <Dialog open={itemOpen} onOpenChange={setItemOpen}>
                      <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Manual</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Novo exercício</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><label className="text-sm">Nome</label><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Ex: Footwork Toes" /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-sm">Séries</label><Input type="number" value={itemForm.sets} onChange={(e) => setItemForm({ ...itemForm, sets: parseInt(e.target.value) || 0 })} /></div>
                            <div><label className="text-sm">Repetições</label><Input type="number" value={itemForm.reps} onChange={(e) => setItemForm({ ...itemForm, reps: parseInt(e.target.value) || 0 })} /></div>
                          </div>
                          <div><label className="text-sm">Observações</label><Textarea value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} /></div>
                          <Button onClick={handleAddItem} disabled={!itemForm.name.trim()} className="w-full">Adicionar</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                {localOrder.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Adicione exercícios à sequência.</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={localOrder.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {localOrder.map((it, idx) => (
                          <SortableItemRow
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
            </>
          )}
        </div>
      </div>

      {/* Library picker (visual, multi-select, filters) */}
      <ExercisePickerDialog
        open={libOpen}
        onOpenChange={setLibOpen}
        exercises={library as any}
        categories={categories as any}
        showOriginFilter
        title="Adicionar da biblioteca"
        onConfirm={async (picks) => {
          await addFromLibrary.mutateAsync(picks as any);
        }}
      />

      {/* Template picker — loads exercises from a global template into this sequence */}
      <TemplateExercisesPicker
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onAdd={async (picks) => {
          await addFromLibrary.mutateAsync(picks as any);
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
    </div>
  );
}

// ============= Template picker =============
// Lets the clinic browse global templates, pick one, and choose which
// exercises from it to append to the currently open clinic sequence.
function TemplateExercisesPicker({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (picks: any[]) => Promise<void>;
}) {
  const [templateId, setTemplateId] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['global-templates-for-picker'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sequences')
        .select('id,name,description,estimated_minutes')
        .eq('is_global', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: tplItems = [] } = useQuery({
    queryKey: ['global-template-items', templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sequence_items')
        .select('id,name,image_urls,sets,reps,video_url,video_type,video_start_seconds,video_end_seconds,exercise_library_id')
        .eq('sequence_id', templateId!)
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });

  // Reset when closed
  useEffect(() => { if (!open) setTemplateId(null); }, [open]);

  // Map template items to PickableExercise shape (default_sets/reps from item)
  const pickable = (tplItems as any[]).map((it) => ({
    id: it.id,
    name: it.name,
    image_urls: it.image_urls,
    default_sets: it.sets,
    default_reps: it.reps,
    video_url: it.video_url,
    video_type: it.video_type,
    video_start_seconds: it.video_start_seconds,
    video_end_seconds: it.video_end_seconds,
    is_global: true,
    // keep reference for insertion
    __ref_library_id: it.exercise_library_id,
  }));

  if (!open) return null;

  // Step 1: pick template
  if (!templateId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              Escolha um template
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid sm:grid-cols-2 gap-2 p-1">
              {templates.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground text-center py-8">
                  Nenhum template global disponível.
                </p>
              )}
              {(templates as any[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className="text-left rounded-xl border bg-card p-3 hover:border-primary/50 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <LayoutTemplate className="h-4 w-4 text-primary" />
                    {t.name}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  )}
                  {t.estimated_minutes && (
                    <p className="text-[10px] text-muted-foreground mt-1">~{t.estimated_minutes} min</p>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: pick exercises from chosen template
  return (
    <ExercisePickerDialog
      open={open}
      onOpenChange={onOpenChange}
      exercises={pickable as any}
      categories={[]}
      title="Selecione exercícios do template"
      confirmLabel={(c) => `Adicionar ${c || ''} à sequência`}
      onConfirm={async (picks) => {
        // Map back to addFromLibrary shape, preferring the original library_id when available
        const mapped = picks.map((p: any) => ({
          id: p.__ref_library_id ?? p.id,
          name: p.name,
          default_sets: p.default_sets,
          default_reps: p.default_reps,
          image_urls: p.image_urls ?? [],
          video_url: p.video_url,
          video_type: p.video_type,
          video_start_seconds: p.video_start_seconds,
          video_end_seconds: p.video_end_seconds,
        }));
        await onAdd(mapped);
      }}
    />
  );
}
