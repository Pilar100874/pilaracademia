import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Upload, Scissors, Download, Play, Pause, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MarketingVideoEditor: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (src) URL.revokeObjectURL(src);
    const url = URL.createObjectURL(file);
    setSrc(url);
  };

  const onLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setTrimStart(0);
    setTrimEnd(v.duration);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.currentTime = trimStart; v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime >= trimEnd) { v.pause(); setPlaying(false); }
  };

  const exportTrim = async () => {
    const v = videoRef.current;
    if (!v || !src) return;
    setExporting(true);
    try {
      // Use MediaRecorder + canvas for re-encoding the trimmed segment
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d')!;
      const stream = canvas.captureStream(30);
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const stopped = new Promise<void>((res) => { recorder.onstop = () => res(); });

      v.currentTime = trimStart;
      await new Promise<void>((r) => v.addEventListener('seeked', () => r(), { once: true }));
      recorder.start();
      v.play();

      const drawLoop = () => {
        if (v.currentTime >= trimEnd) { v.pause(); recorder.stop(); return; }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawLoop);
      };
      drawLoop();

      await stopped;
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trim-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Vídeo exportado!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao exportar: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {!src && (
        <Card className="p-12 text-center border-dashed">
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">Faça upload de um vídeo para editar</p>
          <Button onClick={() => fileRef.current?.click()}>Selecionar vídeo</Button>
        </Card>
      )}

      {src && (
        <>
          <div className="bg-black rounded-md overflow-hidden">
            <video
              ref={videoRef}
              src={src}
              onLoadedMetadata={onLoaded}
              onTimeUpdate={onTimeUpdate}
              className="w-full max-h-96 mx-auto"
              controls={false}
            />
          </div>

          <Card className="p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={togglePlay}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <span className="text-xs text-muted-foreground">
                {trimStart.toFixed(1)}s → {trimEnd.toFixed(1)}s ({(trimEnd - trimStart).toFixed(1)}s)
              </span>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="ml-auto">
                <Upload className="h-4 w-4 mr-1" />Trocar
              </Button>
              <Button size="sm" onClick={exportTrim} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                Exportar corte
              </Button>
            </div>

            <div>
              <Label className="text-xs">Início ({trimStart.toFixed(1)}s)</Label>
              <Slider value={[trimStart]} max={duration} step={0.1} onValueChange={(v) => setTrimStart(Math.min(v[0], trimEnd - 0.5))} />
            </div>
            <div>
              <Label className="text-xs">Fim ({trimEnd.toFixed(1)}s)</Label>
              <Slider value={[trimEnd]} max={duration} step={0.1} onValueChange={(v) => setTrimEnd(Math.max(v[0], trimStart + 0.5))} />
            </div>
          </Card>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Scissors className="h-3 w-3" />Exportação em WebM via canvas (sem áudio). Para MP4 com áudio, use ferramenta dedicada.
          </p>
        </>
      )}
    </div>
  );
};

export default MarketingVideoEditor;
