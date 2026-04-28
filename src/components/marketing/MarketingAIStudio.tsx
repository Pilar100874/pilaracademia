import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserClinicRole } from '@/hooks/useUserClinicRole';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Image as ImageIcon, FileText, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MarketingAIStudio: React.FC = () => {
  const { data: clinicInfo } = useUserClinicRole();
  const activeClinicId = clinicInfo?.clinicId ?? null;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [latestResult, setLatestResult] = useState<{ text?: string; imageUrl?: string | null } | null>(null);

  const { data: history = [] } = useQuery({
    queryKey: ['marketing-ai-creations', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('marketing_ai_creations')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeClinicId,
  });

  const handleGenerate = async () => {
    if (!prompt.trim() || !activeClinicId || !user) return;
    setGenerating(true);
    setLatestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('marketing-ai', {
        body: { mode, prompt },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setLatestResult({ text: data.text, imageUrl: data.imageUrl });

      await supabase.from('marketing_ai_creations').insert({
        clinic_id: activeClinicId,
        creation_type: mode,
        prompt,
        result_text: data.text || null,
        result_url: data.imageUrl || null,
        model: data.model,
        created_by: user.id,
      });
      queryClient.invalidateQueries({ queryKey: ['marketing-ai-creations'] });
      toast.success('Conteúdo gerado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar');
    } finally {
      setGenerating(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_ai_creations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing-ai-creations'] }),
  });

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList>
          <TabsTrigger value="text"><FileText className="h-4 w-4 mr-1" />Texto</TabsTrigger>
          <TabsTrigger value="image"><ImageIcon className="h-4 w-4 mr-1" />Imagem</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="mt-3">
          <Label>Prompt</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Ex: escreva uma legenda do Instagram para divulgar uma promoção de Pilates 15% off..."
          />
        </TabsContent>
        <TabsContent value="image" className="mt-3">
          <Label>Prompt da imagem</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Ex: estúdio de pilates moderno e minimalista com luz natural, plantas e equipamentos brancos"
          />
        </TabsContent>
      </Tabs>

      <Button onClick={handleGenerate} disabled={generating || !prompt.trim()} className="w-full sm:w-auto">
        {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
        Gerar com IA
      </Button>

      {latestResult && (
        <Card className="p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Resultado</div>
          {latestResult.imageUrl && (
            <img src={latestResult.imageUrl} alt="Gerado" className="rounded-md max-w-md" />
          )}
          {latestResult.text && (
            <div className="space-y-2">
              <p className="text-sm whitespace-pre-wrap">{latestResult.text}</p>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(latestResult.text!); toast.success('Copiado'); }}>
                <Copy className="h-3 w-3 mr-1" />Copiar
              </Button>
            </div>
          )}
        </Card>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-2">Histórico ({history.length})</h3>
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {history.map((h: any) => (
              <Card key={h.id} className="p-3">
                <div className="flex items-start gap-3">
                  {h.result_url && h.creation_type === 'image' && (
                    <img src={h.result_url} alt="" className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{h.creation_type}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(h.created_at), 'dd/MM HH:mm')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 italic">{h.prompt}</p>
                    {h.result_text && <p className="text-sm line-clamp-2 mt-1">{h.result_text}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(h.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
            {history.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">Nenhuma criação ainda.</div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MarketingAIStudio;
