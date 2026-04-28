import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, ImageIcon, Film, Loader2, X } from 'lucide-react';
import { useGalleryFolders } from '@/hooks/useGalleryFolders';
import { GalleryFolderTabs } from '@/components/ui/GalleryFolderTabs';

interface MediaGallerySelectInlineProps {
  config: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
}

const MediaGallerySelectInline: React.FC<MediaGallerySelectInlineProps> = ({ config, onUpdate }) => {
  const [mediaType, setMediaType] = useState<'image' | 'video'>(config.mediaType || 'image');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const { getFilteredItems, activeFolder, setActiveFolder } = useGalleryFolders();

  const fetchItems = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    const tipoFilter = mediaType === 'video' ? ['video'] : ['imagem', 'image', 'gif'];
    const { data } = await supabase
      .from('media_gallery')
      .select('id, nome, tipo, public_url, thumbnail_url, created_at')
      .eq('estabelecimento_id', estabId)
      .in('tipo', tipoFilter)
      .order('created_at', { ascending: false })
      .limit(100);
    setItems(data || []);
    setLoading(false);
  }, [mediaType]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const { folders, filteredItems: folderFiltered } = getFilteredItems(items);
  const filtered = folderFiltered.filter(i =>
    !search || i.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item: any) => {
    onUpdate('selectedUrl', item.public_url);
    onUpdate('selectedName', item.nome || 'Sem nome');
    onUpdate('selectedId', item.id);
    onUpdate('mediaType', mediaType);
  };

  const handleClear = () => {
    onUpdate('selectedUrl', '');
    onUpdate('selectedName', '');
    onUpdate('selectedId', '');
  };

  return (
    <div className="px-3 pb-3 pt-1 space-y-2">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); setMediaType('image'); onUpdate('mediaType', 'image'); }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`nodrag flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            mediaType === 'image' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ImageIcon className="h-3 w-3" />
          Imagens
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setMediaType('video'); onUpdate('mediaType', 'video'); }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`nodrag flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            mediaType === 'video' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Film className="h-3 w-3" />
          Vídeos
        </button>
      </div>

      {/* Selected preview */}
      {config.selectedUrl && (
        <div className="relative rounded-lg overflow-hidden border border-border/50">
          {config.mediaType === 'video' ? (
            <video src={config.selectedUrl} className="w-full h-24 object-cover" muted />
          ) : (
            <img src={config.selectedUrl} alt={config.selectedName} className="w-full h-24 object-cover" />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 flex items-center justify-between">
            <span className="text-[9px] text-white truncate">{config.selectedName}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="p-0.5 rounded hover:bg-white/20"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Folder tabs */}
      {folders.length > 0 && (
        <GalleryFolderTabs folders={folders} activeFolder={activeFolder} onSelectFolder={setActiveFolder} />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { e.stopPropagation(); setSearch(e.target.value); }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={`Buscar ${mediaType === 'video' ? 'vídeos' : 'imagens'}...`}
          className="nodrag nowheel w-full h-7 pl-7 pr-2 text-[10px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
        />
      </div>

      {/* Grid */}
      <div className="max-h-[140px] overflow-y-auto overscroll-contain rounded-lg nodrag nowheel">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[10px] text-muted-foreground">
              {search ? 'Nenhum resultado' : `Nenhum ${mediaType === 'video' ? 'vídeo' : 'imagem'} na galeria`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.map((item) => {
              const isSelected = config.selectedId === item.id;
              const thumb = item.thumbnail_url || item.public_url;
              return (
                <button
                  key={item.id}
                  onClick={(e) => { e.stopPropagation(); handleSelect(item); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`nodrag relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-90 ${
                    isSelected ? 'border-sky-500 ring-1 ring-sky-500/30' : 'border-transparent'
                  }`}
                >
                  {mediaType === 'video' ? (
                    <video src={thumb} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={thumb} alt={item.nome} className="w-full h-full object-cover" />
                  )}
                  {mediaType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Film className="h-3 w-3 text-white/80" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaGallerySelectInline;
