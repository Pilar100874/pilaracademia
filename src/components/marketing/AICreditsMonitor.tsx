import React, { useState } from 'react';
import { 
  CreditCard, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  DollarSign,
  Gauge,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CreditInfo {
  provider: string;
  displayName: string;
  credits?: number;
  creditsUsed?: number;
  creditsRemaining?: number;
  balance?: number;
  quota?: {
    used: number;
    total: number;
    remaining: number;
  };
  usage?: {
    tokens?: number;
    requests?: number;
    cost?: number;
  };
  plan?: string;
  error?: string;
  supported: boolean;
}

interface SavedKey {
  id: string;
  provider: string;
  provider_display_name: string;
  api_key: string | null;
  organization_id: string | null;
  is_active: boolean;
}

interface AICreditsMonitorProps {
  savedKeys: SavedKey[];
}

const PROVIDER_URLS: Record<string, string> = {
  openai: 'https://platform.openai.com/usage',
  anthropic: 'https://console.anthropic.com/settings/billing',
  google: 'https://console.cloud.google.com/billing',
  groq: 'https://console.groq.com/settings/billing',
  mistral: 'https://console.mistral.ai/billing',
  perplexity: 'https://www.perplexity.ai/settings/billing',
  cohere: 'https://dashboard.cohere.com/billing',
  deepseek: 'https://platform.deepseek.com/billing',
  together: 'https://api.together.xyz/settings/billing',
  replicate: 'https://replicate.com/account/billing',
  huggingface: 'https://huggingface.co/settings/billing',
  stability: 'https://platform.stability.ai/account/credits',
  elevenlabs: 'https://elevenlabs.io/app/subscription',
};

const AICreditsMonitor: React.FC<AICreditsMonitorProps> = ({ savedKeys }) => {
  const [creditsInfo, setCreditsInfo] = useState<Record<string, CreditInfo>>({});
  const [loadingProviders, setLoadingProviders] = useState<Set<string>>(new Set());

  const checkCredits = async (key: SavedKey) => {
    if (!key.api_key) return;

    setLoadingProviders(prev => new Set(prev).add(key.provider));

    try {
      const { data, error } = await supabase.functions.invoke('check-ai-credits', {
        body: {
          provider: key.provider,
          apiKey: key.api_key,
          organizationId: key.organization_id,
        },
      });

      if (error) throw error;

      setCreditsInfo(prev => ({
        ...prev,
        [key.provider]: data as CreditInfo,
      }));

      if (data.supported && !data.error) {
        toast.success(`Créditos de ${key.provider_display_name} verificados`);
      }
    } catch (error) {
      console.error('Error checking credits:', error);
      toast.error(`Erro ao verificar créditos de ${key.provider_display_name}`);
    } finally {
      setLoadingProviders(prev => {
        const next = new Set(prev);
        next.delete(key.provider);
        return next;
      });
    }
  };

  const checkAllCredits = async () => {
    const activeKeys = savedKeys.filter(k => k.is_active && k.api_key);
    for (const key of activeKeys) {
      await checkCredits(key);
    }
  };

  const getStatusColor = (info: CreditInfo) => {
    if (info.error) return 'text-yellow-600';
    if (info.creditsRemaining !== undefined && info.creditsRemaining <= 0) return 'text-red-600';
    if (info.quota && info.quota.remaining <= 0) return 'text-red-600';
    return 'text-green-600';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const activeKeys = savedKeys.filter(k => k.is_active);

  if (activeKeys.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Monitoramento de Créditos IA
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={checkAllCredits}
            disabled={loadingProviders.size > 0}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loadingProviders.size > 0 ? 'animate-spin' : ''}`} />
            Verificar Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeKeys.map(key => {
          const info = creditsInfo[key.provider];
          const isLoading = loadingProviders.has(key.provider);
          const billingUrl = PROVIDER_URLS[key.provider];

          return (
            <div
              key={key.id}
              className="flex items-center justify-between p-3 bg-background rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{key.provider_display_name}</span>
                  {info?.plan && (
                    <Badge variant="secondary" className="text-xs">
                      {info.plan}
                    </Badge>
                  )}
                </div>

                {info ? (
                  <div className="mt-2 space-y-1">
                    {/* OpenAI - Usage Cost */}
                    {info.usage?.cost !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span>Gasto este mês: {formatCurrency(info.usage.cost)}</span>
                        {info.balance !== undefined && (
                          <span className="text-muted-foreground">
                            (Limite restante: {formatCurrency(info.balance)})
                          </span>
                        )}
                      </div>
                    )}

                    {/* ElevenLabs - Character quota */}
                    {info.quota && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Caracteres: {formatNumber(info.quota.used)} / {formatNumber(info.quota.total)}</span>
                          <span className={getStatusColor(info)}>
                            {formatNumber(info.quota.remaining)} restantes
                          </span>
                        </div>
                        <Progress 
                          value={(info.quota.used / info.quota.total) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}

                    {/* Stability AI - Credits */}
                    {info.credits !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-3 w-3 text-muted-foreground" />
                        <span className={getStatusColor(info)}>
                          {formatNumber(info.credits)} créditos disponíveis
                        </span>
                      </div>
                    )}

                    {/* Error or unsupported */}
                    {info.error && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>{info.error}</span>
                      </div>
                    )}

                    {!info.supported && !info.error && (
                      <div className="text-xs text-muted-foreground">
                        Verificação via API não disponível
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1">
                    Clique em verificar para consultar créditos
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => checkCredits(key)}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Verificar créditos</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {billingUrl && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(billingUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Abrir painel de billing</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          );
        })}

        <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2">
          <AlertTriangle className="h-3 w-3" />
          <span>
            Alguns provedores não disponibilizam API de billing. Verifique diretamente no painel.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AICreditsMonitor;
