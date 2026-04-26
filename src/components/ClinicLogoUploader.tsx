import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ClinicLogoUploader({ value, onChange, disabled }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Máx. 5MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('clinic-logos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('clinic-logos').getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Logo enviado');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
        {value ? (
          <img src={value} alt="Logo" className="h-full w-full object-contain" />
        ) : (
          <Building2 className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <Button asChild variant="outline" size="sm" disabled={disabled || uploading}>
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {value ? 'Trocar logo' : 'Enviar logo'}
            </span>
          </Button>
        </label>
        {value && (
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(null)}>
            <X className="h-4 w-4 mr-1" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}
