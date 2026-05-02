import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileJson, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { collectUserData, downloadJSON, downloadPDF } from '@/lib/exportUserData';

/**
 * Botões de exportação dos dados pessoais (LGPD).
 * Gera JSON completo (machine-readable) ou PDF resumido (legível).
 */
export function DataExportSection() {
  const { user } = useAuth();
  const [busy, setBusy] = useState<'json' | 'pdf' | null>(null);

  const handleExport = async (format: 'json' | 'pdf') => {
    if (!user) return;
    setBusy(format);
    try {
      const data = await collectUserData(user.id, user.email ?? null);
      if (format === 'json') {
        downloadJSON(data);
        toast.success('Arquivo JSON baixado');
      } else {
        await downloadPDF(data);
        toast.success('PDF gerado');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Não foi possível exportar agora. Tente novamente.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Download className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Exportar meus dados</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
            Baixe uma cópia de tudo que você registrou no app — refeições, treinos,
            peso, exames e mais. Direito garantido pela LGPD.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport('pdf')}
          disabled={busy !== null}
          className="justify-center"
        >
          {busy === 'pdf' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              PDF resumido
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport('json')}
          disabled={busy !== null}
          className="justify-center"
        >
          {busy === 'json' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <FileJson className="h-3.5 w-3.5 mr-1.5" />
              JSON completo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
