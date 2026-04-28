import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserClinicRole } from '@/hooks/useUserClinicRole';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const MarketingStrategyEngine: React.FC = () => {
  const { data: clinicInfo } = useUserClinicRole();
  const activeClinicId = clinicInfo?.clinicId ?? null;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string>('');

  const { data: strategies = [] } = useQuery({
    queryKey: ['marketing-strategies', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('marketing_strategies')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeClinicId,
  });

  const handleGenerate = async () => {
    if (!goal.trim() || !activeClinicId || !user) return;
    setGenerating(true);
    setGenerated('');
    try {
      const prompt = `Crie uma estratégia de marketing detalhada para uma clínica/estúdio de Pilates.

Objetivo: ${goal}
Público-alvo: ${audience || 'não definido'}

Inclua: 1) 3 pilares estratégicos, 2) canais recomendados (Instagram, WhatsApp, Google), 3) tipos de conteúdo, 4) cronograma sugerido de 4 semanas, 5) métricas para acompanhar.
Formato: markdown estruturado.`;

      const { data, error } = await supabase.functions.invoke('marketing-ai', {
        body: { mode: 'text', prompt },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGenerated(data.text);

      await supabase.from('marketing_strategies').insert({
        clinic_id: activeClinicId,
        name: name || `Estratégia ${new Date().toLocaleDateString()}`,
        goal,
        target_audience: audience || null,
        plan: { content: data.text, model: data.model },
        created_by: user.id,
      });
      queryClient.invalidateQueries({ queryKey: ['marketing-strategies'] });
      toast.success('Estratégia gerada e salva!');
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    } finally {
      setGenerating(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_strategies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing-strategies'] }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold">Gerar nova estratégia com IA</span>
        </div>
        <div className="grid gap-2">
          <div>
            <Label>Nome (opcional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Captação Q1 2026" />
          </div>
          <div>
            <Label>Objetivo *</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex: aumentar matrículas em 30% em 3 meses" />
          </div>
          <div>
            <Label>Público-alvo</Label>
            <Textarea value={audience} onChange={(e) => setAudience(e.target.value)} rows={2} placeholder="Ex: mulheres 30-50 anos, sedentárias, com dores nas costas" />
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={generating || !goal.trim()}>
          {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          Gerar Estratégia
        </Button>
      </Card>

      {generated && (
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground mb-2">Resultado mais recente</div>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{generated}</div>
        </Card>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-2">Estratégias salvas ({strategies.length})</h3>
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {strategies.map((s: any) => (
              <Card key={s.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{s.name}</span>
                      <Badge variant="outline">{s.status}</Badge>
                    </div>
                    {s.goal && <p className="text-xs text-muted-foreground"><strong>Objetivo:</strong> {s.goal}</p>}
                    {s.plan?.content && <p className="text-sm mt-1 line-clamp-3 whitespace-pre-wrap">{s.plan.content}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
            {strategies.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Nenhuma estratégia ainda.</div>}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MarketingStrategyEngine;
