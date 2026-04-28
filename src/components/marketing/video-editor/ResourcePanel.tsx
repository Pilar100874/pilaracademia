import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef, useEffect, KeyboardEvent, useMemo } from 'react';
import { toast } from 'sonner';
import { useGalleryFolders } from '@/hooks/useGalleryFolders';
import { GalleryFolderTabs } from '@/components/ui/GalleryFolderTabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import GalleryFilteredGrid from '@/components/ui/GalleryFilteredGrid';
import {
  Film, Image as ImageIcon, Music, Palette, Upload, FolderOpen, Wand2,
  Play, Check, Trash2, Loader2, Plus, Mic, Pencil, ChevronDown, Sparkles, Save
} from 'lucide-react';
import MiniEffectPreview from './MiniEffectPreview';
import { supabase } from '@/integrations/supabase/client';
import { TimelineTrack, TimelineClip, EFFECT_TRACK_PRESETS, TransitionType } from './types';

type ResourceType = 'video' | 'image' | 'canvas' | 'music' | 'audio' | 'effect' | 'transition';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
  canvasJson?: string;
}

export interface ResourcePanelHandle {
  addCanvasItem: (name: string, src: string, canvasJson?: string) => void;
  addTransitionItem: (name: string, src: string, duration: number) => void;
}

interface Props {
  onAddClip: (type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem, trackId?: string) => void;
  onAddEffectClip?: (trackId: string, startTime: number, effectType: TransitionType, label: string) => void;
  onDeleteClips?: (ids: string[]) => void;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  onOpenCanvas: () => void;
  onEditCanvas?: (canvasJson: string, itemId: string) => void;
}

interface ImportedMedia {
  id: string;
  name: string;
  src: string;
  type: 'video' | 'image' | 'audio';
  duration?: number | null;
  thumbnail?: string | null;
  resourceType: ResourceType;
  canvasJson?: string;
}

interface GalleryItem {
  id: string;
  nome: string;
  public_url: string;
  tipo: string;
  thumbnail_url: string | null;
  created_at: string | null;
  duracao_segundos: number | null;
}

const TABS: { key: ResourceType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'video', label: 'Vídeo', icon: <Film className="h-4 w-4" />, color: 'text-blue-400' },
  { key: 'image', label: 'Imagem', icon: <ImageIcon className="h-4 w-4" />, color: 'text-green-400' },
  { key: 'canvas', label: 'Canvas', icon: <Palette className="h-4 w-4" />, color: 'text-purple-400' },
  { key: 'transition', label: 'Transições AI', icon: <Wand2 className="h-4 w-4" />, color: 'text-cyan-400' },
  { key: 'music', label: 'Música', icon: <Music className="h-4 w-4" />, color: 'text-yellow-400' },
  { key: 'audio', label: 'Áudio', icon: <Mic className="h-4 w-4" />, color: 'text-orange-400' },
  { key: 'effect', label: 'Efeitos', icon: <Sparkles className="h-4 w-4" />, color: 'text-pink-400' },
];

const ResourcePanel = forwardRef<ResourcePanelHandle, Props>(({ onAddClip, onAddEffectClip, onDeleteClips, tracks, clips, onOpenCanvas, onEditCanvas }, ref) => {
  const [items, setItems] = useState<Record<Exclude<ResourceType, 'effect'>, ImportedMedia[]>>({
    video: [], image: [], canvas: [], music: [], audio: [], transition: [],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [effectCategoryFilter, setEffectCategoryFilter] = useState<string | null>(null);
  const [previewEffect, setPreviewEffect] = useState<TransitionType | null>(null);
  const [savingToGalleryId, setSavingToGalleryId] = useState<string | null>(null);

  const handleSaveTransitionToGallery = useCallback(async (media: ImportedMedia) => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }
    setSavingToGalleryId(media.id);
    try {
      // Check if URL is already in storage
      const isStorageUrl = media.src.includes('supabase.co/storage');
      let publicUrl = media.src;
      let storagePath = '';

      if (!isStorageUrl) {
        const resp = await fetch(media.src);
        const blob = await resp.blob();
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const fileName = `transition_ai_${Date.now()}.${ext}`;
        storagePath = `${estabId}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('marketing-videos').upload(storagePath, blob, { contentType: blob.type, upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('marketing-videos').getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      } else {
        const match = media.src.match(/marketing-videos\/(.+)$/);
        storagePath = match?.[1] || '';
      }

      await supabase.from('media_gallery').insert({
        estabelecimento_id: estabId,
        tipo: 'video',
        nome: media.name || `Transição AI ${new Date().toLocaleDateString('pt-BR')}`,
        public_url: publicUrl,
        storage_path: storagePath ? `${storagePath}` : undefined,
        duracao_segundos: media.duration || null,
      });
      toast.success('Transição salva na galeria!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || 'Tente novamente'));
    } finally {
      setSavingToGalleryId(null);
    }
  }, []);

  // Sync timeline clips into resource panel so every clip on a track appears in its group
  useEffect(() => {
    setItems(prev => {
      const next = { ...prev };
      let changed = false;

      for (const clip of clips) {
        let resType: ResourceType;
        if (clip.type === 'video' && clip.name?.includes('Transição AI')) resType = 'transition';
        else if (clip.type === 'video') resType = 'video';
        else if (clip.type === 'image') resType = 'image';
        else if (clip.type === 'canvas') resType = 'canvas';
        else if (clip.type === 'audio') resType = 'audio';
        else continue;

        const alreadyExists = next[resType].some(item => item.id === clip.id || item.src === clip.src);
        if (!alreadyExists && clip.src) {
          changed = true;
          const mediaType: 'video' | 'image' | 'audio' =
            clip.type === 'video' ? 'video' :
            clip.type === 'audio' ? 'audio' : 'image';
          next[resType] = [...next[resType], {
            id: clip.id,
            name: clip.name,
            src: clip.src,
            type: mediaType,
            duration: clip.duration || null,
            thumbnail: clip.thumbnail || null,
            resourceType: resType,
            canvasJson: clip.canvasJson,
          }];
        }
      }

      return changed ? next : prev;
    });
  }, [clips]);

  useImperativeHandle(ref, () => ({
    addCanvasItem: (name: string, src: string, canvasJson?: string) => {
      const imported: ImportedMedia = {
        id: `canvas_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        src,
        type: 'image',
        duration: null,
        thumbnail: null,
        resourceType: 'canvas',
        canvasJson,
      };
      setItems(prev => ({ ...prev, canvas: [...prev.canvas, imported] }));
    },
    addTransitionItem: (name: string, src: string, duration: number) => {
      const imported: ImportedMedia = {
        id: `transition_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        src,
        type: 'video',
        duration,
        thumbnail: null,
        resourceType: 'transition',
      };
      setItems(prev => ({ ...prev, transition: [...prev.transition, imported] }));
    },
    updateCanvasItem: (itemId: string, src: string, canvasJson: string) => {
      setItems(prev => ({
        ...prev,
        canvas: prev.canvas.map(item =>
          item.id === itemId ? { ...item, src, canvasJson } : item
        ),
      }));
    },
  }));

  // Gallery
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryType, setGalleryType] = useState<'video' | 'image'>('video');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const fetchGallery = useCallback(async (type: 'video' | 'image') => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    try {
      const tipoFilter = type === 'video' ? 'video' : 'image';
      const { data, error } = await supabase
        .from('media_gallery')
        .select('id, nome, public_url, tipo, thumbnail_url, created_at, duracao_segundos')
        .eq('estabelecimento_id', estabId)
        .eq('tipo', tipoFilter)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) setGalleryItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenGallery = useCallback((type: 'video' | 'image') => {
    setGalleryType(type);
    setSelectedIds(new Set());
    setGalleryItems([]);
    setGalleryOpen(true);
    fetchGallery(type);
  }, [fetchGallery]);

  const handleConfirmSelection = useCallback(() => {
    const selected = galleryItems.filter(i => selectedIds.has(i.id));
    const resType: ResourceType = galleryType;

    for (const item of selected) {
      const imported: ImportedMedia = {
        id: item.id,
        name: item.nome,
        src: item.public_url,
        type: galleryType,
        duration: item.duracao_segundos,
        thumbnail: item.thumbnail_url,
        resourceType: resType,
      };
      setItems(prev => {
        if (prev[resType].find(v => v.id === item.id)) return prev;
        return { ...prev, [resType]: [...prev[resType], imported] };
      });
    }
    // items added to their section automatically
    setGalleryOpen(false);
    setSelectedIds(new Set());
  }, [galleryItems, selectedIds, galleryType]);

  const handleFileUpload = useCallback((files: FileList | null, resType: ResourceType) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      const mediaType: 'video' | 'image' | 'audio' =
        resType === 'video' ? 'video' :
        resType === 'image' || resType === 'canvas' ? 'image' :
        'audio';

      const imported: ImportedMedia = {
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        src: url,
        type: mediaType,
        duration: null,
        thumbnail: null,
        resourceType: resType,
      };

      if (mediaType === 'video') {
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          imported.duration = vid.duration;
          setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
        };
        vid.onerror = () => setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
        vid.src = url;
      } else if (mediaType === 'audio') {
        const aud = document.createElement('audio');
        aud.preload = 'metadata';
        aud.onloadedmetadata = () => {
          imported.duration = aud.duration;
          setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
        };
        aud.onerror = () => setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
        aud.src = url;
      } else {
        setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
      }
    });
    // items added to section automatically
  }, []);

  const handleAddToTimeline = useCallback((media: ImportedMedia) => {
    const resType = media.resourceType;
    if (resType === 'video') {
      const trackId = tracks.find(t => t.type === 'video')?.id;
      onAddClip('video', { type: 'video', name: media.name, src: media.src, duration: media.duration || undefined }, trackId);
    } else if (resType === 'image') {
      const trackId = tracks.find(t => t.type === 'image')?.id;
      onAddClip('image', { type: 'image', name: media.name, src: media.src }, trackId);
    } else if (resType === 'canvas') {
      const trackId = tracks.find(t => t.type === 'canvas')?.id || tracks.find(t => t.type === 'video')?.id;
      onAddClip('image', { type: 'canvas' as any, name: media.name, src: media.src, canvasJson: media.canvasJson }, trackId);
    } else if (resType === 'music' || resType === 'audio') {
      const trackId = tracks.find(t => t.type === 'audio')?.id;
      onAddClip('audio', { type: 'audio', name: media.name, src: media.src, duration: media.duration || undefined }, trackId);
    }
  }, [onAddClip, tracks]);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; resType: ResourceType; media: ImportedMedia; matchingClipIds: string[] } | null>(null);

  const handleRemove = useCallback((id: string, resType: ResourceType, media: ImportedMedia) => {
    const matchingClipIds = clips.filter(c => c.src && media.src && c.src === media.src).map(c => c.id);
    setDeleteConfirm({ id, resType, media, matchingClipIds });
  }, [clips]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    const { id, resType, matchingClipIds } = deleteConfirm;
    setItems(prev => ({ ...prev, [resType]: prev[resType].filter(v => v.id !== id) }));
    if (matchingClipIds.length > 0 && onDeleteClips) {
      onDeleteClips(matchingClipIds);
      toast.success(`${matchingClipIds.length} clipe(s) removido(s) da timeline`);
    }
    setDeleteConfirm(null);
  }, [deleteConfirm, onDeleteClips]);

  const startRename = useCallback((media: ImportedMedia) => {
    setEditingId(media.id);
    setEditingName(media.name);
  }, []);

  const commitRename = useCallback((id: string, resType: ResourceType) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      setItems(prev => ({
        ...prev,
        [resType]: prev[resType].map(item => item.id === id ? { ...item, name: trimmed } : item),
      }));
    }
    setEditingId(null);
    setEditingName('');
  }, [editingName]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditingName('');
  }, []);

  const handleRenameKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, id: string, resType: ResourceType) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename(id, resType);
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  }, [commitRename, cancelRename]);

  const handleDoubleClickCanvas = useCallback((media: ImportedMedia) => {
    if (media.canvasJson && onEditCanvas) {
      onEditCanvas(media.canvasJson, media.id);
    }
  }, [onEditCanvas]);

  const getInputRef = (tab: ResourceType) => {
    if (tab === 'video') return videoInputRef;
    if (tab === 'image') return imageInputRef;
    if (tab === 'music') return musicInputRef;
    if (tab === 'audio') return audioInputRef;
    return null;
  };

  const getAccept = (tab: ResourceType) => {
    if (tab === 'video') return 'video/*';
    if (tab === 'image' || tab === 'canvas') return 'image/*';
    return 'audio/*';
  };


  const renderSectionItems = (tab: typeof TABS[number], sectionItems: ImportedMedia[]) => (
    <div className="space-y-1">
      {sectionItems.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/60 text-center py-2">Nenhum item</p>
      ) : (
        sectionItems.map((media) => (
          <div
            key={media.id}
            draggable={editingId !== media.id}
            onDragStart={(e) => {
              if (editingId === media.id) { e.preventDefault(); return; }
              const dragType = media.resourceType === 'music' || media.resourceType === 'audio' ? 'audio' : media.resourceType === 'canvas' ? 'canvas' : media.type;
              e.dataTransfer.setData('application/timeline-media', JSON.stringify({
                type: dragType,
                name: media.name,
                src: media.src,
                duration: media.duration,
                canvasJson: media.canvasJson,
              }));
              e.dataTransfer.setData(`mediatype/${dragType}`, '');
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onDoubleClick={() => {
              if (media.resourceType === 'canvas' && media.canvasJson) {
                handleDoubleClickCanvas(media);
              }
            }}
            className={`flex items-center gap-2 p-1.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group cursor-grab active:cursor-grabbing ${
              media.resourceType === 'canvas' && media.canvasJson ? 'cursor-pointer' : ''
            }`}
          >
            {/* Thumbnail */}
            <div className="w-11 h-8 rounded bg-muted shrink-0 overflow-hidden relative">
              {media.type === 'video' ? (
                <>
                  <video src={media.src} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-3 w-3 text-white drop-shadow" />
                  </div>
                </>
              ) : media.type === 'image' ? (
                <img src={media.thumbnail || media.src} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              {editingId === media.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(media.id, media.resourceType)}
                  onKeyDown={(e) => handleRenameKeyDown(e, media.id, media.resourceType)}
                  className="text-[11px] font-medium w-full bg-background border border-primary/50 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary/30"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p
                  className="text-[11px] font-medium truncate cursor-text hover:text-primary/80 transition-colors"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(media);
                  }}
                  title="Duplo clique para renomear"
                >
                  {media.name}
                </p>
              )}
              {media.duration && (
                <p className="text-[10px] text-muted-foreground">{Math.round(media.duration)}s</p>
              )}
              {media.resourceType === 'canvas' && media.canvasJson && (
                <p className="text-[9px] text-purple-400">Duplo clique para editar</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId !== media.id && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); startRename(media); }} title="Renomear">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
              {media.resourceType === 'canvas' && media.canvasJson && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDoubleClickCanvas(media)} title="Editar canvas">
                  <Palette className="h-3 w-3 text-purple-400" />
                </Button>
              )}
              {media.resourceType === 'transition' && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); handleSaveTransitionToGallery(media); }}
                  disabled={savingToGalleryId === media.id}
                  title="Salvar na galeria"
                >
                  {savingToGalleryId === media.id ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : <Save className="h-3 w-3 text-primary" />}
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleAddToTimeline(media)} title="Adicionar à timeline">
                <Plus className="h-3 w-3 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemove(media.id, media.resourceType, media)} title="Remover">
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const [collapsedSections, setCollapsedSections] = useState<Set<ResourceType>>(new Set());
  const toggleSection = (key: ResourceType) => {
    setCollapsedSections(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Hidden file inputs */}
      <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files, 'video')} />
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files, 'image')} />
      <input ref={audioInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files, 'audio')} />
      <input ref={musicInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files, 'music')} />

      {/* All sections in a single scroll */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {TABS.map(tab => {
            const isEffectTab = tab.key === 'effect';
            const sectionItems = isEffectTab ? [] : items[tab.key as Exclude<ResourceType, 'effect'>];
            const isCollapsed = collapsedSections.has(tab.key);
            const effectCount = isEffectTab ? EFFECT_TRACK_PRESETS.length : 0;
            const itemCount = isEffectTab ? effectCount : sectionItems.length;
            return (
              <div key={tab.key} className="rounded-md overflow-hidden">
                {/* Section header — compact, always visible */}
                <button
                  onClick={() => toggleSection(tab.key)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-muted/40 transition-colors rounded-md"
                >
                  <ChevronDown className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                  <span className={`${tab.color} shrink-0`}>{tab.icon}</span>
                  <span className="text-[11px] font-medium flex-1 text-left">{tab.label}</span>
                  {itemCount > 0 && (
                    <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center">{itemCount}</span>
                  )}
                  {/* Inline action buttons in header */}
                  {!isEffectTab && tab.key !== 'transition' && (
                    <span className="flex items-center gap-0.5 ml-0.5" onClick={(e) => e.stopPropagation()}>
                      {(tab.key === 'video' || tab.key === 'image') && (
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleOpenGallery(tab.key as 'video' | 'image')} title="Galeria">
                          <FolderOpen className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                      {tab.key === 'canvas' ? (
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onOpenCanvas} title="Criar canvas">
                          <Plus className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => getInputRef(tab.key)?.current?.click()} title="Upload">
                          <Upload className="h-2.5 w-2.5 text-muted-foreground" />
                        </Button>
                      )}
                    </span>
                  )}
                </button>

                {/* Collapsible content */}
                {!isCollapsed && isEffectTab && (
                  <div className="pl-6 pr-2 pb-1.5 pt-0.5 space-y-1.5">
                    {/* Category filter */}
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(EFFECT_TRACK_PRESETS.map(p => p.category))).map(cat => (
                        <button
                          key={cat}
                          className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${effectCategoryFilter === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}`}
                          onClick={() => setEffectCategoryFilter(effectCategoryFilter === cat ? null : cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    {/* Draggable effect items — grid layout */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {EFFECT_TRACK_PRESETS
                        .filter(p => !effectCategoryFilter || p.category === effectCategoryFilter)
                        .map(preset => (
                          <div
                            key={preset.type}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/timeline-media', JSON.stringify({
                                type: 'effect',
                                name: preset.label,
                                src: '',
                                effectType: preset.type,
                              }));
                              e.dataTransfer.setData('mediatype/effect', '');
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onClick={() => setPreviewEffect(preset.type)}
                            className="flex flex-col items-center gap-1 p-1 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing group"
                          >
                            <MiniEffectPreview effectType={preset.type} size={72} />
                            <p className="text-[9px] font-medium truncate w-full text-center">{preset.label}</p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onAddEffectClip) {
                                  const effectTrack = tracks.find(t => t.type === 'effect');
                                  if (effectTrack) {
                                    const trackClips = clips.filter(c => c.trackId === effectTrack.id);
                                    const endTime = trackClips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
                                    onAddEffectClip(effectTrack.id, endTime, preset.type, preset.label);
                                  }
                                }
                              }}
                              title="Adicionar à timeline"
                            >
                              <Plus className="h-3 w-3 text-primary" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {!isCollapsed && !isEffectTab && (
                  <div className="pl-6 pr-2 pb-1.5 pt-0.5">
                    {tab.key === 'transition' && sectionItems.length === 0 && (
                      <p className="text-[10px] text-muted-foreground text-center py-1.5 italic">
                        Use ✨ na timeline para gerar transições AI
                      </p>
                    )}
                    {renderSectionItems(tab, sectionItems)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Gallery Dialog */}
      {galleryOpen && (
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
            <div className="flex items-center justify-between px-4 pt-10 pb-2 pr-12">
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                {galleryType === 'video' ? <Film className="h-4 w-4 text-primary" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                Selecionar {galleryType === 'video' ? 'Vídeos' : 'Imagens'}
              </DialogTitle>
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b gap-2">
              <Button
                size="sm" variant="outline" className="gap-1.5 text-xs"
                onClick={() => { getInputRef(galleryType)?.current?.click(); setGalleryOpen(false); }}
              >
                <Upload className="h-3.5 w-3.5" />Upload do PC
              </Button>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && <span className="text-xs text-muted-foreground">{selectedIds.size} selecionado(s)</span>}
                <Button size="sm" disabled={selectedIds.size === 0} onClick={handleConfirmSelection} className="gap-1.5 text-xs">
                  <Check className="h-3.5 w-3.5" />Adicionar ({selectedIds.size})
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex justify-center items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : galleryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  {galleryType === 'video' ? <Film className="h-10 w-10 mb-2" /> : <ImageIcon className="h-10 w-10 mb-2" />}
                  <p className="text-sm">Nenhum {galleryType === 'video' ? 'vídeo' : 'imagem'} na galeria</p>
                  <Button variant="outline" size="sm" className="gap-1.5 mt-4" onClick={() => { getInputRef(galleryType)?.current?.click(); setGalleryOpen(false); }}>
                    <Upload className="h-3.5 w-3.5" />Upload do computador
                  </Button>
                </div>
              ) : (
                <GalleryFilteredGrid
                  items={galleryItems}
                  galleryType={galleryType}
                  selectedIds={selectedIds}
                  onToggleSelect={(id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                />
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Effect full-size preview dialog */}
      {previewEffect && (
        <Dialog open onOpenChange={() => setPreviewEffect(null)}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background">
            <DialogTitle className="px-4 pt-4 text-sm font-semibold">
              {EFFECT_TRACK_PRESETS.find(p => p.type === previewEffect)?.label || 'Efeito'} — Preview
            </DialogTitle>
            <div className="flex flex-col items-center gap-3 p-4">
              <MiniEffectPreview effectType={previewEffect} size={280} autoPlay />
              <p className="text-xs text-muted-foreground text-center">
                {EFFECT_TRACK_PRESETS.find(p => p.type === previewEffect)?.description}
              </p>
              <Button
                size="sm"
                onClick={() => {
                  if (onAddEffectClip) {
                    const effectTrack = tracks.find(t => t.type === 'effect');
                    if (effectTrack) {
                      const trackClips = clips.filter(c => c.trackId === effectTrack.id);
                      const endTime = trackClips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
                      onAddEffectClip(effectTrack.id, endTime, previewEffect, EFFECT_TRACK_PRESETS.find(p => p.type === previewEffect)?.label || 'Efeito');
                    }
                  }
                  setPreviewEffect(null);
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar à timeline
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Remover recurso
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm && deleteConfirm.matchingClipIds.length > 0
                ? <>Tem certeza que deseja remover <strong>"{deleteConfirm.media.name}"</strong>? Isso também removerá <strong>{deleteConfirm.matchingClipIds.length} clipe(s)</strong> inserido(s) na timeline.</>
                : <>Tem certeza que deseja remover <strong>"{deleteConfirm?.media.name}"</strong> dos recursos?</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

ResourcePanel.displayName = 'ResourcePanel';

export default ResourcePanel;
