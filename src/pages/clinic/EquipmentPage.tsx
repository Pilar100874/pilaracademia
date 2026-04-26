import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useEquipment } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dumbbell, Plus, Trash2, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const TYPES = ['Reformer', 'Cadillac', 'Chair', 'Barrel', 'Mat', 'Outro'];

export default function EquipmentPage() {
  const { activeClinicId } = useUserRoles();
  const { data: equipment = [], create, remove } = useEquipment(activeClinicId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Reformer');
  const [identifier, setIdentifier] = useState('');

  const handleAdd = async () => {
    await create.mutateAsync({ name, equipment_type: type, identifier });
    setName(''); setIdentifier(''); setOpen(false);
  };

  const copyStationLink = (token: string) => {
    const url = `${window.location.origin}/estacao/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link do tablet copiado');
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">Cada equipamento gera um link de tablet exclusivo.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo equipamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Nome (ex: Reformer 1)</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Tipo</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">Identificador (opcional)</label>
                <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Ex: R1" />
              </div>
              <Button onClick={handleAdd} disabled={!name.trim() || create.isPending} className="w-full">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {equipment.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-50" />
          Nenhum equipamento cadastrado.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {equipment.map((eq) => (
            <Card key={eq.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{eq.name}</div>
                  <div className="text-xs text-muted-foreground">{eq.equipment_type}{eq.identifier ? ` · ${eq.identifier}` : ''}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(eq.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => copyStationLink(eq.station_token)}>
                <Copy className="h-3.5 w-3.5 mr-1" />Copiar link do tablet
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
