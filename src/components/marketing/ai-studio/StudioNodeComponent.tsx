import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGalleryFolders } from '@/hooks/useGalleryFolders';
import { GalleryFolderTabs } from '@/components/ui/GalleryFolderTabs';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import { StudioNodeData, getNodeMeta } from './types';
import { useNodeResult } from './useNodeResults';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import GallerySelectInline from './GallerySelectInline';
import MediaGallerySelectInline from './MediaGallerySelectInline';
import { GalleryCategoryId } from './StudioGalleryManager';
import VideoTrimmer from './VideoTrimmer';
import { 
  Loader2, Play, Maximize2, Image as ImageIcon, Film, Music, Type, 
  MoreHorizontal, GripVertical, Mic, Wand2, FileText, Clapperboard,
  Search, LinkIcon, Headphones, ScanEye, PauseCircle, Upload, Download,
  DollarSign, Volume2, Edit3, Package, User, Mountain, Brush, Palette,
  Box, Star, Move, TypeIcon, Save, FolderOpen, Repeat, Shuffle, Layers, Monitor, X, Scissors
} from 'lucide-react';
import { convertVideoToWhatsappMp4, removeAudioFromVideo, triggerDownload } from '@/lib/video/whatsappMp4';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { VolumeX } from 'lucide-react';

const nodeIconMap: Record<string, React.ElementType> = {
  textInput: FileText,
  systemPrompt: Clapperboard,
  imageInput: Upload,
  videoInput: Film,
  multiImageRef: Layers,
  multiVideoRef: Layers,
  productImageSelect: Package,
  multiProductSelect: Layers,
  galleryInfluencer: User,
  galleryAmbiente: Mountain,
  galleryEstilo: Brush,
  galleryPaleta: Palette,
  galleryTextura: Box,
  galleryLogo: Star,
  galleryPose: Move,
  galleryRoupa: Box,
  gallerySalvas: FolderOpen,
  mediaGallery: FolderOpen,
  textStyle: TypeIcon,
  textContent: FileText,
  platformFormat: Monitor,
  llmProcess: Type,
  imageGen: ImageIcon,
  imageEdit: Wand2,
  productComposite: Wand2,
  videoGen: Film,
  audioGen: Mic,
  musicGen: Music,
  lipSync: Headphones,
  videoMerge: LinkIcon,
  imageAnalyze: ScanEye,
  loopOutput: Repeat,
  randomPick: Shuffle,
  output: Play,
};

const nodeGradientMap: Record<string, string> = {
  textInput: 'from-indigo-500/20 to-violet-500/20',
  multiImageRef: 'from-orange-400/20 to-amber-500/20',
  systemPrompt: 'from-purple-500/20 to-fuchsia-500/20',
  imageInput: 'from-orange-500/20 to-amber-500/20',
  videoInput: 'from-amber-500/20 to-yellow-500/20',
  multiVideoRef: 'from-amber-400/20 to-yellow-500/20',
  productImageSelect: 'from-emerald-500/20 to-teal-500/20',
  multiProductSelect: 'from-emerald-600/20 to-green-500/20',
  galleryInfluencer: 'from-pink-500/20 to-rose-500/20',
  galleryAmbiente: 'from-green-500/20 to-emerald-500/20',
  galleryEstilo: 'from-violet-500/20 to-purple-500/20',
  galleryPaleta: 'from-amber-500/20 to-yellow-500/20',
  galleryTextura: 'from-cyan-500/20 to-sky-500/20',
  galleryLogo: 'from-rose-500/20 to-red-500/20',
  galleryPose: 'from-indigo-500/20 to-blue-500/20',
  galleryRoupa: 'from-fuchsia-500/20 to-purple-500/20',
  gallerySalvas: 'from-blue-500/20 to-sky-500/20',
  mediaGallery: 'from-sky-500/20 to-blue-500/20',
  textStyle: 'from-rose-500/20 to-pink-500/20',
  textContent: 'from-violet-500/20 to-purple-500/20',
  llmProcess: 'from-sky-500/20 to-cyan-500/20',
  imageGen: 'from-rose-500/20 to-pink-500/20',
  imageEdit: 'from-pink-500/20 to-fuchsia-500/20',
  productComposite: 'from-violet-500/20 to-purple-500/20',
  videoGen: 'from-amber-500/20 to-orange-500/20',
  audioGen: 'from-emerald-500/20 to-green-500/20',
  musicGen: 'from-teal-500/20 to-emerald-500/20',
  lipSync: 'from-cyan-500/20 to-sky-500/20',
  videoMerge: 'from-yellow-500/20 to-amber-500/20',
  imageAnalyze: 'from-teal-500/20 to-cyan-500/20',
  loopOutput: 'from-violet-600/20 to-purple-500/20',
  randomPick: 'from-rose-600/20 to-pink-500/20',
  output: 'from-muted-foreground/20 to-zinc-500/20',
};

const nodeIconColorMap: Record<string, string> = {
  textInput: 'text-indigo-400',
  systemPrompt: 'text-purple-400',
  imageInput: 'text-orange-400',
  videoInput: 'text-amber-400',
  multiImageRef: 'text-orange-400',
  multiVideoRef: 'text-amber-400',
  productImageSelect: 'text-emerald-400',
  multiProductSelect: 'text-emerald-500',
  galleryInfluencer: 'text-pink-400',
  galleryAmbiente: 'text-green-400',
  galleryEstilo: 'text-violet-400',
  galleryPaleta: 'text-amber-400',
  galleryTextura: 'text-cyan-400',
  galleryLogo: 'text-rose-400',
  galleryPose: 'text-indigo-400',
  galleryRoupa: 'text-fuchsia-400',
  gallerySalvas: 'text-blue-400',
  mediaGallery: 'text-sky-400',
  textStyle: 'text-rose-400',
  textContent: 'text-violet-400',
  llmProcess: 'text-sky-400',
  imageGen: 'text-rose-400',
  imageEdit: 'text-pink-400',
  productComposite: 'text-violet-400',
  videoGen: 'text-amber-400',
  audioGen: 'text-emerald-400',
  musicGen: 'text-teal-400',
  lipSync: 'text-cyan-400',
  videoMerge: 'text-yellow-400',
  imageAnalyze: 'text-teal-400',
  loopOutput: 'text-violet-400',
  randomPick: 'text-rose-400',
  output: 'text-muted-foreground',
};

const nodeAccentMap: Record<string, string> = {
  textInput: '#6366f1',
  systemPrompt: '#a855f7',
  imageInput: '#f97316',
  videoInput: '#f59e0b',
  multiImageRef: '#e67e22',
  multiVideoRef: '#d97706',
  productImageSelect: '#10b981',
  multiProductSelect: '#059669',
  galleryInfluencer: '#ec4899',
  galleryAmbiente: '#22c55e',
  galleryEstilo: '#8b5cf6',
  galleryPaleta: '#f59e0b',
  galleryTextura: '#06b6d4',
  galleryLogo: '#f43f5e',
  galleryPose: '#6366f1',
  galleryRoupa: '#d946ef',
  gallerySalvas: '#3b82f6',
  mediaGallery: '#0ea5e9',
  textStyle: '#e11d48',
  textContent: '#7c3aed',
  llmProcess: '#0ea5e9',
  imageGen: '#f43f5e',
  imageEdit: '#ec4899',
  productComposite: '#8b5cf6',
  videoGen: '#f59e0b',
  audioGen: '#22c55e',
  musicGen: '#14b8a6',
  lipSync: '#06b6d4',
  videoMerge: '#eab308',
  imageAnalyze: '#14b8a6',
  loopOutput: '#7c3aed',
  randomPick: '#e11d48',
  output: '#64748b',
};
// Blocks that REQUIRE paid external APIs (no free alternative)
const PAID_ONLY_BLOCKS: Set<string> = new Set(['musicGen', 'lipSync', 'videoMerge']);

// Helper: dispatch config update via custom event (avoids prop drilling through ReactFlow)
const dispatchConfigUpdate = (nodeId: string, config: Record<string, any>) => {
  window.dispatchEvent(new CustomEvent('studio-node-config-update', { detail: { nodeId, config } }));
};

// Inline product image selector component
const ProductImageSelectInline: React.FC<{ config: Record<string, any>; onUpdate: (key: string, value: any) => void }> = ({ config, onUpdate }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  const fetchProducts = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, codigo, foto_url, foto_url_2, foto_url_3')
      .eq('estabelecimento_id', estabId)
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(200);
    setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (showList && products.length === 0) fetchProducts();
  }, [showList, fetchProducts, products.length]);

  const filtered = products.filter(p => 
    p.nome?.toLowerCase().includes(search.toLowerCase()) || 
    p.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProduct = config.productName;
  const selectedImage = config.selectedImageUrl;

  if (selectedImage) {
    return (
      <div className="px-3 pb-3 pt-1">
        <div className="rounded-xl overflow-hidden border border-border/50 relative group">
          <img src={selectedImage} alt={selectedProduct || 'Produto'} className="w-full h-40 object-contain bg-muted/30" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate('selectedImageUrl', ''); onUpdate('productId', ''); onUpdate('productName', ''); setShowList(true); }}
              className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/30 transition-colors"
            >
              Trocar produto
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 truncate">📦 {selectedProduct}</p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-1">
      {!showList ? (
        <button
          onClick={(e) => { e.stopPropagation(); setShowList(true); }}
          className="w-full flex flex-col items-center gap-1.5 py-4 border border-dashed border-emerald-500/30 rounded-xl cursor-pointer hover:bg-emerald-500/5 transition-colors"
        >
          <Package className="h-5 w-5 text-emerald-500/40" />
          <p className="text-[10px] text-muted-foreground">Clique para selecionar um produto</p>
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
              placeholder="Buscar produto..."
              className="w-full h-7 pl-7 pr-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1 rounded-lg">
            {loading && <p className="text-[10px] text-muted-foreground text-center py-3">Carregando...</p>}
            {!loading && filtered.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">Nenhum produto com imagem</p>}
            {filtered.filter(p => p.foto_url).map((p) => (
              <button
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate('productId', p.id);
                  onUpdate('selectedImageUrl', p.foto_url);
                  onUpdate('productName', p.nome);
                  setShowList(false);
                }}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors text-left"
              >
                <img src={p.foto_url} alt={p.nome} className="w-8 h-8 rounded-md object-cover border border-border/50 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium truncate text-foreground">{p.nome}</p>
                  {p.codigo && <p className="text-[9px] text-muted-foreground truncate">{p.codigo}</p>}
                </div>
              </button>
            ))}
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

// Inline multi-product selector component
const MultiProductSelectInline: React.FC<{ config: Record<string, any>; onUpdate: (key: string, value: any) => void }> = ({ config, onUpdate }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  const selectedProducts: { id: string; nome: string; foto_url: string }[] = config.products || [];

  const fetchProducts = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, codigo, foto_url')
      .eq('estabelecimento_id', estabId)
      .eq('ativo', true)
      .not('foto_url', 'is', null)
      .order('nome', { ascending: true })
      .limit(200);
    setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (showList && products.length === 0) fetchProducts();
  }, [showList, fetchProducts, products.length]);

  const filtered = products.filter(p =>
    !selectedProducts.some(sp => sp.id === p.id) &&
    (p.nome?.toLowerCase().includes(search.toLowerCase()) || p.codigo?.toLowerCase().includes(search.toLowerCase()))
  );

  const addProduct = (p: any) => {
    onUpdate('products', [...selectedProducts, { id: p.id, nome: p.nome, foto_url: p.foto_url }]);
  };

  const removeProduct = (id: string) => {
    onUpdate('products', selectedProducts.filter(sp => sp.id !== id));
  };

  return (
    <div className="px-3 pb-3 pt-1">
      {selectedProducts.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {selectedProducts.map((p) => (
            <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border/50 aspect-square">
              <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); removeProduct(p.id); }}
                className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity text-[8px]"
              >✕</button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                <p className="text-[8px] text-white truncate">{p.nome}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mb-1.5">{selectedProducts.length} produto(s) selecionado(s)</p>
      {!showList ? (
        <button
          onClick={(e) => { e.stopPropagation(); setShowList(true); }}
          className="w-full flex flex-col items-center gap-1.5 py-3 border border-dashed border-emerald-500/30 rounded-xl cursor-pointer hover:bg-emerald-500/5 transition-colors"
        >
          <Layers className="h-5 w-5 text-emerald-500/40" />
          <p className="text-[10px] text-muted-foreground">Adicionar produtos</p>
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
              placeholder="Buscar produto..."
              className="w-full h-7 pl-7 pr-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <div className="max-h-[180px] overflow-y-auto space-y-1 rounded-lg">
            {loading && <p className="text-[10px] text-muted-foreground text-center py-3">Carregando...</p>}
            {!loading && filtered.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">Nenhum produto disponível</p>}
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); addProduct(p); }}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors text-left"
              >
                <img src={p.foto_url} alt={p.nome} className="w-8 h-8 rounded-md object-cover border border-border/50 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium truncate text-foreground">{p.nome}</p>
                  {p.codigo && <p className="text-[9px] text-muted-foreground truncate">{p.codigo}</p>}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowList(false); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1"
          >
            Fechar lista
          </button>
        </div>
      )}
    </div>
  );
};

// Inline image input with gallery picker (used by imageInput and multiImageRef)
const ImageInputWithGallery: React.FC<{
  images: string[];
  onUpdateImages: (imgs: string[]) => void;
  nodeType: string;
}> = ({ images, onUpdateImages, nodeType }) => {
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [gallerySearch, setGallerySearch] = useState('');
  const [loadingGallery, setLoadingGallery] = useState(false);
  const { getFilteredItems, activeFolder, setActiveFolder } = useGalleryFolders();

  const fetchGalleryImages = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoadingGallery(true);
    const { data } = await supabase
      .from('media_gallery')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .in('tipo', ['imagem', 'image', 'gif'])
      .order('created_at', { ascending: false })
      .limit(200);
    setGalleryImages(data || []);
    setLoadingGallery(false);
  }, []);

  useEffect(() => {
    if (showGalleryPicker && galleryImages.length === 0) fetchGalleryImages();
  }, [showGalleryPicker, fetchGalleryImages, galleryImages.length]);

  const { folders, filteredItems: folderFilteredGallery } = getFilteredItems(galleryImages);
  const filteredGallery = folderFilteredGallery.filter(img =>
    !gallerySearch || img.nome?.toLowerCase().includes(gallerySearch.toLowerCase())
  );

  return (
    <div className="px-3 pb-3 pt-1">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {images.slice(0, 6).map((img: string, idx: number) => (
            <div key={idx} className="rounded-lg overflow-hidden border border-border/50 aspect-square relative group/img">
              <img src={img} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateImages(images.filter((_: any, i: number) => i !== idx));
                }}
                className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity text-[8px]"
              >✕</button>
            </div>
          ))}
          {images.length > 6 && (
            <div className="rounded-lg border border-border/50 aspect-square flex items-center justify-center bg-muted/50">
              <span className="text-xs text-muted-foreground font-medium">+{images.length - 6}</span>
            </div>
          )}
        </div>
      )}

      {/* Gallery Picker */}
      {showGalleryPicker && (
        <div className="space-y-2 mb-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-muted-foreground">📁 Galeria de Mídia</p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowGalleryPicker(false); }}
              className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
            >✕ Fechar</button>
          </div>
          {folders.length > 0 && (
            <GalleryFolderTabs folders={folders} activeFolder={activeFolder} onSelectFolder={setActiveFolder} />
          )}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              autoFocus
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Buscar na galeria..."
              className="nodrag nowheel w-full h-7 pl-7 pr-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="max-h-[180px] overflow-y-auto rounded-lg">
            {loadingGallery && <p className="text-[10px] text-muted-foreground text-center py-3">Carregando...</p>}
            {!loadingGallery && filteredGallery.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-3">Nenhuma imagem na galeria</p>
            )}
            <div className="grid grid-cols-3 gap-1">
              {filteredGallery.map((img) => {
                const isSelected = images.includes(img.public_url);
                return (
                  <button
                    key={img.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) {
                        onUpdateImages(images.filter((u: string) => u !== img.public_url));
                      } else {
                        onUpdateImages([...images, img.public_url]);
                      }
                    }}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors relative ${
                      isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border/30 hover:border-primary/50'
                    }`}
                  >
                    <img src={img.public_url} alt={img.nome || ''} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">✓</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <label className="flex-1 flex flex-col items-center gap-1 py-2.5 border border-dashed border-border/50 rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
          <Upload className="h-4 w-4 text-muted-foreground/40" />
          <p className="text-[9px] text-muted-foreground">Upload</p>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach((file) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = reader.result as string;
                  onUpdateImages([...images, base64]);
                };
                reader.readAsDataURL(file);
              });
              e.target.value = '';
            }}
          />
        </label>
        <button
          onClick={(e) => { e.stopPropagation(); setShowGalleryPicker(!showGalleryPicker); }}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 border border-dashed border-orange-500/30 rounded-xl cursor-pointer hover:bg-orange-500/5 transition-colors"
        >
          <FolderOpen className="h-4 w-4 text-orange-500/40" />
          <p className="text-[9px] text-muted-foreground">Galeria</p>
        </button>
      </div>

      {images.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1.5">{images.length} imagem(ns) de referência</p>
      )}
    </div>
  );
};

// Inline video input with gallery picker (used by videoInput and multiVideoRef)
const VideoInputWithGallery: React.FC<{
  videos: string[];
  onUpdateVideos: (vids: string[]) => void;
  nodeType: string;
}> = ({ videos, onUpdateVideos, nodeType }) => {
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryVideos, setGalleryVideos] = useState<any[]>([]);
  const [gallerySearch, setGallerySearch] = useState('');
  const [loadingGallery, setLoadingGallery] = useState(false);
  const { getFilteredItems, activeFolder, setActiveFolder } = useGalleryFolders();

  const fetchGalleryVideos = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoadingGallery(true);
    const { data } = await supabase
      .from('media_gallery')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .in('tipo', ['video', 'vídeo'])
      .order('created_at', { ascending: false })
      .limit(200);
    setGalleryVideos(data || []);
    setLoadingGallery(false);
  }, []);

  useEffect(() => {
    if (showGalleryPicker && galleryVideos.length === 0) fetchGalleryVideos();
  }, [showGalleryPicker, fetchGalleryVideos, galleryVideos.length]);

  const { folders, filteredItems: folderFilteredGallery } = getFilteredItems(galleryVideos);
  const filteredGallery = folderFilteredGallery.filter(v =>
    !gallerySearch || v.nome?.toLowerCase().includes(gallerySearch.toLowerCase())
  );

  return (
    <div className="px-3 pb-3 pt-1">
      {videos.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {videos.slice(0, 4).map((vid: string, idx: number) => (
            <div key={idx} className="rounded-lg overflow-hidden border border-border/50 relative group/vid">
              <video src={vid} className="w-full h-20 object-cover" muted />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateVideos(videos.filter((_: any, i: number) => i !== idx));
                }}
                className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover/vid:opacity-100 transition-opacity text-[8px]"
              >✕</button>
              <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded bg-black/60 text-white text-[8px]">
                <Film className="h-2.5 w-2.5 inline mr-0.5" />Vídeo {idx + 1}
              </div>
            </div>
          ))}
          {videos.length > 4 && (
            <div className="rounded-lg border border-border/50 h-10 flex items-center justify-center bg-muted/50">
              <span className="text-xs text-muted-foreground font-medium">+{videos.length - 4}</span>
            </div>
          )}
        </div>
      )}

      {/* Gallery Picker */}
      {showGalleryPicker && (
        <div className="space-y-2 mb-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-muted-foreground">🎬 Galeria de Vídeos</p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowGalleryPicker(false); }}
              className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
            >✕ Fechar</button>
          </div>
          {folders.length > 0 && (
            <GalleryFolderTabs folders={folders} activeFolder={activeFolder} onSelectFolder={setActiveFolder} />
          )}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              autoFocus
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Buscar vídeos..."
              className="nodrag nowheel w-full h-7 pl-7 pr-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="max-h-[180px] overflow-y-auto rounded-lg">
            {loadingGallery && <p className="text-[10px] text-muted-foreground text-center py-3">Carregando...</p>}
            {!loadingGallery && filteredGallery.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-3">Nenhum vídeo na galeria</p>
            )}
            <div className="space-y-1">
              {filteredGallery.map((vid) => {
                const isSelected = videos.includes(vid.public_url);
                return (
                  <button
                    key={vid.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) {
                        onUpdateVideos(videos.filter((u: string) => u !== vid.public_url));
                      } else {
                        onUpdateVideos([...videos, vid.public_url]);
                      }
                    }}
                    className={`w-full flex items-center gap-2 p-1.5 rounded-lg border-2 transition-colors ${
                      isSelected ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border/30 hover:border-primary/50'
                    }`}
                  >
                    <div className="w-16 h-10 rounded overflow-hidden bg-muted/50 shrink-0">
                      <video src={vid.public_url} className="w-full h-full object-cover" muted />
                    </div>
                    <span className="text-[10px] text-foreground truncate flex-1 text-left">{vid.nome || 'Sem nome'}</span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold shrink-0">✓</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <label className="flex-1 flex flex-col items-center gap-1 py-2.5 border border-dashed border-border/50 rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
          <Upload className="h-4 w-4 text-muted-foreground/40" />
          <p className="text-[9px] text-muted-foreground">Upload</p>
          <input
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach((file) => {
                const url = URL.createObjectURL(file);
                onUpdateVideos([...videos, url]);
              });
              e.target.value = '';
            }}
          />
        </label>
        <button
          onClick={(e) => { e.stopPropagation(); setShowGalleryPicker(!showGalleryPicker); }}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 border border-dashed border-amber-500/30 rounded-xl cursor-pointer hover:bg-amber-500/5 transition-colors"
        >
          <FolderOpen className="h-4 w-4 text-amber-500/40" />
          <p className="text-[9px] text-muted-foreground">Galeria</p>
        </button>
      </div>

      {videos.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1.5">{videos.length} vídeo(s) de referência</p>
      )}
    </div>
  );
};

const formatTimestamp = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const StudioNodeComponent: React.FC<NodeProps> = ({ data, selected, id }) => {
  const nodeData = data as unknown as StudioNodeData;
  const meta = getNodeMeta(nodeData.type);
  const accent = nodeAccentMap[nodeData.type] || '#64748b';
  const [imageExpanded, setImageExpanded] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const IconComponent = nodeIconMap[nodeData.type] || Play;
  const gradient = nodeGradientMap[nodeData.type] || 'from-muted-foreground/20 to-zinc-500/20';
  const iconColor = nodeIconColorMap[nodeData.type] || 'text-muted-foreground';
  const isPaused = !!nodeData.config?._paused;
  const isPaidBlock = PAID_ONLY_BLOCKS.has(nodeData.type);
  const updateNodeInternals = useUpdateNodeInternals();

  const GALLERY_TYPES = ['galleryInfluencer', 'galleryAmbiente', 'galleryEstilo', 'galleryPaleta', 'galleryTextura', 'galleryLogo', 'galleryPose', 'galleryRoupa', 'gallerySalvas'];
  const isGalleryType = GALLERY_TYPES.includes(nodeData.type);
  const galleryCategoryMap: Record<string, GalleryCategoryId> = {
    galleryInfluencer: 'influencer', galleryAmbiente: 'ambiente', galleryEstilo: 'estilo',
    galleryPaleta: 'paleta', galleryTextura: 'textura', galleryLogo: 'logo', galleryPose: 'pose',
    galleryRoupa: 'roupa', gallerySalvas: 'salvas',
  };
  const hasInput = !['textInput', 'systemPrompt', 'imageInput', 'multiImageRef', 'videoInput', 'multiVideoRef', 'productImageSelect', 'multiProductSelect', 'textStyle', 'textContent', 'platformFormat', 'mediaGallery', ...GALLERY_TYPES].includes(nodeData.type);
  const hasOutput = nodeData.type !== 'output';

  // Use external store for results (bypasses ReactFlow's shallow diff)
  const { result: storeResult, isProcessing: storeProcessing, error: storeError } = useNodeResult(id);
  
  // Keep a persistent ref so the result survives ReactFlow re-renders
  const persistedResult = useRef<any>(null);
  if (storeResult !== undefined && storeResult !== null) {
    persistedResult.current = storeResult;
  }
  
  const activeResult = storeResult ?? persistedResult.current ?? nodeData.result;
  const activeProcessing = storeProcessing || nodeData.isProcessing;
  const activeError = storeError || nodeData.error;

  const resultFrames: string[] | undefined = activeResult?._animFrames;
  const resultFps: number = activeResult?._fps || 2;
  const resultGif: string | undefined = activeResult?._gifUrl;
  const resultImage = resultFrames ? undefined : (activeResult?._isVideo ? undefined : activeResult?.imageUrl);
  const resultVideo = activeResult?.videoUrl;
  const resultAudio = activeResult?.audioUrl;
  const resultText = typeof activeResult === 'string'
    ? activeResult
    : activeResult?.text;
  const hasResult = !!(resultImage || resultVideo || resultAudio || resultText || resultFrames);

  // Stabilize frames reference to avoid flickering re-renders
  const stableFramesRef = useRef<string[]>([]);
  const stableFramesLengthRef = useRef(0);
  if (resultFrames && resultFrames.length !== stableFramesLengthRef.current) {
    stableFramesRef.current = resultFrames;
    stableFramesLengthRef.current = resultFrames.length;
  }
  const stableFrames = resultFrames ? stableFramesRef.current : undefined;
  const frameCount = stableFrames?.length || 0;

  // Animated frames playback
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (frameCount > 1 && isPlaying) {
      frameIntervalRef.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % frameCount);
      }, 1000 / resultFps);
      return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current); };
    }
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current); };
  }, [frameCount, resultFps, isPlaying]);

  // Force ReactFlow to re-measure node dimensions when result changes
  useEffect(() => {
    if (hasResult || activeProcessing) {
      const t1 = setTimeout(() => updateNodeInternals(id), 50);
      const t2 = setTimeout(() => updateNodeInternals(id), 200);
      const t3 = setTimeout(() => updateNodeInternals(id), 500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [hasResult, activeProcessing, resultImage, resultVideo, resultAudio, resultText, id, updateNodeInternals]);

  const nodeWidth = (resultImage || resultVideo || resultAudio || (nodeData.type === 'imageInput' && nodeData.config?.images?.length > 0) || (nodeData.type === 'multiImageRef' && nodeData.config?.images?.length > 0) || (nodeData.type === 'videoInput' && nodeData.config?.videos?.length > 0) || (nodeData.type === 'multiVideoRef' && nodeData.config?.videos?.length > 0) || (nodeData.type === 'productImageSelect' && nodeData.config?.selectedImageUrl) || (isGalleryType && nodeData.config?.selectedImageUrl) || (nodeData.type === 'mediaGallery' && nodeData.config?.selectedUrl)) ? 340 : 280;

  // Inline edit handler
  const handleInlineUpdate = useCallback((key: string, value: any) => {
    dispatchConfigUpdate(id, { [key]: value });
  }, [id]);

  // Helper: extract bucket and path from supabase storage URL
  const parseSupabaseStorageUrl = useCallback((url: string): { bucket: string; path: string } | null => {
    try {
      const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (match) return { bucket: match[1], path: match[2] };
    } catch {}
    return null;
  }, []);

  // Helper: download blob from URL (handles supabase storage + external + base64)
  const downloadAsBlob = useCallback(async (url: string): Promise<Blob> => {
    // Base64 data URLs
    if (url.startsWith('data:')) {
      const [header, b64] = url.split(',');
      const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }

    // Supabase storage URLs - use SDK download to avoid CORS
    const parsed = parseSupabaseStorageUrl(url);
    if (parsed) {
      const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .download(parsed.path);
      if (error) throw new Error(`Storage download falhou: ${error.message}`);
      if (data) return data;
    }

    // Fallback: regular fetch
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch falhou: ${response.status}`);
    return await response.blob();
  }, [parseSupabaseStorageUrl]);

  // Save image to media_gallery (system-wide gallery for catalogs, attachments, etc.)
  const handleSaveToMediaGallery = useCallback(async (imageUrl: string) => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId || !imageUrl) {
      toast.error('Erro: estabelecimento ou imagem não encontrados');
      return;
    }
    console.log('[Studio] Salvando imagem na galeria...', imageUrl.substring(0, 100));
    setIsSavingToGallery(true);
    try {
      const blob = await downloadAsBlob(imageUrl);
      
      const ext = blob.type?.includes('png') ? 'png' : blob.type?.includes('gif') ? 'gif' : 'jpg';
      const fileName = `studio-${nodeData.type}-${id}-${Date.now()}.${ext}`;
      const storagePath = `${estabId}/${fileName}`;

      // Upload to marketing-images bucket
      const { error: uploadErr } = await supabase.storage
        .from('marketing-images')
        .upload(storagePath, blob, { contentType: blob.type || 'image/png' });
      if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('marketing-images')
        .getPublicUrl(storagePath);

      // Insert into media_gallery table
      const { error: dbErr } = await supabase
        .from('media_gallery')
        .insert({
          estabelecimento_id: estabId,
          tipo: 'image',
          storage_path: storagePath,
          public_url: publicUrl,
          nome: `AI Studio - ${nodeData.label}`,
          descricao: `Gerado pelo AI Creative Studio (${nodeData.type})`,
          tamanho_bytes: blob.size,
          mime_type: blob.type || 'image/png',
          origem: 'ai_studio',
        });
      if (dbErr) throw new Error(`DB insert falhou: ${dbErr.message}`);

      console.log('[Studio] Imagem salva com sucesso na galeria!');
      toast.success('✅ Imagem salva! Disponível no bloco "Imagens Salvas".');
    } catch (err: any) {
      console.error('[Studio] Erro ao salvar na galeria:', err);
      toast.error('Erro ao salvar: ' + (err.message || String(err)));
    } finally {
      setIsSavingToGallery(false);
    }
  }, [id, nodeData.type, nodeData.label, downloadAsBlob]);

  const handleSaveVideoToGallery = useCallback(async (videoUrl: string, withAudio: boolean = true) => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId || !videoUrl) {
      toast.error('Erro: estabelecimento ou vídeo não encontrados');
      return;
    }
    console.log('[Studio] Salvando vídeo na galeria...', videoUrl.substring(0, 100));
    setIsSavingToGallery(true);
    try {
      const blob = await downloadAsBlob(videoUrl);
      const finalBlob = withAudio
        ? await convertVideoToWhatsappMp4(blob)
        : await removeAudioFromVideo(blob);

      const fileName = `studio-video-${nodeData.type}-${id}-${withAudio ? 'audio' : 'sem-audio'}-${Date.now()}.mp4`;
      const storagePath = `${estabId}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('marketing-videos')
        .upload(storagePath, finalBlob, { contentType: 'video/mp4' });
      if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('marketing-videos')
        .getPublicUrl(storagePath);

      const { error: dbErr } = await supabase
        .from('media_gallery')
        .insert({
          estabelecimento_id: estabId,
          tipo: 'video',
          storage_path: storagePath,
          public_url: publicUrl,
          nome: `AI Studio Vídeo ${withAudio ? '' : '(Sem Áudio) '} - ${nodeData.label}`,
          descricao: `Vídeo gerado pelo AI Creative Studio (${nodeData.type}) ${withAudio ? 'com áudio' : 'sem áudio'}`,
          tamanho_bytes: finalBlob.size,
          mime_type: 'video/mp4',
          origem: 'ai_studio',
        });
      if (dbErr) throw new Error(`DB insert falhou: ${dbErr.message}`);

      console.log('[Studio] Vídeo salvo com sucesso na galeria!');
      toast.success(`✅ Vídeo salvo na galeria ${withAudio ? 'com áudio' : 'sem áudio'}!`);
    } catch (err: any) {
      console.error('[Studio] Erro ao salvar vídeo na galeria:', err);
      toast.error('Erro ao salvar: ' + (err.message || String(err)));
    } finally {
      setIsSavingToGallery(false);
    }
  }, [id, nodeData.type, nodeData.label, downloadAsBlob]);

  return (
    <>
    <div
      className={`
        relative rounded-2xl transition-all duration-300 overflow-visible group/node
        ${selected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
        ${nodeData.error ? 'ring-2 ring-destructive/40' : ''}
        ${isPaused ? 'opacity-50 grayscale' : ''}
      `}
      style={{
        width: nodeWidth,
        background: 'hsl(var(--card) / 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: selected ? `1.5px solid ${accent}` : '1px solid hsl(var(--border) / 0.5)',
        borderRadius: 14,
        boxShadow: selected
          ? `0 0 0 1px ${accent}15, 0 20px 40px -12px ${accent}20, 0 8px 20px -8px rgba(0,0,0,0.12)`
          : '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px -6px rgba(0,0,0,0.06)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease',
      }}
    >
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-[1.5px] rounded-full opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      {/* Paused badge */}
      {isPaused && (
        <div className="absolute -top-2.5 right-3 z-10 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/90 text-white text-[9px] font-semibold shadow-sm backdrop-blur-sm">
          <PauseCircle className="h-3 w-3" />
          PAUSADO
        </div>
      )}
      {isPaidBlock && (
        <div className="absolute -top-2.5 left-3 z-10 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/90 text-white text-[9px] font-semibold shadow-sm backdrop-blur-sm" title="Este bloco requer API paga externa">
          <DollarSign className="h-3 w-3" />
          API PAGA
        </div>
      )}
      {/* Refined Header */}
      <div className={`px-3.5 py-2.5 flex items-center gap-2.5 rounded-t-[13px] border-b border-border/30`}
        style={{ background: `linear-gradient(135deg, ${accent}08, ${accent}04)` }}
      >
        <div
          className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/node:scale-110"
          style={{
            background: `linear-gradient(135deg, ${accent}20, ${accent}10)`,
            border: `1px solid ${accent}20`,
          }}
        >
          <IconComponent className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate text-foreground/90 tracking-tight">{nodeData.label}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {activeProcessing && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: `${accent}` }} />
              <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: accent }} />
            </div>
          )}
          {hasResult && !activeProcessing && (
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {/* Inline editable text input */}
        {nodeData.type === 'textInput' && (
          <div className="px-3.5 py-2.5">
            {isEditing ? (
              <textarea
                autoFocus
                value={nodeData.config.text || ''}
                onChange={(e) => handleInlineUpdate('text', e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setIsEditing(false); }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="nodrag nowheel w-full text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-muted/50 border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 min-h-[80px] max-h-[200px]"
                placeholder="Escreva seu prompt aqui..."
              />
            ) : (
              <div
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="cursor-text hover:bg-muted/30 rounded-lg p-1.5 -m-1.5 transition-colors group/edit"
              >
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5 whitespace-pre-wrap font-mono">
                  {nodeData.config.text || <span className="italic opacity-50">Clique para editar o texto...</span>}
                </p>
                <Edit3 className="h-3 w-3 text-muted-foreground/30 group-hover/edit:text-muted-foreground/60 transition-colors mt-1" />
              </div>
            )}
          </div>
        )}
        {nodeData.type === 'systemPrompt' && (
          <div className="px-3.5 py-2.5">
            {isEditing ? (
              <textarea
                autoFocus
                value={nodeData.config.systemPrompt || ''}
                onChange={(e) => handleInlineUpdate('systemPrompt', e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setIsEditing(false); }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="nodrag nowheel w-full text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-muted/50 border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 min-h-[80px] max-h-[200px]"
                placeholder="Defina instruções do sistema..."
              />
            ) : (
              <div
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="cursor-text hover:bg-muted/30 rounded-lg p-1.5 -m-1.5 transition-colors group/edit"
              >
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5 whitespace-pre-wrap font-mono">
                  {nodeData.config.systemPrompt || <span className="italic opacity-50">Clique para definir instruções...</span>}
                </p>
                <Edit3 className="h-3 w-3 text-muted-foreground/30 group-hover/edit:text-muted-foreground/60 transition-colors mt-1" />
              </div>
            )}
          </div>
        )}
        {/* Image input with inline upload + gallery */}
        {(nodeData.type === 'imageInput' || nodeData.type === 'multiImageRef') && (
          <ImageInputWithGallery
            images={nodeData.config.images || []}
            onUpdateImages={(imgs) => handleInlineUpdate('images', imgs)}
            nodeType={nodeData.type}
          />
        )}
        {/* Video input with inline upload + gallery */}
        {(nodeData.type === 'videoInput' || nodeData.type === 'multiVideoRef') && (
          <VideoInputWithGallery
            videos={nodeData.config.videos || []}
            onUpdateVideos={(vids) => handleInlineUpdate('videos', vids)}
            nodeType={nodeData.type}
          />
        )}

        {nodeData.type === 'productImageSelect' && (
          <ProductImageSelectInline config={nodeData.config} onUpdate={handleInlineUpdate} />
        )}

        {/* Multi Product Select inline display */}
        {nodeData.type === 'multiProductSelect' && (
          <MultiProductSelectInline config={nodeData.config} onUpdate={handleInlineUpdate} />
        )}

        {/* Loop Output inline display */}
        {nodeData.type === 'loopOutput' && (
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
                <Repeat className="h-2.5 w-2.5" />
                Lote Automático
              </span>
              {nodeData.config.autoSave !== false && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">💾 Auto-salvar</span>
              )}
            </div>
            {activeResult?.loopResults && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium">{activeResult.loopResults.length} imagens geradas</p>
                <div className="grid grid-cols-3 gap-1">
                  {activeResult.loopResults.slice(0, 6).map((r: any, idx: number) => (
                    <div key={idx} className="rounded-lg overflow-hidden border border-border/50 aspect-square">
                      <img src={r.imageUrl} alt={r.productName || `Item ${idx+1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                {activeResult.loopResults.length > 6 && (
                  <p className="text-[9px] text-muted-foreground text-center">+{activeResult.loopResults.length - 6} mais</p>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('studio-reopen-batch', { detail: activeResult.loopResults })); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-full mt-1 text-[10px] font-medium py-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                >
                  📋 Abrir Revisão do Lote
                </button>
              </div>
            )}
          </div>
        )}

        {/* Random Pick inline display */}
        {nodeData.type === 'randomPick' && (
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                <Shuffle className="h-2.5 w-2.5" />
                {nodeData.config.galleryCategory || 'salvas'}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">Seleciona imagem aleatória da galeria a cada iteração do loop</p>
          </div>
        )}

        {/* Gallery select inline display */}
        {isGalleryType && (
          <GallerySelectInline
            categoria={galleryCategoryMap[nodeData.type]}
            config={nodeData.config}
            onUpdate={handleInlineUpdate}
          />
        )}

        {/* Media Gallery inline selector */}
        {nodeData.type === 'mediaGallery' && (
          <MediaGallerySelectInline
            config={nodeData.config}
            onUpdate={handleInlineUpdate}
          />
        )}

        {/* Text Style inline editor */}
        {nodeData.type === 'textStyle' && (
          <div className="px-3 pb-3 pt-1 space-y-2">
            <input
              value={nodeData.config.text || ''}
              onChange={(e) => { e.stopPropagation(); handleInlineUpdate('text', e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Texto para aplicar..."
              className="nodrag nowheel w-full h-7 px-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-rose-500/40"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={nodeData.config.fontFamily || 'Arial'}
                onChange={(e) => handleInlineUpdate('fontFamily', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="h-6 px-1.5 text-[10px] rounded bg-muted/50 border border-border/50"
              >
                {['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Impact', 'Comic Sans MS', 'Verdana'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <input
                type="number"
                value={nodeData.config.fontSize || 48}
                onChange={(e) => handleInlineUpdate('fontSize', parseInt(e.target.value) || 48)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="nodrag nowheel h-6 w-12 px-1.5 text-[10px] rounded bg-muted/50 border border-border/50"
                title="Tamanho"
              />
              <input
                type="color"
                value={nodeData.config.color || '#ffffff'}
                onChange={(e) => handleInlineUpdate('color', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="h-6 w-6 rounded border border-border/50 cursor-pointer"
                title="Cor do texto"
              />
            </div>
            {nodeData.config.text && (
              <div
                className="rounded-lg p-3 bg-muted/30 border border-border/30 text-center overflow-hidden"
                style={{
                  fontFamily: nodeData.config.fontFamily || 'Arial',
                  fontSize: Math.min(nodeData.config.fontSize || 48, 24),
                  fontWeight: nodeData.config.fontWeight || 'bold',
                  color: nodeData.config.color || '#ffffff',
                  textShadow: nodeData.config.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                  WebkitTextStroke: nodeData.config.outline ? '1px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {nodeData.config.text}
              </div>
            )}
          </div>
        )}

        {/* Text Content inline editor */}
        {nodeData.type === 'textContent' && (
          <div className="px-3 pb-3 pt-1 space-y-1.5">
            <input
              value={nodeData.config.title || ''}
              onChange={(e) => { e.stopPropagation(); handleInlineUpdate('title', e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Título..."
              className="nodrag nowheel w-full h-7 px-2 text-[12px] font-bold rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
            />
            <input
              value={nodeData.config.subtitle || ''}
              onChange={(e) => { e.stopPropagation(); handleInlineUpdate('subtitle', e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Subtítulo..."
              className="nodrag nowheel w-full h-7 px-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
            />
            <textarea
              value={nodeData.config.body || ''}
              onChange={(e) => { e.stopPropagation(); handleInlineUpdate('body', e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Corpo do texto..."
              rows={2}
              className="nodrag nowheel w-full px-2 py-1 text-[10px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40 resize-none"
            />
            {nodeData.config.title && (
              <div className="rounded-lg p-2.5 bg-muted/30 border border-border/30 overflow-hidden" style={{ textAlign: (nodeData.config.textAlign || 'center') as any }}>
                <p style={{ fontFamily: nodeData.config.titleFont || 'Montserrat', fontSize: Math.min(nodeData.config.titleSize || 72, 18), fontWeight: nodeData.config.titleWeight || 'bold', color: nodeData.config.titleColor || '#000' }} className="leading-tight truncate">{nodeData.config.title}</p>
                {nodeData.config.subtitle && <p style={{ fontFamily: nodeData.config.subtitleFont || 'Montserrat', fontSize: Math.min(nodeData.config.subtitleSize || 42, 13), fontWeight: nodeData.config.subtitleWeight || '600', color: nodeData.config.subtitleColor || '#4A4A4A' }} className="leading-tight truncate mt-0.5">{nodeData.config.subtitle}</p>}
                {nodeData.config.body && <p style={{ fontFamily: nodeData.config.bodyFont || 'Inter', fontSize: Math.min(nodeData.config.bodySize || 24, 10), fontWeight: nodeData.config.bodyWeight || 'normal', color: nodeData.config.bodyColor || '#666' }} className="leading-snug mt-1 line-clamp-2">{nodeData.config.body}</p>}
              </div>
            )}
            <p className="text-[9px] text-muted-foreground">📝 {nodeData.config.templateId || 'heading-bold'}</p>
          </div>
        )}

        {/* Platform Format inline selector */}
        {nodeData.type === 'platformFormat' && (() => {
          const PLATFORM_PRESETS = [
            { platform: 'instagram', type: 'post', width: 1080, height: 1080, label: 'Post Quadrado' },
            { platform: 'instagram', type: 'story', width: 1080, height: 1920, label: 'Stories' },
            { platform: 'instagram', type: 'reel', width: 1080, height: 1920, label: 'Reels' },
            { platform: 'instagram', type: 'landscape', width: 1080, height: 566, label: 'Post Paisagem' },
            { platform: 'instagram', type: 'portrait', width: 1080, height: 1350, label: 'Post Retrato' },
            { platform: 'whatsapp', type: 'status', width: 1080, height: 1920, label: 'Status' },
            { platform: 'whatsapp', type: 'profile', width: 640, height: 640, label: 'Foto de Perfil' },
            { platform: 'whatsapp', type: 'group', width: 640, height: 640, label: 'Foto de Grupo' },
            { platform: 'facebook', type: 'post', width: 1200, height: 630, label: 'Post' },
            { platform: 'facebook', type: 'story', width: 1080, height: 1920, label: 'Stories' },
            { platform: 'facebook', type: 'cover', width: 820, height: 312, label: 'Capa' },
            { platform: 'facebook', type: 'profile', width: 180, height: 180, label: 'Foto de Perfil' },
            { platform: 'telegram', type: 'post', width: 1280, height: 720, label: 'Post' },
            { platform: 'telegram', type: 'story', width: 1080, height: 1920, label: 'Stories' },
            { platform: 'telegram', type: 'profile', width: 640, height: 640, label: 'Foto de Perfil' },
          ];
          const PLATFORMS = [
            { id: 'instagram', name: 'Instagram', emoji: '📸' },
            { id: 'whatsapp', name: 'WhatsApp', emoji: '💬' },
            { id: 'facebook', name: 'Facebook', emoji: '👤' },
            { id: 'telegram', name: 'Telegram', emoji: '✈️' },
            { id: 'custom', name: 'Personalizado', emoji: '📐' },
          ];
          const currentPlatform = nodeData.config.platform || 'instagram';
          const currentType = nodeData.config.contentType || 'post';
          const types = PLATFORM_PRESETS.filter(p => p.platform === currentPlatform);
          const selected = PLATFORM_PRESETS.find(p => p.platform === currentPlatform && p.type === currentType);
          
          return (
            <div className="px-3 pb-3 pt-1 space-y-2" onClick={e => e.stopPropagation()}>
              <div className="flex flex-wrap gap-1">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      const firstType = PLATFORM_PRESETS.find(pr => pr.platform === p.id);
                      handleInlineUpdate('platform', p.id);
                      if (p.id === 'custom') {
                        handleInlineUpdate('contentType', 'custom');
                      } else if (firstType) {
                        handleInlineUpdate('contentType', firstType.type);
                        handleInlineUpdate('width', firstType.width);
                        handleInlineUpdate('height', firstType.height);
                      }
                    }}
                    className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                      currentPlatform === p.id
                        ? 'bg-primary/10 border-primary/40 text-primary font-semibold'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>
              {currentPlatform !== 'custom' && types.length > 0 && (
                <select
                  value={currentType}
                  onChange={(e) => {
                    e.stopPropagation();
                    const preset = PLATFORM_PRESETS.find(p => p.platform === currentPlatform && p.type === e.target.value);
                    handleInlineUpdate('contentType', e.target.value);
                    if (preset) {
                      handleInlineUpdate('width', preset.width);
                      handleInlineUpdate('height', preset.height);
                    }
                  }}
                  className="w-full h-7 px-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                >
                  {types.map(t => (
                    <option key={t.type} value={t.type}>{t.label} ({t.width}x{t.height})</option>
                  ))}
                </select>
              )}
              {currentPlatform === 'custom' && (
                <div className="flex gap-1.5">
                  <input
                    type="number" min="100" max="4096"
                    value={nodeData.config.width || 1080}
                    onChange={(e) => { e.stopPropagation(); handleInlineUpdate('width', parseInt(e.target.value) || 1080); }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    className="nodrag nowheel w-1/2 h-7 px-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    placeholder="Largura"
                  />
                  <span className="text-muted-foreground text-[10px] self-center">×</span>
                  <input
                    type="number" min="100" max="4096"
                    value={nodeData.config.height || 1080}
                    onChange={(e) => { e.stopPropagation(); handleInlineUpdate('height', parseInt(e.target.value) || 1080); }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    className="nodrag nowheel w-1/2 h-7 px-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    placeholder="Altura"
                  />
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded-md px-2 py-1.5 border border-border/30">
                <Monitor className="h-3 w-3" />
                <span className="font-medium">{nodeData.config.width || 1080} × {nodeData.config.height || 1080}px</span>
                {selected && <span className="ml-auto opacity-70">{selected.label}</span>}
              </div>
            </div>
          );
        })()}

        {!hasResult && nodeData.type === 'llmProcess' && (
          <div className="px-3.5 py-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
              <Type className="h-2.5 w-2.5" />
              {(nodeData.config.model || 'gemini-2.5-flash').split('/').pop()}
            </span>
            <span className="text-[10px] text-muted-foreground/60">T:{nodeData.config.temperature ?? 0.7}</span>
          </div>
        )}
        {!hasResult && nodeData.type === 'videoGen' && (
          <div className="px-3.5 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
              (nodeData.config.videoModel || 'free/gif-animated') === 'free/gif-animated'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <Film className="h-2.5 w-2.5" />
              {(nodeData.config.videoModel || 'free/gif-animated') === 'free/gif-animated' ? 'GIF Animado' : (nodeData.config.videoModel || '').split('/').pop()}
            </span>
            {(nodeData.config.videoModel || 'free/gif-animated') === 'free/gif-animated' ? (
              <>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.frameCount || 4} frames</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.fps || 2} fps</span>
              </>
            ) : (
              <>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.duration || 5}s</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.resolution || '1080p'}</span>
              </>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.aspectRatio || '16:9'}</span>
          </div>
        )}
        {!hasResult && (nodeData.type === 'imageGen' || nodeData.type === 'imageEdit' || nodeData.type === 'productComposite') && (
          <div className="px-3.5 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
              <ImageIcon className="h-2.5 w-2.5" />
              {(nodeData.config.model || 'gemini-flash-image').split('/').pop()}
            </span>
            {nodeData.config.imageStyle && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.imageStyle}</span>
            )}
            {nodeData.config.imageSize && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.imageSize}</span>
            )}
          </div>
        )}
        {!hasResult && nodeData.type === 'musicGen' && (
          <div className="px-3.5 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
              <Music className="h-2.5 w-2.5" />
              {(nodeData.config.musicModel || 'suno-v4').split('/').pop()}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.genre || 'ambient'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.duration || 30}s</span>
          </div>
        )}
        {!hasResult && nodeData.type === 'audioGen' && (
          <div className="px-3.5 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <Mic className="h-2.5 w-2.5" />
              {(nodeData.config.audioModel || 'elevenlabs-v3').split('/').pop()}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.type || 'sfx'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.duration || 5}s</span>
          </div>
        )}

        {/* Result display */}
        {hasResult && (
          <div className="relative">
            {/* Animated frames player */}
            {stableFrames && stableFrames.length > 0 && (
              <div className="relative group px-3 pb-3 pt-1">
                <div
                  className="rounded-xl overflow-hidden border border-border/50 cursor-pointer relative"
                  style={{
                    boxShadow: `0 4px 20px -4px ${accent}20`,
                    height: imageExpanded ? 400 : 200,
                    width: '100%',
                    backgroundImage: `url(${stableFrames[currentFrame % stableFrames.length]})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundColor: 'hsl(var(--muted))',
                  }}
                  onClick={() => setImageExpanded(!imageExpanded)}
                >
                  {/* Frame counter */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono">
                    {(currentFrame % stableFrames.length) + 1}/{stableFrames.length}
                    {activeResult?._totalFrames && stableFrames.length < activeResult._totalFrames && (
                      <span className="text-amber-300 ml-1">({activeResult._totalFrames} total)</span>
                    )}
                  </div>
                  {/* Play/Pause */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                    className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    {isPlaying ? (
                      <PauseCircle className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-white" />
                    )}
                  </button>
                </div>
                {/* Frame dots (max 20 shown) */}
                {stableFrames.length <= 20 && (
                  <div className="flex justify-center gap-1 mt-1.5">
                    {stableFrames.map((_: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => { setCurrentFrame(idx); setIsPlaying(false); }}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentFrame ? 'scale-125' : 'opacity-50'}`}
                        style={{ backgroundColor: idx === currentFrame ? accent : 'hsl(var(--muted-foreground))' }}
                      />
                    ))}
                  </div>
                )}
                {stableFrames.length > 20 && (
                  <div className="flex items-center gap-2 mt-1.5 px-1">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${((currentFrame % stableFrames.length) / stableFrames.length) * 100}%`, backgroundColor: accent }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono">{stableFrames.length}f</span>
                  </div>
                )}
                <div className="absolute top-3 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {resultGif && (
                     <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        try {
                          const base64 = resultGif.split(',')[1];
                          if (!base64) { console.error('GIF data missing'); return; }
                          const byteChars = atob(base64);
                          const byteArray = new Uint8Array(byteChars.length);
                          for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
                          const blob = new Blob([byteArray], { type: 'image/gif' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `studio-animation-${id}.gif`;
                          link.style.display = 'none';
                          document.body.appendChild(link);
                          setTimeout(() => {
                            link.click();
                            setTimeout(() => {
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }, 200);
                          }, 0);
                        } catch (err) {
                          console.error('Download GIF error:', err);
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg bg-emerald-600/80 backdrop-blur-sm hover:bg-emerald-600 transition-colors flex items-center gap-1"
                      title="Download GIF animado"
                    >
                      <Download className="h-3 w-3 text-white" />
                      <span className="text-[10px] text-white font-medium">GIF</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stableFrames.forEach((frame: string, idx: number) => {
                        const link = document.createElement('a');
                        link.href = frame;
                        link.download = `studio-video-${id}-frame${idx + 1}.png`;
                        link.click();
                      });
                    }}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                    title="Download todos os frames"
                  >
                    <Download className="h-3 w-3 text-white" />
                  </button>
                  <button
                    onClick={() => setImageExpanded(!imageExpanded)}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    <Maximize2 className="h-3 w-3 text-white" />
                  </button>
                </div>
              </div>
            )}

           {resultImage && (
              <div className="relative group px-3 pb-3 pt-1">
                <div 
                  className="rounded-xl overflow-hidden border border-border/50 cursor-pointer"
                  style={{ 
                    boxShadow: `0 4px 20px -4px ${accent}20`,
                    height: imageExpanded ? 400 : 200,
                    width: '100%',
                    backgroundColor: 'hsl(var(--muted))',
                  }}
                  onClick={() => setImageExpanded(!imageExpanded)}
                >
                  <img 
                    src={resultImage} 
                    alt="Generated" 
                    className="w-full h-full object-contain"
                    loading="eager"
                  />
                </div>
                <div className="absolute top-3 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (resultImage) handleSaveToMediaGallery(resultImage);
                    }}
                    disabled={isSavingToGallery}
                    className="p-1.5 rounded-lg bg-emerald-600/80 backdrop-blur-sm hover:bg-emerald-600 transition-colors"
                    title="Salvar na galeria do sistema"
                  >
                    {isSavingToGallery ? <Loader2 className="h-3 w-3 text-white animate-spin" /> : <Save className="h-3 w-3 text-white" />}
                  </button>
                  <a
                    href={resultImage}
                    download={`studio-${nodeData.type}-${id}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors cursor-pointer"
                    title="Download / Abrir imagem"
                  >
                    <Download className="h-3 w-3 text-white" />
                  </a>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setImagePreviewOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    <Maximize2 className="h-3 w-3 text-white" />
                  </button>
                </div>
              </div>
            )}

            {resultVideo && (
              <div className="relative group px-3 pb-3 pt-1">
                <div 
                  className="rounded-xl overflow-hidden border border-border/50 relative"
                  style={{ boxShadow: `0 4px 20px -4px ${accent}20` }}
                >
                  <video
                    src={resultVideo}
                    controls
                    controlsList="nofullscreen nodownload"
                    disablePictureInPicture
                    className="w-full object-cover studio-video-no-fullscreen"
                    style={{ maxHeight: 200 }}
                    onDoubleClick={(e) => { e.preventDefault(); setVideoPreviewOpen(true); }}
                  />
                  {/* Always-visible overlay buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 transition-colors"
                          title="Download"
                        >
                          <Download className="h-3 w-3 text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={async () => {
                          try {
                            const resp = await fetch(resultVideo);
                            const originalBlob = await resp.blob();
                            const mp4Blob = await convertVideoToWhatsappMp4(originalBlob);
                            triggerDownload(mp4Blob, `studio-${nodeData.type}-${id}.mp4`);
                          } catch {
                            toast.error('Não foi possível baixar o vídeo.');
                          }
                        }}>
                          <Volume2 className="h-3.5 w-3.5 mr-2" /> Com áudio
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          try {
                            const resp = await fetch(resultVideo);
                            const originalBlob = await resp.blob();
                            const mp4Blob = await removeAudioFromVideo(originalBlob);
                            triggerDownload(mp4Blob, `studio-${nodeData.type}-${id}_sem-audio.mp4`);
                          } catch {
                            toast.error('Não foi possível remover o áudio.');
                          }
                        }}>
                          <VolumeX className="h-3.5 w-3.5 mr-2" /> Sem áudio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      onClick={(e) => { e.stopPropagation(); setVideoPreviewOpen(true); }}
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 transition-colors"
                      title="Expandir"
                    >
                      <Maximize2 className="h-3 w-3 text-white" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                          disabled={isSavingToGallery}
                          className="p-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 transition-colors disabled:opacity-60"
                          title="Salvar vídeo na galeria"
                        >
                          {isSavingToGallery ? <Loader2 className="h-3 w-3 text-white animate-spin" /> : <Save className="h-3 w-3 text-white" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => resultVideo && handleSaveVideoToGallery(resultVideo, true)}>
                          <Volume2 className="h-3.5 w-3.5 mr-2" /> Salvar com áudio
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resultVideo && handleSaveVideoToGallery(resultVideo, false)}>
                          <VolumeX className="h-3.5 w-3.5 mr-2" /> Salvar sem áudio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )}

            {resultAudio && (
              <div className="px-3 pb-3 pt-1 space-y-2">
                <audio controls src={resultAudio} className="w-full h-10 rounded-lg" />
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const link = document.createElement('a');
                      link.href = resultAudio;
                      link.download = `studio-${nodeData.type}-${id}.mp3`;
                      link.click();
                    }}
                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    title="Download áudio"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Web Speech API playback button */}
            {activeResult?._webSpeechText && !resultAudio && (
              <div className="px-3 pb-2 pt-1 space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if ('speechSynthesis' in window) {
                      speechSynthesis.cancel();
                      const utt = new SpeechSynthesisUtterance(activeResult._webSpeechText);
                      utt.lang = activeResult._webSpeechLang || 'pt-BR';
                      utt.rate = activeResult._webSpeechRate || 1.0;
                      utt.pitch = activeResult._webSpeechPitch || 1.0;
                      const voices = speechSynthesis.getVoices();
                      const ptVoice = voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('pt')) || voices[0];
                      if (ptVoice) utt.voice = ptVoice;
                      speechSynthesis.speak(utt);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                >
                  <Volume2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-500">Reproduzir (Gratuito)</span>
                </button>
              </div>
            )}

            {resultText && !resultImage && !resultVideo && !resultAudio && (
              <div className="px-3.5 py-2.5">
                <p className="text-xs text-foreground/70 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                  {resultText}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Output node empty */}
        {nodeData.type === 'output' && !hasResult && (
          <div className="px-3.5 py-4 flex flex-col items-center justify-center text-center gap-2">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${accent}15, ${accent}05)`,
                border: `1px dashed ${accent}30`,
              }}
            >
              <Play className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-[10px] text-muted-foreground">Aguardando execução</p>
          </div>
        )}

        {/* Error */}
        {activeError && (
          <div className="mx-3 mb-3 px-3 py-2 bg-destructive/5 rounded-lg border border-destructive/10">
            <p className="text-[11px] text-destructive line-clamp-2">{activeError}</p>
          </div>
        )}

        {/* Processing overlay */}
        {activeProcessing && (
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 rounded-b-2xl">
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: accent, width: 32, height: 32, margin: 'auto' }} />
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: accent }} />
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">Processando...</p>
          </div>
        )}
      </div>

      {/* Handles - refined minimal style */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !rounded-full !border-[2px] !-left-[6px] !transition-all !duration-200 hover:!scale-125"
          style={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: `${accent}80`,
            boxShadow: `0 0 0 2px ${accent}15`,
          }}
        />
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !rounded-full !border-[2px] !-right-[6px] !transition-all !duration-200 hover:!scale-125"
          style={{
            backgroundColor: accent,
            borderColor: 'hsl(var(--card))',
            boxShadow: `0 0 0 2px ${accent}15`,
          }}
        />
      )}
    </div>

    {resultImage && (
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <img 
            src={resultImage} 
            alt="Preview" 
            className="w-full h-full object-contain max-h-[85vh] rounded-lg"
          />
        </DialogContent>
      </Dialog>
    )}

    {resultVideo && (
      <Dialog open={videoPreviewOpen} onOpenChange={setVideoPreviewOpen}>
        <DialogContent className="max-w-[900px] max-h-[90vh] p-0 border-none bg-card overflow-visible [&>button]:hidden">
          <div className="relative overflow-y-auto max-h-[90vh] rounded-lg">
            {/* Close button */}
            <button
              onClick={() => setVideoPreviewOpen(false)}
              className="absolute top-3 right-3 z-[200] rounded-full p-2 bg-background/80 backdrop-blur text-foreground shadow-lg hover:bg-background transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <VideoTrimmer
              videoUrl={resultVideo}
              isSaving={isSavingToGallery}
              onSaveOriginal={(withAudio) => handleSaveVideoToGallery(resultVideo, withAudio)}
              onSaveTrimmed={async (blob, startTime, endTime, withAudio) => {
                const estabId = localStorage.getItem('estabelecimentoId');
                if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }
                setIsSavingToGallery(true);
                try {
                  const finalBlob = withAudio
                    ? await convertVideoToWhatsappMp4(blob)
                    : await removeAudioFromVideo(blob);
                  const fileName = `studio-trimmed-${id}-${withAudio ? 'audio' : 'sem-audio'}-${Date.now()}.mp4`;
                  const storagePath = `${estabId}/${fileName}`;
                  const { error: uploadErr } = await supabase.storage
                    .from('marketing-videos')
                    .upload(storagePath, finalBlob, { contentType: 'video/mp4' });
                  if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`);
                  const { data: { publicUrl } } = supabase.storage
                    .from('marketing-videos')
                    .getPublicUrl(storagePath);
                  const { error: dbErr } = await supabase
                    .from('media_gallery')
                    .insert({
                      estabelecimento_id: estabId,
                      tipo: 'video',
                      storage_path: storagePath,
                      public_url: publicUrl,
                      nome: `AI Studio Vídeo (${withAudio ? 'Cortado' : 'Cortado Sem Áudio'}) - ${nodeData.label}`,
                      descricao: `Cortado de ${formatTimestamp(startTime)} a ${formatTimestamp(endTime)}`,
                      tamanho_bytes: finalBlob.size,
                      mime_type: 'video/mp4',
                      origem: 'ai_studio',
                    });
                  if (dbErr) throw new Error(`DB insert falhou: ${dbErr.message}`);
                  toast.success(`✅ Vídeo cortado salvo ${withAudio ? 'com áudio' : 'sem áudio'}!`);
                } catch (err: any) {
                  console.error('[Studio] Erro ao salvar vídeo cortado:', err);
                  toast.error('Erro ao salvar: ' + (err.message || String(err)));
                } finally {
                  setIsSavingToGallery(false);
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

StudioNodeComponent.displayName = 'StudioNodeComponent';
export default StudioNodeComponent;
