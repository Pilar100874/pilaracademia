import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Search, Trash2, Image as ImageIcon, Video, Music, FileText, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  audio: <Music className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

const detectType = (file: File): string => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'other';
};

const MarketingGaleria: React.FC = () => {
  const { activeClinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [uploading, setUploading] = useState(false);

  const { data: media = [] } = useQuery({
    queryKey: ['marketing-media', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('marketing_media')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeClinicId,
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || !activeClinicId || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${activeClinicId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('marketing-media')
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('marketing-media').getPublicUrl(path);
        const { error: dbErr } = await supabase.from('marketing_media').insert({
          clinic_id: activeClinicId,
          name: file.name,
          media_type: detectType(file),
          storage_path: path,
          public_url: urlData.publicUrl,
          size_bytes: file.size,
          created_by: user.id,
        });
        if (dbErr) throw dbErr;
      }
      toast.success(`${files.length} arquivo(s) enviado(s)!`);
      queryClient.invalidateQueries({ queryKey: ['marketing-media'] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro no upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (item: any) => {
      await supabase.storage.from('marketing-media').remove([item.storage_path]);
      const { error } = await supabase.from('marketing_media').delete().eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido');
      queryClient.invalidateQueries({ queryKey: ['marketing-media'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = media.filter((m: any) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || m.media_type === filterType;
    return matchSearch && matchType;
  });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada!');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="image">Imagens</SelectItem>
            <SelectItem value="video">Vídeos</SelectItem>
            <SelectItem value="audio">Áudios</SelectItem>
            <SelectItem value="other">Outros</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          Enviar
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      <ScrollArea className="h-[500px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((m: any) => (
            <Card key={m.id} className="overflow-hidden group">
              <div className="aspect-square bg-muted relative">
                {m.media_type === 'image' ? (
                  <img src={m.public_url} alt={m.name} className="w-full h-full object-cover" />
                ) : m.media_type === 'video' ? (
                  <video src={m.public_url} className="w-full h-full object-cover" controls />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {TYPE_ICONS[m.media_type] || TYPE_ICONS.other}
                  </div>
                )}
              </div>
              <div className="p-2 space-y-1">
                <div className="flex items-center gap-1">
                  {TYPE_ICONS[m.media_type] || TYPE_ICONS.other}
                  <span className="text-xs truncate flex-1">{m.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => copyUrl(m.public_url)}>
                    <Copy className="h-3 w-3 mr-1" />URL
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => deleteMutation.mutate(m)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-12">
              Nenhuma mídia encontrada. Faça upload para começar.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MarketingGaleria;
