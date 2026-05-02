import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface BloodMarker {
  key: string;
  label: string;
  value: number | null;
  unit: string | null;
  ref_min?: number | null;
  ref_max?: number | null;
  status: 'low' | 'normal' | 'high' | 'borderline' | 'unknown';
  category: string;
  note?: string | null;
}

export interface BloodExamRow {
  id: string;
  user_id: string;
  file_url: string | null;
  file_name: string | null;
  collected_at: string | null;
  lab_name: string | null;
  markers: BloodMarker[];
  summary: string | null;
  alerts: string[];
  diet_recommendations: string[];
  raw_text: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useBloodExams() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['blood-exams', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<BloodExamRow[]> => {
      const { data, error } = await supabase
        .from('blood_exams')
        .select('*')
        .order('collected_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BloodExamRow[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const row = list.data?.find((r) => r.id === id);
      if (row?.file_url && user?.id) {
        const path = row.file_url.split('/blood-exams/')[1];
        if (path) await supabase.storage.from('blood-exams').remove([path]);
      }
      const { error } = await supabase.from('blood_exams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blood-exams', user?.id] });
      toast.success('Exame removido');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { list, remove };
}
