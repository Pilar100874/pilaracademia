// Unified API providers configuration
// Each unified provider covers multiple individual models - when active, individual models are hidden

export interface UnifiedProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  website: string;
  keyPlaceholder: string;
  /** Model value prefixes or exact values that this provider covers */
  coveredModelPrefixes: string[];
  /** Models this provider offers (shown in settings panel) */
  availableModels: { category: string; models: string[] }[];
  /** Credit cost reference */
  creditsTable?: { action: string; credits: string }[];
}

export const UNIFIED_PROVIDERS: UnifiedProvider[] = [
  {
    id: 'apiframe',
    name: 'Apiframe',
    icon: '⚡',
    description: 'Uma única API para Midjourney, Flux, Runway, Kling, Luma, Suno, Udio e mais.',
    website: 'https://app.apiframe.ai/dashboard',
    keyPlaceholder: 'YOUR_API_KEY',
    coveredModelPrefixes: ['apiframe/'],
    availableModels: [
      { category: '🎨 Imagem', models: ['Midjourney v6/v7', 'Flux (Schnell/Pro/Dev)', 'Ideogram v3', 'DALL-E', 'GPT Image', 'Kling Image', 'Nano Banana', 'Seedream', 'Reve', 'Faceswap'] },
      { category: '🎬 Vídeo', models: ['Midjourney Video', 'Runway Gen-3/Gen-4', 'Kling 2.5/2.6', 'Luma AI', 'Google Veo', 'Sora 2', 'Pika', 'Hailuo MiniMax', 'Wan Video', 'Vidu', 'Pixverse', 'Seedance'] },
      { category: '🎵 Música', models: ['Suno AI', 'Udio', 'Producer AI', 'Eleven Music'] },
      { category: '📸 Headshots', models: ['AI Headshots'] },
    ],
    creditsTable: [
      { action: 'Midjourney Imagine', credits: '4-6' },
      { action: 'Flux Imagine', credits: '1' },
      { action: 'Ideogram v3', credits: '3' },
      { action: 'Runway Gen-4', credits: '6' },
      { action: 'Runway Gen-3', credits: '4' },
      { action: 'Kling 2.6 (5s)', credits: '10' },
      { action: 'Kling 2.6 (10s)', credits: '20' },
      { action: 'Luma AI', credits: '6' },
      { action: 'Pika', credits: '4' },
      { action: 'Hailuo MiniMax', credits: '3' },
      { action: 'Suno', credits: '2' },
      { action: 'Udio', credits: '1-2' },
      { action: 'Faceswap', credits: '2' },
    ],
  },
  {
    id: 'aimlapi',
    name: 'AIML API',
    icon: '🤖',
    description: 'API unificada com 300+ modelos de IA: imagem, vídeo, áudio, LLM. Pague por uso, sem assinatura.',
    website: 'https://aimlapi.com/app/keys',
    keyPlaceholder: 'YOUR_AIMLAPI_KEY',
    coveredModelPrefixes: ['aimlapi/'],
    availableModels: [
      { category: '🎨 Imagem', models: ['Flux Pro/Dev/Schnell', 'DALL-E 3', 'Stable Diffusion 3/XL', 'Midjourney', 'Ideogram', 'Recraft V3', 'Playground v3'] },
      { category: '🎬 Vídeo', models: ['Runway Gen-3', 'Kling v2', 'Luma Dream Machine', 'Minimax Video', 'CogVideoX', 'Haiper 2.0', 'Pika', 'Wan Video', 'Stable Video'] },
      { category: '🔊 Áudio', models: ['ElevenLabs TTS', 'OpenAI TTS', 'Xtts-v2', 'Bark'] },
      { category: '🎵 Música', models: ['Suno v4', 'Udio v2', 'MusicGen', 'Stable Audio'] },
    ],
    creditsTable: [
      { action: 'Flux Schnell', credits: '$0.003' },
      { action: 'Flux Pro', credits: '$0.05' },
      { action: 'DALL-E 3', credits: '$0.04' },
      { action: 'Stable Diffusion 3', credits: '$0.035' },
      { action: 'Runway Gen-3 (5s)', credits: '$0.25' },
      { action: 'Kling v2 (5s)', credits: '$0.28' },
      { action: 'Luma (5s)', credits: '$0.20' },
      { action: 'Pika (4s)', credits: '$0.15' },
      { action: 'ElevenLabs TTS', credits: '$0.30/1k chars' },
      { action: 'Suno v4', credits: '$0.05' },
    ],
  },
  {
    id: 'polloai',
    name: 'Pollo AI',
    icon: '🐔',
    description: 'Plataforma de geração de vídeo e imagem com IA. Runway, Kling, Flux, Luma e mais em uma API.',
    website: 'https://pollo.ai/settings/api',
    keyPlaceholder: 'YOUR_POLLO_KEY',
    coveredModelPrefixes: ['polloai/'],
    availableModels: [
      { category: '🎨 Imagem', models: ['Flux Pro/Schnell', 'Ideogram v2', 'Recraft V3', 'Kolors', 'SDXL'] },
      { category: '🎬 Vídeo', models: ['Runway Gen-3', 'Kling v1.5/v2', 'Luma Dream Machine', 'Minimax Video', 'Hunyuan Video', 'CogVideoX', 'Pika', 'Wan Video'] },
      { category: '🔊 Áudio', models: ['Fish Speech TTS'] },
    ],
    creditsTable: [
      { action: 'Flux Schnell', credits: '1' },
      { action: 'Flux Pro', credits: '5' },
      { action: 'Runway Gen-3 (5s)', credits: '10' },
      { action: 'Kling v2 (5s)', credits: '8' },
      { action: 'Luma (5s)', credits: '6' },
      { action: 'Minimax Video', credits: '5' },
      { action: 'Pika', credits: '6' },
      { action: 'Ideogram v2', credits: '2' },
    ],
  },
];

// Storage key for active unified provider
const ACTIVE_UNIFIED_KEY = 'ai-studio-active-unified';

export const getActiveUnifiedProvider = (estabelecimentoId: string): string | null => {
  try {
    return localStorage.getItem(`${ACTIVE_UNIFIED_KEY}-${estabelecimentoId}`);
  } catch { return null; }
};

export const setActiveUnifiedProvider = (estabelecimentoId: string, providerId: string | null) => {
  const key = `${ACTIVE_UNIFIED_KEY}-${estabelecimentoId}`;
  if (providerId) {
    localStorage.setItem(key, providerId);
  } else {
    localStorage.removeItem(key);
  }
};

/**
 * Given the active unified provider, returns model values that should be hidden
 * because they are covered by the active unified provider.
 * Also hides models from OTHER unified providers that are not active.
 */
export const getHiddenModelPrefixes = (activeProviderId: string | null): string[] => {
  const hidden: string[] = [];
  
  UNIFIED_PROVIDERS.forEach(p => {
    if (p.id !== activeProviderId) {
      // Hide models from inactive unified providers
      hidden.push(...p.coveredModelPrefixes);
    }
  });
  
  return hidden;
};

export const shouldHideModel = (modelValue: string, activeProviderId: string | null): boolean => {
  const hiddenPrefixes = getHiddenModelPrefixes(activeProviderId);
  return hiddenPrefixes.some(prefix => modelValue.startsWith(prefix));
};
