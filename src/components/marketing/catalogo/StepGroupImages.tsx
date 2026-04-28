import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, ImageIcon, Layers, Check, X, FolderOpen, ImagePlus } from 'lucide-react';
import { CatalogPage, CatalogProduct, ProductGroup } from './types';
import { toast } from 'sonner';
import { useCatalogAIImages } from './hooks/useCatalogAIImages';
import { AIImageGallery } from './AIImageGallery';
import { cn } from '@/lib/utils';

interface StepGroupImagesProps {
  productsPage: CatalogPage;
  groupImages: Record<string, string>;
  onGroupImageChange: (groupId: string, imageUrl: string) => void;
  groupPrompts: Record<string, string>;
  onGroupPromptChange: (groupId: string, prompt: string) => void;
  estabelecimentoId?: string | null;
}

export const StepGroupImages: React.FC<StepGroupImagesProps> = ({
  productsPage,
  groupImages,
  onGroupImageChange,
  groupPrompts,
  onGroupPromptChange,
  estabelecimentoId,
}) => {
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [galleryOpenFor, setGalleryOpenFor] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const products = productsPage.products || [];
  const groupByCategory = productsPage.groupByCategory ?? true;

  // AI Images hook for gallery
  const { images, loading: imagesLoading, saveImage, deleteImage, refresh: refreshGallery } = useCatalogAIImages(estabelecimentoId || 'default');

  // Get unique groups from selected products
  const groups = useMemo((): ProductGroup[] => {
    if (!groupByCategory || products.length === 0) {
      return [];
    }

    const groupMap = new Map<string, { id: string; nome: string; products: CatalogProduct[] }>();
    products.forEach(product => {
      const groupName = product.grupo_nome || 'Outros';
      const groupId = product.grupo_id || `outros_${groupName.replace(/\s+/g, '_').toLowerCase()}`;
      
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { id: groupId, nome: groupName, products: [] });
      }
      groupMap.get(groupId)!.products.push(product);
    });

    return Array.from(groupMap.values()).map(g => ({
      ...g,
      backgroundImage: groupImages[g.id]
    })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [products, groupByCategory, groupImages]);

  const generateImageForGroup = async (group: ProductGroup) => {
    const prompt = groupPrompts[group.id];
    if (!prompt?.trim()) {
      toast.error(`Digite uma descrição para o grupo "${group.nome}"`);
      return;
    }

    setGeneratingFor(group.id);
    toast.loading(`Gerando imagem para ${group.nome}...`, { id: `ai-group-${group.id}` });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catalog-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'generate-image',
            prompt: `Professional catalog group page background: ${prompt.trim()}`,
            estabelecimentoId: estabelecimentoId || null,
            saveToGallery: true
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const data = await response.json();

      if (data?.imageUrl) {
        onGroupImageChange(group.id, data.imageUrl);
        
        // Refresh gallery if saved
        if (data.savedToGallery) {
          await refreshGallery();
        }
        
        toast.success(`Imagem gerada para ${group.nome}!`, { id: `ai-group-${group.id}` });
      } else {
        toast.error('Erro: imagem não retornada', { id: `ai-group-${group.id}` });
      }
    } catch (error: any) {
      console.error('Error generating group image:', error);
      if (error.name === 'AbortError') {
        toast.error('Timeout: tente novamente', { id: `ai-group-${group.id}` });
      } else {
        toast.error(error.message || 'Erro ao gerar imagem', { id: `ai-group-${group.id}` });
      }
    } finally {
      setGeneratingFor(null);
    }
  };

  const clearGroupImage = (groupId: string) => {
    onGroupImageChange(groupId, '');
  };

  const handleSelectFromGallery = (groupId: string, imageUrl: string) => {
    onGroupImageChange(groupId, imageUrl);
    setGalleryOpenFor(null);
    toast.success('Imagem selecionada!');
  };

  if (!groupByCategory || groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 animate-fade-in">
          <Layers className="h-10 w-10 text-primary/60" />
        </div>
        <h3 className="text-xl font-medium mb-2">Nenhum grupo para configurar</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {!groupByCategory 
            ? 'Ative "Separar por grupos" na etapa de Produtos para configurar imagens por grupo.'
            : 'Selecione produtos na etapa anterior para ver os grupos disponíveis.'
          }
        </p>
      </div>
    );
  }

  const completedCount = groups.filter(g => !!groupImages[g.id]).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-light tracking-tight">Imagens dos Grupos</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Defina imagens de destaque para cada grupo do catálogo. Use IA para gerar ou escolha da galeria.
        </p>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="flex items-center gap-1.5">
            {groups.map((group) => (
              <div 
                key={group.id}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  groupImages[group.id] 
                    ? "bg-green-500 scale-110" 
                    : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{groups.length} imagens
          </span>
        </div>
      </div>

      {/* Groups Grid - Image focused layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((group) => {
          const hasImage = !!groupImages[group.id];
          const isGenerating = generatingFor === group.id;
          const prompt = groupPrompts[group.id] || '';
          const isExpanded = expandedGroup === group.id;

          return (
            <div
              key={group.id}
              className={cn(
                "group relative rounded-2xl overflow-hidden transition-all duration-300",
                "border border-border/50 hover:border-border",
                "bg-gradient-to-b from-card to-card/80",
                hasImage && "ring-2 ring-green-500/20"
              )}
            >
              {/* Main Image Area - Priority Focus */}
              <div 
                className="relative aspect-[16/10] cursor-pointer"
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
              >
                {hasImage ? (
                  <>
                    <img
                      src={groupImages[group.id]}
                      alt={group.nome}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Remove button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearGroupImage(group.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    {/* Success badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium shadow-lg">
                      <Check className="h-3 w-3" />
                      Pronta
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl bg-background/50 flex items-center justify-center mb-3 backdrop-blur-sm">
                      <ImagePlus className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-medium">Adicionar imagem</p>
                    <p className="text-xs opacity-70">Clique para expandir opções</p>
                  </div>
                )}

                {/* Group name overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className={cn(
                    "font-semibold text-lg",
                    hasImage ? "text-white" : "text-foreground"
                  )}>
                    {group.nome}
                  </h4>
                  <p className={cn(
                    "text-sm",
                    hasImage ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {group.products.length} produto{group.products.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Expandable Content */}
              <div className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                isExpanded ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="p-4 space-y-4 border-t">
                  {/* Prompt Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Descrição para IA
                    </label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => onGroupPromptChange(group.id, e.target.value)}
                      placeholder={`Ex: produtos de ${group.nome.toLowerCase()} em ambiente elegante, iluminação suave...`}
                      className="min-h-[80px] resize-none text-sm bg-muted/30 border-0 focus-visible:ring-1"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={hasImage ? "secondary" : "default"}
                      className="flex-1 gap-2"
                      onClick={() => generateImageForGroup(group)}
                      disabled={isGenerating || !prompt.trim()}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isGenerating ? 'Gerando...' : 'Gerar com IA'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setGalleryOpenFor(group.id)}
                      className="gap-2"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Galeria
                      {images.length > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {images.length}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar (when collapsed) */}
              {!isExpanded && (
                <div className="p-3 flex gap-2 border-t bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-2 h-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedGroup(group.id);
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    IA
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryOpenFor(group.id);
                    }}
                    className="flex-1 gap-2 h-9"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Galeria
                  </Button>
                </div>
              )}

              {/* Gallery Dialog for this group */}
              <AIImageGallery
                open={galleryOpenFor === group.id}
                onOpenChange={(open) => !open && setGalleryOpenFor(null)}
                images={images}
                loading={imagesLoading}
                onSelect={(url) => handleSelectFromGallery(group.id, url)}
                onDelete={deleteImage}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
