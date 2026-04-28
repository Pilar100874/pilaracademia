import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, Wand2, Film, ArrowRight, ImageIcon, Pencil, Plus, Check, X, Sparkles, Lock, Save, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TimelineClip } from './types';
import { BridgeGenerationTask } from './BridgeGenerationManager';


interface AIBridgeVideoDialogProps {
  open: boolean;
  onClose: () => void;
  clipA: TimelineClip;
  clipB: TimelineClip;
  onVideoGenerated: (videoUrl: string, duration: number) => void;
  onStartBackgroundGeneration?: (params: {
    frameA: string;
    frameB: string;
    prompt: string;
    model: string;
    duration: number;
    clipAName: string;
    clipBName: string;
    minimized: boolean;
  }) => void;
  activeTask?: BridgeGenerationTask | null;
  hasActiveGeneration?: boolean;
}

interface VideoModelInfo {
  value: string;
  label: string;
  provider: string;
  cost?: string;
  tip?: string;
  bridgeSupport: 'full' | 'start-only';
}

const ALL_VIDEO_MODELS: VideoModelInfo[] = [
  // Google Veo (I2V — uses side-by-side composite for bridge)
  { value: 'google/veo-3.1', label: '🟦 Veo 3.1 (Flow)', provider: 'google', cost: '$$$$', bridgeSupport: 'full' },
  { value: 'google/veo-3.1-fast', label: '🟦 Veo 3.1 Fast', provider: 'google', cost: '$$$', bridgeSupport: 'full' },
  { value: 'google/veo-3', label: '🟦 Veo 3', provider: 'google', cost: '$$$', bridgeSupport: 'full' },
  { value: 'google/veo-2', label: '🟦 Veo 2', provider: 'google', cost: '$$', bridgeSupport: 'full' },
  // Runway Gen-3: suporta lastFrame
  { value: 'runway/gen3-alpha-turbo', label: '🎬 Gen-3 Alpha Turbo', provider: 'runway', cost: '$$', bridgeSupport: 'full' },
  // Kling (suporta image_tail)
  { value: 'kling/v2.1', label: '🎥 Kling 2.1', provider: 'kling', cost: '$$', bridgeSupport: 'full' },
  { value: 'kling/v1.6', label: '🎥 Kling 1.6', provider: 'kling', cost: '$', bridgeSupport: 'full' },
  // Luma (suporta frame0 + frame1)
  { value: 'luma/dream-machine-1.5', label: '🌙 Dream Machine 1.5', provider: 'luma', cost: '$$', bridgeSupport: 'full' },
  // Apiframe — Runway Gen-3: NÃO suporta end_image_url (Apiframe ignora esse campo para Runway)
  // Removido da lista de bridge — usar runway/gen3-alpha-turbo (nativo) que suporta lastFrame
  // Apiframe — Kling 2.6: NÃO suporta end frame (docs confirmam: só aceita image_url como primeiro frame)
  // Removido do bridge — usar Kling 2.5 Turbo Pro que aceita start_image + end_image
  { value: 'apiframe/kling-2.5', label: '⚡ AF: Kling 2.5 Turbo', provider: 'apiframe', cost: '$', bridgeSupport: 'full' },
  // Apiframe — Luma: suporta end_image_url
  { value: 'apiframe/luma', label: '⚡ AF: Luma AI', provider: 'apiframe', cost: '$$', bridgeSupport: 'full' },
];

const UNIFIED_PREFIXES = ['apiframe/'];
const VIDEO_MODELS_NEEDING_KEY: Record<string, string> = {
  'google/veo-3.1': 'google', 'google/veo-3.1-fast': 'google', 'google/veo-3': 'google', 'google/veo-2': 'google',
  'runway/gen4': 'runway', 'runway/gen3-alpha-turbo': 'runway',
  'kling/v2.1': 'kling', 'kling/v1.6': 'kling',
  'luma/dream-machine-1.5': 'luma', 'stability/stable-video': 'stability',
};

const normalizeProvider = (provider: string): string => {
  const compact = provider.toLowerCase().trim().replace(/[\s._-]/g, '');
  if (compact === 'apiframe' || compact === 'apiframeai') return 'apiframe';
  if (compact === 'aimlapi' || compact === 'aiml') return 'aimlapi';
  if (compact === 'polloai' || compact === 'pollo') return 'polloai';
  return compact;
};

const isModelConfigured = (modelValue: string, configuredProviders: string[]): boolean => {
  const normalizedProviders = configuredProviders.map(normalizeProvider);
  const unifiedPrefix = UNIFIED_PREFIXES.find((p) => modelValue.startsWith(p));
  if (unifiedPrefix) {
    const providerName = normalizeProvider(unifiedPrefix.replace('/', ''));
    return normalizedProviders.includes(providerName);
  }
  const requiredProvider = VIDEO_MODELS_NEEDING_KEY[modelValue];
  if (!requiredProvider) return true;
  return normalizedProviders.includes(normalizeProvider(requiredProvider));
};
interface TransitionPromptGroup {
  id: string;
  label: string;
  icon: string;
  prompts: { id: string; text: string }[];
}

const TRANSITION_PROMPT_GROUPS: TransitionPromptGroup[] = [
  {
    id: 'cinematic', label: 'Cinematográfico', icon: '🎬',
    prompts: [
      { id: 'c1', text: 'Zoom out suave revelando a paisagem ao redor, transição cinematográfica para a próxima cena' },
      { id: 'c2', text: 'Câmera gira 360° ao redor do objeto principal e dissolve para a próxima imagem' },
      { id: 'c3', text: 'Movimento de câmera dolly para frente atravessando a cena até chegar na próxima' },
      { id: 'c4', text: 'Câmera faz um tilt up dramático para o céu e desce revelando o novo cenário' },
      { id: 'c5', text: 'Fumaça cinematográfica preenche a tela e se dissipa mostrando o novo ambiente' },
      { id: 'c6', text: 'Câmera orbita lentamente enquanto a cena se transforma suavemente' },
      { id: 'c7', text: 'Pan horizontal cinematográfico com desfoque gaussiano na transição' },
      { id: 'c8', text: 'Câmera faz movimento crane ascendente saindo da cena atual para a próxima' },
      { id: 'c9', text: 'Efeito de câmera lenta com bokeh luminoso transitando entre cenas' },
      { id: 'c10', text: 'Fade suave com raios de luz passando pela câmera durante a transição' },
      { id: 'c11', text: 'Dolly zoom (efeito Vertigo) criando distorção de perspectiva entre as cenas — estilo Hitchcock' },
      { id: 'c12', text: 'Rack focus suave do primeiro plano para o fundo, revelando a próxima cena com mudança de foco' },
      { id: 'c13', text: 'Câmera em steadicam contorna o cenário e revela a próxima cena em plano sequência' },
      { id: 'c14', text: 'Slow motion dramático com partículas flutuando no ar entre as cenas — estilo trailer épico' },
      { id: 'c15', text: 'Lens flare anamórfico atravessa a tela horizontalmente revelando a nova cena — estilo J.J. Abrams' },
    ],
  },
  {
    id: 'ugc', label: 'UGC / Social', icon: '📱',
    prompts: [
      { id: 'u1', text: 'Corte rápido estilo TikTok com zoom punch entre as cenas, movimento energético' },
      { id: 'u2', text: 'Swipe vertical para cima revelando a próxima cena como stories do Instagram' },
      { id: 'u3', text: 'Câmera chacoalha levemente e faz jump cut para a próxima cena — estilo vlog autêntico' },
      { id: 'u4', text: 'Mão cobre a câmera e ao remover revela a nova cena — transição viral do TikTok' },
      { id: 'u5', text: 'Flip rápido de câmera frontal para traseira revelando novo ângulo — selfie style' },
      { id: 'u6', text: 'Zoom rápido no rosto/produto com desfoque de movimento e corte seco para próxima cena' },
      { id: 'u7', text: 'Transição whip pan ultra rápida com motion blur — estilo Casey Neistat' },
      { id: 'u8', text: 'Câmera faz spin 360° rápido e para revelando a nova cena com energia de Reels' },
      { id: 'u9', text: 'Snap zoom para o objeto e corte com beat drop para a próxima cena' },
      { id: 'u10', text: 'Efeito boomerang rápido no final da cena antes de revelar a próxima — Instagram style' },
      { id: 'u11', text: 'Transição com glitch digital rápido e colorido — estilo conteúdo Gen Z' },
      { id: 'u12', text: 'Pan rápido lateral com o celular seguindo o movimento — estilo POV viral' },
    ],
  },
  {
    id: 'brands-nike', label: 'Nike / Esportivo', icon: '✓',
    prompts: [
      { id: 'n1', text: 'Câmera segue o movimento do atleta em slow motion e corta com flash branco para a próxima cena — estilo "Just Do It"' },
      { id: 'n2', text: 'Transição com whoosh de vento e partículas de velocidade, corte dinâmico entre ação e produto' },
      { id: 'n3', text: 'Slow motion épico do suor/impacto seguido de speed ramp até a próxima cena — estilo Nike Running' },
      { id: 'n4', text: 'Câmera orbital em slow motion ao redor do produto com luz dramática e corte para close-up' },
    ],
  },
  {
    id: 'brands-apple', label: 'Apple / Tech Premium', icon: '🍎',
    prompts: [
      { id: 'a1', text: 'Fade ultra-lento para preto (2 segundos) e emerge suavemente na nova cena — Apple keynote style' },
      { id: 'a2', text: 'Câmera desliza suavemente sobre superfície minimalista e revela o produto em fundo branco puro' },
      { id: 'a3', text: 'Zoom elegante e preciso no detalhe do produto com reflexos sutis — estilo "Shot on iPhone"' },
      { id: 'a4', text: 'Transição com profundidade de campo extrema, foco muda de uma cena para outra com bokeh luxuoso' },
    ],
  },
  {
    id: 'brands-luxury', label: 'Luxo / Moda', icon: '👑',
    prompts: [
      { id: 'l1', text: 'Cortina dourada elegante desliza lentamente revelando a nova cena — estilo Louis Vuitton/Chanel' },
      { id: 'l2', text: 'Dupla exposição artística mesclando as duas cenas com tons dourados — estilo Dior' },
      { id: 'l3', text: 'Câmera em slow motion com reflexos de jóias e cristais transitando entre cenas — Tiffany & Co style' },
      { id: 'l4', text: 'Transição com tecido de seda fluindo sobre a câmera, revelando a nova composição — Gucci/Prada' },
      { id: 'l5', text: 'Fade elegante com textura de mármore e partículas douradas entre cenas — haute couture' },
    ],
  },
  {
    id: 'brands-food', label: 'Food / Bebidas', icon: '🍔',
    prompts: [
      { id: 'f1', text: 'Splash de líquido em câmera lenta cobrindo a tela e revelando a nova cena — Coca-Cola style' },
      { id: 'f2', text: 'Câmera mergulha no ingrediente em macro extremo e emerge na próxima composição — estilo McDonald\'s' },
      { id: 'f3', text: 'Vapor/fumaça sobe do prato em slow motion e dissolve na próxima cena — food photography premium' },
      { id: 'f4', text: 'Corte sincronizado com ação (morder, servir, verter) e transição com movimento do ingrediente' },
    ],
  },
  {
    id: 'brands-auto', label: 'Automotivo', icon: '🏎️',
    prompts: [
      { id: 'au1', text: 'Speed ramp dramático — carro em alta velocidade desacelera em slow motion e corta para próxima cena — BMW/Mercedes style' },
      { id: 'au2', text: 'Reflexo no capô do carro transiciona para o novo cenário com distorção de luz — estilo Audi' },
      { id: 'au3', text: 'Câmera drone orbita o veículo em plano aberto épico e faz dolly in para o detalhe — Porsche style' },
      { id: 'au4', text: 'Faróis iluminam a escuridão e revelam a nova cena com raios de luz cinematográficos' },
    ],
  },
  {
    id: 'effects', label: 'Efeitos Especiais', icon: '✨',
    prompts: [
      { id: 'e1', text: 'Efeito de partículas douradas se formam e se dissolvem revelando a nova cena' },
      { id: 'e2', text: 'Efeito de ondas distorcendo a imagem como reflexo na água, revelando nova cena' },
      { id: 'e3', text: 'Efeito de espelho se quebrando, fragmentos revelam gradualmente a nova cena' },
      { id: 'e4', text: 'Flash de luz branca estilo fotográfico que revela a próxima composição' },
      { id: 'e5', text: 'Transição com efeito de tinta se espalhando em aquarela pela tela' },
      { id: 'e6', text: 'Efeito de portal luminoso se abrindo no centro da tela com a nova cena dentro' },
      { id: 'e7', text: 'Cristais de gelo se formam sobre a imagem e derretem revelando a próxima' },
      { id: 'e8', text: 'Ondas de energia luminosa expandem do centro transformando a cena' },
      { id: 'e9', text: 'Efeito de dupla exposição mesclando as duas cenas de forma artística' },
      { id: 'e10', text: 'Pétalas de flores voam pela tela cobrindo a imagem e revelando a próxima' },
    ],
  },
];

const DEFAULT_TRANSITION_PROMPTS = TRANSITION_PROMPT_GROUPS.flatMap(g => g.prompts);

const STORAGE_KEY = 'bridge-transition-prompts';

function loadCustomPrompts(): typeof DEFAULT_TRANSITION_PROMPTS {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const map = new Map(DEFAULT_TRANSITION_PROMPTS.map((p) => [p.id, p]));
      parsed.forEach((p: any) => map.set(p.id, p));
      return Array.from(map.values());
    }
  } catch {}
  return [...DEFAULT_TRANSITION_PROMPTS];
}

function saveCustomPrompts(prompts: typeof DEFAULT_TRANSITION_PROMPTS) {
  const defaultMap = new Map(DEFAULT_TRANSITION_PROMPTS.map((p) => [p.id, p.text]));
  const toSave = prompts.filter((p) => !defaultMap.has(p.id) || defaultMap.get(p.id) !== p.text);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

const AIBridgeVideoDialog: React.FC<AIBridgeVideoDialogProps> = ({
  open, onClose, clipA, clipB, onVideoGenerated, onStartBackgroundGeneration, activeTask, hasActiveGeneration
}) => {
  const [frameA, setFrameA] = useState<string | null>(null);
  const [frameB, setFrameB] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedDuration, setGeneratedDuration] = useState<number>(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [prompt, setPrompt] = useState('');
   const [model, setModel] = useState('google/veo-3.1');

    const getDurationOptionsForModel = (m: string): number[] => {
      // Kling (direto ou via Apiframe) aceita apenas 5 ou 10
      if (m.startsWith('kling/') || m.includes('kling')) return [5, 10];
      // Runway (direto ou via Apiframe) aceita apenas 5 ou 10
      if (m.startsWith('runway/') || m.includes('runway')) return [5, 10];
      // OpenAI Sora aceita apenas 4, 8 ou 12
      if (m.startsWith('openai/sora')) return [4, 8, 12];
      // Google Veo aceita 4 a 8
      if (m.startsWith('google/')) return [4, 5, 6, 7, 8];
      // Luma (direto ou via Apiframe) aceita 5 ou 10
      if (m.startsWith('luma/') || m.includes('luma')) return [5, 10];
      // Stability aceita 2 a 4
      if (m.startsWith('stability/')) return [2, 3, 4];
      // Replicate LTX aceita 2 a 10
      if (m.startsWith('replicate/')) return [2, 3, 4, 5, 6, 7, 8, 9, 10];
      return [4, 5, 6, 8, 10];
    };
   const durationOptions = getDurationOptionsForModel(model);
   const [duration, setDuration] = useState(() => getDurationOptionsForModel('google/veo-3.1')[0]);

   // Auto-adjust duration when model changes
   const handleModelChange = (newModel: string) => {
     setModel(newModel);
     const opts = getDurationOptionsForModel(newModel);
     if (!opts.includes(duration)) {
       setDuration(opts[0]);
     }
   };
  const [isGenerating, setIsGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);

  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';

  // Load configured providers (with fallback to auth-based estabelecimento lookup)
  useEffect(() => {
    let mounted = true;

    (async () => {
      let estabId = estabelecimentoId;

      if (!estabId) {
        const { data: rpcEstab } = await supabase.rpc('get_auth_user_estabelecimento_id');
        if (typeof rpcEstab === 'string') estabId = rpcEstab;
      }

      if (!estabId) {
        if (mounted) setConfiguredProviders([]);
        return;
      }

      const { data } = await supabase
        .from('ai_api_keys')
        .select('provider')
        .eq('estabelecimento_id', estabId)
        .eq('is_active', true);

      if (mounted && data) {
        setConfiguredProviders(data.map((d) => normalizeProvider(d.provider)));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [estabelecimentoId]);

  const filteredModels = useMemo(() => {
    const withStatus = ALL_VIDEO_MODELS.map((m) => ({ ...m, disabled: !isModelConfigured(m.value, configuredProviders) }));
    return withStatus.sort((a, b) => Number(a.disabled) - Number(b.disabled));
  }, [configuredProviders]);

  // Prompt suggestions state
  const [suggestions, setSuggestions] = useState(loadCustomPrompts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newText, setNewText] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  useEffect(() => {
    if (open) setSuggestions(loadCustomPrompts());
  }, [open]);

  // Extract frames when dialog opens
  useEffect(() => {
    if (!open) return;
    setFrameA(null);
    setFrameB(null);
    setExtracting(true);

    const extract = async () => {
      try {
        const fA = await extractFrame(clipA, 'last');
        const fB = await extractFrame(clipB, 'first');
        setFrameA(fA);
        setFrameB(fB);
      } catch (err: any) {
        toast.error('Erro ao extrair frames: ' + (err.message || 'Tente novamente'));
      } finally {
        setExtracting(false);
      }
    };
    extract();
  }, [open, clipA, clipB]);

  const drawWithTransforms = useCallback((
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    clip?: TimelineClip,
  ) => {
    const { canvas } = ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Check if clip has any custom positioning/transforms
    const hasCustomLayout = clip && (
      clip.x !== undefined || clip.y !== undefined ||
      clip.w !== undefined || clip.h !== undefined ||
      (clip.rotation && clip.rotation !== 0) ||
      (clip.scaleX !== undefined && clip.scaleX !== 1) ||
      (clip.scaleY !== undefined && clip.scaleY !== 1) ||
      (clip.skewX && clip.skewX !== 0) ||
      (clip.skewY && clip.skewY !== 0)
    );

    if (hasCustomLayout && clip) {
      // x, y, w, h are percentages (0-100) of the composition
      const drawX = (clip.x ?? 0) / 100 * canvas.width;
      const drawY = (clip.y ?? 0) / 100 * canvas.height;
      const drawW = (clip.w ?? 100) / 100 * canvas.width;
      const drawH = (clip.h ?? 100) / 100 * canvas.height;
      const rotation = (clip.rotation || 0) * Math.PI / 180;
      const sx = clip.scaleX ?? 1;
      const sy = clip.scaleY ?? 1;
      const skewXRad = (clip.skewX || 0) * Math.PI / 180;
      const skewYRad = (clip.skewY || 0) * Math.PI / 180;

      ctx.save();
      const cx = drawX + drawW / 2;
      const cy = drawY + drawH / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.scale(sx, sy);
      if (skewXRad || skewYRad) {
        ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
      }
      ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      // Default: fit to canvas (contain)
      const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
      const w = sourceWidth * scale;
      const h = sourceHeight * scale;
      ctx.drawImage(source, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    }
  }, []);

  const loadImage = useCallback(async (src: string, name: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${name}`));
      img.src = src;
    });
    return img;
  }, []);

  const seekVideoPrecisely = useCallback(async (video: HTMLVideoElement, time: number) => {
    const maxTime = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.001) : time;
    const safeTime = Math.max(0, Math.min(time, maxTime));
    const tolerance = 0.01;

    await new Promise<void>((resolve, reject) => {
      if (Math.abs(video.currentTime - safeTime) <= tolerance && video.readyState >= 2) {
        resolve();
        return;
      }

      let settled = false;
      let timeoutId: number | undefined;
      let frameCbId: number | undefined;

      const cleanup = () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        video.removeEventListener('seeked', afterSeek);
        video.removeEventListener('error', onError);
        if (frameCbId !== undefined && 'cancelVideoFrameCallback' in video) {
          (video as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }).cancelVideoFrameCallback?.(frameCbId);
        }
      };

      const done = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Falha ao posicionar o frame do vídeo'));
      };

      const afterSeek = () => {
        if ('requestVideoFrameCallback' in video) {
          frameCbId = (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number })
            .requestVideoFrameCallback(() => done());
        } else {
          requestAnimationFrame(() => done());
        }
      };

      timeoutId = window.setTimeout(() => done(), 900);
      video.addEventListener('seeked', afterSeek, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.currentTime = safeTime;
    });
  }, []);

  const extractFrame = useCallback(async (clip: TimelineClip, position: 'first' | 'last'): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    if (clip.type === 'image' || clip.type === 'canvas') {
      const img = await loadImage(clip.src || '', clip.name);
      drawWithTransforms(ctx, img, img.width, img.height, clip);
      return canvas.toDataURL('image/jpeg', 0.92);
    }

    if (clip.type === 'video') {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'auto';
      video.playsInline = true;
      video.poster = '';

      let blobUrl: string | null = null;
      try {
        const resp = await fetch(clip.src || '', { mode: 'cors' });
        const blob = await resp.blob();
        blobUrl = URL.createObjectURL(blob);
      } catch {
        blobUrl = null;
      }

      const videoSrc = blobUrl || clip.src || '';

      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('error', onFail);
          resolve();
        };
        const onFail = () => {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('error', onFail);
          reject(new Error(`Falha ao carregar vídeo: ${clip.name}`));
        };
        video.addEventListener('loadeddata', onReady, { once: true });
        video.addEventListener('error', onFail, { once: true });
        video.src = videoSrc;
        video.load();
      });

      if (!Number.isFinite(video.duration) || video.duration === Infinity) {
        video.currentTime = 1e101;
        await new Promise<void>(r => { video.ontimeupdate = () => { video.ontimeupdate = null; r(); }; });
      }

      const trimStart = Math.max(0, clip.trimStart || 0);
      const trimEnd = Math.max(0, clip.trimEnd || 0);
      const maxVideoTime = Math.max(0, video.duration - 0.001);
      const mediaEnd = Math.max(trimStart, video.duration - trimEnd);
      const visibleEnd = Math.max(trimStart, Math.min(mediaEnd, trimStart + Math.max(clip.duration, 0)));
      const clampedVisibleEnd = Math.max(trimStart, Math.min(maxVideoTime, visibleEnd));
      const captureCandidates = position === 'first'
        ? [Math.max(0, Math.min(maxVideoTime, trimStart + 0.001)), Math.max(0, Math.min(maxVideoTime, trimStart))]
        : Array.from(new Set([
            clampedVisibleEnd,
            Math.max(trimStart, clampedVisibleEnd - 0.001),
            Math.max(trimStart, clampedVisibleEnd - 1 / 240),
            Math.max(trimStart, clampedVisibleEnd - 1 / 120),
            Math.max(trimStart, clampedVisibleEnd - 1 / 60),
            Math.max(trimStart, clampedVisibleEnd - 1 / 30),
          ].map((time) => Number(time.toFixed(6)))));

      let selectedTime = captureCandidates[0] ?? 0;
      let captured = false;

      for (const candidateTime of captureCandidates) {
        await seekVideoPrecisely(video, candidateTime);
        video.pause();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        if (!video.videoWidth || !video.videoHeight) continue;

        selectedTime = candidateTime;

        try {
          const bitmap = await createImageBitmap(video);
          drawWithTransforms(ctx, bitmap, bitmap.width, bitmap.height, clip);
          bitmap.close();
          captured = true;
          break;
        } catch {
          drawWithTransforms(ctx, video, video.videoWidth || canvas.width, video.videoHeight || canvas.height, clip);
          captured = true;
          break;
        }
      }

      console.log('[AI Bridge] frame capture', {
        clipName: clip.name,
        position,
        captureCandidates,
        selectedTime,
        currentTime: video.currentTime,
        duration: video.duration,
        trimStart,
        trimEnd,
        visibleEnd,
        clampedVisibleEnd,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        src: clip.src,
      });

      if (!captured) {
        throw new Error(`Vídeo sem frame decodificado: ${clip.name}`);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      if (blobUrl) URL.revokeObjectURL(blobUrl);
      return dataUrl;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, [drawWithTransforms, loadImage, seekVideoPrecisely]);





  const handleSelectSuggestion = (text: string) => {
    setPrompt(text);
  };

  const handleStartEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    const updated = suggestions.map(s => s.id === editingId ? { ...s, text: editText.trim() } : s);
    setSuggestions(updated);
    saveCustomPrompts(updated);
    setEditingId(null);
    setEditText('');
    toast.success('Sugestão atualizada');
  };

  const handleAddNew = () => {
    if (!newText.trim()) return;
    const newId = `custom_${Date.now()}`;
    const updated = [...suggestions, { id: newId, text: newText.trim() }];
    setSuggestions(updated);
    saveCustomPrompts(updated);
    setNewText('');
    setIsAddingNew(false);
    setPrompt(newText.trim());
    toast.success('Nova sugestão adicionada e selecionada');
  };

  const handleGenerate = useCallback(async () => {
    if (!frameA || !frameB) { toast.error('Aguarde a extração dos frames'); return; }
    if (!prompt.trim()) { toast.error('Digite ou selecione uma descrição para a transição'); return; }

    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }

    // ── Validate selected model provider is active ──────────────────────
    const selectedModelInfo = filteredModels.find(m => m.value === model);
    if (selectedModelInfo?.disabled) {
      toast.error(
        `O modelo "${selectedModelInfo.label}" não está ativo. Vá em Config APIs para ativar o provedor "${selectedModelInfo.provider}", ou selecione outro modelo.`,
        { duration: 6000 }
      );
      return;
    }

    // Use background generation manager if available
    if (onStartBackgroundGeneration) {
      setIsGenerating(true);
      onStartBackgroundGeneration({
        frameA,
        frameB,
        prompt: prompt.trim(),
        model,
        duration,
        clipAName: clipA.name,
        clipBName: clipB.name,
        minimized: false,
      });
      return;
    }

    // Legacy fallback (without background manager)
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    try {
      const signal = controller.signal;
      const uploadFrame = async (dataUrl: string, label: string): Promise<string> => {
        const resp = await fetch(dataUrl);
        const blob = await resp.blob();
        const fileName = `bridge/${Date.now()}_${label}.jpg`;
        const path = `${estabId}/${fileName}`;
        const { error } = await supabase.storage.from('marketing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('marketing-images').getPublicUrl(path);
        return urlData.publicUrl;
      };

      const [frameAUrl, frameBUrl] = await Promise.all([
        uploadFrame(frameA, 'frame_start'),
        uploadFrame(frameB, 'frame_end'),
      ]);

      const fullPrompt = `IMAGE-TO-VIDEO TRANSITION: You MUST start this video from Image 1 (the starting frame) and smoothly transition to end at Image 2 (the ending frame).

START FROM THIS EXACT IMAGE (Image 1): The video's first frame must visually match this image exactly.
END AT THIS EXACT IMAGE (Image 2): The video's last frame must visually match this image exactly.

TRANSITION DIRECTION: ${prompt.trim()}

CRITICAL: The generated video must begin looking identical to Image 1 and gradually transform/transition to look identical to Image 2 by the end. This is a bridge/transition between two scenes.`;

      const requestParams = {
        model,
        prompt: fullPrompt,
        imageUrls: [frameAUrl, frameBUrl],
        imageRoles: ['STARTING FRAME', 'ENDING FRAME'],
        aspectRatio: '16:9',
        duration,
        estabelecimentoId: estabId,
        withAudio: false,
        withMusic: false,
        bridgeMode: true,
      };

      const isApiframeModel = model.startsWith('apiframe/');
      if (!isApiframeModel) {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: 'generate_video', params: requestParams }),
          signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errData.error || `Erro ${response.status}`);
        }

        const data = await response.json();
        const result = data.result;
        if (result?.error) throw new Error(result.error);
        if (!result?.videoUrl) throw new Error('Nenhuma URL de vídeo retornada');

        setVideoLoading(true);
        setVideoError(false);
        setGeneratedVideoUrl(result.videoUrl);
        setGeneratedDuration(duration);
        return;
      }

      const startResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: 'start_apiframe_video', params: requestParams }),
        signal,
      });

      if (!startResp.ok) {
        const errData = await startResp.json().catch(() => ({ error: `HTTP ${startResp.status}` }));
        throw new Error(errData.error || `Erro ${startResp.status}`);
      }

      const startData = await startResp.json();
      const started = startData.result;
      if (started?.error) throw new Error(started.error);

      if (started?.videoUrl) {
        setVideoLoading(true);
        setVideoError(false);
        setGeneratedVideoUrl(started.videoUrl);
        setGeneratedDuration(duration);
        return;
      }

      if (!started?.taskId) throw new Error('Nenhuma tarefa de vídeo foi iniciada');

      for (let attempt = 0; attempt < 120; attempt += 1) {
        if (signal.aborted) throw new DOMException('Geração cancelada', 'AbortError');
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Geração cancelada', 'AbortError')); }, { once: true });
        });

        const pollResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'fetch_apiframe_video',
            params: { estabelecimentoId: estabId, taskId: started.taskId },
          }),
          signal,
        });

        if (!pollResp.ok) {
          const errData = await pollResp.json().catch(() => ({ error: `HTTP ${pollResp.status}` }));
          throw new Error(errData.error || `Erro ${pollResp.status}`);
        }

        const pollData = await pollResp.json();
        const pollResult = pollData.result;
        if (pollResult?.error) throw new Error(pollResult.error);

        if (pollResult?.done && pollResult?.videoUrl) {
          setVideoLoading(true);
          setVideoError(false);
          setGeneratedVideoUrl(pollResult.videoUrl);
          setGeneratedDuration(duration);
          return;
        }
      }

      throw new Error('Timeout: a geração demorou mais de 10 minutos. Tente novamente.');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        toast.info('Geração cancelada.');
      } else {
        const msg = err?.message || 'Erro desconhecido';
        if (msg.includes('429') || msg.includes('quota') || msg.includes('Rate limit') || msg.includes('too many')) toast.error('Limite de requisições atingido. Aguarde e tente novamente.');
        else if (msg.includes('402') || msg.includes('billing') || msg.includes('insufficient') || msg.includes('Credits') || msg.includes('exclusively available')) toast.error('Créditos insuficientes. Adicione saldo no provedor.');
        else toast.error('Erro ao gerar vídeo: ' + msg.substring(0, 120));
      }
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
    }
  }, [duration, frameA, frameB, model, prompt, onStartBackgroundGeneration, clipA, clipB]);

  const [isSavingToGallery, setIsSavingToGallery] = useState(false);

  const handleSaveToGallery = useCallback(async () => {
    if (!generatedVideoUrl) return;
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }
    setIsSavingToGallery(true);
    try {
      const resp = await fetch(generatedVideoUrl);
      const blob = await resp.blob();
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `transition_ai_${Date.now()}.${ext}`;
      const path = `${estabId}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('marketing-videos').upload(path, blob, { contentType: blob.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('marketing-videos').getPublicUrl(path);
      await supabase.from('media_gallery').insert({
        estabelecimento_id: estabId,
        tipo: 'video',
        nome: `Transição AI ${new Date().toLocaleDateString('pt-BR')}`,
        public_url: urlData.publicUrl,
        storage_path: path,
        duracao_segundos: generatedDuration,
      });
      toast.success('Transição salva na galeria!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSavingToGallery(false);
    }
  }, [generatedVideoUrl, generatedDuration]);

  const handleInsert = useCallback(() => {
    if (generatedVideoUrl && generatedDuration > 0) {
      onVideoGenerated(generatedVideoUrl, generatedDuration);
      onClose();
    }
  }, [generatedVideoUrl, generatedDuration, onVideoGenerated, onClose]);

  const handleCancelGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    onClose();
  }, [onClose]);

  const handleDiscardPreview = useCallback(() => {
    setGeneratedVideoUrl(null);
    setGeneratedDuration(0);
    setVideoLoading(false);
    setVideoError(false);
  }, []);

  // Derive generating state from activeTask or local state
  const effectiveGenerating = isGenerating || (activeTask?.status === 'generating');
  const effectiveProgress = activeTask?.progress ?? 0;

  // If activeTask completed with video, show it and clear local generating
  useEffect(() => {
    if (activeTask?.status === 'done') {
      setIsGenerating(false);
      if (activeTask.videoUrl && !generatedVideoUrl) {
        setVideoLoading(true);
        setVideoError(false);
        setGeneratedVideoUrl(activeTask.videoUrl);
        setGeneratedDuration(activeTask.duration);
      }
    }
    if (activeTask?.status === 'error') {
      setIsGenerating(false);
    }
  }, [activeTask?.status, activeTask?.videoUrl, activeTask?.duration, generatedVideoUrl]);

  const handleMinimize = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        // If using background manager and generating, just minimize (don't abort)
        if (effectiveGenerating && onStartBackgroundGeneration) {
          onClose();
          return;
        }
        // Legacy: abort local generation
        if (isGenerating && abortRef.current) abortRef.current.abort();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="h-4 w-4 text-primary" />
          Gerar Vídeo de Transição AI
        </DialogTitle>

        {/* Generated Video Preview */}
        {generatedVideoUrl && (
          <div className="mt-2 space-y-3">
            <div className="rounded-lg border-2 border-primary/50 bg-muted/30 overflow-hidden">
              <div className="p-2 bg-primary/10 flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Prévia do Vídeo de Transição</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{generatedDuration}s</span>
              </div>
              <div className="aspect-video bg-black flex items-center justify-center relative">
                {videoLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs text-white/70">Carregando vídeo...</span>
                  </div>
                )}
                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
                    <X className="h-8 w-8 text-destructive" />
                    <span className="text-xs text-white/70">Erro ao carregar o vídeo. Tente descartar e gerar novamente.</span>
                  </div>
                )}
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                  onLoadedData={() => {
                    setVideoLoading(false);
                    setVideoError(false);
                    toast.success('Vídeo de transição pronto! Confira o resultado.');
                  }}
                  onError={() => {
                    setVideoLoading(false);
                    setVideoError(true);
                    toast.error('Falha ao carregar o vídeo gerado. Tente novamente.');
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscardPreview}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Descartar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToGallery}
                disabled={isSavingToGallery || videoLoading || videoError}
                className="gap-1.5"
              >
                {isSavingToGallery ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar na Galeria
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleInsert}
                className="gap-1.5"
                variant="success"
              >
                <Check className="h-3.5 w-3.5" />
                Inserir na Timeline
              </Button>
            </div>
          </div>
        )}

        {/* Frames preview — hide when showing generated video */}
        {!generatedVideoUrl && (
          <>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Último frame — {clipA.name}</p>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border/50 flex items-center justify-center">
                  {extracting ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : frameA ? <img src={frameA} alt="Frame A" className="w-full h-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <ArrowRight className="h-5 w-5 text-primary" />
                <Film className="h-4 w-4 text-muted-foreground" />
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-center">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Primeiro frame — {clipB.name}</p>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border/50 flex items-center justify-center">
                  {extracting ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : frameB ? <img src={frameB} alt="Frame B" className="w-full h-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                </div>
              </div>
            </div>

            {/* Prompt Suggestions */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                  <Sparkles className="h-3 w-3" />
                  Sugestões
                </label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="h-7 text-[11px] w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos os grupos</SelectItem>
                    {TRANSITION_PROMPT_GROUPS.map(g => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        {g.icon} {g.label} ({g.prompts.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-2 shrink-0"
                  onClick={() => { setIsAddingNew(true); setNewText(''); }}
                  disabled={isGenerating}
                >
                  <Plus className="h-3 w-3" /> Nova
                </Button>
              </div>

              <ScrollArea className="h-[200px] rounded-lg border border-border/50 bg-muted/30 p-1.5">
                <div className="grid grid-cols-1 gap-0.5">
                  {isAddingNew && (
                    <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-primary/10 border border-primary/30 mb-1">
                      <Input
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        placeholder="Digite sua descrição de transição personalizada..."
                        className="h-7 text-[11px] flex-1"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') setIsAddingNew(false); }}
                      />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleAddNew} disabled={!newText.trim()}>
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setIsAddingNew(false)}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  )}

                  {/* Custom prompts (user-added) — always visible */}
                  {suggestions.filter(s => !DEFAULT_TRANSITION_PROMPTS.find(d => d.id === s.id)).map((s) => (
                    <div key={s.id}>
                      {editingId === s.id ? (
                        <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-primary/10 border border-primary/30">
                          <Input value={editText} onChange={e => setEditText(e.target.value)} className="h-7 text-[11px] flex-1" autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleSaveEdit}><Check className="h-3 w-3 text-primary" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setEditingId(null)}><X className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      ) : (
                        <div className={`group flex items-start gap-1.5 p-1.5 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${prompt === s.text ? 'bg-primary/15 border border-primary/40' : 'border border-transparent'}`}
                          onClick={() => handleSelectSuggestion(s.text)}>
                          <span className="text-[11px] leading-snug flex-1 text-foreground/80">{s.text}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); handleStartEdit(s.id, s.text); }}><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Filtered group prompts */}
                  {TRANSITION_PROMPT_GROUPS
                    .filter(group => selectedGroupId === 'all' || group.id === selectedGroupId)
                    .map((group) => {
                      const groupPrompts = group.prompts.map(gp => suggestions.find(s => s.id === gp.id) || gp);
                      return (
                        <React.Fragment key={group.id}>
                          {selectedGroupId === 'all' && (
                            <div className="flex items-center gap-1.5 px-1.5 py-1 mt-1">
                              <span className="text-[10px]">{group.icon}</span>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                              <div className="flex-1 border-t border-border/40" />
                            </div>
                          )}
                          {groupPrompts.map((s) => (
                            <div key={s.id}>
                              {editingId === s.id ? (
                                <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-primary/10 border border-primary/30">
                                  <Input value={editText} onChange={e => setEditText(e.target.value)} className="h-7 text-[11px] flex-1" autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleSaveEdit}><Check className="h-3 w-3 text-primary" /></Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setEditingId(null)}><X className="h-3 w-3 text-destructive" /></Button>
                                </div>
                              ) : (
                                <div
                                  className={`group flex items-start gap-1.5 p-1.5 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${prompt === s.text ? 'bg-primary/15 border border-primary/40' : 'border border-transparent'}`}
                                  onClick={() => handleSelectSuggestion(s.text)}
                                >
                                  <span className="text-[11px] leading-snug flex-1 text-foreground/80">{s.text}</span>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); handleStartEdit(s.id, s.text); }}><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </React.Fragment>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>

            {/* Manual prompt */}
            <div className="mt-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Ou escreva sua própria descrição
              </label>
              <Textarea
                placeholder="Ex: A câmera faz um zoom out suave revelando a paisagem ao redor..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="text-sm resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* Controls */}
            <div className="flex gap-3 mt-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Modelo</label>
                <Select value={model} onValueChange={handleModelChange} disabled={isGenerating}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredModels.map(m => (
                      <SelectItem
                        key={m.value}
                        value={m.value}
                        className="text-xs"
                        disabled={m.disabled}
                      >
                         <span className={`flex items-center gap-1.5 ${m.disabled ? 'opacity-50' : ''}`}>
                          {m.label}
                          {m.cost && <span className="text-muted-foreground text-[9px]">{m.cost}</span>}
                          {m.disabled && (
                            <span className="flex items-center gap-0.5 text-destructive/70 text-[9px] font-medium ml-1">
                              <Lock className="h-2.5 w-2.5" />
                              sem créditos
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Duração (s)</label>
                 <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))} disabled={isGenerating}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {durationOptions.map(d => <SelectItem key={d} value={String(d)} className="text-xs">{d}s</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={handleCancelGeneration}>
                {effectiveGenerating ? 'Cancelar Geração' : 'Cancelar'}
              </Button>
              {effectiveGenerating && onStartBackgroundGeneration && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMinimize}
                  className="gap-1.5"
                  title="Minimizar e continuar em segundo plano"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Minimizar
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={effectiveGenerating || extracting || !frameA || !frameB || !prompt.trim() || (hasActiveGeneration && !effectiveGenerating)}
                className="gap-1.5"
              >
                {effectiveGenerating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Gerando...</> : (hasActiveGeneration && !effectiveGenerating) ? <>Aguarde a geração atual...</> : <><Wand2 className="h-3.5 w-3.5" />Gerar Vídeo de Transição</>}
              </Button>
            </div>

            {effectiveGenerating && (
              <div className="space-y-2 mt-2">
                <div className="space-y-1">
                  <Progress value={effectiveProgress} className="h-2" />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(effectiveProgress)}% concluído
                    </span>
                    {activeTask && (
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round((Date.now() - activeTask.startedAt) / 1000)}s
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center animate-pulse">
                  ⏳ Gerando vídeo de transição AI... Isso pode levar de 30s a 5min dependendo do modelo.
                </p>
                {onStartBackgroundGeneration && (
                  <p className="text-[10px] text-center text-primary/70">
                    💡 Clique em "Minimizar" para continuar editando enquanto o vídeo é gerado em segundo plano.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIBridgeVideoDialog;
