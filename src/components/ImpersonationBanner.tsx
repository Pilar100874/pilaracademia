import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getImpersonation, stopImpersonation } from '@/lib/impersonation';
import { Button } from '@/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';

export function ImpersonationBanner() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const imp = getImpersonation();
  if (!imp || !user) return null;
  return (
    <div className="sticky top-0 z-[60] flex min-w-0 items-center gap-2 border-b border-border bg-accent px-3 py-2 text-accent-foreground lg:pl-64">
      <Eye className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 truncate text-xs">
        Você está na conta de <strong>{user.email}</strong>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 text-xs"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await stopImpersonation();
        }}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Voltar para minha conta'}
      </Button>
    </div>
  );
}
