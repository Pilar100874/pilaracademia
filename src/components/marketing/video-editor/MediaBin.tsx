import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Film, Image as ImageIcon, FolderOpen, Loader2, Check, Trash2, Play, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TimelineTrack } from './types';
import GalleryFilteredGrid from '@/components/ui/GalleryFilteredGrid';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
  canvasJson?: string;
}

interface Props {
  onAddClip: (type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem, trackId?: string) => void;
  tracks: TimelineTrack[];
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

interface ImportedMedia {
  id: string;
  name: string;
  src: string;
  type: 'video' | 'image';
  duration?: number | null;
  thumbnail?: string | null;
}

const VideoThumbnail: React.FC<{ src: string; thumbnail?: string | null }> = ({ src, thumbnail }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(thumbnail || null);

  useEffect(() => {
    if (thumbnail) { setThumbUrl(thumbnail); return; }
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';
    video.playsInline = true;

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 96;
        canvas.height = video.videoHeight || 72;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbUrl(canvas.toDataURL('image/jpeg', 0.7));
        }
      } catch { /* cross-origin fallback */ }
      video.removeEventListener('seeked', handleSeeked);
      video.src = '';
      video.load();
    };

    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('loadeddata', () => { video.currentTime = 0.1; });
    video.addEventListener('error', () => { /* silently fail, show placeholder */ });
    video.src = src;

    return () => { video.src = ''; video.load(); };
  }, [src, thumbnail]);

  if (thumbUrl) return <img src={thumbUrl} className="w-full h-full object-cover" alt="" />;
  return <video ref={videoRef} src={src} className="w-full h-full object-cover" muted preload="auto" onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }} />;
};

const MediaBin: React.FC<Props> = ({ onAddClip, tracks }) => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryType, setGalleryType] = useState<'video' | 'image'>('video');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Imported media lists
  const [importedVideos, setImportedVideos] = useState<ImportedMedia[]>([]);
  const [importedImages, setImportedImages] = useState<ImportedMedia[]>([]);
  const [activeTab, setActiveTab] = useState<'video' | 'image'>('video');

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchGallery = useCallback(async (type: 'video' | 'image') => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    try {
      const tipoFilter = type === 'video' ? 'video' : 'imagem';
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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirmSelection = useCallback(() => {
    const selected = galleryItems.filter(i => selectedIds.has(i.id));
    
    for (const item of selected) {
      const imported: ImportedMedia = {
        id: item.id,
        name: item.nome,
        src: item.public_url,
        type: galleryType,
        duration: item.duracao_segundos,
        thumbnail: item.thumbnail_url,
      };

      if (galleryType === 'video') {
        setImportedVideos(prev => {
          if (prev.find(v => v.id === item.id)) return prev;
          return [...prev, imported];
        });
      } else {
        setImportedImages(prev => {
          if (prev.find(v => v.id === item.id)) return prev;
          return [...prev, imported];
        });
      }
    }

    setActiveTab(galleryType);
    setGalleryOpen(false);
    setSelectedIds(new Set());
  }, [galleryItems, selectedIds, galleryType]);

  const handleAddToTimeline = useCallback((media: ImportedMedia) => {
    if (media.type === 'video') {
      const videoTrackId = tracks.find(t => t.type === 'video')?.id;
      onAddClip('video', {
        type: 'video',
        name: media.name,
        src: media.src,
        duration: media.duration || undefined,
      }, videoTrackId);
    } else {
      const imageTrackId = tracks.find(t => t.type === 'image')?.id;
      onAddClip('image', {
        type: 'image',
        name: media.name,
        src: media.src,
      }, imageTrackId);
    }
  }, [onAddClip, tracks]);

  const handleRemoveImported = useCallback((id: string, type: 'video' | 'image') => {
    if (type === 'video') {
      setImportedVideos(prev => prev.filter(v => v.id !== id));
    } else {
      setImportedImages(prev => prev.filter(v => v.id !== id));
    }
  }, []);

  const handleFileUpload = useCallback((files: FileList | null, type: 'video' | 'image') => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      const imported: ImportedMedia = {
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        src: url,
        type,
        duration: null,
        thumbnail: null,
      };

      if (type === 'video') {
        // Get video duration
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          imported.duration = vid.duration;
          setImportedVideos(prev => [...prev, imported]);
        };
        vid.onerror = () => setImportedVideos(prev => [...prev, imported]);
        vid.src = url;
      } else {
        setImportedImages(prev => [...prev, imported]);
      }
    });
    setActiveTab(type);
  }, []);

  const currentList = activeTab === 'video' ? importedVideos : importedImages;
  const totalImported = importedVideos.length + importedImages.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Hidden file inputs */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files, 'video')}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files, 'image')}
      />

      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Biblioteca de Mídia
        </h3>
      </div>

      {/* Insert buttons */}
      <div className="p-3 space-y-2 shrink-0">
        {/* Video */}
        <div className="flex gap-1.5">
          <Button
            onClick={() => handleOpenGallery('video')}
            variant="outline"
            className="flex-1 justify-start gap-2 text-xs h-9"
          >
            <Film className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Vídeo</span>
            {importedVideos.length > 0 && (
              <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{importedVideos.length}</span>
            )}
          </Button>
          <Button
            onClick={() => videoInputRef.current?.click()}
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Upload vídeo do computador"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>
        {/* Image */}
        <div className="flex gap-1.5">
          <Button
            onClick={() => handleOpenGallery('image')}
            variant="outline"
            className="flex-1 justify-start gap-2 text-xs h-9"
          >
            <ImageIcon className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Imagem</span>
            {importedImages.length > 0 && (
              <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{importedImages.length}</span>
            )}
          </Button>
          <Button
            onClick={() => imageInputRef.current?.click()}
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Upload imagem do computador"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs + imported list */}
      {totalImported > 0 && (
        <div className="flex-1 flex flex-col overflow-hidden border-t">
          {/* Tabs */}
          <div className="flex border-b shrink-0">
            <button
              onClick={() => setActiveTab('video')}
              className={`flex-1 text-xs py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'video'
                  ? 'border-b-2 border-primary text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Film className="h-3 w-3" />
              Vídeos ({importedVideos.length})
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`flex-1 text-xs py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'image'
                  ? 'border-b-2 border-primary text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ImageIcon className="h-3 w-3" />
              Imagens ({importedImages.length})
            </button>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {currentList.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-6">
                  Nenhum {activeTab === 'video' ? 'vídeo' : 'imagem'} importado
                </p>
              ) : (
                currentList.map((media) => (
                  <div
                    key={media.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/timeline-media', JSON.stringify({
                        type: media.type,
                        name: media.name,
                        src: media.src,
                        duration: media.duration,
                      }));
                      // Set type hint so tracks can filter during dragover
                      e.dataTransfer.setData(`mediatype/${media.type}`, '');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="flex items-center gap-2 p-1.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group cursor-grab active:cursor-grabbing"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-9 rounded bg-muted shrink-0 overflow-hidden relative">
                      {media.type === 'video' ? (
                        <>
                          <VideoThumbnail src={media.src} thumbnail={media.thumbnail} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-3 w-3 text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <img src={media.thumbnail || media.src} className="w-full h-full object-cover" alt="" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate">{media.name}</p>
                      {media.duration && (
                        <p className="text-[10px] text-muted-foreground">{Math.round(media.duration)}s</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleAddToTimeline(media)}
                        title="Adicionar à timeline"
                      >
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleRemoveImported(media.id, media.type)}
                        title="Remover"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Gallery Popup */}
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
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  if (galleryType === 'video') videoInputRef.current?.click();
                  else imageInputRef.current?.click();
                  setGalleryOpen(false);
                }}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload do PC
              </Button>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <span className="text-xs text-muted-foreground">{selectedIds.size} selecionado(s)</span>
                )}
                <Button
                  size="sm"
                  disabled={selectedIds.size === 0}
                  onClick={handleConfirmSelection}
                  className="gap-1.5 text-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  Adicionar ({selectedIds.size})
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : galleryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  {galleryType === 'video' ? <Film className="h-10 w-10 mb-2" /> : <ImageIcon className="h-10 w-10 mb-2" />}
                  <p className="text-sm">Nenhum {galleryType === 'video' ? 'vídeo' : 'imagem'} na galeria</p>
                  <p className="text-xs mt-1 mb-4">Salve mídias pelo AI Studio ou faça upload</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      if (galleryType === 'video') videoInputRef.current?.click();
                      else imageInputRef.current?.click();
                      setGalleryOpen(false);
                    }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload do computador
                  </Button>
                </div>
              ) : (
                <GalleryFilteredGrid
                  items={galleryItems}
                  galleryType={galleryType}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MediaBin;
