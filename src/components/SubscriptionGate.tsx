import { ReactNode } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useClinicSubscription, hasActiveAccess } from '@/hooks/useSubscription';
import BillingPage from '@/pages/clinic/BillingPage';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

export function SubscriptionGate({ children }: Props) {
  const { activeClinicId, activeClinic, isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { data: sub, isLoading } = useClinicSubscription(activeClinicId);

  if (rolesLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Demo libera acesso
  if ((activeClinic as any)?.is_demo) return <>{children}</>;

  if (hasActiveAccess(sub)) return <>{children}</>;

  // Bloqueio total
  if (isAdmin) {
    return <BillingPage fullscreen />;
  }

  // Não-admin: tela explicativa
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500" />
        <h1 className="text-xl font-bold">Clínica suspensa</h1>
        <p className="text-sm text-muted-foreground">
          A assinatura de <strong>{activeClinic?.name}</strong> expirou.
          Por favor entre em contato com o administrador da clínica para regularizar.
        </p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sair</Button>
      </Card>
    </div>
  );
}
