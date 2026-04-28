// Types for the Video Timeline Editor

export interface TimelineClip {
  id: string;
  trackId: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'effect' | 'canvas';
  name: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  src?: string;
  thumbnail?: string;
  color: string;
  volume?: number;
  opacity?: number;
  filters?: VideoFilter[];
  audioFilters?: AudioFilter[];
  transition?: ClipTransition;
  transitions?: ClipTransitions;
  locked?: boolean;
  lockedEdge?: 'start' | 'end' | 'both' | null;
  muted?: boolean;
  canvasJson?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  skewY?: number;
  effectType?: TransitionType;
  // Audio envelope & speed
  volumeEnvelope?: VolumeEnvelopePoint[];
  playbackRate?: number; // 0.25 - 4.0 (1 = normal)
}

// Volume automation point (position as % of clip duration, volume 0-1)
export interface VolumeEnvelopePoint {
  time: number;  // 0-1 (percentage of clip duration)
  value: number; // 0-1 (volume level)
}

// ========== Audio Filter System ==========

export type AudioFilterType =
  // EQ
  | 'eq-bass' | 'eq-low-mid' | 'eq-mid' | 'eq-high-mid' | 'eq-treble' | 'eq-presence' | 'eq-brilliance'
  // Dynamics
  | 'compressor' | 'limiter' | 'noise-gate' | 'expander' | 'de-esser'
  // Spatial
  | 'reverb' | 'delay' | 'echo' | 'chorus' | 'flanger' | 'phaser' | 'stereo-widener' | 'pan'
  // Pitch & Time
  | 'pitch-shift' | 'time-stretch' | 'harmonizer'
  // Enhancement
  | 'normalize' | 'de-noise' | 'de-hum' | 'vocal-enhance' | 'bass-boost' | 'treble-boost' | 'exciter' | 'warmth'
  // Creative
  | 'distortion' | 'bitcrusher' | 'vinyl-crackle' | 'radio-effect' | 'telephone' | 'underwater' | 'megaphone' | 'robot-voice'
  // Fade
  | 'fade-in' | 'fade-out' | 'crossfade-audio'
  // Ducking
  | 'ducking' | 'sidechain';

export interface AudioFilter {
  id: string;
  type: AudioFilterType;
  label: string;
  value: number; // 0-100
  enabled: boolean;
  params?: Record<string, number>; // extra parameters per filter
}

export interface AudioFilterDef {
  type: AudioFilterType;
  label: string;
  icon: string;
  description: string;
  defaultValue: number;
  category: string;
  params?: { key: string; label: string; min: number; max: number; step: number; defaultValue: number }[];
}

export const AUDIO_FILTER_DEFS: AudioFilterDef[] = [
  // === EQ (Equalizador) ===
  { type: 'eq-bass', label: 'Graves (60Hz)', icon: '🔊', description: 'Reforço/corte de frequências graves', defaultValue: 50, category: 'Equalizador' },
  { type: 'eq-low-mid', label: 'Médio-Grave (250Hz)', icon: '🔉', description: 'Corpo e calor do áudio', defaultValue: 50, category: 'Equalizador' },
  { type: 'eq-mid', label: 'Médios (1kHz)', icon: '🔈', description: 'Presença vocal e instrumentos', defaultValue: 50, category: 'Equalizador' },
  { type: 'eq-high-mid', label: 'Médio-Agudo (4kHz)', icon: '📢', description: 'Definição e articulação', defaultValue: 50, category: 'Equalizador' },
  { type: 'eq-treble', label: 'Agudos (8kHz)', icon: '🔔', description: 'Brilho e clareza', defaultValue: 50, category: 'Equalizador' },
  { type: 'eq-presence', label: 'Presença (12kHz)', icon: '✨', description: 'Abertura e ar', defaultValue: 50, category: 'Equalizador' },
  { type: 'eq-brilliance', label: 'Brilho (16kHz)', icon: '💎', description: 'Ultra-agudos e shimmer', defaultValue: 50, category: 'Equalizador' },
  // === Dinâmica ===
  { type: 'compressor', label: 'Compressor', icon: '📊', description: 'Reduz diferença entre volumes alto e baixo', defaultValue: 40, category: 'Dinâmica',
    params: [
      { key: 'threshold', label: 'Threshold (dB)', min: -60, max: 0, step: 1, defaultValue: -20 },
      { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.5, defaultValue: 4 },
      { key: 'attack', label: 'Attack (ms)', min: 0, max: 200, step: 1, defaultValue: 10 },
      { key: 'release', label: 'Release (ms)', min: 10, max: 1000, step: 10, defaultValue: 100 },
      { key: 'knee', label: 'Knee (dB)', min: 0, max: 40, step: 1, defaultValue: 6 },
    ] },
  { type: 'limiter', label: 'Limiter', icon: '🛑', description: 'Impede picos acima do teto definido', defaultValue: 50, category: 'Dinâmica',
    params: [
      { key: 'ceiling', label: 'Ceiling (dB)', min: -12, max: 0, step: 0.5, defaultValue: -1 },
      { key: 'release', label: 'Release (ms)', min: 1, max: 500, step: 1, defaultValue: 50 },
    ] },
  { type: 'noise-gate', label: 'Noise Gate', icon: '🚪', description: 'Silencia áudio abaixo do limiar', defaultValue: 30, category: 'Dinâmica',
    params: [
      { key: 'threshold', label: 'Threshold (dB)', min: -80, max: 0, step: 1, defaultValue: -40 },
      { key: 'attack', label: 'Attack (ms)', min: 0, max: 50, step: 1, defaultValue: 1 },
      { key: 'release', label: 'Release (ms)', min: 10, max: 500, step: 5, defaultValue: 50 },
      { key: 'hold', label: 'Hold (ms)', min: 0, max: 500, step: 5, defaultValue: 50 },
    ] },
  { type: 'expander', label: 'Expander', icon: '📈', description: 'Aumenta alcance dinâmico suavemente', defaultValue: 30, category: 'Dinâmica' },
  { type: 'de-esser', label: 'De-Esser', icon: '🐍', description: 'Remove sibilâncias (SSS) de voz', defaultValue: 40, category: 'Dinâmica',
    params: [
      { key: 'frequency', label: 'Frequência (Hz)', min: 4000, max: 10000, step: 100, defaultValue: 6000 },
      { key: 'reduction', label: 'Redução (dB)', min: 0, max: 20, step: 1, defaultValue: 6 },
    ] },
  // === Espacial ===
  { type: 'reverb', label: 'Reverb', icon: '🏛️', description: 'Simula ambiente (sala, hall, catedral)', defaultValue: 30, category: 'Espacial',
    params: [
      { key: 'roomSize', label: 'Tamanho', min: 0, max: 100, step: 1, defaultValue: 50 },
      { key: 'damping', label: 'Amortecimento', min: 0, max: 100, step: 1, defaultValue: 50 },
      { key: 'wetDry', label: 'Wet/Dry', min: 0, max: 100, step: 1, defaultValue: 30 },
      { key: 'preDelay', label: 'Pre-Delay (ms)', min: 0, max: 200, step: 5, defaultValue: 20 },
    ] },
  { type: 'delay', label: 'Delay', icon: '⏱️', description: 'Repetições ritmadas do áudio', defaultValue: 25, category: 'Espacial',
    params: [
      { key: 'time', label: 'Tempo (ms)', min: 50, max: 2000, step: 10, defaultValue: 300 },
      { key: 'feedback', label: 'Feedback', min: 0, max: 95, step: 1, defaultValue: 40 },
      { key: 'wetDry', label: 'Wet/Dry', min: 0, max: 100, step: 1, defaultValue: 25 },
    ] },
  { type: 'echo', label: 'Echo', icon: '🗣️', description: 'Eco natural com decaimento', defaultValue: 20, category: 'Espacial' },
  { type: 'chorus', label: 'Chorus', icon: '🎵', description: 'Duplicação sutil para espessura', defaultValue: 30, category: 'Espacial',
    params: [
      { key: 'rate', label: 'Rate (Hz)', min: 0, max: 10, step: 0.1, defaultValue: 1.5 },
      { key: 'depth', label: 'Depth', min: 0, max: 100, step: 1, defaultValue: 50 },
      { key: 'wetDry', label: 'Wet/Dry', min: 0, max: 100, step: 1, defaultValue: 50 },
    ] },
  { type: 'flanger', label: 'Flanger', icon: '🌀', description: 'Efeito de varredura metálica', defaultValue: 30, category: 'Espacial' },
  { type: 'phaser', label: 'Phaser', icon: '🔀', description: 'Modulação de fase estilo sintetizador', defaultValue: 30, category: 'Espacial' },
  { type: 'stereo-widener', label: 'Stereo Widener', icon: '↔️', description: 'Expande imagem estéreo', defaultValue: 50, category: 'Espacial' },
  { type: 'pan', label: 'Pan (L/R)', icon: '🔄', description: 'Posição no campo estéreo', defaultValue: 50, category: 'Espacial' },
  // === Pitch & Tempo ===
  { type: 'pitch-shift', label: 'Pitch Shift', icon: '🎹', description: 'Altera tom sem mudar velocidade', defaultValue: 50, category: 'Pitch & Tempo',
    params: [
      { key: 'semitones', label: 'Semitons', min: -24, max: 24, step: 1, defaultValue: 0 },
      { key: 'cents', label: 'Cents', min: -50, max: 50, step: 1, defaultValue: 0 },
    ] },
  { type: 'time-stretch', label: 'Time Stretch', icon: '⏩', description: 'Altera velocidade sem mudar tom', defaultValue: 50, category: 'Pitch & Tempo',
    params: [
      { key: 'speed', label: 'Velocidade (%)', min: 25, max: 400, step: 5, defaultValue: 100 },
    ] },
  { type: 'harmonizer', label: 'Harmonizer', icon: '🎶', description: 'Adiciona harmonias automáticas', defaultValue: 30, category: 'Pitch & Tempo' },
  // === Enhancement ===
  { type: 'normalize', label: 'Normalizar', icon: '📏', description: 'Ajusta volume ao nível ideal', defaultValue: 80, category: 'Enhancement' },
  { type: 'de-noise', label: 'Remoção de Ruído', icon: '🔇', description: 'Remove ruído de fundo (AI)', defaultValue: 60, category: 'Enhancement' },
  { type: 'de-hum', label: 'Remover Hum (60Hz)', icon: '⚡', description: 'Remove zumbido de rede elétrica', defaultValue: 70, category: 'Enhancement' },
  { type: 'vocal-enhance', label: 'Realce Vocal', icon: '🎤', description: 'Melhora clareza e presença da voz', defaultValue: 60, category: 'Enhancement' },
  { type: 'bass-boost', label: 'Bass Boost', icon: '💥', description: 'Reforço de graves profundos', defaultValue: 40, category: 'Enhancement' },
  { type: 'treble-boost', label: 'Treble Boost', icon: '🔔', description: 'Reforço de agudos cristalinos', defaultValue: 40, category: 'Enhancement' },
  { type: 'exciter', label: 'Exciter', icon: '⚡', description: 'Adiciona harmônicos para brilho', defaultValue: 35, category: 'Enhancement' },
  { type: 'warmth', label: 'Warmth', icon: '🔥', description: 'Saturação analógica sutil (tape)', defaultValue: 30, category: 'Enhancement' },
  // === Criativo ===
  { type: 'distortion', label: 'Distorção', icon: '🎸', description: 'Overdrive/saturação pesada', defaultValue: 20, category: 'Criativo' },
  { type: 'bitcrusher', label: 'Bitcrusher', icon: '👾', description: 'Redução de bits (lo-fi digital)', defaultValue: 25, category: 'Criativo' },
  { type: 'vinyl-crackle', label: 'Vinil Crackle', icon: '📀', description: 'Chiado de disco de vinil', defaultValue: 30, category: 'Criativo' },
  { type: 'radio-effect', label: 'Rádio AM', icon: '📻', description: 'Simula áudio de rádio antigo', defaultValue: 50, category: 'Criativo' },
  { type: 'telephone', label: 'Telefone', icon: '📞', description: 'Voz de ligação telefônica', defaultValue: 50, category: 'Criativo' },
  { type: 'underwater', label: 'Subaquático', icon: '🌊', description: 'Áudio abafado como debaixo d\'água', defaultValue: 50, category: 'Criativo' },
  { type: 'megaphone', label: 'Megafone', icon: '📣', description: 'Voz amplificada com distorção', defaultValue: 50, category: 'Criativo' },
  { type: 'robot-voice', label: 'Voz Robótica', icon: '🤖', description: 'Efeito vocoder/robô', defaultValue: 50, category: 'Criativo' },
  // === Fades ===
  { type: 'fade-in', label: 'Fade In', icon: '📈', description: 'Volume sobe gradualmente', defaultValue: 50, category: 'Fades',
    params: [{ key: 'duration', label: 'Duração (s)', min: 0.1, max: 10, step: 0.1, defaultValue: 1 }] },
  { type: 'fade-out', label: 'Fade Out', icon: '📉', description: 'Volume diminui gradualmente', defaultValue: 50, category: 'Fades',
    params: [{ key: 'duration', label: 'Duração (s)', min: 0.1, max: 10, step: 0.1, defaultValue: 2 }] },
  { type: 'crossfade-audio', label: 'Crossfade', icon: '🔄', description: 'Transição suave entre áudios', defaultValue: 50, category: 'Fades' },
  // === Ducking ===
  { type: 'ducking', label: 'Ducking', icon: '🦆', description: 'Abaixa música quando há voz', defaultValue: 60, category: 'Ducking',
    params: [
      { key: 'reduction', label: 'Redução (dB)', min: -30, max: 0, step: 1, defaultValue: -12 },
      { key: 'attack', label: 'Attack (ms)', min: 1, max: 200, step: 1, defaultValue: 20 },
      { key: 'release', label: 'Release (ms)', min: 50, max: 2000, step: 10, defaultValue: 500 },
    ] },
  { type: 'sidechain', label: 'Sidechain', icon: '🔗', description: 'Compressão rítmica (pumping)', defaultValue: 50, category: 'Ducking' },
];

export interface AudioPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  filters: Omit<AudioFilter, 'id'>[];
}

export const AUDIO_PRESETS: AudioPreset[] = [
  // Podcast
  { id: 'podcast-voice', name: 'Podcast Voz', icon: '🎙️', description: 'Voz clara e profissional para podcast', category: 'Podcast',
    filters: [
      { type: 'noise-gate', label: 'Noise Gate', value: 35, enabled: true },
      { type: 'de-noise', label: 'Remoção de Ruído', value: 60, enabled: true },
      { type: 'compressor', label: 'Compressor', value: 50, enabled: true },
      { type: 'eq-bass', label: 'Graves', value: 40, enabled: true },
      { type: 'eq-mid', label: 'Médios', value: 60, enabled: true },
      { type: 'eq-presence', label: 'Presença', value: 65, enabled: true },
      { type: 'limiter', label: 'Limiter', value: 50, enabled: true },
    ] },
  { id: 'podcast-music', name: 'Podcast BG', icon: '🎵', description: 'Música de fundo para podcast', category: 'Podcast',
    filters: [
      { type: 'eq-treble', label: 'Agudos', value: 40, enabled: true },
      { type: 'ducking', label: 'Ducking', value: 60, enabled: true },
    ] },
  // Música
  { id: 'master-loud', name: 'Master Loud', icon: '🔊', description: 'Mastering alto e impactante', category: 'Música',
    filters: [
      { type: 'compressor', label: 'Compressor', value: 60, enabled: true },
      { type: 'exciter', label: 'Exciter', value: 40, enabled: true },
      { type: 'stereo-widener', label: 'Stereo Width', value: 65, enabled: true },
      { type: 'limiter', label: 'Limiter', value: 70, enabled: true },
    ] },
  { id: 'warm-analog', name: 'Analógico Quente', icon: '🔥', description: 'Saturação tape vintage', category: 'Música',
    filters: [
      { type: 'warmth', label: 'Warmth', value: 55, enabled: true },
      { type: 'eq-low-mid', label: 'Médio-Grave', value: 58, enabled: true },
      { type: 'compressor', label: 'Compressor', value: 35, enabled: true },
    ] },
  { id: 'lofi-chill', name: 'Lo-Fi Chill', icon: '☕', description: 'Estética lo-fi hip hop', category: 'Música',
    filters: [
      { type: 'vinyl-crackle', label: 'Vinil', value: 40, enabled: true },
      { type: 'bitcrusher', label: 'Bitcrusher', value: 20, enabled: true },
      { type: 'eq-treble', label: 'Agudos', value: 35, enabled: true },
      { type: 'warmth', label: 'Warmth', value: 50, enabled: true },
      { type: 'reverb', label: 'Reverb', value: 35, enabled: true },
    ] },
  // Voz
  { id: 'vocal-clarity', name: 'Voz Clara', icon: '🎤', description: 'Realce vocal para narração', category: 'Voz',
    filters: [
      { type: 'de-noise', label: 'De-noise', value: 50, enabled: true },
      { type: 'vocal-enhance', label: 'Realce Vocal', value: 65, enabled: true },
      { type: 'de-esser', label: 'De-Esser', value: 40, enabled: true },
      { type: 'compressor', label: 'Compressor', value: 45, enabled: true },
    ] },
  { id: 'voice-radio', name: 'Voz de Rádio', icon: '📻', description: 'Presença e impacto de locutor FM', category: 'Voz',
    filters: [
      { type: 'compressor', label: 'Compressor', value: 65, enabled: true },
      { type: 'eq-bass', label: 'Graves', value: 60, enabled: true },
      { type: 'eq-presence', label: 'Presença', value: 70, enabled: true },
      { type: 'exciter', label: 'Exciter', value: 45, enabled: true },
      { type: 'limiter', label: 'Limiter', value: 55, enabled: true },
    ] },
  { id: 'voice-asmr', name: 'ASMR', icon: '🤫', description: 'Voz sussurrada próxima', category: 'Voz',
    filters: [
      { type: 'noise-gate', label: 'Noise Gate', value: 25, enabled: true },
      { type: 'bass-boost', label: 'Bass Boost', value: 55, enabled: true },
      { type: 'eq-presence', label: 'Presença', value: 65, enabled: true },
      { type: 'reverb', label: 'Reverb', value: 15, enabled: true },
    ] },
  // Efeitos
  { id: 'telephone-effect', name: 'Efeito Telefone', icon: '📞', description: 'Simula ligação telefônica', category: 'Efeitos',
    filters: [
      { type: 'telephone', label: 'Telefone', value: 50, enabled: true },
    ] },
  { id: 'underwater-effect', name: 'Subaquático', icon: '🌊', description: 'Áudio debaixo d\'água', category: 'Efeitos',
    filters: [
      { type: 'underwater', label: 'Subaquático', value: 50, enabled: true },
    ] },
  { id: 'robot-effect', name: 'Robô', icon: '🤖', description: 'Voz robótica/vocoder', category: 'Efeitos',
    filters: [
      { type: 'robot-voice', label: 'Voz Robótica', value: 50, enabled: true },
    ] },
  { id: 'cinematic-boom', name: 'Cinematic Boom', icon: '💥', description: 'Impacto cinematográfico profundo', category: 'Efeitos',
    filters: [
      { type: 'bass-boost', label: 'Bass Boost', value: 80, enabled: true },
      { type: 'reverb', label: 'Reverb', value: 60, enabled: true },
      { type: 'compressor', label: 'Compressor', value: 55, enabled: true },
    ] },
  { id: 'space-ambient', name: 'Espacial', icon: '🚀', description: 'Ambiente espacial etéreo', category: 'Efeitos',
    filters: [
      { type: 'reverb', label: 'Reverb', value: 80, enabled: true },
      { type: 'delay', label: 'Delay', value: 40, enabled: true },
      { type: 'chorus', label: 'Chorus', value: 50, enabled: true },
      { type: 'stereo-widener', label: 'Stereo Width', value: 80, enabled: true },
    ] },
];

export interface VideoFilter {
  id: string;
  type: FilterType;
  label: string;
  value: number; // 0-100
  enabled: boolean;
}

export type FilterType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue-rotate'
  | 'blur'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'opacity'
  | 'sharpen'
  | 'drop-shadow'
  | 'vignette';

export interface ClipTransition {
  type: TransitionType;
  duration: number;
  easing?: string;
}

export interface ClipTransitions {
  entrance?: ClipTransition;
  exit?: ClipTransition;
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'crossfade'
  | 'dissolve'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'wipe-circle'
  | 'wipe-diamond'
  | 'zoom-in'
  | 'zoom-out'
  | 'blur-transition'
  | 'flash'
  | 'scale-up'
  | 'scale-down'
  | 'rotate-in'
  | 'rotate-out'
  | 'bounce'
  | 'elastic'
  | 'flip-x'
  | 'flip-y'
  | 'glitch'
  | 'split-horizontal'
  | 'split-vertical'
  | 'iris-open'
  | 'iris-close'
  | 'pixelate'
  | 'swing'
  | 'roll-left'
  | 'roll-right'
  | 'fade-blur'
  | 'morph-scale'
  | 'spiral'
  // --- NEW: Premiere / After Effects style ---
  | 'push-left'
  | 'push-right'
  | 'push-up'
  | 'push-down'
  | 'cover-left'
  | 'cover-right'
  | 'reveal-left'
  | 'reveal-right'
  | 'cross-zoom'
  | 'cross-spin'
  | 'luma-fade'
  | 'light-leak'
  | 'film-burn'
  | 'whip-pan'
  | 'shake'
  | 'stretch-h'
  | 'stretch-v'
  | 'page-curl'
  | 'cube-left'
  | 'cube-right'
  | 'door-open'
  | 'door-close'
  | 'blinds-h'
  | 'blinds-v'
  | 'clock-wipe'
  | 'radial-wipe'
  | 'mosaic'
  | 'color-wipe'
  | 'ripple'
  | 'spin-out'
  | 'tumble'
  | 'drop'
  | 'fly-in'
  | 'fly-out'
  // Cinematográfico
  | 'cinematic-fade'
  | 'dolly-zoom'
  | 'lens-flare'
  | 'anamorphic-wipe'
  | 'rack-focus'
  | 'letterbox-reveal'
  | 'speed-ramp'
  | 'film-grain-fade'
  | 'smoke-reveal'
  | 'prism-shift'
  // UGC / Social
  | 'snap-cut'
  | 'phone-swipe-up'
  | 'phone-swipe-left'
  | 'tiktok-zoom'
  | 'vlog-jump'
  | 'selfie-flip'
  | 'story-slide'
  | 'boomerang'
  | 'hand-block'
  | 'quick-pan'
  // Marcas Famosas
  | 'nike-swoosh'
  | 'apple-fade'
  | 'netflix-punch'
  | 'adidas-stripe'
  | 'coca-wave'
  | 'samsung-fold'
  | 'google-morph'
  | 'disney-sparkle'
  | 'supreme-drop'
  | 'luxury-curtain';

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'effect' | 'canvas' | 'image';
  height: number;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  volume: number;
  solo: boolean;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  duration: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
  isPlaying: boolean;
  selectedClipIds: string[];
  snapEnabled: boolean;
  fps: number;
}

export interface EffectPreset {
  id: string;
  name: string;
  icon: string;
  category: string;
  filters: Omit<VideoFilter, 'id'>[];
  description?: string;
}

export const TRANSITION_PRESETS: { type: TransitionType; label: string; icon: string; description: string }[] = [
  { type: 'none', label: 'Nenhum', icon: '⬜', description: 'Sem efeito' },
  // Básicas
  { type: 'fade', label: 'Fade', icon: '🌫️', description: 'Aparece/desaparece suavemente' },
  { type: 'dissolve', label: 'Dissolve', icon: '✨', description: 'Dissolução gradual com partículas' },
  { type: 'crossfade', label: 'Crossfade', icon: '🔄', description: 'Transição cruzada entre clipes' },
  { type: 'fade-blur', label: 'Fade + Blur', icon: '🌀', description: 'Fade com desfoque progressivo' },
  // Movimento
  { type: 'slide-left', label: 'Slide ←', icon: '⬅️', description: 'Desliza pela esquerda' },
  { type: 'slide-right', label: 'Slide →', icon: '➡️', description: 'Desliza pela direita' },
  { type: 'slide-up', label: 'Slide ↑', icon: '⬆️', description: 'Desliza por cima' },
  { type: 'slide-down', label: 'Slide ↓', icon: '⬇️', description: 'Desliza por baixo' },
  { type: 'roll-left', label: 'Roll ←', icon: '🎞️', description: 'Rola com rotação lateral' },
  { type: 'roll-right', label: 'Roll →', icon: '📽️', description: 'Rola com rotação lateral' },
  // Escala & Rotação
  { type: 'zoom-in', label: 'Zoom In', icon: '🔍', description: 'Cresce do centro' },
  { type: 'zoom-out', label: 'Zoom Out', icon: '🔎', description: 'Diminui ao centro' },
  { type: 'scale-up', label: 'Pop', icon: '💥', description: 'Aparece com impacto e bounce' },
  { type: 'scale-down', label: 'Encolher', icon: '🫧', description: 'Encolhe suavemente' },
  { type: 'morph-scale', label: 'Morph', icon: '🎭', description: 'Escala com distorção suave' },
  { type: 'rotate-in', label: 'Rotação ↻', icon: '↻', description: 'Gira ao aparecer (horário)' },
  { type: 'rotate-out', label: 'Rotação ↺', icon: '↺', description: 'Gira ao aparecer (anti-horário)' },
  { type: 'spiral', label: 'Espiral', icon: '🌀', description: 'Espiral do centro' },
  { type: 'flip-x', label: 'Flip H', icon: '↔️', description: 'Gira horizontalmente (3D)' },
  { type: 'flip-y', label: 'Flip V', icon: '↕️', description: 'Gira verticalmente (3D)' },
  // Dinâmicas
  { type: 'bounce', label: 'Bounce', icon: '🏀', description: 'Efeito elástico natural' },
  { type: 'elastic', label: 'Elástico', icon: '🎢', description: 'Efeito mola com overshoot' },
  { type: 'swing', label: 'Swing', icon: '🎪', description: 'Balanço pendular' },
  // Revelação
  { type: 'wipe-left', label: 'Wipe ←', icon: '◀️', description: 'Cortina para esquerda' },
  { type: 'wipe-right', label: 'Wipe →', icon: '▶️', description: 'Cortina para direita' },
  { type: 'wipe-up', label: 'Wipe ↑', icon: '🔼', description: 'Cortina para cima' },
  { type: 'wipe-down', label: 'Wipe ↓', icon: '🔽', description: 'Cortina para baixo' },
  { type: 'wipe-circle', label: 'Wipe Círculo', icon: '⭕', description: 'Revelação circular do centro' },
  { type: 'wipe-diamond', label: 'Wipe Losango', icon: '💎', description: 'Revelação em losango' },
  { type: 'iris-open', label: 'Iris Open', icon: '👁️', description: 'Abertura tipo íris de câmera' },
  { type: 'iris-close', label: 'Iris Close', icon: '🔘', description: 'Fechamento tipo íris' },
  { type: 'split-horizontal', label: 'Split H', icon: '↔️', description: 'Divide ao meio horizontalmente' },
  { type: 'split-vertical', label: 'Split V', icon: '↕️', description: 'Divide ao meio verticalmente' },
  // Efeitos Especiais
  { type: 'blur-transition', label: 'Blur', icon: '💫', description: 'Desfoque progressivo' },
  { type: 'flash', label: 'Flash', icon: '⚡', description: 'Lampejo branco cinematográfico' },
  { type: 'glitch', label: 'Glitch', icon: '📺', description: 'Distorção digital RGB' },
  { type: 'pixelate', label: 'Pixelate', icon: '🟩', description: 'Pixelização progressiva' },
  { type: 'light-leak', label: 'Light Leak', icon: '🔆', description: 'Vazamento de luz cinematográfico' },
  { type: 'film-burn', label: 'Film Burn', icon: '🎞️', description: 'Queima de filme analógico' },
  { type: 'luma-fade', label: 'Luma Fade', icon: '🌓', description: 'Fade por luminosidade' },
  { type: 'shake', label: 'Shake', icon: '📳', description: 'Tremor de câmera' },
  { type: 'ripple', label: 'Ripple', icon: '🌊', description: 'Ondulação líquida' },
  { type: 'mosaic', label: 'Mosaico', icon: '🧩', description: 'Transição em mosaico' },
  { type: 'color-wipe', label: 'Color Wipe', icon: '🎨', description: 'Wipe com cor sólida' },
  // Premiere Push/Cover/Reveal
  { type: 'push-left', label: 'Push ←', icon: '👈', description: 'Empurra o clipe para a esquerda' },
  { type: 'push-right', label: 'Push →', icon: '👉', description: 'Empurra o clipe para a direita' },
  { type: 'push-up', label: 'Push ↑', icon: '👆', description: 'Empurra o clipe para cima' },
  { type: 'push-down', label: 'Push ↓', icon: '👇', description: 'Empurra o clipe para baixo' },
  { type: 'cover-left', label: 'Cover ←', icon: '📕', description: 'Cobre deslizando da direita' },
  { type: 'cover-right', label: 'Cover →', icon: '📗', description: 'Cobre deslizando da esquerda' },
  { type: 'reveal-left', label: 'Reveal ←', icon: '🎪', description: 'Revela deslizando para esquerda' },
  { type: 'reveal-right', label: 'Reveal →', icon: '🎠', description: 'Revela deslizando para direita' },
  // After Effects 3D & Motion
  { type: 'cross-zoom', label: 'Cross Zoom', icon: '🔭', description: 'Zoom cruzado entre clipes' },
  { type: 'cross-spin', label: 'Cross Spin', icon: '💫', description: 'Rotação cruzada entre clipes' },
  { type: 'whip-pan', label: 'Whip Pan', icon: '🎬', description: 'Pan rápido com motion blur' },
  { type: 'cube-left', label: 'Cubo ←', icon: '🧊', description: 'Rotação de cubo 3D horizontal' },
  { type: 'cube-right', label: 'Cubo →', icon: '📦', description: 'Rotação de cubo 3D horizontal' },
  { type: 'page-curl', label: 'Page Curl', icon: '📄', description: 'Virar de página 3D' },
  { type: 'door-open', label: 'Door Open', icon: '🚪', description: 'Portas abrindo ao centro' },
  { type: 'door-close', label: 'Door Close', icon: '🔒', description: 'Portas fechando ao centro' },
  { type: 'stretch-h', label: 'Stretch H', icon: '↔️', description: 'Estica horizontalmente' },
  { type: 'stretch-v', label: 'Stretch V', icon: '↕️', description: 'Estica verticalmente' },
  // Wipes avançados
  { type: 'blinds-h', label: 'Blinds H', icon: '🪟', description: 'Persianas horizontais' },
  { type: 'blinds-v', label: 'Blinds V', icon: '🏢', description: 'Persianas verticais' },
  { type: 'clock-wipe', label: 'Clock Wipe', icon: '🕐', description: 'Wipe circular tipo relógio' },
  { type: 'radial-wipe', label: 'Radial Wipe', icon: '☀️', description: 'Wipe radial do centro' },
  // Motion
  { type: 'spin-out', label: 'Spin Out', icon: '🌪️', description: 'Gira e desaparece' },
  { type: 'tumble', label: 'Tumble', icon: '🎲', description: 'Cai girando 3D' },
  { type: 'drop', label: 'Drop', icon: '⬇️', description: 'Cai com gravidade e bounce' },
  { type: 'fly-in', label: 'Fly In', icon: '✈️', description: 'Voa de longe com perspectiva' },
  { type: 'fly-out', label: 'Fly Out', icon: '🚀', description: 'Voa para longe com perspectiva' },
  // Cinematográfico
  { type: 'cinematic-fade', label: 'Cine Fade', icon: '🎬', description: 'Fade lento com vinheta e leve desfoque — estilo trailer' },
  { type: 'dolly-zoom', label: 'Dolly Zoom', icon: '📹', description: 'Efeito Vertigo (zoom + escala inversa) — Hitchcock/Spielberg' },
  { type: 'lens-flare', label: 'Lens Flare', icon: '☀️', description: 'Transição com reflexo de lente — estilo J.J. Abrams' },
  { type: 'anamorphic-wipe', label: 'Anamorphic', icon: '🎞️', description: 'Wipe com distorção anamórfica — cinema widescreen' },
  { type: 'rack-focus', label: 'Rack Focus', icon: '🔭', description: 'Desfoque e refoco dramático — padrão cinematográfico' },
  { type: 'letterbox-reveal', label: 'Letterbox', icon: '📽️', description: 'Barras cinemáticas abrindo — intro de filme' },
  { type: 'speed-ramp', label: 'Speed Ramp', icon: '⚡', description: 'Desaceleração dramática + zoom — estilo Guy Ritchie' },
  { type: 'film-grain-fade', label: 'Grain Fade', icon: '📷', description: 'Fade com grão de filme — estilo película 35mm' },
  { type: 'smoke-reveal', label: 'Smoke Reveal', icon: '💨', description: 'Revelação com efeito fumaça — trailers de ação' },
  { type: 'prism-shift', label: 'Prism', icon: '🌈', description: 'Aberração cromática + prisma — indie cinematográfico' },
  // UGC / Social
  { type: 'snap-cut', label: 'Snap Cut', icon: '✂️', description: 'Corte seco e rápido — estilo YouTube/TikTok' },
  { type: 'phone-swipe-up', label: 'Swipe ↑', icon: '📱', description: 'Swipe para cima estilo Stories/Reels' },
  { type: 'phone-swipe-left', label: 'Swipe ←', icon: '📲', description: 'Swipe lateral estilo carrossel' },
  { type: 'tiktok-zoom', label: 'TikTok Zoom', icon: '🔥', description: 'Zoom rápido com shake — viral TikTok' },
  { type: 'vlog-jump', label: 'Jump Cut', icon: '🎥', description: 'Jump cut clássico de vlog — Casey Neistat style' },
  { type: 'selfie-flip', label: 'Selfie Flip', icon: '🤳', description: 'Flip de câmera frontal — estilo influencer' },
  { type: 'story-slide', label: 'Story Slide', icon: '📖', description: 'Slide suave entre stories — Instagram/Snapchat' },
  { type: 'boomerang', label: 'Boomerang', icon: '🪃', description: 'Efeito vai-e-volta — Instagram Boomerang' },
  { type: 'hand-block', label: 'Hand Block', icon: '✋', description: 'Simulação de mão cobrindo câmera — transição viral' },
  { type: 'quick-pan', label: 'Quick Pan', icon: '💫', description: 'Pan rápido lateral — estilo travel vlog' },
  // Marcas Famosas
  { type: 'nike-swoosh', label: 'Swoosh Cut', icon: '✓', description: 'Corte diagonal dinâmico — inspirado Nike "Just Do It"' },
  { type: 'apple-fade', label: 'Apple Fade', icon: '🍎', description: 'Fade ultra-suave com preto — Apple keynote style' },
  { type: 'netflix-punch', label: 'Netflix Punch', icon: '🅽', description: 'Zoom agressivo com flash — estilo Netflix trailer' },
  { type: 'adidas-stripe', label: 'Stripe Wipe', icon: '▰', description: 'Wipe em 3 faixas diagonais — inspirado Adidas' },
  { type: 'coca-wave', label: 'Wave Reveal', icon: '🌊', description: 'Revelação com onda fluida — estilo Coca-Cola' },
  { type: 'samsung-fold', label: 'Fold', icon: '📱', description: 'Dobra 3D central — inspirado Samsung Fold' },
  { type: 'google-morph', label: 'Color Morph', icon: '🔵', description: 'Morph com cores vibrantes — estilo Google/Material' },
  { type: 'disney-sparkle', label: 'Sparkle', icon: '✨', description: 'Brilho mágico com fade — Disney/Pixar style' },
  { type: 'supreme-drop', label: 'Drop In', icon: '🔴', description: 'Queda com impacto bold — streetwear/Supreme' },
  { type: 'luxury-curtain', label: 'Luxury Curtain', icon: '🎭', description: 'Cortina dourada elegante — Louis Vuitton/Chanel' },
];

export const EFFECT_PRESETS: EffectPreset[] = [
  // Cor
  {
    id: 'cinematic', name: 'Cinematográfico', icon: '🎬', category: 'Cor',
    description: 'Look de cinema com contraste alto e tons quentes',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 65, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 40, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 45, enabled: true },
    ],
  },
  {
    id: 'cinematic-teal', name: 'Teal & Orange', icon: '🎥', category: 'Cor',
    description: 'Paleta Hollywood: tons teal nas sombras e laranja na pele',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 62, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 55, enabled: true },
      { type: 'hue-rotate', label: 'Matiz', value: 5, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 48, enabled: true },
    ],
  },
  {
    id: 'vintage', name: 'Vintage', icon: '📷', category: 'Cor',
    description: 'Estilo retrô com sépia e contraste suave',
    filters: [
      { type: 'sepia', label: 'Sépia', value: 40, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 60, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'bw', name: 'Preto e Branco', icon: '⬛', category: 'Cor',
    description: 'Monocromático clássico com alto contraste',
    filters: [
      { type: 'grayscale', label: 'Cinza', value: 100, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 60, enabled: true },
    ],
  },
  {
    id: 'noir', name: 'Film Noir', icon: '🕵️', category: 'Cor',
    description: 'Noir dramático com sombras profundas',
    filters: [
      { type: 'grayscale', label: 'Cinza', value: 100, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 75, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 42, enabled: true },
    ],
  },
  {
    id: 'vivid', name: 'Vívido', icon: '🌈', category: 'Cor',
    description: 'Cores ultra saturadas e vibrantes',
    filters: [
      { type: 'saturation', label: 'Saturação', value: 85, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 58, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'warm', name: 'Quente', icon: '🔥', category: 'Cor',
    description: 'Tons alaranjados e aconchegantes',
    filters: [
      { type: 'hue-rotate', label: 'Matiz', value: 8, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 60, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'cold', name: 'Frio', icon: '❄️', category: 'Cor',
    description: 'Tons azulados e gélidos',
    filters: [
      { type: 'hue-rotate', label: 'Matiz', value: 60, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 45, enabled: true },
    ],
  },
  {
    id: 'sunset', name: 'Pôr do Sol', icon: '🌅', category: 'Cor',
    description: 'Tons dourados de golden hour',
    filters: [
      { type: 'hue-rotate', label: 'Matiz', value: 6, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 65, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 58, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 52, enabled: true },
    ],
  },
  // Estilo
  {
    id: 'retro-vhs', name: 'VHS Retro', icon: '📼', category: 'Estilo',
    description: 'Estética de fita VHS dos anos 80/90',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 55, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 65, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 52, enabled: true },
      { type: 'blur', label: 'Blur', value: 3, enabled: true },
    ],
  },
  {
    id: 'dreamy', name: 'Sonho', icon: '☁️', category: 'Estilo',
    description: 'Visual etéreo e onírico',
    filters: [
      { type: 'blur', label: 'Blur', value: 12, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 62, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 35, enabled: true },
    ],
  },
  {
    id: 'hdr', name: 'HDR', icon: '📸', category: 'Estilo',
    description: 'Alto alcance dinâmico simulado',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 70, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 65, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 52, enabled: true },
      { type: 'sharpen', label: 'Nitidez', value: 40, enabled: true },
    ],
  },
  {
    id: 'matte', name: 'Matte', icon: '🎞️', category: 'Estilo',
    description: 'Pretos suaves estilo cinematográfico',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 45, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 52, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 42, enabled: true },
    ],
  },
  {
    id: 'bleach', name: 'Bleach Bypass', icon: '🧪', category: 'Estilo',
    description: 'Desaturado com contraste dramático',
    filters: [
      { type: 'saturation', label: 'Saturação', value: 25, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 72, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 48, enabled: true },
    ],
  },
  {
    id: 'lomo', name: 'Lomo', icon: '📸', category: 'Estilo',
    description: 'Efeito lomografia com vinheta',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 68, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 70, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 48, enabled: true },
    ],
  },
  // Premiere / AE Pro Looks
  {
    id: 'lumetri-basic', name: 'Lumetri Basic', icon: '🎬', category: 'Pro',
    description: 'Correção de cor base estilo Premiere Lumetri',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 58, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 52, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 50, enabled: true },
      { type: 'sharpen', label: 'Nitidez', value: 25, enabled: true },
    ],
  },
  {
    id: 'blockbuster', name: 'Blockbuster', icon: '🎥', category: 'Pro',
    description: 'Visual de filme de ação: contraste extremo, azulado',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 75, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 35, enabled: true },
      { type: 'hue-rotate', label: 'Matiz', value: 55, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 44, enabled: true },
    ],
  },
  {
    id: 'horror', name: 'Horror', icon: '👻', category: 'Pro',
    description: 'Atmosfera sombria e desaturada para terror',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 70, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 20, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 38, enabled: true },
    ],
  },
  {
    id: 'documentary', name: 'Documentário', icon: '📹', category: 'Pro',
    description: 'Visual natural e limpo para documentários',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 55, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 48, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 52, enabled: true },
    ],
  },
  {
    id: 'music-video', name: 'Music Video', icon: '🎵', category: 'Pro',
    description: 'Visual vibrante e stylizado para clipes musicais',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 65, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 78, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
      { type: 'sharpen', label: 'Nitidez', value: 30, enabled: true },
    ],
  },
  {
    id: 'sci-fi', name: 'Sci-Fi', icon: '🛸', category: 'Pro',
    description: 'Visual futurista com tons frios e alto contraste',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 68, enabled: true },
      { type: 'hue-rotate', label: 'Matiz', value: 45, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 55, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 46, enabled: true },
    ],
  },
  {
    id: 'anamorphic', name: 'Anamorphic', icon: '🎞️', category: 'Pro',
    description: 'Simula lente anamórfica: flares e tons quentes',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 60, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 50, enabled: true },
      { type: 'hue-rotate', label: 'Matiz', value: 10, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 54, enabled: true },
    ],
  },
  {
    id: 'cross-process', name: 'Cross Process', icon: '🔬', category: 'Pro',
    description: 'Revelação cruzada: cores surreais e intensas',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 65, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 75, enabled: true },
      { type: 'hue-rotate', label: 'Matiz', value: 25, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 50, enabled: true },
    ],
  },
  // Especial
  {
    id: 'negative', name: 'Negativo', icon: '🔄', category: 'Especial',
    description: 'Inversão total de cores',
    filters: [
      { type: 'invert', label: 'Inverter', value: 100, enabled: true },
    ],
  },
  {
    id: 'xray', name: 'Raio-X', icon: '🦴', category: 'Especial',
    description: 'Efeito radiografia',
    filters: [
      { type: 'invert', label: 'Inverter', value: 100, enabled: true },
      { type: 'grayscale', label: 'Cinza', value: 80, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 70, enabled: true },
    ],
  },
  {
    id: 'cyberpunk', name: 'Cyberpunk', icon: '🌃', category: 'Especial',
    description: 'Neon urbano futurista',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 72, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 80, enabled: true },
      { type: 'hue-rotate', label: 'Matiz', value: 75, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 48, enabled: true },
    ],
  },
  {
    id: 'thermal', name: 'Térmica', icon: '🌡️', category: 'Especial',
    description: 'Visão térmica com tons quentes/frios',
    filters: [
      { type: 'hue-rotate', label: 'Matiz', value: 85, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 90, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 80, enabled: true },
    ],
  },
  {
    id: 'posterize', name: 'Posterize', icon: '🖼️', category: 'Especial',
    description: 'Redução de cores estilo poster',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 90, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 80, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'duotone', name: 'Duotone', icon: '🎨', category: 'Especial',
    description: 'Duas cores: sombra e destaque',
    filters: [
      { type: 'grayscale', label: 'Cinza', value: 100, enabled: true },
      { type: 'sepia', label: 'Sépia', value: 50, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 65, enabled: true },
      { type: 'hue-rotate', label: 'Matiz', value: 40, enabled: true },
    ],
  },
];

// Presets specifically for the Effects track — standalone visual overlays
export const EFFECT_TRACK_PRESETS: { type: TransitionType; label: string; icon: string; description: string; category: string }[] = [
  // Luz & Flash
  { type: 'flash', label: 'Flash', icon: '⚡', description: 'Lampejo branco cinematográfico', category: 'Luz' },
  { type: 'light-leak', label: 'Light Leak', icon: '🔆', description: 'Vazamento de luz dourada', category: 'Luz' },
  { type: 'film-burn', label: 'Film Burn', icon: '🎞️', description: 'Queima de filme analógico', category: 'Luz' },
  { type: 'luma-fade', label: 'Luma Fade', icon: '🌓', description: 'Fade por luminosidade', category: 'Luz' },
  // Distorção
  { type: 'glitch', label: 'Glitch', icon: '📺', description: 'Distorção digital RGB', category: 'Distorção' },
  { type: 'shake', label: 'Shake', icon: '📳', description: 'Tremor de câmera', category: 'Distorção' },
  { type: 'ripple', label: 'Ripple', icon: '🌊', description: 'Ondulação líquida', category: 'Distorção' },
  { type: 'pixelate', label: 'Pixelate', icon: '🟩', description: 'Pixelização progressiva', category: 'Distorção' },
  { type: 'mosaic', label: 'Mosaico', icon: '🧩', description: 'Transição em mosaico', category: 'Distorção' },
  // Blur & Foco
  { type: 'blur-transition', label: 'Blur', icon: '💫', description: 'Desfoque progressivo', category: 'Blur' },
  { type: 'fade-blur', label: 'Fade + Blur', icon: '🌀', description: 'Fade com desfoque', category: 'Blur' },
  // Movimento
  { type: 'whip-pan', label: 'Whip Pan', icon: '🎬', description: 'Pan rápido com motion blur', category: 'Movimento' },
  { type: 'cross-zoom', label: 'Cross Zoom', icon: '🔭', description: 'Zoom cruzado', category: 'Movimento' },
  { type: 'cross-spin', label: 'Cross Spin', icon: '💫', description: 'Rotação cruzada', category: 'Movimento' },
  // Revelação
  { type: 'wipe-circle', label: 'Wipe Círculo', icon: '⭕', description: 'Revelação circular do centro', category: 'Revelação' },
  { type: 'iris-open', label: 'Iris Open', icon: '👁️', description: 'Abertura tipo íris', category: 'Revelação' },
  { type: 'radial-wipe', label: 'Radial Wipe', icon: '☀️', description: 'Wipe radial do centro', category: 'Revelação' },
  { type: 'clock-wipe', label: 'Clock Wipe', icon: '🕐', description: 'Wipe circular tipo relógio', category: 'Revelação' },
  // Especiais
  { type: 'color-wipe', label: 'Color Wipe', icon: '🎨', description: 'Wipe com cor sólida', category: 'Especial' },
  { type: 'fade', label: 'Fade', icon: '🌫️', description: 'Aparece/desaparece suavemente', category: 'Especial' },
  { type: 'dissolve', label: 'Dissolve', icon: '✨', description: 'Dissolução com partículas', category: 'Especial' },
];

export const TRACK_COLORS: Record<string, string> = {
  video: '#3b82f6',
  audio: '#22c55e',
  image: '#f97316',
  text: '#f59e0b',
  effect: '#a855f7',
  canvas: '#ec4899',
};

export const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'cv1', name: 'Canvas', type: 'canvas', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'img1', name: 'Imagem', type: 'image', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'v1', name: 'Vídeo 1', type: 'video', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'v2', name: 'Vídeo 2', type: 'video', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'a1', name: 'Áudio 1', type: 'audio', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'a2', name: 'Música', type: 'audio', height: 50, muted: false, locked: false, visible: true, volume: 0.7, solo: false },
  { id: 'e1', name: 'Efeitos', type: 'effect', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
];
