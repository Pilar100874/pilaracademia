// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function CreateClinicPage() {
  const { user } = useAuth();
  const { refetch } = useUserRoles();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
      const { data: clinic, error: cErr } = await supabase
        .from('clinics')
        .insert({ name: name.trim(), slug, owner_user_id: user.id })
        .select()
        .single();
      if (cErr) throw cErr;

      const { error: rErr } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, clinic_id: clinic.id, role: 'clinic_admin' });
      if (rErr) throw rErr;

      // Seed default skill levels
      await supabase.from('clinic_skill_levels').insert([
        { clinic_id: clinic.id, name: 'Iniciante', rank: 1, color: '#10b981' },
        { clinic_id: clinic.id, name: 'Intermediário', rank: 2, color: '#f59e0b' },
        { clinic_id: clinic.id, name: 'Avançado', rank: 3, color: '#ef4444' },
      ]);

      toast.success('Clínica criada!');
      await refetch();
      navigate('/clinica');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar clínica');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Criar minha clínica</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre sua clínica de Pilates para começar a gerenciar alunos e aulas.
          </p>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome da clínica</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Studio Pilates Central"
              required
              className="h-12 mt-1"
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim()} className="w-full h-12">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar clínica'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/')}>
            Voltar
          </Button>
        </form>
      </Card>
    </div>
  );
}
