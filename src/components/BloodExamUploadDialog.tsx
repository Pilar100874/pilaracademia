import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBackgroundAnalysis } from '@/contexts/BackgroundAnalysisContext';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function BloodExamUploadDialog({ open, onOpenChange }: Props) {
  const { startBloodExam } = useBackgroundAnalysis();
  const [file, setFile] = useState<File | null>(null);

  const reset = () => setFile(null);

  const handleSubmit = () => {
    if (!file) return;
    startBloodExam(file);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Enviar exame de sangue</DialogTitle>
          <DialogDescription>
            Envie o PDF do laudo. A análise roda em segundo plano — você pode continuar usando o
            app e avisaremos quando terminar.
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
            />
          </label>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!file}>
              Analisar em segundo plano
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
