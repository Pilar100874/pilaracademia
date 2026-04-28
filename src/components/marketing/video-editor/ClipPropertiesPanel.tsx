import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { TimelineClip, EFFECT_TRACK_PRESETS } from './types';
import { Settings2, FlipHorizontal, FlipVertical, RotateCcw, Maximize, Move, Undo2 } from 'lucide-react';

interface Props {
  clip?: TimelineClip;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
}

const ClipPropertiesPanel: React.FC<Props> = ({ clip, onUpdateClip }) => {
  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Settings2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Selecione um clipe para ver suas propriedades</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: clip.color }} />
          <span className="text-sm font-semibold">{clip.name}</span>
        </div>

        {/* Name */}
        <div>
          <Label className="text-xs">Nome</Label>
          <Input
            value={clip.name}
            onChange={(e) => onUpdateClip(clip.id, { name: e.target.value })}
            className="mt-1 text-xs h-8"
          />
        </div>

        {/* Timing */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Início (s)</Label>
            <Input
              type="number"
              value={clip.startTime.toFixed(2)}
              onChange={(e) => onUpdateClip(clip.id, { startTime: Number(e.target.value) })}
              className="mt-1 text-xs h-8"
              step={0.1}
              min={0}
            />
          </div>
          <div>
            <Label className="text-[10px]">Duração (s)</Label>
            <Input
              type="number"
              value={clip.duration.toFixed(2)}
              onChange={(e) => onUpdateClip(clip.id, { duration: Number(e.target.value) })}
              className="mt-1 text-xs h-8"
              step={0.1}
              min={0.1}
            />
          </div>
        </div>

        {/* Volume */}
        {(clip.type === 'video' || clip.type === 'audio') && (
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Volume ({Math.round((clip.volume ?? 1) * 100)}%)</Label>
              <Switch
                checked={!clip.muted}
                onCheckedChange={(v) => onUpdateClip(clip.id, { muted: !v })}
              />
            </div>
            <Slider
              value={[clip.volume ?? 1]}
              onValueChange={([v]) => onUpdateClip(clip.id, { volume: v })}
              min={0}
              max={1}
              step={0.01}
              disabled={clip.muted}
              className="mt-2"
            />
          </div>
        )}


        {/* Opacity */}
        <div>
          <Label className="text-xs">Opacidade ({Math.round((clip.opacity ?? 1) * 100)}%)</Label>
          <Slider
            value={[clip.opacity ?? 1]}
            onValueChange={([v]) => onUpdateClip(clip.id, { opacity: v })}
            min={0}
            max={1}
            step={0.01}
            className="mt-2"
          />
        </div>

        {/* Effect Type — for effect track clips */}
        {clip.type === 'effect' && (
          <div>
            <Label className="text-xs font-semibold">Tipo de Efeito</Label>
            <div className="grid grid-cols-2 gap-1 mt-1.5 max-h-48 overflow-auto">
              {EFFECT_TRACK_PRESETS.map(preset => (
                <button
                  key={preset.type}
                  className={`flex items-center gap-1 p-1.5 rounded-md text-left transition-colors border ${
                    clip.effectType === preset.type
                      ? 'bg-primary/20 border-primary text-foreground'
                      : 'border-transparent hover:bg-accent text-muted-foreground'
                  }`}
                  onClick={() => onUpdateClip(clip.id, { effectType: preset.type, name: `✨ ${preset.label}` })}
                >
                  <span className="text-xs">{preset.icon}</span>
                  <span className="text-[10px] truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(clip.type === 'video' || clip.type === 'image' || clip.type === 'canvas') && (
          <div>
            <Label className="text-xs font-semibold">Posição e Tamanho</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <Label className="text-[10px]">X (%)</Label>
                <Input
                  type="number"
                  value={(clip.x ?? 0).toFixed(0)}
                  onChange={(e) => onUpdateClip(clip.id, { x: Number(e.target.value) })}
                  className="mt-1 text-xs h-8"
                  step={1}
                />
              </div>
              <div>
                <Label className="text-[10px]">Y (%)</Label>
                <Input
                  type="number"
                  value={(clip.y ?? 0).toFixed(0)}
                  onChange={(e) => onUpdateClip(clip.id, { y: Number(e.target.value) })}
                  className="mt-1 text-xs h-8"
                  step={1}
                />
              </div>
              <div>
                <Label className="text-[10px]">Largura (%)</Label>
                <Input
                  type="number"
                  value={(clip.w ?? 100).toFixed(0)}
                  onChange={(e) => onUpdateClip(clip.id, { w: Number(e.target.value) })}
                  className="mt-1 text-xs h-8"
                  step={1}
                  min={10}
                />
              </div>
              <div>
                <Label className="text-[10px]">Altura (%)</Label>
                <Input
                  type="number"
                  value={(clip.h ?? 100).toFixed(0)}
                  onChange={(e) => onUpdateClip(clip.id, { h: Number(e.target.value) })}
                  className="mt-1 text-xs h-8"
                  step={1}
                  min={10}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs gap-1.5"
                  onClick={() => onUpdateClip(clip.id, { x: 0, y: 0, w: 100, h: 100 })}
                >
                  <Move className="h-3 w-3" />
                  Resetar posição
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 text-xs gap-1.5"
                  onClick={() => onUpdateClip(clip.id, { x: 0, y: 0, w: 100, h: 100, rotation: 0, skewX: 0, skewY: 0, scaleX: 1, scaleY: 1 })}
                  title="Preencher todo o quadro do vídeo"
                >
                  <Maximize className="h-3 w-3" />
                  Preencher quadro
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5 border-dashed text-muted-foreground hover:text-foreground"
                onClick={() => onUpdateClip(clip.id, {
                  x: undefined,
                  y: undefined,
                  w: undefined,
                  h: undefined,
                  rotation: undefined,
                  scaleX: undefined,
                  scaleY: undefined,
                  skewX: undefined,
                  skewY: undefined,
                })}
                title="Restaurar o objeto ao estado original sem transformações"
              >
                <Undo2 className="h-3 w-3" />
                Restaurar original
              </Button>
            </div>
          </div>
        )}

        {/* Transform: Rotation, Flip, Skew, Scale */}
        {(clip.type === 'video' || clip.type === 'image' || clip.type === 'canvas') && (
          <div>
            <Label className="text-xs font-semibold">Transformar</Label>

            {/* Rotation */}
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Rotação ({clip.rotation ?? 0}°)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onUpdateClip(clip.id, { rotation: 0 })}
                  title="Resetar rotação"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
              <Slider
                value={[clip.rotation ?? 0]}
                onValueChange={([v]) => onUpdateClip(clip.id, { rotation: v })}
                min={0}
                max={360}
                step={1}
                className="mt-1"
              />
            </div>

            {/* Quick rotation presets */}
            <div className="flex gap-1 mt-1">
              {[0, 90, 180, 270].map(deg => (
                <Button
                  key={deg}
                  variant={(clip.rotation ?? 0) === deg ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-[10px] h-6 px-1"
                  onClick={() => onUpdateClip(clip.id, { rotation: deg })}
                >
                  {deg}°
                </Button>
              ))}
            </div>

            {/* Scale X / Y */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-[10px]">Escala X ({((clip.scaleX ?? 1) * 100).toFixed(0)}%)</Label>
                <Slider
                  value={[Math.abs(clip.scaleX ?? 1)]}
                  onValueChange={([v]) => {
                    const sign = (clip.scaleX ?? 1) < 0 ? -1 : 1;
                    onUpdateClip(clip.id, { scaleX: v * sign });
                  }}
                  min={0.1}
                  max={3}
                  step={0.05}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px]">Escala Y ({((clip.scaleY ?? 1) * 100).toFixed(0)}%)</Label>
                <Slider
                  value={[Math.abs(clip.scaleY ?? 1)]}
                  onValueChange={([v]) => {
                    const sign = (clip.scaleY ?? 1) < 0 ? -1 : 1;
                    onUpdateClip(clip.id, { scaleY: v * sign });
                  }}
                  min={0.1}
                  max={3}
                  step={0.05}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Skew / Distort */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-[10px]">Distorcer H ({clip.skewX ?? 0}°)</Label>
                <Slider
                  value={[clip.skewX ?? 0]}
                  onValueChange={([v]) => onUpdateClip(clip.id, { skewX: v })}
                  min={-45}
                  max={45}
                  step={1}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px]">Distorcer V ({clip.skewY ?? 0}°)</Label>
                <Slider
                  value={[clip.skewY ?? 0]}
                  onValueChange={([v]) => onUpdateClip(clip.id, { skewY: v })}
                  min={-45}
                  max={45}
                  step={1}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Flip buttons */}
            <div className="flex gap-2 mt-2">
              <Button
                variant={(clip.scaleX ?? 1) < 0 ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs gap-1.5 h-8"
                onClick={() => onUpdateClip(clip.id, { scaleX: (clip.scaleX ?? 1) * -1 })}
              >
                <FlipHorizontal className="h-3.5 w-3.5" />
                Inverter H
              </Button>
              <Button
                variant={(clip.scaleY ?? 1) < 0 ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs gap-1.5 h-8"
                onClick={() => onUpdateClip(clip.id, { scaleY: (clip.scaleY ?? 1) * -1 })}
              >
                <FlipVertical className="h-3.5 w-3.5" />
                Inverter V
              </Button>
            </div>

            {/* Reset all transforms */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => onUpdateClip(clip.id, { rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 })}
            >
              Resetar transformações
            </Button>
          </div>
        )}

        {/* Trim */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Trim Início (s)</Label>
            <Input
              type="number"
              value={clip.trimStart.toFixed(2)}
              onChange={(e) => onUpdateClip(clip.id, { trimStart: Number(e.target.value) })}
              className="mt-1 text-xs h-8"
              step={0.1}
              min={0}
            />
          </div>
          <div>
            <Label className="text-[10px]">Trim Fim (s)</Label>
            <Input
              type="number"
              value={clip.trimEnd.toFixed(2)}
              onChange={(e) => onUpdateClip(clip.id, { trimEnd: Number(e.target.value) })}
              className="mt-1 text-xs h-8"
              step={0.1}
              min={0}
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <Label className="text-xs">Cor do Clipe</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={clip.color}
              onChange={(e) => onUpdateClip(clip.id, { color: e.target.value })}
              className="h-8 w-8 rounded cursor-pointer"
            />
            <Input
              value={clip.color}
              onChange={(e) => onUpdateClip(clip.id, { color: e.target.value })}
              className="text-xs h-8 flex-1"
            />
          </div>
        </div>

        {/* Lock */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Bloquear clipe</Label>
            <p className="text-[9px] text-muted-foreground">Impede mover, redimensionar ou editar este clipe na timeline</p>
          </div>
          <Switch
            checked={clip.locked || false}
            onCheckedChange={(v) => onUpdateClip(clip.id, { locked: v })}
          />
        </div>

        {/* Locked Edge (for AI transition adjacent clips) */}
        {clip.lockedEdge && (
          <div className="flex items-center justify-between p-2 rounded-md bg-destructive/10 border border-destructive/20">
            <div>
              <Label className="text-xs flex items-center gap-1">
                🔒 {clip.lockedEdge === 'both' ? 'Bordas inicial e final travadas' : `Borda ${clip.lockedEdge === 'start' ? 'inicial' : 'final'} travada`}
              </Label>
              <p className="text-[9px] text-muted-foreground">
                Travada para preservar continuidade com transição AI {clip.lockedEdge === 'both' ? '(este é um clipe de transição)' : 'adjacente'}
              </p>
            </div>
            <Switch
              checked={true}
              onCheckedChange={(v) => {
                if (!v) {
                  onUpdateClip(clip.id, { lockedEdge: null });
                }
              }}
            />
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default ClipPropertiesPanel;
