import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimelineTrack, TRACK_COLORS } from './types';
import {
  Eye, EyeOff, Volume2, VolumeX, Lock, Unlock, Plus, Trash2,
  GripVertical, Film, Music, Type, Sparkles, Palette, Image as ImageIcon,
  Headphones
} from 'lucide-react';

interface Props {
  tracks: TimelineTrack[];
  onUpdateTrack: (id: string, updates: Partial<TimelineTrack>) => void;
  onDeleteTrack: (id: string) => void;
  onAddTrack: (track: Omit<TimelineTrack, 'id'>) => void;
  onMoveTrack: (id: string, direction: 'up' | 'down') => void;
  onReorderTrack?: (id: string, toIndex: number) => void;
  renderMode?: 'add-button' | 'tracks';
}

const TRACK_TYPE_OPTIONS: { type: TimelineTrack['type']; label: string; icon: React.ReactNode; defaultHeight: number }[] = [
  { type: 'video', label: 'Vídeo', icon: <Film className="h-3.5 w-3.5" />, defaultHeight: 50 },
  { type: 'image', label: 'Imagem', icon: <ImageIcon className="h-3.5 w-3.5" />, defaultHeight: 50 },
  { type: 'canvas', label: 'Canvas', icon: <Palette className="h-3.5 w-3.5" />, defaultHeight: 50 },
  { type: 'audio', label: 'Áudio', icon: <Music className="h-3.5 w-3.5" />, defaultHeight: 50 },
  { type: 'effect', label: 'Efeitos', icon: <Sparkles className="h-3.5 w-3.5" />, defaultHeight: 50 },
];

const TrackHeaders: React.FC<Props> = ({ tracks, onUpdateTrack, onDeleteTrack, onAddTrack, onMoveTrack, onReorderTrack, renderMode }) => {
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleAddTrack = (opt: typeof TRACK_TYPE_OPTIONS[0]) => {
    const count = tracks.filter(t => t.type === opt.type).length + 1;
    onAddTrack({
      name: `${opt.label} ${count}`,
      type: opt.type,
      height: opt.defaultHeight,
      muted: false,
      locked: false,
      visible: true,
      volume: opt.type === 'audio' ? 0.7 : 1,
      solo: false,
    });
    setAddPopoverOpen(false);
  };

  // Render only the add button for the ruler row
  if (renderMode === 'add-button') {
    return (
      <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-5 w-5" title="Adicionar trilha">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-44 p-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1">Tipo de trilha</p>
          {TRACK_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.type}
              onClick={() => handleAddTrack(opt)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-xs transition-colors text-left"
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ backgroundColor: `${TRACK_COLORS[opt.type]}25`, color: TRACK_COLORS[opt.type] }}
              >
                {opt.icon}
              </div>
              {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  // Render only track rows (for 'tracks' mode or default without renderMode for backwards compat)
  return (
    <div className="flex flex-col">
      {tracks.map((track, index) => (
        <div
          key={track.id}
          draggable
          onDragStart={(e) => {
            setDraggingId(track.id);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', track.id);
          }}
          onDragEnd={() => { setDraggingId(null); setDragOverIndex(null); }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverIndex(index);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverIndex(null);
            const srcId = e.dataTransfer.getData('text/plain');
            if (srcId && onReorderTrack) {
              onReorderTrack(srcId, index);
            }
            setDraggingId(null);
          }}
          className={`border-b border-r flex items-center gap-1 px-1.5 group transition-all ${
            draggingId === track.id ? 'opacity-40' : ''
          } ${dragOverIndex === index && draggingId !== track.id ? 'border-t-2 border-t-primary' : ''} ${
            track.locked ? 'bg-muted/30' : ''
          }`}
          style={{ height: track.height, backgroundColor: track.locked ? undefined : `${TRACK_COLORS[track.type] || TRACK_COLORS.video}12` }}
        >
          {/* Drag handle */}
          <div className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <div
            className="w-1.5 h-4 rounded-full shrink-0"
            style={{ backgroundColor: TRACK_COLORS[track.type] }}
          />
          <span className={`text-xs font-medium flex-1 truncate ${track.locked ? 'text-muted-foreground' : ''}`}>{track.name}</span>
          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
            {/* Solo button - only for audio/video */}
            {(track.type === 'audio' || track.type === 'video') && (
              <button
                onClick={() => onUpdateTrack(track.id, { solo: !track.solo })}
                className={`p-0.5 rounded hover:bg-muted ${track.solo ? 'text-yellow-500' : ''}`}
                title={track.solo ? 'Desativar solo' : 'Solo'}
              >
                <Headphones className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => onUpdateTrack(track.id, { muted: !track.muted })}
              className={`p-0.5 rounded hover:bg-muted ${track.muted ? 'text-destructive' : ''}`}
              title={track.muted ? 'Ativar som' : 'Silenciar'}
            >
              {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </button>
            <button
              onClick={() => onUpdateTrack(track.id, { visible: !track.visible })}
              className={`p-0.5 rounded hover:bg-muted ${!track.visible ? 'text-muted-foreground/40' : ''}`}
              title={track.visible ? 'Ocultar' : 'Mostrar'}
            >
              {track.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
            <button
              onClick={() => onUpdateTrack(track.id, { locked: !track.locked })}
              className={`p-0.5 rounded hover:bg-muted ${track.locked ? 'text-orange-500' : ''}`}
              title={track.locked ? 'Desbloquear' : 'Bloquear'}
            >
              {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            </button>
            <button
              onClick={() => onDeleteTrack(track.id)}
              className="p-0.5 rounded hover:bg-destructive/20 opacity-0 group-hover:opacity-100"
              title="Remover trilha"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrackHeaders;