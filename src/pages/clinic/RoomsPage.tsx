import { useState, useEffect, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useClinicRooms, useRoomEquipment, type ClinicRoom, type EquipmentMode } from '@/hooks/useClinicRooms';
import { useEquipment } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, DoorOpen, Trash2, Pencil, Loader2, Users, Dumbbell } from 'lucide-react';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ConfirmProvider';

const COLOR_PRESETS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function RoomsPage() {
  const { activeClinicId } = useUserRoles();
  const { data: rooms = [], isLoading, create, update, remove } = useClinicRooms(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: roomEquipmentLinks = [], setRoomEquipment } = useRoomEquipment(activeClinicId);
  const { confirm } = useConfirm();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicRoom | null>(null);
  const [form, setForm] = useState<{
    name: string;
    color: string;
    capacity: string | number;
    equipment_mode: EquipmentMode;
  }>({ name: '', color: COLOR_PRESETS[0], capacity: '', equipment_mode: 'free' });
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  // Map: roomId -> equipmentIds
  const roomEqMap = useMemo(() => {
    const m = new Map<string, string[]>();
    roomEquipmentLinks.forEach((l) => {
      const arr = m.get(l.room_id) ?? [];
      arr.push(l.equipment_id);
      m.set(l.room_id, arr);
    });
    return m;
  }, [roomEquipmentLinks]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSelectedEquipment(roomEqMap.get(editing.id) ?? []);
    } else {
      setSelectedEquipment([]);
    }
  }, [open, editing, roomEqMap]);

  const startCreate = () => {
    setEditing(null);
    setForm({ name: '', color: COLOR_PRESETS[0], capacity: '', equipment_mode: 'free' });
    setOpen(true);
  };
  const startEdit = (r: ClinicRoom) => {
    setEditing(r);
    setForm({
      name: r.name,
      color: r.color || COLOR_PRESETS[0],
      capacity: r.capacity ?? '',
      equipment_mode: r.equipment_mode ?? 'free',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Informe o nome da sala');
    const payload = {
      name: form.name.trim(),
      color: form.color,
      capacity: form.capacity === '' ? null : Number(form.capacity),
      equipment_mode: form.equipment_mode,
    };
    try {
      let roomId: string;
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        roomId = editing.id;
        toast.success('Sala atualizada');
      } else {
        const created = await create.mutateAsync(payload);
        roomId = created.id;
      }
      await setRoomEquipment.mutateAsync({ roomId, equipmentIds: selectedEquipment });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    }
  };

  const toggleEquipment = (id: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
    <ClinicPageHeader icon={DoorOpen} title="Salas" subtitle="Salas físicas da clínica" />
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-end flex-wrap gap-3">
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" />Nova sala</Button>
      </div>

      {rooms.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground space-y-3">
          <DoorOpen className="h-10 w-10 mx-auto opacity-50" />
          <p>Nenhuma sala cadastrada ainda.</p>
          <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" />Criar primeira sala</Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r) => {
            const eqIds = roomEqMap.get(r.id) ?? [];
            const eqCount = eqIds.length;
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="h-12 w-12 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${r.color || '#3b82f6'}20`, color: r.color || '#3b82f6' }}
                  >
                    <DoorOpen className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg truncate">{r.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {r.capacity != null && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />Cap. {r.capacity}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {r.equipment_mode === 'single_per_class' ? '1 equip./aluno' : 'Equip. livre'}
                      </Badge>
                      {eqCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Dumbbell className="h-3 w-3 mr-1" />{eqCount}
                        </Badge>
                      )}
                      {!r.active && <Badge variant="destructive" className="text-xs">Inativa</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(r)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      if (await confirm({ title: 'Excluir sala', description: `Excluir sala "${r.name}"?`, destructive: true })) remove.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar sala' : 'Nova sala'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Sala 1, Sala Mat..."
              />
            </div>
            <div>
              <Label>Capacidade padrão (opcional)</Label>
              <Input
                inputMode="numeric"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value.replace(/\D/g, '') })}
                placeholder="Ex: 6"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Será usada como vagas padrão ao criar grade nesta sala.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Modo de equipamento na aula</Label>
              <RadioGroup
                value={form.equipment_mode}
                onValueChange={(v) => setForm({ ...form, equipment_mode: v as EquipmentMode })}
                className="space-y-2"
              >
                <label className="flex items-start gap-3 border border-border rounded-md p-3 cursor-pointer hover:bg-muted/40">
                  <RadioGroupItem value="single_per_class" className="mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">1 equipamento por aluno por aula</div>
                    <div className="text-muted-foreground text-xs">
                      O sistema avisa se o equipamento já está em uso e sugere outro livre.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 border border-border rounded-md p-3 cursor-pointer hover:bg-muted/40">
                  <RadioGroupItem value="free" className="mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Livre — pode trocar de equipamento</div>
                    <div className="text-muted-foreground text-xs">
                      O aluno pode usar mais de um equipamento durante a mesma aula.
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4" /> Equipamentos disponíveis nesta sala
              </Label>
              {equipment.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Cadastre equipamentos em "Equipamentos" para vinculá-los aqui.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-md p-2">
                  {equipment.map((eq) => (
                    <label
                      key={eq.id}
                      className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEquipment.includes(eq.id)}
                        onCheckedChange={() => toggleEquipment(eq.id)}
                      />
                      <span className="truncate">{eq.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-9 w-9 rounded-md border-2 transition ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editing ? 'Salvar alterações' : 'Criar sala'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
