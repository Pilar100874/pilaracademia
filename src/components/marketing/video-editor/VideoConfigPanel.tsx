import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Settings2, Square, RectangleHorizontal, RectangleVertical, Check, AlertTriangle } from 'lucide-react';

export interface VideoConfig {
  backgroundColor: string;
  resolution: string;
  fps: number;
  destination: string;
  format: string;
}

interface Props {
  config: VideoConfig;
  onChange: (config: VideoConfig) => void;
}

const DESTINATIONS = [
  { id: 'youtube', label: 'YouTube', icon: '📺', formats: [
    { id: '1920x1080', label: '1080p (16:9)', desc: 'Full HD — padrão recomendado' },
    { id: '3840x2160', label: '4K (16:9)', desc: 'Ultra HD' },
    { id: '1280x720', label: '720p (16:9)', desc: 'HD' },
    { id: '1080x1920', label: 'Shorts (9:16)', desc: 'YouTube Shorts' },
  ]},
  { id: 'instagram', label: 'Instagram', icon: '📷', formats: [
    { id: '1080x1080', label: '1080x1080 (1:1)', desc: 'Feed quadrado' },
    { id: '1080x1350', label: '1080x1350 (4:5)', desc: 'Feed retrato — mais engajamento' },
    { id: '1080x1920', label: '1080x1920 (9:16)', desc: 'Stories / Reels' },
    { id: '1920x1080', label: '1920x1080 (16:9)', desc: 'IGTV horizontal' },
  ]},
  { id: 'tiktok', label: 'TikTok', icon: '🎵', formats: [
    { id: '1080x1920', label: '1080x1920 (9:16)', desc: 'Formato padrão TikTok' },
    { id: '1920x1080', label: '1920x1080 (16:9)', desc: 'Horizontal' },
  ]},
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', formats: [
    { id: '848x480', label: '480p (16:9)', desc: 'Leve para envio rápido' },
    { id: '1280x720', label: '720p (16:9)', desc: 'Boa qualidade' },
    { id: '720x1280', label: '720x1280 (9:16)', desc: 'Status vertical' },
  ]},
  { id: 'facebook', label: 'Facebook', icon: '📘', formats: [
    { id: '1920x1080', label: '1080p (16:9)', desc: 'Feed horizontal' },
    { id: '1080x1080', label: '1080x1080 (1:1)', desc: 'Feed quadrado' },
    { id: '1080x1920', label: '1080x1920 (9:16)', desc: 'Stories / Reels' },
  ]},
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', formats: [
    { id: '1920x1080', label: '1080p (16:9)', desc: 'Post profissional' },
    { id: '1080x1080', label: '1080x1080 (1:1)', desc: 'Quadrado' },
  ]},
  { id: 'custom', label: 'Personalizado', icon: '⚙️', formats: [
    { id: '1920x1080', label: '1920x1080 (16:9)', desc: 'Full HD horizontal' },
    { id: '1080x1920', label: '1080x1920 (9:16)', desc: 'Full HD vertical' },
    { id: '1080x1080', label: '1080x1080 (1:1)', desc: 'Quadrado' },
    { id: '1280x720', label: '1280x720 (16:9)', desc: 'HD' },
    { id: '3840x2160', label: '3840x2160 (16:9)', desc: '4K' },
    { id: '720x1280', label: '720x1280 (9:16)', desc: 'HD vertical' },
  ]},
];

const BG_COLORS = [
  { value: '#000000', label: 'Preto' },
  { value: '#ffffff', label: 'Branco' },
  { value: '#111827', label: 'Cinza Escuro' },
  { value: '#1e3a5f', label: 'Azul Escuro' },
  { value: '#1a1a2e', label: 'Noite' },
  { value: '#0f172a', label: 'Slate' },
  { value: '#064e3b', label: 'Verde Escuro' },
  { value: '#7f1d1d', label: 'Vermelho Escuro' },
  { value: '#transparent', label: 'Transparente' },
];

const VideoConfigPanel: React.FC<Props> = ({ config, onChange }) => {
  const currentDest = DESTINATIONS.find(d => d.id === config.destination) || DESTINATIONS[0];
  const currentFormat = currentDest.formats.find(f => f.id === config.resolution);

  // Pending change confirmation state
  const [pendingChange, setPendingChange] = useState<{
    destination: string;
    resolution: string;
    destLabel: string;
    destIcon: string;
    formatLabel: string;
  } | null>(null);

  const updateConfig = (partial: Partial<VideoConfig>) => {
    onChange({ ...config, ...partial });
  };

  const handleDestinationChange = (destId: string) => {
    if (destId === config.destination) return;
    const dest = DESTINATIONS.find(d => d.id === destId)!;
    const firstFormat = dest.formats[0];

    // Check if resolution/aspect ratio is actually changing
    const currentRes = config.resolution;
    const newRes = firstFormat.id;
    if (currentRes === newRes) {
      // Same resolution, just switch destination label
      updateConfig({ destination: destId });
      return;
    }

    setPendingChange({
      destination: destId,
      resolution: newRes,
      destLabel: dest.label,
      destIcon: dest.icon,
      formatLabel: firstFormat.label,
    });
  };

  const confirmChange = () => {
    if (!pendingChange) return;
    updateConfig({
      destination: pendingChange.destination,
      resolution: pendingChange.resolution,
    });
    setPendingChange(null);
  };

  const getAspectLabel = (res: string) => {
    const [w, h] = res.split('x').map(Number);
    if (w === h) return '1:1';
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const d = gcd(w, h);
    return `${w / d}:${h / d}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Configurações do Vídeo
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-5">
          {/* Destination */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Destino da Mídia</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {DESTINATIONS.map(dest => (
                <button
                  key={dest.id}
                  onClick={() => handleDestinationChange(dest.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs transition-all ${
                    config.destination === dest.id
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <span>{dest.icon}</span>
                  <span>{dest.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Suggested formats */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Formato Sugerido</Label>
            <div className="space-y-1.5">
              {currentDest.formats.map(fmt => {
                const isActive = config.resolution === fmt.id;
                const [w, h] = fmt.id.split('x').map(Number);
                const isVertical = h > w;
                const isSquare = h === w;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => {
                      if (fmt.id !== config.resolution) {
                        setPendingChange({
                          destination: config.destination,
                          resolution: fmt.id,
                          destLabel: currentDest.label,
                          destIcon: currentDest.icon,
                          formatLabel: fmt.label,
                        });
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10'
                        : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className={`shrink-0 rounded border flex items-center justify-center ${
                      isActive ? 'border-primary/60 bg-primary/20' : 'border-border bg-muted/50'
                    }`} style={{
                      width: isSquare ? 24 : isVertical ? 18 : 28,
                      height: isSquare ? 24 : isVertical ? 28 : 18,
                    }}>
                      {isSquare ? <Square className="h-2.5 w-2.5" /> :
                       isVertical ? <RectangleVertical className="h-2.5 w-2.5" /> :
                       <RectangleHorizontal className="h-2.5 w-2.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] font-medium ${isActive ? 'text-primary' : ''}`}>{fmt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{fmt.desc}</p>
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FPS */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Taxa de Quadros (FPS)</Label>
            <Select value={String(config.fps)} onValueChange={(v) => updateConfig({ fps: Number(v) })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 fps — Cinema</SelectItem>
                <SelectItem value="25">25 fps — PAL</SelectItem>
                <SelectItem value="30">30 fps — Padrão</SelectItem>
                <SelectItem value="60">60 fps — Suave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Background color */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Cor de Fundo</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {BG_COLORS.map(color => {
                const isActive = config.backgroundColor === color.value;
                return (
                  <button
                    key={color.value}
                    onClick={() => updateConfig({ backgroundColor: color.value })}
                    title={color.label}
                    className={`aspect-square rounded-lg border-2 transition-all relative ${
                      isActive
                        ? 'border-primary scale-110 shadow-md'
                        : 'border-border hover:border-primary/50 hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: color.value === '#transparent' ? 'transparent' : color.value,
                      backgroundImage: color.value === '#transparent'
                        ? 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 8px 8px'
                        : undefined,
                    }}
                  >
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className={`h-3 w-3 ${
                          color.value === '#ffffff' ? 'text-black' : 'text-white'
                        }`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Cor visível onde não houver conteúdo
            </p>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Formato de Saída</Label>
            <Select value={config.format} onValueChange={(v) => updateConfig({ format: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4 (H.264) — Universal</SelectItem>
                <SelectItem value="webm">WebM (VP9) — Web</SelectItem>
                <SelectItem value="gif">GIF — Animado sem áudio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {currentFormat && (
            <div className="rounded-lg bg-muted/50 border border-border/60 p-3 space-y-1">
              <p className="text-[11px] font-medium">📋 Resumo</p>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>Destino: <span className="text-foreground">{currentDest.icon} {currentDest.label}</span></p>
                <p>Resolução: <span className="text-foreground">{currentFormat.label}</span></p>
                <p>FPS: <span className="text-foreground">{config.fps}</span></p>
                <p>Fundo: <span className="text-foreground inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm border inline-block" style={{
                    backgroundColor: config.backgroundColor === '#transparent' ? 'transparent' : config.backgroundColor,
                    backgroundImage: config.backgroundColor === '#transparent'
                      ? 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 4px 4px'
                      : undefined,
                  }} />
                  {BG_COLORS.find(c => c.value === config.backgroundColor)?.label || config.backgroundColor}
                </span></p>
                <p>Formato: <span className="text-foreground">{config.format.toUpperCase()}</span></p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingChange} onOpenChange={(open) => { if (!open) setPendingChange(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alterar formato do vídeo?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está mudando para <strong>{pendingChange?.destIcon} {pendingChange?.destLabel}</strong> com formato <strong>{pendingChange?.formatLabel}</strong>.
                </p>

                {pendingChange && (
                  <div className="flex items-center gap-4 justify-center py-2">
                    {/* Current */}
                    <div className="text-center">
                      <div
                        className="mx-auto rounded border border-border bg-muted/60 flex items-center justify-center"
                        style={{
                          width: (() => { const [w, h] = config.resolution.split('x').map(Number); const ratio = w / h; return ratio >= 1 ? 56 : Math.round(56 * ratio); })(),
                          height: (() => { const [w, h] = config.resolution.split('x').map(Number); const ratio = w / h; return ratio <= 1 ? 56 : Math.round(56 / ratio); })(),
                        }}
                      >
                        <span className="text-[8px] text-muted-foreground">{getAspectLabel(config.resolution)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Atual</p>
                    </div>

                    <span className="text-lg text-muted-foreground">→</span>

                    {/* New */}
                    <div className="text-center">
                      <div
                        className="mx-auto rounded border-2 border-primary bg-primary/10 flex items-center justify-center"
                        style={{
                          width: (() => { const [w, h] = (pendingChange?.resolution || '1920x1080').split('x').map(Number); const ratio = w / h; return ratio >= 1 ? 56 : Math.round(56 * ratio); })(),
                          height: (() => { const [w, h] = (pendingChange?.resolution || '1920x1080').split('x').map(Number); const ratio = w / h; return ratio <= 1 ? 56 : Math.round(56 / ratio); })(),
                        }}
                      >
                        <span className="text-[8px] text-primary font-medium">{getAspectLabel(pendingChange?.resolution || '1920x1080')}</span>
                      </div>
                      <p className="text-[10px] text-primary font-medium mt-1">Novo</p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  A tela de preview e a exportação serão ajustadas para o novo formato. Clipes existentes podem ficar desproporcionais.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>Confirmar Alteração</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VideoConfigPanel;
