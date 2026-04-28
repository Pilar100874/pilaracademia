import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CatalogPage } from './types';
import { Phone, Mail, Globe, MapPin, Sparkles, Loader2, X, ImageIcon, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCatalogAIImages } from './hooks/useCatalogAIImages';
import { AIImageGallery } from './AIImageGallery';

interface StepBackcoverProps {
  page: CatalogPage;
  onChange: (page: CatalogPage) => void;
  primaryColor: string;
  logoUrl?: string;
  estabelecimentoId?: string;
}

export const StepBackcover: React.FC<StepBackcoverProps> = ({ 
  page, 
  onChange, 
  primaryColor,
  logoUrl,
  estabelecimentoId = 'default'
}) => {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  
  const { images, loading: imagesLoading, saveImage, deleteImage } = useCatalogAIImages(estabelecimentoId);

  const updateContact = (field: keyof CatalogPage['contactInfo'], value: string) => {
    onChange({
      ...page,
      contactInfo: {
        ...page.contactInfo,
        [field]: value,
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onChange({ ...page, backgroundImage: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    onChange({ ...page, backgroundImage: undefined });
  };

  const handleSelectFromGallery = (imageUrl: string) => {
    onChange({ ...page, backgroundImage: imageUrl });
    toast.success('Imagem selecionada!');
  };

  const generateAIImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Digite uma descrição para a imagem');
      return;
    }
    
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalog-ai', {
        body: { 
          action: 'generate-image',
          prompt: `Professional catalog back cover background: ${imagePrompt.trim()}, suitable for contact information display`,
          estabelecimentoId,
          saveToGallery: true
        }
      });

      if (error) throw error;
      if (data.imageUrl) {
        onChange({ ...page, backgroundImage: data.imageUrl });
        
        // Save to gallery
        await saveImage(data.imageUrl, imagePrompt.trim());
        
        toast.success('Imagem gerada e salva na galeria!');
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast.error(error.message || 'Erro ao gerar imagem');
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Contracapa</h3>
          <p className="text-sm text-muted-foreground">
            Configure as informações de contato
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Título
            </Label>
            <Input
              value={page.title || ''}
              onChange={(e) => onChange({ ...page, title: e.target.value })}
              placeholder="Ex: Entre em Contato"
              className="h-11 border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Telefone
            </Label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={page.contactInfo?.phone || ''}
                onChange={(e) => updateContact('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                className="pl-11 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={page.contactInfo?.email || ''}
                onChange={(e) => updateContact('email', e.target.value)}
                placeholder="contato@empresa.com"
                className="pl-11 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Website
            </Label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={page.contactInfo?.website || ''}
                onChange={(e) => updateContact('website', e.target.value)}
                placeholder="www.empresa.com"
                className="pl-11 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Endereço
            </Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
              <Textarea
                value={page.contactInfo?.address || ''}
                onChange={(e) => updateContact('address', e.target.value)}
                placeholder="Rua Exemplo, 123 - Cidade - Estado"
                className="pl-11 min-h-[80px] rounded-xl resize-none"
              />
            </div>
          </div>

          {/* AI Image Generation */}
          <div className="space-y-3 pt-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Imagem de Fundo com IA
            </Label>
            
            <Textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Descreva a imagem que deseja, ex: paisagem moderna com tons azuis, fundo minimalista..."
              className="min-h-[70px] resize-none text-sm"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={generateAIImage}
                disabled={generatingImage || !imagePrompt.trim()}
                className="flex-1 h-10 gap-2"
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
                className="h-10 gap-2"
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {page.backgroundImage ? (
              <div className="relative group">
                <img
                  src={page.backgroundImage}
                  alt="Background"
                  className="w-full h-24 object-cover rounded-xl"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={clearImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className="w-full h-14 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-xs"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Carregar imagem do dispositivo</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Cor de Fundo
            </Label>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg shadow-sm border cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: page.backgroundColor || primaryColor }}
                onClick={() => document.getElementById('backcover-bg-color')?.click()}
              />
              <Input
                id="backcover-bg-color"
                type="color"
                value={page.backgroundColor || primaryColor}
                onChange={(e) => onChange({ ...page, backgroundColor: e.target.value })}
                className="sr-only"
              />
              <Input
                value={page.backgroundColor || primaryColor}
                onChange={(e) => onChange({ ...page, backgroundColor: e.target.value })}
                className="flex-1 h-10 font-mono text-sm"
              />
            </div>
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
              className="aspect-[210/297] relative flex overflow-hidden"
              style={{
                backgroundColor: page.backgroundColor || '#1a1a1a',
              }}
            >
              {/* Background */}
              {page.backgroundImage && (
                <>
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${page.backgroundImage})` }}
                  />
                  <div className="absolute inset-0 bg-black/60" />
                </>
              )}

              {/* Left Side - Decorative */}
              <div className="relative z-10 w-1/2 flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-4xl font-light text-white/20 uppercase tracking-widest">
                    <span className="font-serif italic block">{new Date().getFullYear()}</span>
                  </h2>
                </div>
              </div>

              {/* Right Side - Contact Info */}
              <div className="relative z-10 w-1/2 flex flex-col justify-center p-8 bg-white/5 backdrop-blur-sm">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-light text-white">
                      <span className="font-serif italic text-white/60">Product</span>
                      {' '}
                      <span className="font-bold uppercase">CATALOG</span>
                    </h3>
                    <div className="w-12 h-0.5 bg-white/30" />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-white/60 uppercase tracking-wider">
                      {page.title || 'Contact us'}
                    </p>
                    
                    <div className="space-y-2 text-xs">
                      {page.contactInfo?.phone && (
                        <div className="flex items-center gap-2 text-white/80">
                          <Phone className="h-3 w-3 text-white/40" />
                          <span>{page.contactInfo.phone}</span>
                        </div>
                      )}
                      {page.contactInfo?.email && (
                        <div className="flex items-center gap-2 text-white/80">
                          <Mail className="h-3 w-3 text-white/40" />
                          <span>{page.contactInfo.email}</span>
                        </div>
                      )}
                      {page.contactInfo?.website && (
                        <div className="flex items-center gap-2 text-white/80">
                          <Globe className="h-3 w-3 text-white/40" />
                          <span>{page.contactInfo.website}</span>
                        </div>
                      )}
                      {page.contactInfo?.address && (
                        <div className="flex items-start gap-2 text-white/80">
                          <MapPin className="h-3 w-3 text-white/40 mt-0.5" />
                          <span className="line-clamp-2">{page.contactInfo.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
