import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ProgressAngle = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: string;
  user_id: string;
  taken_at: string;
  angle: ProgressAngle;
  image_url: string;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
}

export function useProgressPhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false });
    if (!error && data) setPhotos(data as ProgressPhoto[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const upload = async (file: File, angle: ProgressAngle, weight_kg?: number, notes?: string) => {
    if (!user) throw new Error('Não autenticado');
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}-${angle}.${ext}`;
    const { error: upErr } = await supabase.storage.from('progress-photos').upload(path, file, { upsert: false });
    if (upErr) throw upErr;
    const { data: signed } = await supabase.storage.from('progress-photos').createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signed?.signedUrl || path;
    const { data, error } = await supabase
      .from('progress_photos')
      .insert({ user_id: user.id, angle, image_url: url, weight_kg: weight_kg ?? null, notes: notes ?? null })
      .select()
      .single();
    if (error) throw error;
    setPhotos((prev) => [data as ProgressPhoto, ...prev]);
    return data as ProgressPhoto;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('progress_photos').delete().eq('id', id);
    if (error) throw error;
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  return { photos, loading, upload, remove, refetch: fetch };
}
