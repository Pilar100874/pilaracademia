import { Node, Edge } from '@xyflow/react';

// Node types available in the studio
export type StudioNodeType = 
  | 'textInput'
  | 'systemPrompt'
  | 'imageInput'
  | 'multiImageRef'
  | 'videoInput'
  | 'multiVideoRef'
  | 'productImageSelect'
  | 'multiProductSelect'
  | 'galleryInfluencer'
  | 'galleryAmbiente'
  | 'galleryEstilo'
  | 'galleryPaleta'
  | 'galleryTextura'
  | 'galleryLogo'
  | 'galleryPose'
  | 'galleryRoupa'
  | 'gallerySalvas'
  | 'textStyle'
  | 'textContent'
  | 'platformFormat'
  | 'llmProcess'
  | 'imageGen'
  | 'imageEdit'
  | 'productComposite'
  | 'videoGen'
  | 'audioGen'
  | 'musicGen'
  | 'lipSync'
  | 'videoMerge'
  | 'imageAnalyze'
  | 'mediaCorrection'
  | 'loopOutput'
  | 'randomPick'
  | 'mediaGallery'
  | 'output';

export interface StudioNodeData {
  label: string;
  type: StudioNodeType;
  config: Record<string, any>;
  result?: any;
  isProcessing?: boolean;
  error?: string;
  [key: string]: unknown;
}

export type StudioNode = Node<StudioNodeData>;
export type StudioEdge = Edge;

export interface NodeCategory {
  id: string;
  label: string;
  icon: string;
  nodes: {
    type: StudioNodeType;
    label: string;
    description: string;
    icon: string;
    color: string;
    defaultConfig: Record<string, any>;
  }[];
}

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: 'input',
    label: 'Entrada',
    icon: '📝',
    nodes: [
      {
        type: 'textInput',
        label: 'Texto / Prompt',
        description: 'Entrada de texto ou prompt do usuário',
        icon: '✏️',
        color: '#6366f1',
        defaultConfig: { text: 'Foto profissional de produto em fundo branco, iluminação de estúdio, alta resolução, detalhes nítidos' },
      },
      {
        type: 'systemPrompt',
        label: 'Mensagem do Sistema',
        description: 'Instruções para o modelo de IA',
        icon: '⚙️',
        color: '#8b5cf6',
        defaultConfig: { systemPrompt: 'Você é um diretor criativo especializado em marketing visual. Gere descrições detalhadas e prompts otimizados para geração de imagens publicitárias.' },
      },
      {
        type: 'imageInput',
        label: 'Imagens de Referência',
        description: 'Carregue imagens como referência para geração',
        icon: '🖼️',
        color: '#f97316',
        defaultConfig: { images: [] },
      },
      {
        type: 'multiImageRef',
        label: 'Referências Múltiplas',
        description: 'Selecione várias imagens de referência (upload ou galeria)',
        icon: '🖼️🖼️',
        color: '#e67e22',
        defaultConfig: { images: [], referenceRole: '' },
      },
      {
        type: 'videoInput',
        label: 'Vídeo de Referência',
        description: 'Carregue vídeos como referência para geração',
        icon: '🎬',
        color: '#f59e0b',
        defaultConfig: { videos: [] },
      },
      {
        type: 'multiVideoRef',
        label: 'Referências Múltiplas de Vídeo',
        description: 'Selecione vários vídeos de referência (upload ou galeria)',
        icon: '🎬🎬',
        color: '#d97706',
        defaultConfig: { videos: [] },
      },
      {
        type: 'productImageSelect',
        label: 'Imagem de Produto',
        description: 'Selecione imagem de um produto cadastrado',
        icon: '📦',
        color: '#10b981',
        defaultConfig: { productId: '', selectedImageUrl: '', productName: '' },
      },
      {
        type: 'multiProductSelect',
        label: 'Múltiplos Produtos',
        description: 'Selecione vários produtos para processamento em lote',
        icon: '📦📦',
        color: '#059669',
        defaultConfig: { products: [] },
      },
      {
        type: 'galleryInfluencer',
        label: 'Influencer',
        description: 'Selecione foto de influencer da galeria',
        icon: '👤',
        color: '#ec4899',
        defaultConfig: { selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
      },
      {
        type: 'galleryAmbiente',
        label: 'Ref. Ambiente',
        description: 'Referência de cenário ou ambientação',
        icon: '🏔️',
        color: '#22c55e',
        defaultConfig: { selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
      },
      {
        type: 'galleryEstilo',
        label: 'Ref. Estilo',
        description: 'Referência de estilo visual',
        icon: '🎨',
        color: '#8b5cf6',
        defaultConfig: { selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
      },
      {
        type: 'galleryPaleta',
        label: 'Paleta de Cores',
        description: 'Referência de paleta de cores',
        icon: '🎨',
        color: '#f59e0b',
        defaultConfig: { selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
      },
      {
        type: 'galleryTextura',
        label: 'Textura/Material',
        description: 'Referência de textura ou material',
        icon: '🧱',
        color: '#06b6d4',
        defaultConfig: { selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
      },
      {
        type: 'galleryLogo',
        label: 'Logo/Marca',
        description: 'Logo e identidade visual',
        icon: '⭐',
        color: '#f43f5e',
        defaultConfig: { selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
      },
      {
        type: 'galleryPose',
        label: 'Ref. Pose',
        description: 'Referência de pose e composição',
        icon: '🤸',
        color: '#6366f1',
        defaultConfig: { selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
      },
      {
        type: 'galleryRoupa',
        label: 'Roupa/Vestuário',
        description: 'Referência de roupas e vestuário',
        icon: '👗',
        color: '#d946ef',
        defaultConfig: { selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
      },
      {
        type: 'gallerySalvas',
        label: 'Imagens Salvas',
        description: 'Imagens salvas na galeria do sistema',
        icon: '📁',
        color: '#3b82f6',
        defaultConfig: { selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
      },
      {
        type: 'textStyle',
        label: 'Estilo de Texto',
        description: 'Configure estilo visual de texto para aplicar na imagem',
        icon: '🔤',
        color: '#e11d48',
        defaultConfig: { text: 'SEU TEXTO AQUI', fontFamily: 'Montserrat', fontSize: 48, fontWeight: 'bold', color: '#ffffff', bgColor: '', align: 'center', shadow: true, outline: true },
      },
      {
        type: 'textContent',
        label: 'Conteúdo de Texto',
        description: 'Título, subtítulo e corpo com estilos prontos',
        icon: '📝',
        color: '#7c3aed',
        defaultConfig: { 
          title: 'TÍTULO PRINCIPAL', 
          subtitle: 'Subtítulo complementar', 
          body: 'Texto descritivo ou informação adicional para sua peça.',
          templateId: 'heading-bold',
          titleFont: 'Montserrat', titleSize: 72, titleWeight: 'bold', titleColor: '#000000',
          subtitleFont: 'Montserrat', subtitleSize: 42, subtitleWeight: '600', subtitleColor: '#4A4A4A',
          bodyFont: 'Inter', bodySize: 24, bodyWeight: 'normal', bodyColor: '#666666',
          textAlign: 'center',
        },
      },
      {
        type: 'platformFormat',
        label: 'Formato / Plataforma',
        description: 'Defina tamanho e formato por plataforma (Instagram, Facebook, WhatsApp...)',
        icon: '📐',
        color: '#0891b2',
        defaultConfig: { platform: 'instagram', contentType: 'post', width: 1080, height: 1080 },
      },
    ],
  },
  {
    id: 'ai-text',
    label: 'IA Texto',
    icon: '🧠',
    nodes: [
      {
        type: 'llmProcess',
        label: 'Processar com LLM',
        description: 'Processe texto com modelos de linguagem',
        icon: '🧠',
        color: '#0ea5e9',
        defaultConfig: { model: 'google/gemini-2.5-flash' },
      },
      {
        type: 'imageAnalyze',
        label: 'Analisar Imagem',
        description: 'Analise e descreva imagens com IA',
        icon: '🔍',
        color: '#14b8a6',
        defaultConfig: { model: 'google/gemini-2.5-flash', prompt: 'Descreva esta imagem em detalhes, incluindo cores, composição, objetos, pessoas, cenário, iluminação e estilo visual.' },
      },
    ],
  },
  {
    id: 'ai-image',
    label: 'IA Imagem',
    icon: '🎨',
    nodes: [
      {
        type: 'imageGen',
        label: 'Gerar Imagem',
        description: 'Gere imagens a partir de prompts de texto',
        icon: '🖼️',
        color: '#f43f5e',
        defaultConfig: { model: 'google/gemini-2.5-flash-image', quality: 'standard' },
      },
      {
        type: 'imageEdit',
        label: 'Editar Imagem',
        description: 'Edite imagens existentes com IA',
        icon: '✨',
        color: '#ec4899',
        defaultConfig: { model: 'google/gemini-2.5-flash-image', editPrompt: 'Melhore a qualidade, ajuste cores e iluminação para um visual profissional de marketing' },
      },
      {
        type: 'productComposite',
        label: 'Produto em Pessoa',
        description: 'Coloque produtos/roupas em pessoas com IA',
        icon: '👕',
        color: '#8b5cf6',
        defaultConfig: { 
          model: 'google/gemini-2.5-flash-image',
          compositeMode: 'clothing',
          prompt: 'Integre o produto de forma natural e realista na cena, mantendo a iluminação e proporções corretas',
        },
      },
    ],
  },
  {
    id: 'ai-video',
    label: 'IA Vídeo',
    icon: '🎬',
    nodes: [
      {
        type: 'videoGen',
        label: 'Gerar Vídeo',
        description: 'Gere vídeos a partir de prompts ou imagens',
        icon: '🎬',
        color: '#f59e0b',
        defaultConfig: { duration: 4, resolution: '1080p', aspectRatio: '16:9', withAudio: true, withMusic: true, videoModel: 'openai/sora-2' },
      },
      {
        type: 'videoMerge',
        label: 'Unir Vídeos',
        description: 'Combine vídeos com frames iniciais e finais',
        icon: '🔗',
        color: '#d97706',
        defaultConfig: { transition: 'fade', transitionDuration: 1 },
      },
    ],
  },
  {
    id: 'ai-audio',
    label: 'IA Áudio',
    icon: '🎵',
    nodes: [
      {
        type: 'audioGen',
        label: 'Gerar Áudio/SFX',
        description: 'Gere efeitos sonoros e narração',
        icon: '🔊',
        color: '#22c55e',
        defaultConfig: { duration: 5, type: 'narration', model: 'openai_tts', language: 'pt-BR' },
      },
      {
        type: 'musicGen',
        label: 'Criar Música',
        description: 'Crie músicas originais com IA',
        icon: '🎵',
        color: '#10b981',
        defaultConfig: { duration: 30, genre: 'ambient' },
      },
      {
        type: 'lipSync',
        label: 'Sincronismo Labial',
        description: 'Sincronize áudio com vídeo de lábios',
        icon: '👄',
        color: '#06b6d4',
        defaultConfig: {},
      },
    ],
  },
  {
    id: 'refinement',
    label: 'Refinamento',
    icon: '🔧',
    nodes: [
      {
        type: 'mediaCorrection',
        label: 'Correção / Refinamento',
        description: 'Recebe imagem ou vídeo e passa instrução de correção para o próximo bloco de geração',
        icon: '🔧',
        color: '#f97316',
        defaultConfig: { correctionPrompt: '' },
      },
    ],
  },
  {
    id: 'loop',
    label: 'Looping',
    icon: '🔄',
    nodes: [
      {
        type: 'loopOutput',
        label: 'Saída em Lote',
        description: 'Processa cada produto e salva na galeria automaticamente',
        icon: '🔄',
        color: '#7c3aed',
        defaultConfig: { autoSave: true, savePrefix: 'AI Studio Lote' },
      },
      {
        type: 'randomPick',
        label: 'Randômico',
        description: 'Escolhe uma imagem aleatória da galeria a cada iteração',
        icon: '🎲',
        color: '#e11d48',
        defaultConfig: { galleryCategory: 'salvas' },
      },
    ],
  },
  {
    id: 'output',
    label: 'Saída',
    icon: '📤',
    nodes: [
      {
        type: 'output',
        label: 'Resultado Final',
        description: 'Visualize e exporte o resultado',
        icon: '📤',
        color: '#64748b',
        defaultConfig: { format: 'auto' },
      },
    ],
  },
];

export const getNodeMeta = (type: StudioNodeType) => {
  for (const cat of NODE_CATEGORIES) {
    for (const n of cat.nodes) {
      if (n.type === type) return n;
    }
  }
  return null;
};
