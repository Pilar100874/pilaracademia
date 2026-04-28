export interface CatalogProduct {
  id: string;
  nome: string;
  descricao?: string;
  foto_url?: string;
  preco_tabela?: number;
  codigo?: string;
  categoria_nome?: string;
  grupo_nome?: string;
  grupo_id?: string;
  grupo_descritivo_catalogo?: string;
  // Dados Básicos
  largura?: number;
  altura?: number;
  comprimento?: number;
  gramatura?: number;
  peso_unitario?: number;
  numero_folhas?: number;
  // Dados do Frete
  embalagem_largura?: number;
  embalagem_altura?: number;
  embalagem_comprimento?: number;
  embalagem_peso?: number;
  cubagem?: number;
  valor_seguro?: number;
  empilhamento_maximo?: number;
  fragil?: boolean;
  observacoes_frete?: string;
  // Embalagem
  ean_13?: string;
  ean_14_1?: string;
  ean_14_2?: string;
}

export interface ProductGroup {
  id: string;
  nome: string;
  products: CatalogProduct[];
  backgroundImage?: string;
  descritivo_catalogo?: string;
}

export interface CatalogPage {
  id: string;
  type: 'cover' | 'products' | 'backcover';
  title?: string;
  subtitle?: string;
  products?: CatalogProduct[];
  layout?: 'grid-2' | 'grid-3' | 'grid-4' | 'list';
  backgroundColor?: string;
  backgroundImage?: string;
  logoUrl?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  groupByCategory?: boolean;
}

export interface GroupFieldConfig {
  groupId: string;
  groupName: string;
  selectedFields: string[];
}

export interface CatalogConfig {
  id?: string;
  name: string;
  pages: CatalogPage[];
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showPrices: boolean;
  showCodes: boolean;
  showPriceTable: boolean;
  groupFieldConfigs?: GroupFieldConfig[];
  groupImages?: Record<string, string>;
  businessType?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'info', title: 'Informações', description: 'Nome e configurações do catálogo' },
  { id: 'cover', title: 'Capa', description: 'Configure a capa do catálogo' },
  { id: 'products', title: 'Produtos', description: 'Selecione os produtos' },
  { id: 'groups', title: 'Grupos', description: 'Imagens dos grupos' },
  { id: 'fields', title: 'Campos', description: 'Campos exibidos por grupo' },
  { id: 'backcover', title: 'Contracapa', description: 'Informações de contato' },
  { id: 'preview', title: 'Visualização', description: 'Revise e exporte o PDF' },
];

export const PRODUCT_FIELDS = [
  // Dados Básicos
  { key: 'codigo', label: 'Código/SKU', category: 'Dados Básicos' },
  { key: 'descricao', label: 'Descrição', category: 'Dados Básicos' },
  { key: 'preco_tabela', label: 'Preço', category: 'Dados Básicos' },
  { key: 'categoria_nome', label: 'Categoria', category: 'Dados Básicos' },
  { key: 'largura', label: 'Largura (cm)', category: 'Dados Básicos' },
  { key: 'altura', label: 'Altura (cm)', category: 'Dados Básicos' },
  { key: 'comprimento', label: 'Comprimento (cm)', category: 'Dados Básicos' },
  { key: 'gramatura', label: 'Gramatura', category: 'Dados Básicos' },
  { key: 'peso_unitario', label: 'Peso Unitário', category: 'Dados Básicos' },
  { key: 'numero_folhas', label: 'Número de Folhas', category: 'Dados Básicos' },
  
  // Dados do Frete
  { key: 'embalagem_largura', label: 'Largura Embalagem (cm)', category: 'Dados do Frete' },
  { key: 'embalagem_altura', label: 'Altura Embalagem (cm)', category: 'Dados do Frete' },
  { key: 'embalagem_comprimento', label: 'Comprimento Embalagem (cm)', category: 'Dados do Frete' },
  { key: 'embalagem_peso', label: 'Peso c/ Embalagem (kg)', category: 'Dados do Frete' },
  { key: 'cubagem', label: 'Cubagem (m³)', category: 'Dados do Frete' },
  { key: 'valor_seguro', label: 'Valor do Seguro', category: 'Dados do Frete' },
  { key: 'empilhamento_maximo', label: 'Empilhamento Máximo', category: 'Dados do Frete' },
  { key: 'fragil', label: 'Produto Frágil', category: 'Dados do Frete' },
  { key: 'observacoes_frete', label: 'Observações de Frete', category: 'Dados do Frete' },
  
  // Embalagem
  { key: 'ean_13', label: 'EAN-13', category: 'Embalagem' },
  { key: 'ean_14_1', label: 'EAN-14 (1)', category: 'Embalagem' },
  { key: 'ean_14_2', label: 'EAN-14 (2)', category: 'Embalagem' },
] as const;

export const LAYOUT_OPTIONS = [
  { value: 'grid-2', label: '2 Colunas', cols: 2 },
  { value: 'grid-3', label: '3 Colunas', cols: 3 },
  { value: 'grid-4', label: '4 Colunas', cols: 4 },
  { value: 'list', label: 'Lista', cols: 1 },
] as const;

export const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
] as const;

export const COVER_STYLES = [
  { id: 'elegant', label: 'Elegante', prompt: 'Professional elegant catalog cover with subtle gradients, deep blues and golds, minimalist geometric patterns' },
  { id: 'modern', label: 'Moderno', prompt: 'Modern sleek catalog cover with clean lines, monochromatic scheme, abstract shapes' },
  { id: 'nature', label: 'Natural', prompt: 'Natural organic catalog cover with soft earth tones, botanical elements, warm textures' },
  { id: 'tech', label: 'Tecnológico', prompt: 'Futuristic tech catalog cover with digital patterns, neon accents, dark background' },
  { id: 'luxury', label: 'Luxo', prompt: 'Luxury premium catalog cover with marble textures, gold accents, sophisticated black background' },
] as const;
