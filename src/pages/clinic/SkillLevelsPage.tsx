import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useSkillLevels } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Layers } from 'lucide-react';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';

export default function SkillLevelsPage() {
  const { activeClinicId } = useUserRoles();
  const { data: levels = [], create, remove } = useSkillLevels(activeClinicId);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const handleAdd = async () => {
    if (!name.trim()) return;
    const nextRank = (levels.reduce((max, l) => Math.max(max, l.rank ?? 0), 0)) + 1;
    await create.mutateAsync({ name: name.trim(), rank: nextRank, color });
    setName('');
  };

  return (
    <>
    <ClinicPageHeader icon={Layers} title="Níveis de habilidade" subtitle="1 = mais básico" />
    <div className="p-6 space-y-4 max-w-3xl mx-auto">

      <Card className="p-4 flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm">Novo nível</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Avançado" />
        </div>
        <div>
          <label className="text-sm">Cor</label>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 p-1" />
        </div>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </Card>

      {levels.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
          Nenhum nível cadastrado.
        </Card>
      ) : (
        <div className="space-y-2">
          {levels.map((lv) => (
            <Card key={lv.id} className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: lv.color || '#6366f1' }}>
                {lv.rank}
              </div>
              <div className="flex-1 font-medium">{lv.name}</div>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(lv.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
