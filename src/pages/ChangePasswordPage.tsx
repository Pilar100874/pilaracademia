// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pw1.length < 8) { toast.error('Senha deve ter ao menos 8 caracteres'); return; }
    if (pw1 !== pw2) { toast.error('Senhas não conferem'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      if (user) {
        await supabase.from('user_security_flags').upsert({
          user_id: user.id,
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
      toast.success('Senha atualizada!');
      await queryClient.invalidateQueries({ queryKey: ['must-change-password'] });
      await queryClient.refetchQueries({ queryKey: ['must-change-password'] });
      navigate('/', { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao trocar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Defina sua nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Você está usando uma senha temporária. Crie uma senha pessoal para continuar.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Nova senha</Label>
            <Input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <Label>Confirme a senha</Label>
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar nova senha'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
