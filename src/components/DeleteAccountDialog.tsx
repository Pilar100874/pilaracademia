import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: Props) {
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { signOut } = useAuth();

  const canDelete = confirm.trim().toUpperCase() === 'EXCLUIR';

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      toast.success('Conta excluída. Sentiremos sua falta.');
      await signOut();
      window.location.href = '/auth';
    } catch (e: any) {
      toast.error('Erro ao excluir conta', { description: e?.message || 'Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Excluir conta permanentemente</DialogTitle>
          <DialogDescription className="text-center">
            Esta ação é irreversível. Todos os seus dados (perfil, refeições, treinos, exames, fotos
            e histórico) serão apagados imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-delete" className="text-sm">
            Para confirmar, digite <strong>EXCLUIR</strong> abaixo:
          </Label>
          <Input
            id="confirm-delete"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="EXCLUIR"
            autoComplete="off"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Você pode exportar seus dados antes em <em>Perfil → Exportar dados</em>.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Excluir conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
