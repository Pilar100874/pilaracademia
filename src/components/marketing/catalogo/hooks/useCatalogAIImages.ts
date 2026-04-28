import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CatalogAIImage {
  id: string;
  estabelecimento_id: string;
  storage_path: string;
  public_url: string;
  prompt: string | null;
  created_at: string;
}

export function useCatalogAIImages(estabelecimentoId: string) {
  const [images, setImages] = useState<CatalogAIImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data, error } = await supabase
        .from('catalog_ai_images')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error: any) {
      console.error('Error fetching AI images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [estabelecimentoId]);

  const saveImage = async (imageUrl: string, prompt: string): Promise<CatalogAIImage | null> => {
    try {
      // If it's a base64 image, upload to storage
      if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const filename = `${estabelecimentoId}/${Date.now()}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('catalog-ai-images')
          .upload(filename, binaryData, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('catalog-ai-images')
          .getPublicUrl(filename);

        // Save reference to database
        const { data, error } = await supabase
          .from('catalog_ai_images')
          .insert({
            estabelecimento_id: estabelecimentoId,
            storage_path: filename,
            public_url: urlData.publicUrl,
            prompt: prompt
          })
          .select()
          .single();

        if (error) throw error;
        
        setImages(prev => [data, ...prev]);
        return data;
      } else {
        // Already a URL, just save the reference
        const filename = imageUrl.split('/').pop() || `${Date.now()}.png`;
        
        const { data, error } = await supabase
          .from('catalog_ai_images')
          .insert({
            estabelecimento_id: estabelecimentoId,
            storage_path: filename,
            public_url: imageUrl,
            prompt: prompt
          })
          .select()
          .single();

        if (error) throw error;
        
        setImages(prev => [data, ...prev]);
        return data;
      }
    } catch (error: any) {
      console.error('Error saving image:', error);
      toast.error('Erro ao salvar imagem na galeria');
      return null;
    }
  };

  const deleteImage = async (image: CatalogAIImage) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('catalog-ai-images')
        .remove([image.storage_path]);

      if (storageError) {
        console.warn('Storage delete error:', storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from('catalog_ai_images')
        .delete()
        .eq('id', image.id);

      if (error) throw error;
      
      setImages(prev => prev.filter(img => img.id !== image.id));
      toast.success('Imagem removida');
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast.error('Erro ao remover imagem');
    }
  };

  return {
    images,
    loading,
    saveImage,
    deleteImage,
    refetch: fetchImages,
    refresh: fetchImages
  };
}
