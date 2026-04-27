import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useEquipment, type Equipment } from '@/hooks/useClinicData';
import { useClinicRooms, type ClinicRoom } from '@/hooks/useClinicRooms';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DoorOpen, Dumbbell } from 'lucide-react';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';

const NO_ROOM = '__none__';

export default function EquipmentRoomsPage() {
  const { activeClinicId } = useUserRoles();
  const { data: equipment = [], update } = useEquipment(activeClinicId);
  const { data: rooms = [] } = useClinicRooms(activeClinicId);

  const grouped = useMemo(() => {
    const map = new Map<string | null, Equipment[]>();
    map.set(null, []);
    rooms.forEach((r) => map.set(r.id, []));
    equipment.forEach((eq) => {
      const key = eq.room_id && map.has(eq.room_id) ? eq.room_id : null;
      map.get(key)!.push(eq);
    });
    return map;
  }, [equipment, rooms]);

  const handleChange = (eq: Equipment, value: string) => {
    update.mutate({ id: eq.id, room_id: value === NO_ROOM ? null : value });
  };

  const renderRoomBlock = (room: ClinicRoom | null, items: Equipment[]) => (
    <Card key={room?.id ?? 'none'} className="p-4 space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        {room ? (
          <>
            <DoorOpen className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">{room.name}</h3>
            {room.capacity != null && (
              <span className="text-xs text-muted-foreground">cap. {room.capacity}</span>
            )}
          </>
        ) : (
          <>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">Sem sala</h3>
          </>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? 'equipamento' : 'equipamentos'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-2">Nenhum equipamento aqui.</div>
      ) : (
        <div className="space-y-2">
          {items.map((eq) => (
            <div key={eq.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{eq.name}</div>
                {eq.identifier && (
                  <div className="text-xs text-muted-foreground">{eq.identifier}</div>
                )}
              </div>
              <Select
                value={eq.room_id ?? NO_ROOM}
                onValueChange={(v) => handleChange(eq, v)}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
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
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <>
      <ClinicPageHeader icon={DoorOpen} title="Equipamentos por sala" subtitle="Defina em qual sala fica cada equipamento" />
      <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">

      {rooms.length === 0 && (
        <Card className="p-4 bg-amber-500/10 border-amber-500/30 text-sm">
          Você ainda não tem salas cadastradas.{' '}
          <Link to="/clinica/salas" className="underline font-medium">Cadastrar salas</Link>.
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-3">
        {rooms.map((r) => renderRoomBlock(r, grouped.get(r.id) ?? []))}
        {renderRoomBlock(null, grouped.get(null) ?? [])}
      </div>
      </div>
    </>
  );
}
