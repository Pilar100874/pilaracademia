import { useState, useEffect } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useSequences, useSequenceItems, useEquipment, useSkillLevels, type SequenceItem } from '@/hooks/useClinicData';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ListOrdered, GripVertical, Library, Pencil, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ===== Sortable Row =====
function SortableItemRow({ item, idx, onRemove, onEdit }: { item: SequenceItem; idx: number; onRemove: () => void; onEdit: (patch: Partial<SequenceItem>) => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(item.sets);
  const [reps, setReps] = useState(item.reps);
  const [notes, setNotes] = useState(item.notes ?? '');

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
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

export default function SequencesPage() {
  const { activeClinicId } = useUserRoles();
  const { user } = useAuth();
  const { data: sequences = [], create, remove } = useSequences(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: levels = [] } = useSkillLevels(activeClinicId);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: items = [], addItem, removeItem, updateItem, reorderItems, addFromLibrary } = useSequenceItems(selected);
  const { exercises: library } = useExerciseLibrary();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', equipment_id: '', skill_level_id: '', estimated_minutes: '' });
  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', sets: 3, reps: 12, notes: '' });
  const [libOpen, setLibOpen] = useState(false);
  const [libSelected, setLibSelected] = useState<Set<string>>(new Set());
  const [libSearch, setLibSearch] = useState('');

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
    setForm({ name: '', description: '', equipment_id: '', skill_level_id: '', estimated_minutes: '' });
    setOpen(false);
    setSelected(created.id);
  };

  const handleAddItem = async () => {
    await addItem.mutateAsync({ name: itemForm.name, sets: itemForm.sets, reps: itemForm.reps, notes: itemForm.notes });
    setItemForm({ name: '', sets: 3, reps: 12, notes: '' });
    setItemOpen(false);
  };

  const handleAddFromLibrary = async () => {
    const picks = library.filter((e) => libSelected.has(e.id));
    if (picks.length === 0) return;
    await addFromLibrary.mutateAsync(picks);
    setLibSelected(new Set());
    setLibOpen(false);
  };

  const currentSeq = sequences.find((s) => s.id === selected);
  const filteredLib = library.filter((e) => e.name.toLowerCase().includes(libSearch.toLowerCase()));

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Sequências de exercícios</h1>
          <p className="text-sm text-muted-foreground">Monte grades por equipamento e nível.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ImportGlobalTemplateButton clinicId={activeClinicId} onImported={(id) => setSelected(id)} />
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
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        <Card className="p-2 max-h-[70vh] overflow-y-auto">
          {sequences.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm"><ListOrdered className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhuma sequência.</div>
          ) : sequences.map((s) => {
            const lv = levels.find((l) => l.id === s.skill_level_id);
            const eq = equipment.find((e) => e.id === s.equipment_id);
            return (
              <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full text-left p-3 rounded-lg hover:bg-muted ${selected === s.id ? 'bg-muted' : ''}`}>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground flex gap-1 mt-1 flex-wrap">
                  {eq && <Badge variant="outline" className="text-[10px]">{eq.equipment_type}</Badge>}
                  {lv && <Badge variant="outline" className="text-[10px]" style={{ borderColor: lv.color || undefined }}>{lv.name}</Badge>}
                </div>
              </button>
            );
          })}
        </Card>

        <div className="space-y-4">
          {!currentSeq ? (
            <Card className="p-8 text-center text-muted-foreground">Selecione uma sequência.</Card>
          ) : (
            <>
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{currentSeq.name}</h2>
                    {currentSeq.description && <p className="text-sm text-muted-foreground mt-1">{currentSeq.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm('Excluir sequência?')) { remove.mutate(currentSeq.id); setSelected(null); } }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="font-semibold">Exercícios ({localOrder.length}) <span className="text-xs text-muted-foreground font-normal">— arraste para reordenar</span></h3>
                  <div className="flex gap-2">
                    <Dialog open={libOpen} onOpenChange={setLibOpen}>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><Library className="h-3.5 w-3.5 mr-1" />Da biblioteca</Button></DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Importar da biblioteca</DialogTitle></DialogHeader>
                        <Input placeholder="Buscar exercício..." value={libSearch} onChange={(e) => setLibSearch(e.target.value)} />
                        <ScrollArea className="h-96 mt-2">
                          <div className="space-y-1">
                            {filteredLib.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">Nenhum exercício na biblioteca.</p>}
                            {filteredLib.map((ex) => (
                              <label key={ex.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                                <Checkbox
                                  checked={libSelected.has(ex.id)}
                                  onCheckedChange={(v) => {
                                    const next = new Set(libSelected);
                                    if (v) next.add(ex.id); else next.delete(ex.id);
                                    setLibSelected(next);
                                  }}
                                />
                                {ex.image_urls?.[0] && <img src={ex.image_urls[0]} className="h-10 w-10 rounded object-cover" />}
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{ex.name}</div>
                                  <div className="text-xs text-muted-foreground">{ex.default_sets}×{ex.default_reps}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                        <Button onClick={handleAddFromLibrary} disabled={libSelected.size === 0} className="w-full">
                          Adicionar {libSelected.size} exercício(s)
                        </Button>
                      </DialogContent>
                    </Dialog>
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
    </div>
  );
}
