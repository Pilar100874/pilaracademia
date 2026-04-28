import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Music, Play, Pause, Save, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ExternalLink, RefreshCw, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';

const ELEVENLABS_VOICES = [
  { value: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger', gender: 'Masculino', lang: 'en' },
  { value: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah', gender: 'Feminino', lang: 'en' },
  { value: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura', gender: 'Feminino', lang: 'en' },
  { value: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie', gender: 'Masculino', lang: 'en' },
  { value: 'JBFqnCBsd6RMkjVDRZzb', label: 'George', gender: 'Masculino', lang: 'en' },
  { value: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum', gender: 'Masculino', lang: 'en' },
  { value: 'SAz9YHcvj6GT2YYXdXww', label: 'River', gender: 'Neutro', lang: 'en' },
  { value: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam', gender: 'Masculino', lang: 'en' },
  { value: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice', gender: 'Feminino', lang: 'en' },
  { value: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda', gender: 'Feminino', lang: 'en' },
  { value: 'bIHbv24MWmeRgasZH58o', label: 'Will', gender: 'Masculino', lang: 'en' },
  { value: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica', gender: 'Feminino', lang: 'en' },
  { value: 'cjVigY5qzO86Huf0OWal', label: 'Eric', gender: 'Masculino', lang: 'en' },
  { value: 'iP95p4xoKVk53GoZ742B', label: 'Chris', gender: 'Masculino', lang: 'en' },
  { value: 'nPczCjzI2devNBz1zQrb', label: 'Brian', gender: 'Masculino', lang: 'en' },
  { value: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel', gender: 'Masculino', lang: 'en' },
  { value: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily', gender: 'Feminino', lang: 'en' },
  { value: 'pqHfZKP75CvOlQylNhV4', label: 'Bill', gender: 'Masculino', lang: 'en' },
];

const MODELS = [
  { value: 'eleven_multilingual_v2', label: 'Multilingual v2', description: 'Melhor qualidade, 29 idiomas', quality: 5 },
  { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5', description: 'Baixa latência, boa qualidade', quality: 4 },
  { value: 'eleven_turbo_v2', label: 'Turbo v2', description: 'Mais rápido', quality: 3 },
  { value: 'eleven_monolingual_v1', label: 'Monolingual v1', description: 'Inglês apenas, legacy', quality: 2 },
];

const OUTPUT_FORMATS = [
  { value: 'mp3_44100_128', label: 'MP3 44.1kHz 128kbps (Alta qualidade)' },
  { value: 'mp3_22050_32', label: 'MP3 22kHz 32kbps (Arquivo menor)' },
  { value: 'pcm_16000', label: 'PCM 16kHz (Processamento)' },
  { value: 'pcm_24000', label: 'PCM 24kHz' },
  { value: 'pcm_44100', label: 'PCM 44.1kHz' },
];

interface ElevenLabsSettings {
  apiKey: string;
  defaultVoiceId: string;
  defaultModel: string;
  outputFormat: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  speed: number;
}

const DEFAULT_SETTINGS: ElevenLabsSettings = {
  apiKey: '',
  defaultVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
  defaultModel: 'eleven_multilingual_v2',
  outputFormat: 'mp3_44100_128',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.5,
  useSpeakerBoost: true,
  speed: 1.0,
};

const ElevenLabsConfig: React.FC = () => {
  const [settings, setSettings] = useState<ElevenLabsSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testText, setTestText] = useState('Olá! Este é um teste de áudio do ElevenLabs.');
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<'none' | 'pending' | 'valid' | 'invalid'>('none');
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const storedId = localStorage.getItem('estabelecimentoId');
      if (storedId) {
        setEstabelecimentoId(storedId);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('estabelecimento_id')
            .eq('auth_user_id', user.id)
            .single();
          if (usuario?.estabelecimento_id) {
            setEstabelecimentoId(usuario.estabelecimento_id);
          }
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (estabelecimentoId) loadSettings();
  }, [estabelecimentoId]);

  const loadSettings = async () => {
    if (!estabelecimentoId) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('ai_api_keys')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('provider', 'elevenlabs')
        .maybeSingle();

      if (data) {
        const extraConfig = (data.base_url ? JSON.parse(data.base_url) : {}) as Record<string, any>;
        setSettings({
          apiKey: data.api_key || '',
          defaultVoiceId: extraConfig.defaultVoiceId || DEFAULT_SETTINGS.defaultVoiceId,
          defaultModel: extraConfig.defaultModel || DEFAULT_SETTINGS.defaultModel,
          outputFormat: extraConfig.outputFormat || DEFAULT_SETTINGS.outputFormat,
          stability: extraConfig.stability ?? DEFAULT_SETTINGS.stability,
          similarityBoost: extraConfig.similarityBoost ?? DEFAULT_SETTINGS.similarityBoost,
          style: extraConfig.style ?? DEFAULT_SETTINGS.style,
          useSpeakerBoost: extraConfig.useSpeakerBoost ?? DEFAULT_SETTINGS.useSpeakerBoost,
          speed: extraConfig.speed ?? DEFAULT_SETTINGS.speed,
        });
        setApiKeyStatus(data.validation_status === 'valid' ? 'valid' : data.api_key ? 'pending' : 'none');
      }
    } catch (err) {
      console.error('Error loading ElevenLabs settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!estabelecimentoId) {
      toast.error('Estabelecimento não encontrado');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('estabelecimento_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!usuario?.estabelecimento_id) {
      toast.error('Usuário não vinculado a um estabelecimento');
      return;
    }

    setIsSaving(true);
    try {
      const extraConfig = JSON.stringify({
        defaultVoiceId: settings.defaultVoiceId,
        defaultModel: settings.defaultModel,
        outputFormat: settings.outputFormat,
        stability: settings.stability,
        similarityBoost: settings.similarityBoost,
        style: settings.style,
        useSpeakerBoost: settings.useSpeakerBoost,
        speed: settings.speed,
      });

      const payload = {
        estabelecimento_id: usuario.estabelecimento_id,
        provider: 'elevenlabs',
        provider_display_name: 'ElevenLabs',
        api_key: settings.apiKey || null,
        base_url: extraConfig,
        is_active: true,
        validation_status: settings.apiKey ? 'pending' : 'none',
      };

      const { data: existing } = await supabase
        .from('ai_api_keys')
        .select('id')
        .eq('estabelecimento_id', usuario.estabelecimento_id)
        .eq('provider', 'elevenlabs')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('ai_api_keys').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_api_keys').insert(payload);
        if (error) throw error;
      }

      toast.success('Configurações do ElevenLabs salvas com sucesso!');
      setApiKeyStatus(settings.apiKey ? 'pending' : 'none');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestVoice = async () => {
    if (!settings.apiKey) {
      toast.error('Configure a API Key antes de testar');
      return;
    }
    if (!testText.trim()) {
      toast.error('Digite um texto para testar');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${settings.defaultVoiceId}?output_format=${settings.outputFormat}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': settings.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: testText,
            model_id: settings.defaultModel,
            voice_settings: {
              stability: settings.stability,
              similarity_boost: settings.similarityBoost,
              style: settings.style,
              use_speaker_boost: settings.useSpeakerBoost,
              speed: settings.speed,
            },
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setApiKeyStatus('invalid');
          toast.error('API Key inválida. Verifique sua chave.');
          return;
        }
        throw new Error(`Erro ${response.status}`);
      }

      setApiKeyStatus('valid');

      // Update validation status
      const { data: existing } = await supabase
        .from('ai_api_keys')
        .select('id')
        .eq('estabelecimento_id', estabelecimentoId!)
        .eq('provider', 'elevenlabs')
        .maybeSingle();

      if (existing) {
        await supabase.from('ai_api_keys').update({ validation_status: 'valid' }).eq('id', existing.id);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);

      if (testAudioUrl) URL.revokeObjectURL(testAudioUrl);
      setTestAudioUrl(url);

      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);

      toast.success('Áudio gerado com sucesso! API Key válida.');
    } catch (err) {
      console.error('Test error:', err);
      toast.error('Erro ao testar: ' + (err instanceof Error ? err.message : 'Desconhecido'));
    } finally {
      setIsTesting(false);
    }
  };

  const togglePlayback = () => {
    if (!audioElement) return;
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const update = <K extends keyof ElevenLabsSettings>(key: K, value: ElevenLabsSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const selectedVoice = ELEVENLABS_VOICES.find(v => v.value === settings.defaultVoiceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Configuração ElevenLabs
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure a API do ElevenLabs para geração de áudio, voz e música
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apiKeyStatus === 'valid' && (
            <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3" /> Conectado
            </Badge>
          )}
          {apiKeyStatus === 'invalid' && (
            <Badge className="gap-1 bg-red-500/10 text-red-600 border-red-500/20">
              <AlertCircle className="h-3 w-3" /> Inválida
            </Badge>
          )}
          {apiKeyStatus === 'pending' && (
            <Badge className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <AlertCircle className="h-3 w-3" /> Pendente
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credentials">🔑 Credenciais</TabsTrigger>
          <TabsTrigger value="voice">🎙️ Voz Padrão</TabsTrigger>
          <TabsTrigger value="test">🧪 Testar</TabsTrigger>
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API Key</CardTitle>
              <CardDescription>
                Obtenha sua chave em{' '}
                <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  elevenlabs.io <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ElevenLabs API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.apiKey}
                      onChange={(e) => update('apiKey', e.target.value)}
                      placeholder="Sua API Key do ElevenLabs"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Modelo Padrão</Label>
                <Select value={settings.defaultModel} onValueChange={(v) => update('defaultModel', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex items-center gap-2">
                          <span>{m.label}</span>
                          <span className="text-xs text-muted-foreground">— {m.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato de Saída</Label>
                <Select value={settings.outputFormat} onValueChange={(v) => update('outputFormat', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Settings Tab */}
        <TabsContent value="voice" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voz Padrão</CardTitle>
              <CardDescription>Selecione a voz e ajuste os parâmetros de fala</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Voz</Label>
                <Select value={settings.defaultVoiceId} onValueChange={(v) => update('defaultVoiceId', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEVENLABS_VOICES.map(v => (
                      <SelectItem key={v.value} value={v.value}>
                        <div className="flex items-center gap-2">
                          <span>{v.label}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{v.gender}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVoice && (
                  <p className="text-xs text-muted-foreground">
                    Selecionado: {selectedVoice.label} ({selectedVoice.gender})
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Parâmetros de Voz</h4>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Estabilidade</Label>
                    <span className="text-xs text-muted-foreground">{settings.stability.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[settings.stability]}
                    onValueChange={([v]) => update('stability', v)}
                    min={0} max={1} step={0.05}
                  />
                  <p className="text-[10px] text-muted-foreground">Menor = mais expressivo · Maior = mais consistente</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Similaridade</Label>
                    <span className="text-xs text-muted-foreground">{settings.similarityBoost.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[settings.similarityBoost]}
                    onValueChange={([v]) => update('similarityBoost', v)}
                    min={0} max={1} step={0.05}
                  />
                  <p className="text-[10px] text-muted-foreground">Fidelidade à voz original</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Estilo</Label>
                    <span className="text-xs text-muted-foreground">{settings.style.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[settings.style]}
                    onValueChange={([v]) => update('style', v)}
                    min={0} max={1} step={0.05}
                  />
                  <p className="text-[10px] text-muted-foreground">Exagero estilístico (somente Multilingual v2+)</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Velocidade</Label>
                    <span className="text-xs text-muted-foreground">{settings.speed.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[settings.speed]}
                    onValueChange={([v]) => update('speed', v)}
                    min={0.7} max={1.2} step={0.1}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Speaker Boost</Label>
                    <p className="text-[10px] text-muted-foreground">Melhora clareza e similaridade</p>
                  </div>
                  <Switch
                    checked={settings.useSpeakerBoost}
                    onCheckedChange={(v) => update('useSpeakerBoost', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Testar Geração de Áudio
              </CardTitle>
              <CardDescription>
                Teste sua configuração gerando um áudio de exemplo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texto de teste</Label>
                <Textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Digite o texto para converter em áudio..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleTestVoice} disabled={isTesting || !settings.apiKey}>
                  {isTesting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                  ) : (
                    <><Volume2 className="h-4 w-4 mr-2" /> Gerar Áudio</>
                  )}
                </Button>

                {testAudioUrl && (
                  <Button variant="outline" onClick={togglePlayback}>
                    {isPlaying ? (
                      <><Pause className="h-4 w-4 mr-2" /> Pausar</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Reproduzir</>
                    )}
                  </Button>
                )}
              </div>

              {!settings.apiKey && (
                <p className="text-xs text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Configure a API Key na aba "Credenciais" antes de testar
                </p>
              )}

              {testAudioUrl && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-2">Áudio gerado:</p>
                  <audio controls src={testAudioUrl} className="w-full" />
                </div>
              )}

              <Separator />

              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <h4 className="text-sm font-medium">Configuração atual do teste:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Voz: <span className="text-foreground">{selectedVoice?.label || '—'}</span></div>
                  <div>Modelo: <span className="text-foreground">{MODELS.find(m => m.value === settings.defaultModel)?.label || '—'}</span></div>
                  <div>Estabilidade: <span className="text-foreground">{settings.stability}</span></div>
                  <div>Similaridade: <span className="text-foreground">{settings.similarityBoost}</span></div>
                  <div>Velocidade: <span className="text-foreground">{settings.speed}x</span></div>
                  <div>Formato: <span className="text-foreground">{settings.outputFormat}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Salvar Configurações</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ElevenLabsConfig;
