import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useBookableSlots } from '@/hooks/useBookableSlots';
import { useEquipment } from '@/hooks/useClinicData';
import { useClinicRooms } from '@/hooks/useClinicRooms';
import { useSlotEquipmentLinks } from '@/hooks/useSlotEquipment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Wrench,
  DoorOpen,
  Link2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

export default function GradeEquipmentLinkPage() {
  const { activeClinicId } = useUserRoles();
  const [day, setDay] = useState(() => new Date());

  const fromISO = useMemo(() => {
    const d = startOfWeek(day, { weekStartsOn: 1 });
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [day]);
  const toISO = useMemo(() => {
    const d = startOfWeek(day, { weekStartsOn: 1 });
    d.setDate(d.getDate() + 7);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [day]);

  const { data: slots = [] } = useBookableSlots(activeClinicId, fromISO, toISO);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: rooms = [] } = useClinicRooms(activeClinicId);

  const slotIds = useMemo(() => slots.map((s) => s.id), [slots]);
  const { data: links = [], setEquipmentForSlot } = useSlotEquipmentLinks(activeClinicId, slotIds);

  const week = useMemo(() => {
    const start = startOfWeek(day, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [day]);

  const slotsToday = slots.filter((s) => isSameDay(parseISO(s.scheduled_at), day));
  const linksBySlot = useMemo(() => {
    const m = new Map<string, Set<string>>();
    links.forEach((l) => {
      const set = m.get(l.bookable_slot_id) ?? new Set<string>();
      set.add(l.equipment_id);
      m.set(l.bookable_slot_id, set);
    });
    return m;
  }, [links]);

  const roomById = (id: string | null) => (id ? rooms.find((r) => r.id === id) ?? null : null);

  // Estado local de seleção (para edição em lote por slot)
  const [selection, setSelection] = useState<Record<string, Set<string>>>({});
  const [openSlot, setOpenSlot] = useState<string | null>(null);

  const startEdit = (slotId: string) => {
    const current = linksBySlot.get(slotId) ?? new Set<string>();
    setSelection((s) => ({ ...s, [slotId]: new Set(current) }));
    setOpenSlot(slotId);
  };

  const toggle = (slotId: string, equipmentId: string) => {
    setSelection((s) => {
      const cur = new Set(s[slotId] ?? []);
      if (cur.has(equipmentId)) cur.delete(equipmentId);
      else cur.add(equipmentId);
      return { ...s, [slotId]: cur };
    });
  };

  const save = async (slotId: string) => {
    const ids = Array.from(selection[slotId] ?? []);
    await setEquipmentForSlot.mutateAsync({ slotId, equipmentIds: ids });
    setOpenSlot(null);
  };

  const activeEquipment = equipment.filter((e) => (e.status ?? 'active') !== 'inactive');
  const inMaintenance = equipment.filter((e) => e.status === 'maintenance');

  return (
    <>
      <ClinicPageHeader icon={Link2} title="Equipamentos por grade" subtitle="Equipamentos disponíveis em cada horário" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <Button asChild variant="outline">
            <Link to="/clinica/equipamentos">
              <Dumbbell className="h-4 w-4 mr-1" />
              Gerenciar equipamentos
            </Link>
          </Button>
        </div>

      {inMaintenance.length > 0 && (
        <Card className="p-3 border-amber-500/30 bg-amber-500/5 flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-medium">{inMaintenance.length}</span>{' '}
            equipamento(s) em manutenção: {inMaintenance.map((e) => e.name).join(', ')}
          </div>
        </Card>
      )}

      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 grid grid-cols-7 gap-1">
            {week.map((d) => {
              const active = isSameDay(d, day);
              const count = slots.filter((s) => isSameDay(parseISO(s.scheduled_at), d)).length;
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setDay(d)}
                  className={`p-2 rounded-lg text-center transition ${
                    active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <div className="text-[10px] uppercase">{format(d, 'EEE', { locale: ptBR })}</div>
                  <div className="text-lg font-bold">{format(d, 'd')}</div>
                  {count > 0 && (
                    <div
                      className={`text-[10px] mt-0.5 ${
                        active ? 'text-primary-foreground/90' : 'text-muted-foreground'
                      }`}
                    >
                      {count} slot(s)
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">
          {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h2>

        {slotsToday.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum slot para este dia. Crie a grade em{' '}
            <Link to="/clinica/grades" className="text-primary underline">
              Horários
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-3">
            {slotsToday.map((s) => {
              const room = roomById(s.room_id);
              const linked = linksBySlot.get(s.id) ?? new Set<string>();
              const linkedEqs = equipment.filter((e) => linked.has(e.id));
              const editing = openSlot === s.id;
              const sel = selection[s.id] ?? linked;

              return (
                <div
                  key={s.id}
                  className="rounded-xl border bg-card overflow-hidden"
                  style={room?.color ? { borderLeftWidth: 4, borderLeftColor: room.color } : undefined}
                >
                  <div className="flex items-center gap-3 p-3 flex-wrap">
                    <div className="text-center min-w-[64px]">
                      <div className="font-bold text-lg">
                        {format(parseISO(s.scheduled_at), 'HH:mm')}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{s.duration_minutes}min</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {room && (
                          <Badge
                            variant="outline"
                            style={{
                              background: `${room.color}20`,
                              color: room.color,
                              borderColor: `${room.color}40`,
                            }}
                          >
                            <DoorOpen className="h-3 w-3 mr-1" />
                            {room.name}
                          </Badge>
                        )}
                        {linkedEqs.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nenhum equipamento vinculado</span>
                        ) : (
                          linkedEqs.map((eq) => {
                            const inMaint = eq.status === 'maintenance';
                            return (
                              <Badge
                                key={eq.id}
                                variant="outline"
                                className={inMaint ? 'border-amber-500/40 bg-amber-500/10 text-amber-700' : ''}
                              >
                                {inMaint && <Wrench className="h-3 w-3 mr-1" />}
                                <Dumbbell className="h-3 w-3 mr-1" />
                                {eq.name}
                              </Badge>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant={editing ? 'secondary' : 'outline'} onClick={() => (editing ? setOpenSlot(null) : startEdit(s.id))}>
                      {editing ? 'Cancelar' : 'Vincular'}
                    </Button>
                  </div>

                  {editing && (
                    <div className="border-t p-3 bg-muted/30 space-y-3">
                      {activeEquipment.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhum equipamento ativo. Cadastre em{' '}
                          <Link to="/clinica/equipamentos" className="text-primary underline">
                            Equipamentos
                          </Link>
                          .
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {activeEquipment.map((eq) => {
                            const inMaint = eq.status === 'maintenance';
                            const checked = sel.has(eq.id);
                            return (
                              <label
                                key={eq.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                                  checked ? 'bg-primary/5 border-primary/40' : 'bg-card hover:bg-muted'
                                } ${inMaint ? 'opacity-70' : ''}`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggle(s.id, eq.id)}
                                  disabled={inMaint}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium truncate flex items-center gap-1">
                                    {eq.name}
                                    {inMaint && <Wrench className="h-3 w-3 text-amber-600" />}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {eq.equipment_type}
                                    {inMaint && ' · em manutenção'}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setOpenSlot(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={() => save(s.id)} disabled={setEquipmentForSlot.isPending}>
                          Salvar vínculos
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      </div>
    </>
  );
}
