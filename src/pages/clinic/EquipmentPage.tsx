import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useEquipment, type Equipment } from '@/hooks/useClinicData';
import { useClinicRooms } from '@/hooks/useClinicRooms';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Plus, Trash2, Copy, Wrench, CheckCircle2, Link2, DoorOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const NO_ROOM = '__none__';

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  maintenance: { label: 'Manutenção', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  inactive: { label: 'Inativo', className: 'bg-muted text-muted-foreground border-border' },
};

export default function EquipmentPage() {
  const { activeClinicId } = useUserRoles();
  const { data: equipment = [], create, update, remove, setStatus } = useEquipment(activeClinicId);
  const { data: rooms = [] } = useClinicRooms(activeClinicId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [roomId, setRoomId] = useState<string>(NO_ROOM);

  const [maintEq, setMaintEq] = useState<Equipment | null>(null);
  const [maintNotes, setMaintNotes] = useState('');
  const [maintUntil, setMaintUntil] = useState('');

  const handleAdd = async () => {
    await create.mutateAsync({
      name,
      identifier,
      room_id: roomId === NO_ROOM ? null : roomId,
    });
    setName('');
    setIdentifier('');
    setRoomId(NO_ROOM);
    setOpen(false);
  };

  const roomNameOf = (id: string | null) =>
    id ? rooms.find((r) => r.id === id)?.name ?? '—' : null;

  const copyStationLink = (token: string) => {
    const url = `${window.location.origin}/estacao/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link do tablet copiado');
  };

  const openMaintenance = (eq: Equipment) => {
    setMaintEq(eq);
    setMaintNotes(eq.maintenance_notes ?? '');
    setMaintUntil(eq.maintenance_until ?? '');
  };

  const submitMaintenance = async () => {
    if (!maintEq) return;
    await setStatus.mutateAsync({
      id: maintEq.id,
      status: 'maintenance',
      maintenance_notes: maintNotes || null,
      maintenance_until: maintUntil || null,
    });
    setMaintEq(null);
  };

  const reactivate = async (eq: Equipment) => {
    await setStatus.mutateAsync({ id: eq.id, status: 'active' });
  };

  return (
    <>
      <ClinicPageHeader icon={Dumbbell} title="Equipamentos" subtitle="Cadastro, manutenção e vínculo com a grade" />
      <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-start justify-end gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link to="/clinica/equipamentos-salas">
              <DoorOpen className="h-4 w-4 mr-1" />
              Vincular a salas
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/clinica/grade-equipamentos">
              <Link2 className="h-4 w-4 mr-1" />
              Vincular à grade
            </Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo equipamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome (ex: Reformer 1)</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Identificador (opcional)</Label>
                  <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Ex: R1" />
                </div>
                <div>
                  <Label>Sala (opcional)</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem sala" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ROOM}>Sem sala</SelectItem>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} disabled={!name.trim() || create.isPending} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {equipment.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-50" />
          Nenhum equipamento cadastrado.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {equipment.map((eq) => {
            const status = (eq.status ?? 'active') as keyof typeof STATUS_META;
            const meta = STATUS_META[status] ?? STATUS_META.active;
            const inMaint = status === 'maintenance';
            return (
              <Card key={eq.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{eq.name}</div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {eq.room_id ? (
                        <><DoorOpen className="h-3 w-3" />{roomNameOf(eq.room_id)}</>
                      ) : (
                        <span className="italic">Sem sala</span>
                      )}
                      {eq.identifier ? ` · ${eq.identifier}` : ''}
                    </div>
                  </div>
                  <Badge variant="outline" className={meta.className}>
                    {meta.label}
                  </Badge>
                </div>

                {inMaint && (
                  <div className="text-xs rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 space-y-0.5">
                    {eq.maintenance_notes && <div className="text-foreground">{eq.maintenance_notes}</div>}
                    {eq.maintenance_until && (
                      <div className="text-muted-foreground">
                        Previsão: {new Date(eq.maintenance_until).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-auto">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => copyStationLink(eq.station_token)}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Link tablet
                  </Button>
                  {inMaint ? (
                    <Button variant="outline" size="sm" onClick={() => reactivate(eq)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Reativar
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => openMaintenance(eq)}>
                      <Wrench className="h-3.5 w-3.5 mr-1" />
                      Manutenção
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm('Excluir equipamento?')) remove.mutate(eq.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Diálogo de manutenção */}
      <Dialog open={!!maintEq} onOpenChange={(v) => !v && setMaintEq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-600" />
              Colocar em manutenção
            </DialogTitle>
          </DialogHeader>
          {maintEq && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Equipamento: <span className="font-medium text-foreground">{maintEq.name}</span>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea
                  rows={3}
                  value={maintNotes}
                  onChange={(e) => setMaintNotes(e.target.value)}
                  placeholder="Ex: Mola substituída, aguardando técnico"
                />
              </div>
              <div>
                <Label>Previsão de retorno (opcional)</Label>
                <Input type="date" value={maintUntil} onChange={(e) => setMaintUntil(e.target.value)} />
              </div>
              <Button className="w-full" onClick={submitMaintenance} disabled={setStatus.isPending}>
                Confirmar manutenção
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
