import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Images, Upload, Trash2, Search, X, Plus, Copy,
  User, Mountain, Palette, Brush, Box, Star, Move, FolderOpen,
  ZoomIn, Download, Play, Pause, Scissors, Folder, FolderPlus
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import VideoTrimmer from './VideoTrimmer';
import { convertVideoToWhatsappMp4, removeAudioFromVideo } from '@/lib/video/whatsappMp4';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Volume2, VolumeX, ChevronDown } from 'lucide-react';

export interface GalleryImage {
  id: string;
  categoria: string;
  nome: string | null;
  descricao: string | null;
  image_url: string;
  storage_path: string | null;
  tags: string[] | null;
  created_at: string;
  tipo?: string;
  pasta?: string | null;
  _source?: string;
}

export const GALLERY_CATEGORIES = [
  { id: 'salvas', label: 'Imagens Salvas', icon: FolderOpen, color: '#3b82f6', gradient: 'from-blue-500/20 to-sky-500/20', desc: 'Imagens salvas no sistema (galeria de mídia)' },
  { id: 'influencer', label: 'Influencers', icon: User, color: '#ec4899', gradient: 'from-pink-500/20 to-rose-500/20', desc: 'Fotos de modelos e influenciadores' },
  { id: 'ambiente', label: 'Ambientes', icon: Mountain, color: '#22c55e', gradient: 'from-green-500/20 to-emerald-500/20', desc: 'Cenários e referências de ambientação' },
  { id: 'estilo', label: 'Estilos', icon: Brush, color: '#8b5cf6', gradient: 'from-violet-500/20 to-purple-500/20', desc: 'Referências de estilo visual' },
  { id: 'paleta', label: 'Paletas', icon: Palette, color: '#f59e0b', gradient: 'from-amber-500/20 to-yellow-500/20', desc: 'Paletas e combinações de cores' },
  { id: 'textura', label: 'Texturas', icon: Box, color: '#06b6d4', gradient: 'from-cyan-500/20 to-sky-500/20', desc: 'Texturas e materiais de referência' },
  { id: 'logo', label: 'Logos', icon: Star, color: '#f43f5e', gradient: 'from-rose-500/20 to-red-500/20', desc: 'Logos e identidade visual' },
  { id: 'pose', label: 'Poses', icon: Move, color: '#6366f1', gradient: 'from-indigo-500/20 to-blue-500/20', desc: 'Referências de poses e composição' },
  { id: 'roupa', label: 'Roupas', icon: Box, color: '#d946ef', gradient: 'from-fuchsia-500/20 to-purple-500/20', desc: 'Roupas e vestuário de referência' },
] as const;

export type GalleryCategoryId = typeof GALLERY_CATEGORIES[number]['id'];

function isVideoUrl(url: string, tipo?: string): boolean {
  if (tipo === 'video') return true;
  const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogg'];
  const lower = url.toLowerCase().split('?')[0];
  return videoExts.some(ext => lower.endsWith(ext)) || lower.includes('marketing-videos') || lower.includes('/video');
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface StudioGalleryManagerProps {
  open: boolean;
  onClose: () => void;
}

const StudioGalleryManager: React.FC<StudioGalleryManagerProps> = ({ open, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<GalleryCategoryId>('influencer');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<GalleryImage | null>(null);
  const [previewItem, setPreviewItem] = useState<GalleryImage | null>(null);
  const [editItem, setEditItem] = useState<GalleryImage | null>(null);
  const [isSavingTrimmed, setIsSavingTrimmed] = useState(false);
  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';

  // Folder system state
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isCreatingFolderInline, setIsCreatingFolderInline] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null);
  const [manualFolders, setManualFolders] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`gallery_folders_${localStorage.getItem('estabelecimentoId') || ''}_${localStorage.getItem('__gallery_active_cat') || 'influencer'}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Reload manual folders when category changes
  useEffect(() => {
    if (activeCategory === 'salvas') {
      setManualFolders([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`gallery_folders_${estabelecimentoId}_${activeCategory}`);
      setManualFolders(stored ? JSON.parse(stored) : []);
    } catch { setManualFolders([]); }
    setActiveFolder(null);
  }, [activeCategory, estabelecimentoId]);

  const saveManualFolders = useCallback((newFolders: string[]) => {
    setManualFolders(newFolders);
    localStorage.setItem(`gallery_folders_${estabelecimentoId}_${activeCategory}`, JSON.stringify(newFolders));
  }, [estabelecimentoId, activeCategory]);

  const fetchImages = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    
    if (activeCategory === 'salvas') {
      const { data, error } = await supabase
        .from('media_gallery')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .in('tipo', ['imagem', 'image', 'video'])
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error) {
        setImages((data || []).map((item: any) => ({
          id: item.id,
          categoria: 'salvas',
          nome: item.nome,
          descricao: item.descricao,
          image_url: item.public_url,
          storage_path: item.storage_path,
          tags: null,
          created_at: item.created_at,
          tipo: item.tipo,
          pasta: null,
          _source: 'media_gallery',
        })));
      }
    } else {
      const { data, error } = await supabase
        .from('studio_gallery_images')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('categoria', activeCategory)
        .order('created_at', { ascending: false });
      if (!error) setImages((data as any[] || []).map(item => ({ ...item, _source: 'studio_gallery' })));
    }
    setLoading(false);
  }, [estabelecimentoId, activeCategory]);

  useEffect(() => {
    if (open) fetchImages();
  }, [open, fetchImages]);

  // Derive folders from images + manual folders
  const folders = activeCategory !== 'salvas' 
    ? Array.from(new Set([
        ...images.map(i => i.pasta).filter(Boolean) as string[],
        ...manualFolders
      ]))
    : [];

  // Filter images by active folder
  const folderFilteredImages = activeCategory !== 'salvas'
    ? (activeFolder === null
        ? images.filter(i => !i.pasta)
        : images.filter(i => i.pasta === activeFolder))
    : images;

  const filtered = folderFilteredImages.filter(img => 
    !search || img.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = useCallback(async (files: FileList) => {
    if (!estabelecimentoId || files.length === 0) return;
    if (activeCategory === 'salvas') {
      toast.info('Use a galeria de mídia do sistema para adicionar imagens salvas.');
      return;
    }
    setUploading(true);
    
    const uploadPromises = Array.from(files).map(async (file) => {
      const ext = file.name.split('.').pop();
      const path = `${estabelecimentoId}/${activeCategory}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('studio-gallery')
        .upload(path, file, { upsert: false });
      
      if (uploadError) {
        toast.error(`Erro ao enviar ${file.name}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage.from('studio-gallery').getPublicUrl(path);

      const { error: dbError } = await supabase
        .from('studio_gallery_images')
        .insert({
          estabelecimento_id: estabelecimentoId,
          categoria: activeCategory,
          nome: file.name.replace(/\.[^.]+$/, ''),
          image_url: publicUrl,
          storage_path: path,
          pasta: activeFolder,
        } as any);

      if (dbError) {
        toast.error(`Erro ao salvar ${file.name}`);
        return null;
      }
      return true;
    });

    await Promise.all(uploadPromises);
    toast.success(`${files.length} arquivo(s) enviado(s)!`);
    fetchImages();
    setUploading(false);
  }, [estabelecimentoId, activeCategory, activeFolder, fetchImages]);

  const handleDelete = useCallback(async (img: GalleryImage) => {
    try {
      if (activeCategory === 'salvas') {
        if (img.storage_path) {
          await supabase.storage.from('media_gallery').remove([img.storage_path]);
        }
        const { error } = await supabase.from('media_gallery').delete().eq('id', img.id);
        if (error) { toast.error('Erro ao remover imagem'); return; }
      } else {
        if (img.storage_path) {
          await supabase.storage.from('studio-gallery').remove([img.storage_path]);
        }
        const { error } = await supabase.from('studio_gallery_images').delete().eq('id', img.id);
        if (error) { toast.error('Erro ao remover imagem'); return; }
      }
      toast.success('Item removido');
      if (previewItem?.id === img.id) setPreviewItem(null);
      fetchImages();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      toast.error('Erro ao remover');
    } finally {
      setDeleteConfirm(null);
    }
  }, [activeCategory, fetchImages, previewItem]);

  const handleDuplicate = useCallback(async (img: GalleryImage) => {
    if (!estabelecimentoId) return;
    try {
      if (activeCategory === 'salvas') {
        const newPath = img.storage_path 
          ? img.storage_path.replace(/(\.[^.]+)$/, `_copy_${Date.now()}$1`)
          : null;
        if (img.storage_path && newPath) {
          await supabase.storage.from('media_gallery').copy(img.storage_path, newPath);
        }
        const { data: { publicUrl } } = newPath
          ? supabase.storage.from('media_gallery').getPublicUrl(newPath)
          : { data: { publicUrl: img.image_url } };
        await supabase.from('media_gallery').insert({
          estabelecimento_id: estabelecimentoId,
          nome: `${img.nome || 'Item'} (cópia)`,
          descricao: img.descricao,
          public_url: publicUrl,
          storage_path: newPath,
          tipo: isVideoUrl(img.image_url, img.tipo) ? 'video' : 'imagem',
        });
      } else {
        const newPath = img.storage_path 
          ? img.storage_path.replace(/(\.[^.]+)$/, `_copy_${Date.now()}$1`)
          : null;
        if (img.storage_path && newPath) {
          await supabase.storage.from('studio-gallery').copy(img.storage_path, newPath);
        }
        const { data: { publicUrl } } = newPath
          ? supabase.storage.from('studio-gallery').getPublicUrl(newPath)
          : { data: { publicUrl: img.image_url } };
        await supabase.from('studio_gallery_images').insert({
          estabelecimento_id: estabelecimentoId,
          categoria: activeCategory,
          nome: `${img.nome || 'Item'} (cópia)`,
          descricao: img.descricao,
          image_url: publicUrl,
          storage_path: newPath,
          tags: img.tags,
        });
      }
      toast.success('Item duplicado!');
      fetchImages();
    } catch (err) {
      console.error('Erro ao duplicar:', err);
      toast.error('Erro ao duplicar');
    }
  }, [estabelecimentoId, activeCategory, fetchImages]);

  const handleDownload = useCallback(async (img: GalleryImage, withAudio: boolean = true) => {
    try {
      const response = await fetch(img.image_url);
      const originalBlob = await response.blob();
      const isVideo = img.image_url?.includes('/marketing-videos/') || img.nome?.endsWith('.mp4') || img.nome?.endsWith('.webm');
      const isAudio = img.image_url?.includes('/marketing-audio/');

      let downloadBlob: Blob;
      let ext: string;
      if (isVideo) {
        downloadBlob = withAudio
          ? await convertVideoToWhatsappMp4(originalBlob)
          : await removeAudioFromVideo(originalBlob);
        ext = withAudio ? '.mp4' : '_sem-audio.mp4';
      } else if (isAudio) {
        downloadBlob = new Blob([originalBlob], { type: 'audio/mpeg' });
        ext = '.mp3';
      } else {
        downloadBlob = originalBlob;
        ext = '.png';
      }

      const baseName = (img.nome || 'download').replace(/\.\w+$/, '');
      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Não foi possível converter para MP4 compatível.');
    }
  }, []);

  // Folder handlers
  const handleMoveToFolder = useCallback(async (itemId: string, folder: string | null) => {
    const { error } = await supabase
      .from('studio_gallery_images')
      .update({ pasta: folder } as any)
      .eq('id', itemId);
    if (error) {
      toast.error('Erro ao mover item');
      return;
    }
    toast.success(folder ? `Movido para "${folder}"` : 'Movido para raiz');
    fetchImages();
  }, [fetchImages]);

  const handleFolderDrop = useCallback(async (folder: string | null) => {
    if (!draggingItemId) return;
    setDragOverFolder(null);
    await handleMoveToFolder(draggingItemId, folder);
    setDraggingItemId(null);
  }, [draggingItemId, handleMoveToFolder]);

  const handleCreateFolder = useCallback(() => {
    const folderName = createFolderName.trim();
    if (!folderName) return;
    if (folders.includes(folderName)) {
      toast.info('Pasta já existe');
    } else {
      saveManualFolders([...manualFolders, folderName]);
      setActiveFolder(folderName);
      toast.success(`Pasta "${folderName}" criada!`);
    }
    setIsCreatingFolderInline(false);
    setCreateFolderName('');
  }, [createFolderName, folders, manualFolders, saveManualFolders]);

  const handleDeleteFolder = useCallback(async (folder: string) => {
    // Move all items in folder to root
    const itemsInFolder = images.filter(i => i.pasta === folder);
    for (const item of itemsInFolder) {
      await supabase.from('studio_gallery_images').update({ pasta: null } as any).eq('id', item.id);
    }
    saveManualFolders(manualFolders.filter(f => f !== folder));
    toast.success(`Pasta "${folder}" excluída. Itens movidos para raiz.`);
    setDeleteFolderConfirm(null);
    if (activeFolder === folder) setActiveFolder(null);
    fetchImages();
  }, [images, activeFolder, fetchImages, manualFolders, saveManualFolders]);

  const activeCat = GALLERY_CATEGORIES.find(c => c.id === activeCategory)!;

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background border border-border rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Images className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Galeria de Referências</h2>
              <p className="text-xs text-muted-foreground">Organize imagens e vídeos por categoria para usar nos workflows</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar - Categories + Folders */}
          <div className="w-56 border-r border-border p-3 space-y-1 overflow-y-auto shrink-0">
            {GALLERY_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setActiveFolder(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                    isActive 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color: isActive ? cat.color : undefined }} />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}

            {/* Folder section - only for non-salvas categories */}
            {activeCategory !== 'salvas' && (
              <>
                <div className="border-t border-border my-2 pt-2">
                  <div className="flex items-center justify-between px-2 mb-1">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider">Pastas</span>
                    <button
                      onClick={() => { setIsCreatingFolderInline(true); setCreateFolderName(''); }}
                      className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="Nova Pasta"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Inline folder creation */}
                  {isCreatingFolderInline && (
                    <div className="flex flex-col gap-1.5 p-2 bg-card/60 border border-border rounded-xl mb-1">
                      <Input
                        value={createFolderName}
                        onChange={(e) => setCreateFolderName(e.target.value)}
                        placeholder="Nome da pasta..."
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateFolder();
                          if (e.key === 'Escape') { setIsCreatingFolderInline(false); setCreateFolderName(''); }
                        }}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1" onClick={() => { setIsCreatingFolderInline(false); setCreateFolderName(''); }}>
                          Cancelar
                        </Button>
                        <Button size="sm" className="h-6 text-[10px] flex-1 gap-1" onClick={handleCreateFolder} disabled={!createFolderName.trim()}>
                          <FolderPlus className="h-3 w-3" />
                          Criar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Root folder */}
                  <button
                    onClick={() => setActiveFolder(null)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverFolder('__root__'); }}
                    onDragLeave={() => setDragOverFolder(null)}
                    onDrop={(e) => { e.preventDefault(); handleFolderDrop(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all text-xs ${
                      activeFolder === null
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    } ${dragOverFolder === '__root__' ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span className="truncate">Raiz</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {images.filter(i => !i.pasta).length}
                    </span>
                  </button>

                  {/* Custom folders */}
                  {folders.map((folder) => (
                    <div key={folder} className="group relative">
                      <button
                        onClick={() => setActiveFolder(folder)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder); }}
                        onDragLeave={() => setDragOverFolder(null)}
                        onDrop={(e) => { e.preventDefault(); handleFolderDrop(folder); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all text-xs ${
                          activeFolder === folder
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        } ${dragOverFolder === folder ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
                      >
                        <Folder className="h-3.5 w-3.5" />
                        <span className="truncate flex-1">{folder}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {images.filter(i => i.pasta === folder).length}
                        </span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteFolderConfirm(folder); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                        title="Excluir pasta"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${activeCat.gradient} text-xs font-medium`}>
                {React.createElement(activeCat.icon, { className: 'h-3 w-3' })}
                {activeCat.label}
              </div>
              {activeFolder && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                  <Folder className="h-3 w-3" />
                  {activeFolder}
                </div>
              )}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex-1" />
              {activeCategory !== 'salvas' && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleUpload(e.target.files)}
                    disabled={uploading}
                  />
                  <Button size="sm" className="gap-1.5 text-xs h-8" disabled={uploading} asChild>
                    <span>
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? 'Enviando...' : 'Adicionar'}
                    </span>
                  </Button>
                </label>
              )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Carregando...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-2xl bg-muted/30 mb-4">
                    {React.createElement(activeCat.icon, { className: 'h-8 w-8 text-muted-foreground/40' })}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {activeFolder ? `Nenhum item na pasta "${activeFolder}"` : `Nenhum item em "${activeCat.label}"`}
                  </p>
                  <p className="text-xs text-muted-foreground/60">{activeFolder ? 'Arraste itens para cá ou adicione novos' : activeCat.desc}</p>
                  {activeCategory !== 'salvas' && (
                    <label className="cursor-pointer mt-4">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && handleUpload(e.target.files)}
                      />
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild>
                        <span>
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar arquivos
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filtered.map((img) => {
                    const isVideo = isVideoUrl(img.image_url, img.tipo);
                    const isDraggable = activeCategory !== 'salvas';
                    return (
                      <div
                        key={img.id}
                        className={`group relative rounded-xl overflow-hidden border border-border/50 bg-muted/20 aspect-square cursor-pointer ${
                          draggingItemId === img.id ? 'opacity-50 ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setPreviewItem(img)}
                        draggable={isDraggable}
                        onDragStart={(e) => {
                          if (!isDraggable) return;
                          setDraggingItemId(img.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', img.id);
                        }}
                        onDragEnd={() => setDraggingItemId(null)}
                      >
                        {isVideo ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/80">
                            <Play className="h-8 w-8 text-white/70" />
                          </div>
                        ) : (
                          <img src={img.image_url} alt={img.nome || ''} className="w-full h-full object-cover" loading="lazy" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          {/* Top actions */}
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setPreviewItem(img); }}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                              title="Visualizar"
                            >
                              <ZoomIn className="h-3 w-3" />
                            </button>
                            {isVideo && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditItem(img); }}
                                className="p-1.5 rounded-lg bg-primary/40 hover:bg-primary/60 text-white transition-colors"
                                title="Editar / Cortar"
                              >
                                <Scissors className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDuplicate(img); }}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                              title="Duplicar"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            {isVideo ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                                    title="Download"
                                  >
                                    <Download className="h-3 w-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={() => handleDownload(img, true)}>
                                    <Volume2 className="h-3.5 w-3.5 mr-2" /> Com áudio
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownload(img, false)}>
                                    <VolumeX className="h-3.5 w-3.5 mr-2" /> Sem áudio
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownload(img); }}
                                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                                title="Download"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          {/* Bottom info + delete */}
                          <div className="flex items-end justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-white truncate">{img.nome}</p>
                              {isVideo && <p className="text-[8px] text-white/60">Vídeo</p>}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(img); }}
                              className="p-1.5 rounded-lg bg-destructive/30 hover:bg-destructive/50 text-white transition-colors shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Video Editor Dialog */}
      {editItem && isVideoUrl(editItem.image_url, editItem.tipo) && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
          <DialogContent className="max-w-[900px] max-h-[90vh] p-0 border-none bg-card overflow-visible [&>button]:hidden z-[200]">
            <div className="relative overflow-y-auto max-h-[90vh] rounded-lg">
              <button
                onClick={() => setEditItem(null)}
                className="absolute top-3 right-3 z-[200] rounded-full p-2 bg-background/80 backdrop-blur text-foreground shadow-lg hover:bg-background transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
              <VideoTrimmer
                videoUrl={editItem.image_url}
                isSaving={isSavingTrimmed}
                onSaveTrimmed={async (blob, startTime, endTime, withAudio) => {
                  setIsSavingTrimmed(true);
                  try {
                    const finalBlob = withAudio
                      ? await convertVideoToWhatsappMp4(blob)
                      : await removeAudioFromVideo(blob);
                    const fileName = `trimmed_${withAudio ? 'audio' : 'sem-audio'}_${Date.now()}.mp4`;
                    const path = `${estabelecimentoId}/${fileName}`;
                    const { error: upErr } = await supabase.storage
                      .from('marketing-videos')
                      .upload(path, finalBlob, { contentType: 'video/mp4' });
                    if (upErr) throw upErr;
                    const { data: { publicUrl } } = supabase.storage
                      .from('marketing-videos')
                      .getPublicUrl(path);
                    await supabase.from('media_gallery').insert({
                      estabelecimento_id: estabelecimentoId,
                      tipo: 'video',
                      public_url: publicUrl,
                      storage_path: path,
                      nome: `${editItem.nome || 'Vídeo'} (${withAudio ? 'cortado' : 'cortado sem áudio'})`,
                      descricao: `Cortado de ${formatTimestamp(startTime)} a ${formatTimestamp(endTime)}`,
                      tamanho_bytes: finalBlob.size,
                      mime_type: 'video/mp4',
                      origem: 'studio-trimmed',
                    });
                    toast.success(`✅ Vídeo cortado salvo ${withAudio ? 'com áudio' : 'sem áudio'}!`);
                    fetchImages();
                  } catch (err: any) {
                    toast.error('Erro ao salvar vídeo cortado: ' + (err.message || String(err)));
                  } finally {
                    setIsSavingTrimmed(false);
                  }
                }}
                onSaveOriginal={(withAudio) => {
                  toast.success(withAudio ? 'Vídeo original mantido' : 'Escolha "Salvar Cortado > Sem áudio" para gerar uma versão sem áudio.');
                  setEditItem(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview actions bar */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-[210]">
                {isVideoUrl(previewItem.image_url, previewItem.tipo) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5 text-xs h-8 rounded-lg bg-primary/70 hover:bg-primary/90 text-white border-0 shadow-lg"
                    onClick={() => { setEditItem(previewItem); setPreviewItem(null); }}
                  >
                    <Scissors className="h-3.5 w-3.5" /> Editar / Cortar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 text-xs h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white border-0 shadow-lg"
                  onClick={() => handleDuplicate(previewItem)}
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicar
                </Button>
                {isVideoUrl(previewItem.image_url, previewItem.tipo) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 text-xs h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white border-0 shadow-lg"
                      >
                        <Download className="h-3.5 w-3.5" /> Download <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(previewItem, true)}>
                        <Volume2 className="h-3.5 w-3.5 mr-2" /> Com áudio
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(previewItem, false)}>
                        <VolumeX className="h-3.5 w-3.5 mr-2" /> Sem áudio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5 text-xs h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white border-0 shadow-lg"
                    onClick={() => handleDownload(previewItem)}
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 text-xs h-8 rounded-lg bg-destructive/50 hover:bg-destructive/70 text-white border-0 shadow-lg"
                  onClick={() => { setDeleteConfirm(previewItem); }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg text-white bg-black/50 hover:bg-black/70 shadow-lg"
                  onClick={() => setPreviewItem(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isVideoUrl(previewItem.image_url, previewItem.tipo) ? (
                <video
                  src={previewItem.image_url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-xl shadow-2xl mt-14 studio-video-no-fullscreen"
                  controlsList="nofullscreen nodownload"
                  disablePictureInPicture
                  onDoubleClick={(e) => e.preventDefault()}
                />
              ) : (
                <img
                  src={previewItem.image_url}
                  alt={previewItem.nome || ''}
                  className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain"
                />
              )}

              {previewItem.nome && (
                <p className="mt-3 text-sm text-white/80 font-medium">{previewItem.nome}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete item confirm */}
      {deleteConfirm && (
        <AlertDialog open={true} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
          <AlertDialogContent className="z-[300]" onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover item</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover "{deleteConfirm.nome}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(deleteConfirm);
                }}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete folder confirm */}
      {deleteFolderConfirm && (
        <AlertDialog open={true} onOpenChange={(open) => { if (!open) setDeleteFolderConfirm(null); }}>
          <AlertDialogContent className="z-[300]" onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir pasta "{deleteFolderConfirm}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Os itens dentro desta pasta serão movidos para a raiz. Nenhum arquivo será excluído.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteFolderConfirm(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteFolder(deleteFolderConfirm);
                }}
              >
                Excluir Pasta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
};

export default StudioGalleryManager;
