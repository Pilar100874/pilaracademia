import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, X } from 'lucide-react';
import { GALLERY_CATEGORIES, GalleryCategoryId } from './StudioGalleryManager';

interface GallerySelectInlineProps {
  categoria: GalleryCategoryId;
  config: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
}

const GallerySelectInline: React.FC<GallerySelectInlineProps> = ({ categoria, config, onUpdate }) => {
  const [images, setImages] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  const catMeta = GALLERY_CATEGORIES.find(c => c.id === categoria);
  const Icon = catMeta?.icon;

  const fetchImages = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    
    if (categoria === 'salvas') {
      const { data } = await supabase
        .from('media_gallery')
        .select('*')
        .eq('estabelecimento_id', estabId)
        .in('tipo', ['imagem', 'image', 'gif'])
        .order('created_at', { ascending: false })
        .limit(200);
      setImages((data || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        image_url: item.public_url,
      })));
    } else {
      const { data } = await supabase
        .from('studio_gallery_images')
        .select('*')
        .eq('estabelecimento_id', estabId)
        .eq('categoria', categoria)
        .order('created_at', { ascending: false })
        .limit(200);
      setImages(data || []);
    }
    setLoading(false);
  }, [categoria]);

  useEffect(() => {
    if (showList && images.length === 0) fetchImages();
  }, [showList, fetchImages, images.length]);

  const filtered = images.filter(img =>
    !search || img.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUrl = config.selectedImageUrl;
  const selectedName = config.selectedImageName;

  if (selectedUrl) {
    return (
      <div className="px-3 pb-3 pt-1">
        <div className="rounded-xl overflow-hidden border border-border/50 relative group">
          <img src={selectedUrl} alt={selectedName || ''} className="w-full h-40 object-cover bg-muted/30" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate('selectedImageUrl', '');
                onUpdate('selectedImageName', '');
                onUpdate('galleryImageId', '');
                setShowList(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/30 transition-colors"
            >
              Trocar imagem
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{catMeta?.label}: {selectedName}</p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-1">
      {!showList ? (
        <button
          onClick={(e) => { e.stopPropagation(); setShowList(true); }}
          className="w-full flex flex-col items-center gap-1.5 py-4 border border-dashed rounded-xl cursor-pointer hover:bg-muted/20 transition-colors"
          style={{ borderColor: `${catMeta?.color}30` }}
        >
          {Icon && <Icon className="h-5 w-5" style={{ color: `${catMeta?.color}60` }} />}
          <p className="text-[10px] text-muted-foreground">Selecionar da galeria "{catMeta?.label}"</p>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={`Buscar em ${catMeta?.label}...`}
              className="w-full h-7 pl-7 pr-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto rounded-lg">
            {loading && <p className="text-[10px] text-muted-foreground text-center py-3">Carregando...</p>}
            {!loading && filtered.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-3">Nenhuma imagem. Adicione na Galeria de Referências.</p>
            )}
            <div className="grid grid-cols-3 gap-1">
              {filtered.map((img) => (
                <button
                  key={img.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate('selectedImageUrl', img.image_url);
                    onUpdate('selectedImageName', img.nome || '');
                    onUpdate('galleryImageId', img.id);
                    setShowList(false);
                  }}
                  className="aspect-square rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 transition-colors"
                >
                  <img src={img.image_url} alt={img.nome || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowList(false); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
};

export default GallerySelectInline;
