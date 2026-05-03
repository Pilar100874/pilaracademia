import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { fileToBase64 } from '@/lib/analyzeFood';
import { useBodyAnalyses } from '@/hooks/useBodyAnalyses';
import { useProfile } from '@/hooks/useProfile';
import { useWeightHistory } from '@/hooks/useWeightHistory';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { differenceInDays, parseISO } from 'date-fns';
import type { BodyPlan } from '@/types/bodyAnalysis';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type JobKind = 'bioimpedance' | 'blood_exam';
interface Job {
  id: string;
  kind: JobKind;
  step: string;
}

interface Ctx {
  jobs: Job[];
  startBioimpedance: (file: File) => void;
  startBloodExam: (file: File) => void;
}

const BackgroundAnalysisContext = createContext<Ctx | null>(null);

export function useBackgroundAnalysis() {
  const ctx = useContext(BackgroundAnalysisContext);
  if (!ctx) throw new Error('useBackgroundAnalysis fora do provider');
  return ctx;
}

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(' ') + '\n';
  }
  return text;
}

export function BackgroundAnalysisProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { create, list } = useBodyAnalyses();
  const { updateProfile } = useProfile();
  const { addWeightEntry, refetch: refetchWeights } = useWeightHistory();
  const { allExercises } = useExerciseLibrary();
  const [jobs, setJobs] = useState<Job[]>([]);
  const idRef = useRef(0);

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);
  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const startBioimpedance = useCallback(
    (file: File) => {
      if (!user) {
        toast.error('Faça login para analisar relatórios');
        return;
      }
      const id = `bio-${++idRef.current}`;
      const job: Job = { id, kind: 'bioimpedance', step: 'Preparando…' };
      setJobs((prev) => [...prev, job]);

      const toastId = toast.loading('Analisando bioimpedância em segundo plano…', {
        description: 'Você pode continuar usando o app. Avisaremos quando terminar.',
        duration: Infinity,
      });

      (async () => {
        try {
          updateJob(id, { step: 'Lendo imagem…' });
          const base64 = await fileToBase64(file);

          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `${user.id}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('body-analysis-reports')
            .upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' });
          const { data: pub } = supabase.storage.from('body-analysis-reports').getPublicUrl(path);
          const imageUrl = upErr ? null : pub.publicUrl;

          toast.loading('Analisando bioimpedância com IA…', { id: toastId });
          updateJob(id, { step: 'Analisando com IA…' });

          const library = (allExercises || []).map((ex) => ({ id: ex.id, name: ex.name }));
          const prevRow = (list.data || [])[0];
          const previous = prevRow
            ? {
                measured_at: prevRow.measured_at || prevRow.created_at,
                extracted: prevRow.extracted,
                score: prevRow.score,
                days_since: prevRow.created_at
                  ? differenceInDays(new Date(), parseISO(prevRow.created_at))
                  : null,
              }
            : null;

          const { data, error } = await supabase.functions.invoke('analyze-bioimpedance', {
            body: { imageBase64: base64, library, previous },
          });
          if (error) throw error;
          if (!data?.success || !data?.data) throw new Error(data?.error || 'Falha ao analisar relatório');

          const plan = data.data as BodyPlan;
          const created = await create.mutateAsync({ plan, imageUrl });

          // sync profile
          const w = Number(plan.extracted?.weight_kg);
          const h = Number(plan.extracted?.height_cm);
          const sex = plan.extracted?.sex;
          const profileUpdate: Record<string, unknown> = {};
          if (Number.isFinite(w) && w >= 30 && w <= 300) profileUpdate.weight_kg = w;
          if (Number.isFinite(h) && h >= 100 && h <= 250) profileUpdate.height_cm = h;
          if (sex === 'male' || sex === 'female') profileUpdate.gender = sex;
          if (Object.keys(profileUpdate).length > 0) {
            try { await updateProfile(profileUpdate); } catch (e) { console.warn(e); }
          }
          if (Number.isFinite(w) && w >= 30 && w <= 300) {
            try { await addWeightEntry(w); await refetchWeights(); } catch (e) { console.warn(e); }
          }

          toast.success('Bioimpedância analisada!', {
            id: toastId,
            description: 'Plano corporal pronto para visualização.',
            duration: 10000,
            action: {
              label: 'Ver análise',
              onClick: () => navigate(`/body-analysis?id=${created.id}`),
            },
          });
        } catch (e) {
          console.error(e);
          toast.error('Falha ao analisar bioimpedância', {
            id: toastId,
            description: e instanceof Error ? e.message : undefined,
            duration: 8000,
          });
        } finally {
          removeJob(id);
        }
      })();
    },
    [user, allExercises, list.data, create, updateProfile, addWeightEntry, refetchWeights, navigate, updateJob, removeJob],
  );

  const startBloodExam = useCallback(
    (file: File) => {
      if (!user) {
        toast.error('Faça login para enviar exames');
        return;
      }
      if (file.type !== 'application/pdf') {
        toast.error('Envie um arquivo PDF');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Arquivo muito grande (máx. 20MB)');
        return;
      }

      const id = `blood-${++idRef.current}`;
      const job: Job = { id, kind: 'blood_exam', step: 'Lendo PDF…' };
      setJobs((prev) => [...prev, job]);

      const toastId = toast.loading('Analisando exame em segundo plano…', {
        description: 'Você pode continuar usando o app. Avisaremos quando terminar.',
        duration: Infinity,
      });

      (async () => {
        try {
          updateJob(id, { step: 'Lendo PDF…' });
          const rawText = await extractPdfText(file);
          if (!rawText.trim()) throw new Error('Não foi possível ler o texto do PDF');

          updateJob(id, { step: 'Enviando arquivo…' });
          const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
          const { error: upErr } = await supabase.storage
            .from('blood-exams')
            .upload(path, file, { contentType: 'application/pdf', upsert: false });
          if (upErr) throw upErr;
          const { data: signed } = await supabase.storage
            .from('blood-exams')
            .createSignedUrl(path, 60 * 60 * 24 * 365);
          const fileUrl = signed?.signedUrl || path;

          toast.loading('Analisando marcadores com IA…', { id: toastId });
          updateJob(id, { step: 'Analisando com IA…' });
          const { data: extracted, error: fnErr } = await supabase.functions.invoke('extract-blood-exam', {
            body: { rawText },
          });
          if (fnErr) throw fnErr;
          if (extracted?.error) throw new Error(extracted.error);

          updateJob(id, { step: 'Salvando…' });
          const { error: insErr } = await supabase.from('blood_exams').insert({
            user_id: user.id,
            file_url: fileUrl,
            file_name: file.name,
            collected_at: extracted.collected_at || null,
            lab_name: extracted.lab_name || null,
            markers: extracted.markers || [],
            summary: extracted.summary || null,
            alerts: extracted.alerts || [],
            diet_recommendations: extracted.diet_recommendations || [],
            raw_text: rawText.slice(0, 50000),
            status: 'analyzed',
          });
          if (insErr) throw insErr;

          queryClient.invalidateQueries({ queryKey: ['blood-exams', user.id] });

          toast.success('Exame analisado!', {
            id: toastId,
            description: 'Marcadores extraídos e prontos para uso.',
            duration: 10000,
            action: {
              label: 'Ver exame',
              onClick: () => navigate('/bioimpedance?tab=blood'),
            },
          });
        } catch (e) {
          console.error(e);
          toast.error('Falha ao analisar exame', {
            id: toastId,
            description: e instanceof Error ? e.message : undefined,
            duration: 8000,
          });
        } finally {
          removeJob(id);
        }
      })();
    },
    [user, queryClient, navigate, updateJob, removeJob],
  );

  return (
    <BackgroundAnalysisContext.Provider value={{ jobs, startBioimpedance, startBloodExam }}>
      {children}
    </BackgroundAnalysisContext.Provider>
  );
}
