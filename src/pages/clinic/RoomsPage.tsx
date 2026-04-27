import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useClinicRooms, type ClinicRoom } from '@/hooks/useClinicRooms';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, DoorOpen, Trash2, Pencil, Loader2, Users } from 'lucide-react';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';
import { toast } from 'sonner';

const COLOR_PRESETS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function RoomsPage() {
  const { activeClinicId } = useUserRoles();
  const { data: rooms = [], isLoading, create, update, remove } = useClinicRooms(activeClinicId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicRoom | null>(null);
  const [form, setForm] = useState({ name: '', color: COLOR_PRESETS[0], capacity: '' as string | number });

  const startCreate = () => {
    setEditing(null);
    setForm({ name: '', color: COLOR_PRESETS[0], capacity: '' });
    setOpen(true);
  };
  const startEdit = (r: ClinicRoom) => {
    setEditing(r);
    setForm({ name: r.name, color: r.color || COLOR_PRESETS[0], capacity: r.capacity ?? '' });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Informe o nome da sala');
    const payload = {
      name: form.name.trim(),
      color: form.color,
      capacity: form.capacity === '' ? null : Number(form.capacity),
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast.success('Sala atualizada');
      } else {
        await create.mutateAsync(payload);
      }
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    }
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
          {rooms.map((r) => (
            <Card key={r.id} className="p-5 hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
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
                  onClick={() => {
                    if (confirm(`Excluir sala "${r.name}"?`)) remove.mutate(r.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="Ex: 6"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Será usada como vagas padrão ao criar grade nesta sala.
              </p>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-9 w-9 rounded-xl border-2 transition ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
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
