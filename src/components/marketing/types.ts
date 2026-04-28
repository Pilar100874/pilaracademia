// Types for Marketing Resources System

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'media_image'    // Mídia - Imagem (usuário faz upload no wizard)
  | 'media_audio'    // Mídia - Áudio (usuário faz upload no wizard)
  | 'media_video'    // Mídia - Vídeo (usuário faz upload no wizard)
  | 'selection_image'  // Seleção de imagens (criador define as opções)
  | 'selection_audio'  // Seleção de áudios (criador define as opções)
  | 'selection_video'  // Seleção de vídeos (criador define as opções)
  | 'selection_text'   // Seleção de textos longos (criador define as opções)
  | 'selection_text_image' // Seleção de texto com referência de imagem
  | 'radio_selection'  // Seleção única com radio buttons (criador define as opções)
  | 'number'
  | 'date'
  | 'checkbox'
  | 'product_name'
  | 'product_image';

export type ReturnType = 'image' | 'audio' | 'video' | 'text';

export type PublishChannel = 
  | 'whatsapp' 
  | 'instagram' 
  | 'facebook' 
  | 'twitter' 
  | 'linkedin'
  | 'telegram'
  | 'email';

export interface FieldOption {
  id: string;
  label: string;
  value: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
}

export interface ResourceField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: FieldOption[]; // For dropdown, selection types
  defaultValue?: string;
  stepId?: string; // ID da etapa à qual o campo pertence
  hidden?: boolean; // Campo oculto - não aparece no wizard mas é enviado ao webhook
}

export interface FormStep {
  id: string;
  number: number;
  title: string;
  description?: string;
}

export interface MarketingResource {
  id: string;
  name: string;
  description?: string;
  fields: ResourceField[];
  steps?: FormStep[]; // Etapas do formulário
  returnType: ReturnType;
  saveLocation?: string;
  n8nWebhookUrl?: string; // Webhook para gerar conteúdo
  n8nPublishWebhookUrl?: string; // Webhook para publicar conteúdo
  publishChannels?: PublishChannel[]; // Canais habilitados para publicação
  autoPublishEnabled?: boolean; // Se publicação automática está ativada
  webhookHasResponse?: boolean; // Se o webhook de geração terá retorno
  createdAt: string;
  updatedAt: string;
}

export interface WizardStep {
  id: string;
  resourceId: string;
  values: Record<string, any>;
}

export interface ContentCreationSession {
  id: string;
  steps: WizardStep[];
  selectedChannels: PublishChannel[];
  status: 'draft' | 'processing' | 'completed' | 'failed';
  result?: {
    type: ReturnType;
    content: string; // URL or text content
  };
  createdAt: string;
}

// Field type categories for better UI organization
export const FIELD_TYPE_CATEGORIES = {
  basic: {
    label: 'Básicos',
    types: ['text', 'textarea', 'number', 'date', 'checkbox'] as FieldType[],
  },
  media: {
    label: 'Mídia',
    description: 'O usuário faz upload no momento de usar o recurso',
    types: ['media_image', 'media_audio', 'media_video'] as FieldType[],
  },
  selection: {
    label: 'Seleção',
    description: 'Você define as opções agora, usuário escolhe depois',
    types: ['selection_image', 'selection_audio', 'selection_video', 'selection_text', 'selection_text_image', 'radio_selection'] as FieldType[],
  },
  product: {
    label: 'Produto',
    types: ['product_name', 'product_image'] as FieldType[],
  },
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto Curto',
  textarea: 'Texto Longo',
  media_image: 'Upload de Imagem',
  media_audio: 'Upload de Áudio',
  media_video: 'Upload de Vídeo',
  selection_image: 'Seleção de Imagens',
  selection_audio: 'Seleção de Áudios',
  selection_video: 'Seleção de Vídeos',
  selection_text: 'Seleção de Textos',
  selection_text_image: 'Seleção de Texto com Imagem',
  radio_selection: 'Seleção Única',
  number: 'Número',
  date: 'Data',
  checkbox: 'Checkbox',
  product_name: 'Nome do Produto',
  product_image: 'Imagem do Produto',
};

export const FIELD_TYPE_DESCRIPTIONS: Record<FieldType, string> = {
  text: 'Campo de texto simples',
  textarea: 'Área de texto maior',
  media_image: 'Usuário faz upload de imagem ao usar',
  media_audio: 'Usuário faz upload de áudio ao usar',
  media_video: 'Usuário faz upload de vídeo ao usar',
  selection_image: 'Defina imagens para o usuário escolher',
  selection_audio: 'Defina áudios para o usuário escolher',
  selection_video: 'Defina vídeos para o usuário escolher',
  selection_text: 'Defina textos longos para o usuário escolher',
  selection_text_image: 'Textos com imagem de referência para o usuário escolher',
  radio_selection: 'Defina opções para o usuário escolher uma',
  number: 'Valor numérico',
  date: 'Seletor de data',
  checkbox: 'Opção sim/não',
  product_name: 'Selecione um produto e use seu nome',
  product_image: 'Selecione um produto e use uma de suas imagens',
};

export const RETURN_TYPE_LABELS: Record<ReturnType, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  text: 'Texto',
};

export const CHANNEL_CONFIG: Record<PublishChannel, { label: string; icon: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle', color: 'bg-green-500' },
  instagram: { label: 'Instagram', icon: 'Instagram', color: 'bg-pink-500' },
  facebook: { label: 'Facebook', icon: 'Facebook', color: 'bg-blue-600' },
  twitter: { label: 'Twitter', icon: 'Twitter', color: 'bg-sky-500' },
  linkedin: { label: 'LinkedIn', icon: 'Linkedin', color: 'bg-blue-700' },
  telegram: { label: 'Telegram', icon: 'Send', color: 'bg-blue-400' },
  email: { label: 'E-mail', icon: 'Mail', color: 'bg-gray-600' },
};
