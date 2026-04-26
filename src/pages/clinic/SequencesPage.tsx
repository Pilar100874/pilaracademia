import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useSequences, useSequenceItems, useEquipment, useSkillLevels } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ListOrdered, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

export default function SequencesPage() {
  const { activeClinicId } = useUserRoles();
  const { user } = useAuth();
  const { data: sequences = [], create, remove } = useSequences(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: levels = [] } = useSkillLevels(activeClinicId);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: items = [], addItem, removeItem } = useSequenceItems(selected);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', equipment_id: '', skill_level_id: '', estimated_minutes: '' });

  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', sets: 3, reps: 12, notes: '' });

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

  const currentSeq = sequences.find((s) => s.id === selected);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sequências de exercícios</h1>
          <p className="text-sm text-muted-foreground">Monte grades por equipamento e nível.</p>
        </div>
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
                  <Button variant="ghost" size="icon" onClick={() => { remove.mutate(currentSeq.id); setSelected(null); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Exercícios ({items.length})</h3>
                  <Dialog open={itemOpen} onOpenChange={setItemOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button></DialogTrigger>
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
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Adicione exercícios à sequência.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={it.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{idx + 1}</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{it.name}</div>
                          <div className="text-xs text-muted-foreground">{it.sets}x{it.reps}{it.notes ? ` · ${it.notes}` : ''}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeItem.mutate(it.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
