import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, ImageIcon, X, Sparkles, Loader2, Wand2, FolderOpen } from 'lucide-react';
import { CatalogPage } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCatalogAIImages } from './hooks/useCatalogAIImages';
import { AIImageGallery } from './AIImageGallery';

interface StepCoverProps {
  page: CatalogPage;
  onChange: (page: CatalogPage) => void;
  onPromptChange?: (prompt: string) => void;
  imagePrompt?: string;
  primaryColor: string;
  catalogName?: string;
  businessType?: string;
  estabelecimentoId?: string | null;
}

export const StepCover: React.FC<StepCoverProps> = ({ 
  page, 
  onChange, 
  onPromptChange,
  imagePrompt: externalImagePrompt,
  primaryColor,
  catalogName,
  businessType,
  estabelecimentoId
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);
  const [imagePrompt, setImagePromptLocal] = useState(externalImagePrompt || '');
  const [galleryOpen, setGalleryOpen] = useState(false);
  
  // Sync prompt to parent when it changes
  const setImagePrompt = (prompt: string) => {
    setImagePromptLocal(prompt);
    onPromptChange?.(prompt);
  };
  
  // Estado para loading do logo
  const [logoLoading, setLogoLoading] = useState(false);
  
  // Debug: verificar se page.logoUrl está sendo atualizado
  console.log('[StepCover] Render - page.logoUrl existe?', !!page.logoUrl, 'tamanho:', page.logoUrl?.length);
  
  // AI Images hook for gallery
  const { images, loading: imagesLoading, saveImage, deleteImage, refresh: refreshGallery } = useCatalogAIImages(estabelecimentoId || 'default');

  const handleSelectFromGallery = (imageUrl: string) => {
    onChange({ ...page, backgroundImage: imageUrl });
    toast.success('Imagem selecionada!');
  };

  // Converter para base64 para garantir que funcione
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecione um arquivo de imagem");
      return;
    }
    
    setLogoLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      console.log('[StepCover] Base64 gerado, tamanho:', base64?.length);
      onChange({ ...page, logoUrl: base64 });
      setLogoLoading(false);
      toast.success('Logo carregado!');
    };
    reader.onerror = () => {
      console.error('[StepCover] Erro ao ler arquivo');
      toast.error('Erro ao carregar logo');
      setLogoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    onChange({ ...page, logoUrl: undefined });
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result) {
        onChange({ ...page, backgroundImage: result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearBackground = () => {
    onChange({ ...page, backgroundImage: undefined });
  };

  const generateAIImage = useCallback(async () => {
    if (!imagePrompt.trim()) {
      toast.error('Digite uma descrição para a imagem');
      return;
    }
    
    setGeneratingImage(true);
    toast.loading('Gerando imagem... isso pode levar até 30 segundos', { id: 'ai-image' });
    
    try {
      console.log('[StepCover] Generating AI image with prompt:', imagePrompt.trim());
      
      // Use fetch with AbortController for better timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
      
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
            prompt: `Professional catalog cover background: ${imagePrompt.trim()}`,
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
      console.log('[StepCover] AI response received:', { hasImageUrl: !!data?.imageUrl, imageUrlLength: data?.imageUrl?.length });

      if (data?.imageUrl) {
        console.log('[StepCover] Setting background image, URL:', data.imageUrl.substring(0, 100));
        
        // Apply image to catalog immediately - preserve logo
        onChange({ ...page, backgroundImage: data.imageUrl });
        
        // If saved to gallery by edge function, just refresh the gallery
        if (data.savedToGallery) {
          await refreshGallery();
          toast.success('Imagem gerada e aplicada ao catálogo!', { id: 'ai-image' });
        } else {
          // If not saved by edge function, save manually
          await saveImage(data.imageUrl, imagePrompt.trim());
          toast.success('Imagem gerada e aplicada ao catálogo!', { id: 'ai-image' });
        }
      } else {
        console.error('[StepCover] No imageUrl in response:', data);
        toast.error('Erro: imagem não retornada', { id: 'ai-image' });
      }
    } catch (error: any) {
      console.error('[StepCover] Error generating image:', error);
      const msg = error?.message || '';
      if (error.name === 'AbortError') {
        toast.error('Timeout: a geração demorou muito. Tente novamente.', { id: 'ai-image' });
      } else if (msg.includes('402') || msg.includes('billing') || msg.includes('insufficient') || msg.includes('credits') || msg.includes('Créditos') || msg.includes('exclusively available')) {
        toast.error('💳 Créditos insuficientes. Adicione saldo no provedor.', { id: 'ai-image' });
      } else if (msg.includes('429') || msg.includes('Rate limit') || msg.includes('too many') || msg.includes('Limite')) {
        toast.error('⏳ Limite de requisições excedido. Aguarde e tente novamente.', { id: 'ai-image' });
      } else {
        toast.error(msg.substring(0, 150) || 'Erro ao gerar imagem', { id: 'ai-image' });
      }
    } finally {
      setGeneratingImage(false);
    }
  }, [imagePrompt, onChange, saveImage, refreshGallery, page]);

  const generateAIText = useCallback(async () => {
    setGeneratingText(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalog-ai', {
        body: { 
          action: 'suggest-layout',
          catalogName: catalogName || 'Catálogo de Produtos',
          businessType: businessType || 'varejo'
        }
      });

      if (error) throw error;
      if (data.suggestions?.length > 0) {
        const suggestion = data.suggestions[0];
        onChange({ 
          ...page,
          title: suggestion.title,
          subtitle: suggestion.subtitle 
        });
        toast.success('Texto gerado com sucesso!');
      }
    } catch (error: any) {
      console.error('Error generating text:', error);
      const msg = error?.message || '';
      if (msg.includes('402') || msg.includes('Créditos') || msg.includes('credits') || msg.includes('billing')) {
        toast.error('💳 Créditos insuficientes. Adicione saldo no provedor.');
      } else if (msg.includes('429') || msg.includes('Limite') || msg.includes('Rate limit')) {
        toast.error('⏳ Limite de requisições excedido. Aguarde e tente novamente.');
      } else {
        toast.error(msg.substring(0, 150) || 'Erro ao gerar texto');
      }
    } finally {
      setGeneratingText(false);
    }
  }, [catalogName, businessType, onChange, page]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Capa do Catálogo</h3>
          <p className="text-sm text-muted-foreground">
            Personalize a primeira página do seu catálogo
          </p>
        </div>

        <div className="space-y-5">
          {/* AI Text Generation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Título e Subtítulo
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateAIText}
                disabled={generatingText}
                className="h-8 text-xs gap-1.5"
              >
                {generatingText ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                Gerar com IA
              </Button>
            </div>
            <Input
              value={page.title || ''}
              onChange={(e) => onChange({ ...page, title: e.target.value })}
              placeholder="Ex: Catálogo de Produtos"
              className="h-11 border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
            />
            <Input
              value={page.subtitle || ''}
              onChange={(e) => onChange({ ...page, subtitle: e.target.value })}
              placeholder="Ex: Primavera/Verão 2024"
              className="h-11 border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          {/* Logo Upload - Same pattern as ProdutoGruposCRUD */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Logo da Empresa
            </Label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
              id="logo-upload"
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoLoading}
                className="text-xs sm:text-sm"
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                {logoLoading ? 'Carregando...' : (page.logoUrl ? 'Trocar' : 'Selecionar')}
              </Button>
              {logoLoading ? (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded border bg-muted flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : page.logoUrl ? (
                <div className="relative inline-block group">
                  <img 
                    src={page.logoUrl} 
                    alt="Logo Preview" 
                    className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded border bg-white"
                    key={page.logoUrl.substring(0, 50)}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={clearLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Nenhum logo selecionado</span>
              )}
            </div>
          </div>

          {/* AI Image Generation */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Imagem de Fundo com IA
            </Label>
            
            {/* Custom Prompt */}
            <Textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Descreva a imagem que deseja, ex: paisagem moderna com tons azuis e abstratos, fundo minimalista com texturas de mármore..."
              className="min-h-[80px] resize-none text-sm"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={generateAIImage}
                disabled={generatingImage || !imagePrompt.trim()}
                className="flex-1 h-11 gap-2"
              >
                {generatingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generatingImage ? 'Gerando...' : 'Gerar com IA'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setGalleryOpen(true)}
                className="h-11 gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Galeria</span>
                {images.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {images.length}
                  </span>
                )}
              </Button>
            </div>


            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              onChange={handleBackgroundUpload}
              className="hidden"
            />

            {page.backgroundImage ? (
              <div className="relative group">
                <img
                  src={page.backgroundImage}
                  alt="Background"
                  className="w-full h-32 object-cover rounded-xl"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={clearBackground}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className="w-full h-16 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-xs"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Carregar imagem do dispositivo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="lg:col-span-3">
        <div className="sticky top-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Preview
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <div
              className="aspect-[210/297] flex flex-col overflow-hidden bg-white"
            >
              {/* Top White Header Section */}
              <div className="bg-white px-6 pt-20 pb-4 text-center">
                <h1 
                  className="text-3xl text-gray-900 tracking-[0.15em] uppercase"
                  style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 700 }}
                >
                  {page.title || 'CATALOG'}
                </h1>
                {page.subtitle && (
                  <p 
                    className="text-[8px] text-gray-400 tracking-[0.3em] uppercase mt-2"
                    style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
                  >
                    {page.subtitle}
                  </p>
                )}
                {/* Year with decorative lines */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className="w-8 h-px bg-gray-400" />
                  <span 
                    className="text-xs text-gray-600 tracking-[0.15em]"
                    style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
                  >
                    {new Date().getFullYear()}
                  </span>
                  <div className="w-8 h-px bg-gray-400" />
                </div>
              </div>

              {/* Main Image Area with 5mm margins - fixed position */}
              <div className="flex-1 px-[5mm] pb-[5mm]">
                <div className="relative w-full h-full overflow-hidden">
                  {page.backgroundImage ? (
                    <img 
                      src={page.backgroundImage}
                      alt="Cover"
                      className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">Imagem gerada por IA</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Footer Section */}
              <div className="bg-white px-4 py-3 flex items-center justify-between">
              {/* Logo bottom left */}
              <div className="flex items-center">
                {page.logoUrl ? (
                  <img 
                    src={page.logoUrl}
                    alt="Logo" 
                    className="h-6 w-auto object-contain"
                  />
                ) : (
                  <div className="w-7 h-7 border border-gray-300 rounded flex items-center justify-center">
                    <span className="text-[6px] text-gray-400 uppercase">Logo</span>
                  </div>
                )}
              </div>

                {/* Website right */}
                <span 
                  className="text-base text-gray-500 tracking-wider"
                  style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
                >
                  www.pilar.com.br
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Image Gallery Dialog */}
      <AIImageGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        images={images}
        loading={imagesLoading}
        onSelect={handleSelectFromGallery}
        onDelete={deleteImage}
      />
    </div>
  );
};
