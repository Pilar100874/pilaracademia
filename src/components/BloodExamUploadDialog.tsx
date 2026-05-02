import { useState } from 'react';
import { Loader2, Upload, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - vite worker import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(' ') + '\n';
  }
  return text;
}

export function BloodExamUploadDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string>('');

  const reset = () => {
    setFile(null);
    setBusy(false);
    setStep('');
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    if (file.type !== 'application/pdf') {
      toast.error('Envie um arquivo PDF');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 20MB)');
      return;
    }

    setBusy(true);
    try {
      setStep('Lendo o PDF…');
      const rawText = await extractPdfText(file);
      if (!rawText.trim()) throw new Error('Não foi possível ler o texto do PDF');

      setStep('Enviando para a nuvem…');
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('blood-exams').upload(path, file, {
        contentType: 'application/pdf',
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('blood-exams').createSignedUrl(path, 60 * 60 * 24 * 365);
      const fileUrl = signed?.signedUrl || path;

      setStep('Analisando marcadores com IA…');
      const { data: extracted, error: fnErr } = await supabase.functions.invoke('extract-blood-exam', {
        body: { rawText },
      });
      if (fnErr) throw fnErr;
      if (extracted?.error) throw new Error(extracted.error);

      setStep('Salvando…');
      const { error: insErr } = await supabase.from('blood_exams').insert({
        user_id: user.id,
        file_url: fileUrl,
        file_name: file.name,
        collected_at: extracted.collected_at || null,
        lab_name: extracted.lab_name || null,
        markers: extracted.markers || [],
        summary: extracted.summary || null,
        alerts: extracted.alerts || [],
        diet_recommendations: extracted.diet_recommendations || [],
        raw_text: rawText.slice(0, 50000),
        status: 'analyzed',
      });
      if (insErr) throw insErr;

      queryClient.invalidateQueries({ queryKey: ['blood-exams', user.id] });
      toast.success('Exame analisado com sucesso!');
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Falha ao processar exame');
    } finally {
      setBusy(false);
      setStep('');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          if (!v) reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent
        className="max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Enviar exame de sangue</DialogTitle>
          <DialogDescription>
            Envie o PDF do laudo. A IA extrai os marcadores e gera um resumo didático para usar no
            cardápio e nas sugestões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label
            htmlFor="blood-exam-file"
            className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-6 cursor-pointer hover:bg-muted/40 transition-colors"
          >
            {file ? (
              <>
                <FileText className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-center break-all">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · clique para trocar
                </p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">Toque para selecionar o PDF</p>
                <p className="text-[11px] text-muted-foreground">PDF até 20MB</p>
              </>
            )}
            <input
              id="blood-exam-file"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={busy}
            />
          </label>

          {busy && (
            <div className="rounded-md bg-muted/40 border border-border p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">{step}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!file || busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analisar exame'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
