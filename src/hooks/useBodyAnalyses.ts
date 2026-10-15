import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { BodyAnalysisRow, BodyPlan } from '@/types/bodyAnalysis';
import { signRowsMedia } from '@/lib/signedMediaUrl';

export function useBodyAnalyses() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['body-analyses', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_analyses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Bucket privé : URL signée temporaire pour l'affichage.
      return signRowsMedia((data || []) as unknown as BodyAnalysisRow[], ['image_url']);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('body_analyses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-analyses', user?.id] }),
  });

  const create = useMutation({
    mutationFn: async ({
      plan,
      imageUrl,
    }: {
      plan: BodyPlan;
      imageUrl: string | null;
    }) => {
      if (!user) throw new Error('not authenticated');
      const { data, error } = await supabase
        .from('body_analyses')
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          measured_at: plan.extracted?.measured_at || null,
          extracted: plan.extracted as never,
          plan: plan as never,
          summary: plan.summary,
          score: Math.round(plan.score ?? 0),
          profile_label: plan.profile_label,
          goal: plan.goal?.primary || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BodyAnalysisRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-analyses', user?.id] }),
  });

  return { list, create, remove };
}
