import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Clock, Ban, AlertCircle } from 'lucide-react';

interface Props {
  status: 'pending' | 'rejected' | 'disabled';
}

/**
 * Tela exibida quando o usuário está autenticado mas:
 *  - aguardando aprovação (`pending`)
 *  - teve cadastro rejeitado (`rejected`)
 *  - foi desativado pelo admin (`disabled`)
 */
export default function AccountStatusGate({ status }: Props) {
  const { signOut, user } = useAuth();

  const config =
    status === 'pending'
      ? {
          Icon: Clock,
          title: 'Aguardando aprovação',
          message:
            'Seu cadastro foi recebido e está aguardando aprovação do administrador. Você receberá acesso assim que for liberado.',
          tone: 'text-amber-600',
        }
      : status === 'rejected'
        ? {
            Icon: Ban,
            title: 'Acesso não aprovado',
            message:
              'Seu cadastro não foi aprovado. Se acredita que isso é um engano, entre em contato com o administrador.',
            tone: 'text-destructive',
          }
        : {
            Icon: AlertCircle,
            title: 'Conta desativada',
            message:
              'Sua conta foi desativada pelo administrador. Entre em contato para mais informações.',
            tone: 'text-destructive',
          };

  const { Icon, title, message, tone } = config;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Icon className={`h-8 w-8 ${tone}`} />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          {user?.email && (
            <p className="text-xs text-muted-foreground">
              Conectado como <strong>{user.email}</strong>
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => signOut()} className="w-full">
          Sair
        </Button>
      </div>
    </div>
  );
}
