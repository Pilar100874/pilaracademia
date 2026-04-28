import React, { useState, useEffect, useCallback } from 'react';
import { 
  Image, 
  Video, 
  Music, 
  FileText, 
  Calendar, 
  Trash2, 
  ExternalLink,
  Loader2,
  Filter,
  Search,
  Play,
  Download,
  Pencil,
  X,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReturnType, RETURN_TYPE_LABELS, CHANNEL_CONFIG, PublishChannel } from './types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import VideoTrimmer from './ai-studio/VideoTrimmer';
import { convertVideoToWhatsappMp4, removeAudioFromVideo } from '@/lib/video/whatsappMp4';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Volume2, VolumeX, ChevronDown } from 'lucide-react';

interface MarketingContentItem {
  id: string;
  resource_id: string | null;
  resource_name: string;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  input_data: any;
  channels: string[] | null;
  status: string | null;
  created_at: string;
  _source?: 'marketing_content' | 'media_gallery';
  _folder?: string | null;
  disponivel_chat?: boolean;
}

const ContentTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className = "h-5 w-5" }) => {
  const icons: Record<string, React.ReactNode> = {
    image: <Image className={className} />,
    video: <Video className={className} />,
    audio: <Music className={className} />,
    text: <FileText className={className} />,
  };
  return <>{icons[type] || <FileText className={className} />}</>;
};

const contentTypeColors: Record<string, string> = {
  image: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  audio: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  video: 'bg-red-500/10 text-red-600 border-red-500/20',
  text: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

interface MarketingGaleriaProps {
  onEditImage?: (imageUrl: string, resourceName?: string) => void;
  onEditVideo?: (videoUrl: string, resourceName?: string) => void;
}

const MarketingGaleria: React.FC<MarketingGaleriaProps> = ({ onEditImage, onEditVideo }) => {
  const [content, setContent] = useState<MarketingContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<MarketingContentItem | null>(null);
  const [isSavingTrimmed, setIsSavingTrimmed] = useState(false);
  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';

  // Folder system
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null);
  const [manualFolders, setManualFolders] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`galeria_content_folders_${localStorage.getItem('estabelecimentoId') || ''}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Folder assignment stored in localStorage (since content comes from two tables)
  const [folderAssignments, setFolderAssignments] = useState<Record<string, string | null>>(() => {
    try {
      const stored = localStorage.getItem(`galeria_content_assignments_${localStorage.getItem('estabelecimentoId') || ''}`);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const saveManualFolders = useCallback((newFolders: string[]) => {
    setManualFolders(newFolders);
    localStorage.setItem(`galeria_content_folders_${estabelecimentoId}`, JSON.stringify(newFolders));
  }, [estabelecimentoId]);

  const saveFolderAssignments = useCallback((assignments: Record<string, string | null>) => {
    setFolderAssignments(assignments);
    localStorage.setItem(`galeria_content_assignments_${estabelecimentoId}`, JSON.stringify(assignments));
  }, [estabelecimentoId]);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const estabId = localStorage.getItem('estabelecimentoId');

      const { data: mcData, error: mcError } = await supabase
        .from('marketing_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (mcError) throw mcError;

      const mcItems: MarketingContentItem[] = (mcData || []).map((item: any) => ({
        ...item,
        _source: 'marketing_content' as const,
      }));

      let mgItems: MarketingContentItem[] = [];
      if (estabId) {
        const { data: mgData, error: mgError } = await supabase
          .from('media_gallery')
          .select('*')
          .eq('estabelecimento_id', estabId)
          .order('created_at', { ascending: false });

        if (!mgError && mgData) {
          mgItems = mgData.map((item: any) => ({
            id: item.id,
            resource_id: null,
            resource_name: item.nome || 'Mídia',
            content_type: item.tipo || 'image',
            content_url: item.public_url,
            text_content: item.descricao || null,
            input_data: null,
            channels: null,
            status: null,
            created_at: item.created_at || new Date().toISOString(),
            _source: 'media_gallery' as const,
            disponivel_chat: item.disponivel_chat || false,
          }));
        }
      }

      const merged = [...mcItems, ...mgItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setContent(merged);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Erro ao carregar conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const item = content.find(c => c.id === deleteId);
    if (!item) return;

    try {
      const table = item._source === 'media_gallery' ? 'media_gallery' : 'marketing_content';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setContent(prev => prev.filter(c => c.id !== deleteId));
      // Remove folder assignment
      const newAssignments = { ...folderAssignments };
      delete newAssignments[deleteId];
      saveFolderAssignments(newAssignments);
      toast.success('Conteúdo removido');
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Erro ao remover conteúdo');
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = (item: MarketingContentItem) => {
    if (!item.content_url) return;

    if (item.content_type === 'image' && onEditImage) {
      onEditImage(item.content_url, item.resource_name);
      return;
    }

    if (item.content_type === 'video') {
      setEditingVideo(item);
      return;
    }

    window.open(item.content_url, '_blank');
  };

  const handleToggleDisponibilidadeChat = useCallback(async (item: MarketingContentItem) => {
    if (item._source !== 'media_gallery') return;
    const newValue = !item.disponivel_chat;
    try {
      const { error } = await supabase
        .from('media_gallery')
        .update({ disponivel_chat: newValue } as any)
        .eq('id', item.id);
      if (error) throw error;
      setContent(prev => prev.map(c => c.id === item.id ? { ...c, disponivel_chat: newValue } : c));
      toast.success(newValue ? 'Disponível no chat ✅' : 'Removido do chat');
    } catch (err) {
      console.error('Erro ao atualizar disponibilidade:', err);
      toast.error('Erro ao atualizar');
    }
  }, []);

  const handleDownload = useCallback(async (item: MarketingContentItem, withAudio: boolean = true) => {
    if (!item.content_url) return;
    try {
      const response = await fetch(item.content_url);
      const blob = await response.blob();
      const isVideo = item.content_type === 'video';
      const ext = isVideo ? 'mp4' : (item.content_type === 'audio' ? 'mp3' : 'png');
      const suffix = isVideo && !withAudio ? '_sem-audio' : '';
      const fileName = `${item.resource_name || 'download'}${suffix}.${ext}`;

      let downloadBlob: Blob;
      if (isVideo) {
        downloadBlob = withAudio
          ? await convertVideoToWhatsappMp4(blob)
          : await removeAudioFromVideo(blob);
      } else if (item.content_type === 'audio') {
        downloadBlob = new Blob([blob], { type: 'audio/mpeg' });
      } else {
        downloadBlob = blob;
      }

      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Não foi possível converter para MP4 compatível.');
    }
  }, []);

  // Folder logic
  const folders = Array.from(new Set([
    ...Object.values(folderAssignments).filter(Boolean) as string[],
    ...manualFolders,
  ]));

  const getItemFolder = (itemId: string) => folderAssignments[itemId] || null;

  const handleMoveToFolder = useCallback((itemId: string, folder: string | null) => {
    const newAssignments = { ...folderAssignments };
    if (folder) {
      newAssignments[itemId] = folder;
    } else {
      delete newAssignments[itemId];
    }
    saveFolderAssignments(newAssignments);
    toast.success(folder ? `Movido para "${folder}"` : 'Movido para raiz');
  }, [folderAssignments, saveFolderAssignments]);

  const handleFolderDrop = useCallback((folder: string | null) => {
    if (!draggingItemId) return;
    setDragOverFolder(null);
    handleMoveToFolder(draggingItemId, folder);
    setDraggingItemId(null);
  }, [draggingItemId, handleMoveToFolder]);

  const handleCreateFolder = useCallback(() => {
    const name = newFolderName.trim();
    if (!name) return;
    if (folders.includes(name)) {
      toast.info('Pasta já existe');
    } else {
      saveManualFolders([...manualFolders, name]);
      setActiveFolder(name);
      toast.success(`Pasta "${name}" criada!`);
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
  }, [newFolderName, folders, manualFolders, saveManualFolders]);

  const handleDeleteFolder = useCallback((folder: string) => {
    // Move all items to root
    const newAssignments = { ...folderAssignments };
    Object.keys(newAssignments).forEach(k => {
      if (newAssignments[k] === folder) delete newAssignments[k];
    });
    saveFolderAssignments(newAssignments);
    saveManualFolders(manualFolders.filter(f => f !== folder));
    toast.success(`Pasta "${folder}" excluída. Itens movidos para raiz.`);
    setDeleteFolderConfirm(null);
    if (activeFolder === folder) setActiveFolder(null);
  }, [folderAssignments, saveFolderAssignments, manualFolders, saveManualFolders, activeFolder]);

  // Filter content
  const filteredContent = content.filter(item => {
    const matchesSearch = item.resource_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || item.content_type === filterType;
    const itemFolder = getItemFolder(item.id);
    const matchesFolder = activeFolder === null ? !itemFolder : itemFolder === activeFolder;
    return matchesSearch && matchesType && matchesFolder;
  });

  const groupedByDate = filteredContent.reduce((acc, item) => {
    const date = format(new Date(item.created_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, MarketingContentItem[]>);

  const renderContentPreview = (item: MarketingContentItem) => {
    switch (item.content_type) {
      case 'image':
        return item.content_url ? (
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <img 
              src={item.content_url} 
              alt={item.resource_name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <Image className="h-12 w-12 text-muted-foreground" />
          </div>
        );
      
      case 'video':
        return item.content_url ? (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video 
              src={item.content_url} 
              className="w-full h-full object-cover studio-video-no-fullscreen"
              controls
              controlsList="nofullscreen nodownload"
              disablePictureInPicture
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <Video className="h-12 w-12 text-muted-foreground" />
          </div>
        );
      
      case 'audio':
        return (
          <div className="p-4 bg-muted rounded-lg">
            {item.content_url ? (
              <audio src={item.content_url} controls className="w-full" />
            ) : (
              <div className="flex items-center justify-center py-4">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        );
      
      case 'text':
        return (
          <div className="p-4 bg-muted rounded-lg max-h-32 overflow-hidden">
            <p className="text-sm whitespace-pre-wrap line-clamp-4">
              {item.text_content || 'Sem conteúdo de texto'}
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Galeria de Conteúdo</h3>
          <p className="text-sm text-muted-foreground">
            Visualize todo o conteúdo criado com seus recursos
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por recurso..."
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="image">Imagens</SelectItem>
              <SelectItem value="video">Vídeos</SelectItem>
              <SelectItem value="audio">Áudios</SelectItem>
              <SelectItem value="text">Textos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Folder bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveFolder(null)}
          onDragOver={(e) => { e.preventDefault(); setDragOverFolder('__root__'); }}
          onDragLeave={() => setDragOverFolder(null)}
          onDrop={(e) => { e.preventDefault(); handleFolderDrop(null); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            activeFolder === null
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
          } ${dragOverFolder === '__root__' ? 'ring-2 ring-primary/50' : ''}`}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Raiz
          <span className="text-[10px] opacity-70">
            {content.filter(i => !getItemFolder(i.id)).length}
          </span>
        </button>

        {folders.map((folder) => (
          <div key={folder} className="group relative">
            <button
              onClick={() => setActiveFolder(folder)}
              onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder); }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => { e.preventDefault(); handleFolderDrop(folder); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                activeFolder === folder
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              } ${dragOverFolder === folder ? 'ring-2 ring-primary/50' : ''}`}
            >
              <Folder className="h-3.5 w-3.5" />
              {folder}
              <span className="text-[10px] opacity-70">
                {content.filter(i => getItemFolder(i.id) === folder).length}
              </span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteFolderConfirm(folder); }}
              className="absolute -top-1 -right-1 p-0.5 rounded-full bg-background border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all shadow-sm"
              title="Excluir pasta"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {isCreatingFolder ? (
          <div className="inline-flex items-center gap-1.5">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta..."
              className="h-7 w-36 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }
              }}
            />
            <Button size="sm" className="h-7 text-xs gap-1 px-2" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              <FolderPlus className="h-3 w-3" />
              Criar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}>
              Cancelar
            </Button>
          </div>
        ) : (
          <button
            onClick={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-muted-foreground border border-dashed border-border hover:bg-muted/50 hover:text-foreground transition-all"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Nova Pasta
          </button>
        )}
      </div>

      {/* Content List */}
      {filteredContent.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">
              {activeFolder ? `Nenhum conteúdo na pasta "${activeFolder}"` : 'Nenhum conteúdo encontrado'}
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              {search || filterType !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : activeFolder
                  ? 'Arraste itens para esta pasta'
                  : 'Use um recurso para criar seu primeiro conteúdo'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-24rem)]">
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      className={`overflow-hidden group ${draggingItemId === item.id ? 'opacity-50 ring-2 ring-primary' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggingItemId(item.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragEnd={() => setDraggingItemId(null)}
                    >
                      {renderContentPreview(item)}
                      
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{item.resource_name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), 'HH:mm')}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`shrink-0 ${contentTypeColors[item.content_type]}`}
                          >
                            <ContentTypeIcon type={item.content_type} className="h-3 w-3 mr-1" />
                            {RETURN_TYPE_LABELS[item.content_type as ReturnType] || item.content_type}
                          </Badge>
                        </div>

                        {/* Toggle para disponibilidade no chat */}
                        {item._source === 'media_gallery' && (item.content_type === 'image' || item.content_type === 'video') && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="flex items-center gap-2 mb-2 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageSquare className={`h-3.5 w-3.5 ${item.disponivel_chat ? 'text-primary' : 'text-muted-foreground'}`} />
                                  <span className="text-xs text-muted-foreground">Chat</span>
                                  <Switch
                                    checked={!!item.disponivel_chat}
                                    onCheckedChange={() => handleToggleDisponibilidadeChat(item)}
                                    className="scale-75"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {item.disponivel_chat ? 'Disponível nos anexos rápidos do chat' : 'Habilitar para anexos rápidos do chat'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {item.channels && item.channels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.channels.map((channel) => (
                              <Badge key={channel} variant="secondary" className="text-xs">
                                {CHANNEL_CONFIG[channel as PublishChannel]?.label || channel}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-1 flex-wrap">
                          {item.content_url && (item.content_type === 'image' || item.content_type === 'video') && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                          )}
                          {item.content_url && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => window.open(item.content_url!, '_blank')}
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Abrir
                              </Button>
                              {item.content_type === 'video' ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-1">
                                      <Download className="h-3.5 w-3.5" />
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDownload(item, true)}>
                                      <Volume2 className="h-3.5 w-3.5 mr-2" /> Com áudio
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownload(item, false)}>
                                      <VolumeX className="h-3.5 w-3.5 mr-2" /> Sem áudio
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownload(item)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Video Editor */}
      {editingVideo && editingVideo.content_url && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/10" onClick={() => setEditingVideo(null)} />
          <div className="relative max-w-[900px] w-full max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl z-[201]">
            <div className="relative overflow-y-auto max-h-[90vh] rounded-2xl">
              <button
                onClick={() => setEditingVideo(null)}
                className="absolute top-3 right-3 z-[210] rounded-full p-2 bg-background/80 backdrop-blur text-foreground shadow-lg hover:bg-background transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
              <VideoTrimmer
                videoUrl={editingVideo.content_url}
                isSaving={isSavingTrimmed}
                onSaveTrimmed={async (blob, startTime, endTime, withAudio) => {
                  setIsSavingTrimmed(true);
                  const estabId = localStorage.getItem('estabelecimentoId');
                  if (!estabId) { toast.error('Estabelecimento não encontrado'); setIsSavingTrimmed(false); return; }
                  try {
                    const finalBlob = withAudio
                      ? await convertVideoToWhatsappMp4(blob)
                      : await removeAudioFromVideo(blob);
                    const fileName = `trimmed_${withAudio ? 'audio' : 'sem-audio'}_${Date.now()}.mp4`;
                    const path = `${estabId}/${fileName}`;
                    const { error: upErr } = await supabase.storage
                      .from('marketing-videos')
                      .upload(path, finalBlob, { contentType: 'video/mp4' });
                    if (upErr) throw upErr;
                    const { data: { publicUrl } } = supabase.storage
                      .from('marketing-videos')
                      .getPublicUrl(path);
                    await supabase.from('media_gallery').insert({
                      estabelecimento_id: estabId,
                      tipo: 'video',
                      public_url: publicUrl,
                      storage_path: path,
                      nome: `${editingVideo.resource_name || 'Vídeo'} (${withAudio ? 'cortado' : 'cortado sem áudio'})`,
                      tamanho_bytes: finalBlob.size,
                      mime_type: 'video/mp4',
                      origem: 'galeria-trimmed',
                    });
                    toast.success(`✅ Vídeo cortado salvo ${withAudio ? 'com áudio' : 'sem áudio'}!`);
                    loadContent();
                  } catch (err: any) {
                    toast.error('Erro ao salvar vídeo cortado: ' + (err.message || String(err)));
                  } finally {
                    setIsSavingTrimmed(false);
                  }
                }}
                onSaveOriginal={(withAudio) => {
                  toast.success(withAudio ? 'Vídeo original mantido' : 'Escolha "Salvar Cortado > Sem áudio" para gerar uma versão sem áudio.');
                  setEditingVideo(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Content Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conteúdo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O conteúdo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Confirmation */}
      {deleteFolderConfirm && (
        <AlertDialog open={true} onOpenChange={(open) => { if (!open) setDeleteFolderConfirm(null); }}>
          <AlertDialogContent>
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
                onClick={(e) => { e.preventDefault(); handleDeleteFolder(deleteFolderConfirm); }}
              >
                Excluir Pasta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default MarketingGaleria;
