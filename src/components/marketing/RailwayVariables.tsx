import React, { useState, useEffect } from 'react';
import { 
  Server, Copy, Check, Download, RefreshCw, AlertCircle, 
  Key, Database, MessageCircle, Mail, Image,
  Share2, Brain, Webhook, Cloud, Globe
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EnvVariable {
  name: string;
  description: string;
  example: string;
  category: string;
  required: boolean;
  configured?: boolean;
  currentValue?: string;
}

interface EnvCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const ENV_CATEGORIES: EnvCategory[] = [
  { id: 'n8n', label: 'n8n Core', icon: <Webhook className="h-4 w-4" />, description: 'Configurações básicas do n8n' },
  { id: 'supabase', label: 'Supabase', icon: <Database className="h-4 w-4" />, description: 'Conexão com banco de dados' },
  { id: 'ai', label: 'Inteligência Artificial', icon: <Brain className="h-4 w-4" />, description: 'APIs de IA para geração de conteúdo' },
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-4 w-4" />, description: 'Integração com WhatsApp' },
  { id: 'social', label: 'Redes Sociais', icon: <Share2 className="h-4 w-4" />, description: 'Instagram, Facebook, LinkedIn, TikTok' },
  { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, description: 'Envio de emails' },
  { id: 'media', label: 'Mídia & Storage', icon: <Image className="h-4 w-4" />, description: 'Armazenamento de imagens, vídeos, áudios' },
  { id: 'database', label: 'Bancos Externos', icon: <Database className="h-4 w-4" />, description: 'MySQL, PostgreSQL, SQL Server' },
  { id: 'google', label: 'Google Services', icon: <Cloud className="h-4 w-4" />, description: 'Gmail, Drive, Sheets, Calendar' },
  { id: 'other', label: 'Outros', icon: <Globe className="h-4 w-4" />, description: 'Outras integrações' },
];

const ALL_ENV_VARIABLES: EnvVariable[] = [
  // n8n Core
  { name: 'N8N_ENCRYPTION_KEY', description: 'Chave de criptografia para credenciais do n8n', example: 'uma-chave-segura-de-32-caracteres', category: 'n8n', required: true },
  { name: 'N8N_HOST', description: 'Host onde o n8n está rodando', example: '0.0.0.0', category: 'n8n', required: true },
  { name: 'N8N_PORT', description: 'Porta do n8n', example: '5678', category: 'n8n', required: true },
  { name: 'N8N_PROTOCOL', description: 'Protocolo (http ou https)', example: 'https', category: 'n8n', required: false },
  { name: 'WEBHOOK_URL', description: 'URL base para webhooks', example: 'https://seu-n8n.railway.app', category: 'n8n', required: true },
  { name: 'N8N_BASIC_AUTH_ACTIVE', description: 'Ativar autenticação básica', example: 'true', category: 'n8n', required: false },
  { name: 'N8N_BASIC_AUTH_USER', description: 'Usuário para autenticação básica', example: 'admin', category: 'n8n', required: false },
  { name: 'N8N_BASIC_AUTH_PASSWORD', description: 'Senha para autenticação básica', example: 'sua-senha-segura', category: 'n8n', required: false },
  
  // Supabase
  { name: 'SUPABASE_URL', description: 'URL do projeto Supabase', example: 'https://xxxxx.supabase.co', category: 'supabase', required: true },
  { name: 'SUPABASE_ANON_KEY', description: 'Chave anônima do Supabase', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', category: 'supabase', required: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Chave de serviço do Supabase (acesso total)', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', category: 'supabase', required: true },
  
  // AI Providers
  { name: 'OPENAI_API_KEY', description: 'Chave da API OpenAI (GPT-4, DALL-E)', example: 'sk-...', category: 'ai', required: false },
  { name: 'OPENAI_ORGANIZATION_ID', description: 'ID da organização OpenAI', example: 'org-...', category: 'ai', required: false },
  { name: 'ANTHROPIC_API_KEY', description: 'Chave da API Anthropic (Claude)', example: 'sk-ant-...', category: 'ai', required: false },
  { name: 'GOOGLE_AI_API_KEY', description: 'Chave da API Google AI (Gemini)', example: 'AIza...', category: 'ai', required: false },
  { name: 'GROQ_API_KEY', description: 'Chave da API Groq', example: 'gsk_...', category: 'ai', required: false },
  { name: 'MISTRAL_API_KEY', description: 'Chave da API Mistral AI', example: '', category: 'ai', required: false },
  { name: 'PERPLEXITY_API_KEY', description: 'Chave da API Perplexity', example: 'pplx-...', category: 'ai', required: false },
  { name: 'COHERE_API_KEY', description: 'Chave da API Cohere', example: '', category: 'ai', required: false },
  { name: 'DEEPSEEK_API_KEY', description: 'Chave da API DeepSeek', example: '', category: 'ai', required: false },
  { name: 'DEEPSEEK_BASE_URL', description: 'URL base da API DeepSeek', example: 'https://api.deepseek.com', category: 'ai', required: false },
  { name: 'TOGETHER_API_KEY', description: 'Chave da API Together AI', example: '', category: 'ai', required: false },
  { name: 'REPLICATE_API_TOKEN', description: 'Token da API Replicate', example: 'r8_...', category: 'ai', required: false },
  { name: 'HUGGINGFACE_API_KEY', description: 'Token de acesso Hugging Face', example: 'hf_...', category: 'ai', required: false },
  { name: 'STABILITY_API_KEY', description: 'Chave da API Stability AI (imagens)', example: 'sk-...', category: 'ai', required: false },
  { name: 'ELEVENLABS_API_KEY', description: 'Chave da API ElevenLabs (áudio/voz)', example: '', category: 'ai', required: false },
  { name: 'VEO3_API_KEY', description: 'Chave da API Google Veo 3 (vídeo)', example: '', category: 'ai', required: false },
  { name: 'VEO3_PROJECT_ID', description: 'Project ID do Google Cloud para Veo 3', example: 'my-project-123', category: 'ai', required: false },
  { name: 'SEEDREAM_ACCESS_KEY', description: 'Access Key ID do Seedream (ByteDance)', example: 'AKLT...', category: 'ai', required: false },
  { name: 'SEEDREAM_SECRET_KEY', description: 'Secret Access Key do Seedream', example: '', category: 'ai', required: false },
  
  // WhatsApp
  { name: 'WAHA_API_URL', description: 'URL da API WAHA (WhatsApp)', example: 'https://waha.seu-servidor.com', category: 'whatsapp', required: false },
  { name: 'WAHA_API_KEY', description: 'Chave da API WAHA', example: '', category: 'whatsapp', required: false },
  { name: 'WAHA_SESSION', description: 'Nome da sessão WAHA', example: 'default', category: 'whatsapp', required: false },
  { name: 'EVOLUTION_API_URL', description: 'URL da API Evolution', example: 'https://evolution.seu-servidor.com', category: 'whatsapp', required: false },
  { name: 'EVOLUTION_API_KEY', description: 'Chave da API Evolution', example: '', category: 'whatsapp', required: false },
  { name: 'EVOLUTION_INSTANCE', description: 'Nome da instância Evolution', example: 'minha-instancia', category: 'whatsapp', required: false },
  { name: 'WHATSAPP_BUSINESS_TOKEN', description: 'Token da API WhatsApp Business (Meta)', example: '', category: 'whatsapp', required: false },
  { name: 'WHATSAPP_PHONE_NUMBER_ID', description: 'ID do número de telefone WhatsApp Business', example: '', category: 'whatsapp', required: false },
  { name: 'WHATSAPP_BUSINESS_ACCOUNT_ID', description: 'ID da conta WhatsApp Business', example: '', category: 'whatsapp', required: false },
  
  // Social Media
  { name: 'INSTAGRAM_ACCESS_TOKEN', description: 'Token de acesso do Instagram Graph API', example: '', category: 'social', required: false },
  { name: 'INSTAGRAM_BUSINESS_ACCOUNT_ID', description: 'ID da conta comercial do Instagram', example: '', category: 'social', required: false },
  { name: 'FACEBOOK_PAGE_ACCESS_TOKEN', description: 'Token de acesso da página do Facebook', example: '', category: 'social', required: false },
  { name: 'FACEBOOK_PAGE_ID', description: 'ID da página do Facebook', example: '', category: 'social', required: false },
  { name: 'FACEBOOK_APP_ID', description: 'ID do aplicativo Facebook', example: '', category: 'social', required: false },
  { name: 'FACEBOOK_APP_SECRET', description: 'Secret do aplicativo Facebook', example: '', category: 'social', required: false },
  { name: 'LINKEDIN_ACCESS_TOKEN', description: 'Token de acesso do LinkedIn', example: '', category: 'social', required: false },
  { name: 'LINKEDIN_ORGANIZATION_ID', description: 'ID da organização no LinkedIn', example: '', category: 'social', required: false },
  { name: 'TIKTOK_ACCESS_TOKEN', description: 'Token de acesso do TikTok', example: '', category: 'social', required: false },
  { name: 'TIKTOK_OPEN_ID', description: 'Open ID do TikTok', example: '', category: 'social', required: false },
  { name: 'TWITTER_API_KEY', description: 'API Key do Twitter/X', example: '', category: 'social', required: false },
  { name: 'TWITTER_API_SECRET', description: 'API Secret do Twitter/X', example: '', category: 'social', required: false },
  { name: 'TWITTER_ACCESS_TOKEN', description: 'Access Token do Twitter/X', example: '', category: 'social', required: false },
  { name: 'TWITTER_ACCESS_SECRET', description: 'Access Token Secret do Twitter/X', example: '', category: 'social', required: false },
  { name: 'TELEGRAM_BOT_TOKEN', description: 'Token do bot do Telegram', example: '', category: 'social', required: false },
  { name: 'TELEGRAM_CHAT_ID', description: 'ID do chat/grupo do Telegram', example: '', category: 'social', required: false },
  
  // Email
  { name: 'SMTP_HOST', description: 'Host do servidor SMTP', example: 'smtp.gmail.com', category: 'email', required: false },
  { name: 'SMTP_PORT', description: 'Porta do servidor SMTP', example: '587', category: 'email', required: false },
  { name: 'SMTP_USER', description: 'Usuário SMTP', example: 'seu@email.com', category: 'email', required: false },
  { name: 'SMTP_PASSWORD', description: 'Senha SMTP', example: '', category: 'email', required: false },
  { name: 'SMTP_SECURE', description: 'Usar TLS/SSL', example: 'true', category: 'email', required: false },
  { name: 'RESEND_API_KEY', description: 'Chave da API Resend', example: 're_...', category: 'email', required: false },
  { name: 'SENDGRID_API_KEY', description: 'Chave da API SendGrid', example: 'SG...', category: 'email', required: false },
  { name: 'MAILGUN_API_KEY', description: 'Chave da API Mailgun', example: '', category: 'email', required: false },
  { name: 'MAILGUN_DOMAIN', description: 'Domínio do Mailgun', example: 'mg.seudominio.com', category: 'email', required: false },
  
  // Media & Storage
  { name: 'AWS_ACCESS_KEY_ID', description: 'Access Key ID da AWS (S3)', example: 'AKIA...', category: 'media', required: false },
  { name: 'AWS_SECRET_ACCESS_KEY', description: 'Secret Access Key da AWS', example: '', category: 'media', required: false },
  { name: 'AWS_S3_BUCKET', description: 'Nome do bucket S3', example: 'meu-bucket', category: 'media', required: false },
  { name: 'AWS_S3_REGION', description: 'Região do bucket S3', example: 'us-east-1', category: 'media', required: false },
  { name: 'CLOUDFLARE_R2_ACCESS_KEY', description: 'Access Key do Cloudflare R2', example: '', category: 'media', required: false },
  { name: 'CLOUDFLARE_R2_SECRET_KEY', description: 'Secret Key do Cloudflare R2', example: '', category: 'media', required: false },
  { name: 'CLOUDFLARE_R2_BUCKET', description: 'Nome do bucket R2', example: '', category: 'media', required: false },
  { name: 'CLOUDFLARE_R2_ENDPOINT', description: 'Endpoint do R2', example: '', category: 'media', required: false },
  { name: 'CLOUDINARY_CLOUD_NAME', description: 'Cloud Name do Cloudinary', example: '', category: 'media', required: false },
  { name: 'CLOUDINARY_API_KEY', description: 'API Key do Cloudinary', example: '', category: 'media', required: false },
  { name: 'CLOUDINARY_API_SECRET', description: 'API Secret do Cloudinary', example: '', category: 'media', required: false },
  
  // External Databases
  { name: 'MSSQL_HOST', description: 'Host do SQL Server', example: 'servidor.database.windows.net', category: 'database', required: false },
  { name: 'MSSQL_PORT', description: 'Porta do SQL Server', example: '1433', category: 'database', required: false },
  { name: 'MSSQL_DATABASE', description: 'Nome do database SQL Server', example: 'meu_banco', category: 'database', required: false },
  { name: 'MSSQL_USER', description: 'Usuário do SQL Server', example: 'sa', category: 'database', required: false },
  { name: 'MSSQL_PASSWORD', description: 'Senha do SQL Server', example: '', category: 'database', required: false },
  { name: 'MSSQL_ENCRYPT', description: 'Usar criptografia no SQL Server', example: 'true', category: 'database', required: false },
  { name: 'MYSQL_HOST', description: 'Host do MySQL', example: 'localhost', category: 'database', required: false },
  { name: 'MYSQL_PORT', description: 'Porta do MySQL', example: '3306', category: 'database', required: false },
  { name: 'MYSQL_DATABASE', description: 'Nome do database MySQL', example: 'meu_banco', category: 'database', required: false },
  { name: 'MYSQL_USER', description: 'Usuário do MySQL', example: 'root', category: 'database', required: false },
  { name: 'MYSQL_PASSWORD', description: 'Senha do MySQL', example: '', category: 'database', required: false },
  { name: 'POSTGRES_HOST', description: 'Host do PostgreSQL', example: 'localhost', category: 'database', required: false },
  { name: 'POSTGRES_PORT', description: 'Porta do PostgreSQL', example: '5432', category: 'database', required: false },
  { name: 'POSTGRES_DATABASE', description: 'Nome do database PostgreSQL', example: 'meu_banco', category: 'database', required: false },
  { name: 'POSTGRES_USER', description: 'Usuário do PostgreSQL', example: 'postgres', category: 'database', required: false },
  { name: 'POSTGRES_PASSWORD', description: 'Senha do PostgreSQL', example: '', category: 'database', required: false },
  { name: 'POSTGRES_SSL', description: 'Usar SSL no PostgreSQL', example: 'false', category: 'database', required: false },
  
  // Google Services
  { name: 'GOOGLE_CLIENT_ID', description: 'Client ID do Google OAuth', example: 'xxxx.apps.googleusercontent.com', category: 'google', required: false },
  { name: 'GOOGLE_CLIENT_SECRET', description: 'Client Secret do Google OAuth', example: 'GOCSPX-...', category: 'google', required: false },
  { name: 'GOOGLE_REFRESH_TOKEN', description: 'Refresh Token do Google OAuth', example: '1//...', category: 'google', required: false },
  { name: 'GOOGLE_SHEETS_SPREADSHEET_ID', description: 'ID da planilha Google Sheets padrão', example: '', category: 'google', required: false },
  { name: 'GOOGLE_DRIVE_FOLDER_ID', description: 'ID da pasta Google Drive padrão', example: '', category: 'google', required: false },
  { name: 'GOOGLE_CALENDAR_ID', description: 'ID do calendário Google Calendar', example: 'primary', category: 'google', required: false },
  
  // Others
  { name: 'WEBHOOK_SECRET', description: 'Secret para validação de webhooks', example: 'um-secret-seguro', category: 'other', required: false },
  { name: 'API_BASE_URL', description: 'URL base da sua API principal', example: 'https://api.seusite.com', category: 'other', required: false },
  { name: 'TIMEZONE', description: 'Fuso horário', example: 'America/Sao_Paulo', category: 'other', required: false },
  { name: 'NODE_ENV', description: 'Ambiente de execução', example: 'production', category: 'other', required: false },
];

const RailwayVariables: React.FC = () => {
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>(ALL_ENV_VARIABLES);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkConfiguredVariables();
  }, []);

  const checkConfiguredVariables = async () => {
    setIsLoading(true);
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      if (!estabelecimentoId) {
        setIsLoading(false);
        return;
      }

      const { data: aiKeys } = await supabase
        .from('ai_api_keys')
        .select('provider, api_key, api_secret, organization_id, project_id, base_url, is_active')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('is_active', true);

      const { data: integrationCreds } = await supabase
        .from('integration_credentials')
        .select('integration_name, credentials_json, is_active')
        .eq('is_active', true);

      const { data: dbConnections } = await supabase
        .from('database_connections')
        .select('database_type, sql_server, sql_port, sql_database, sql_username, sql_password')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('active', true);

      const updatedVars = ALL_ENV_VARIABLES.map(envVar => {
        let configured = false;
        let currentValue = '';

        if (aiKeys) {
          const providerMap: Record<string, string> = {
            'OPENAI_API_KEY': 'openai',
            'ANTHROPIC_API_KEY': 'anthropic',
            'GOOGLE_AI_API_KEY': 'google',
            'GROQ_API_KEY': 'groq',
            'MISTRAL_API_KEY': 'mistral',
            'PERPLEXITY_API_KEY': 'perplexity',
            'COHERE_API_KEY': 'cohere',
            'DEEPSEEK_API_KEY': 'deepseek',
            'TOGETHER_API_KEY': 'together',
            'REPLICATE_API_TOKEN': 'replicate',
            'HUGGINGFACE_API_KEY': 'huggingface',
            'STABILITY_API_KEY': 'stability',
            'ELEVENLABS_API_KEY': 'elevenlabs',
            'VEO3_API_KEY': 'veo3',
            'SEEDREAM_ACCESS_KEY': 'seedream',
          };

          const providerName = providerMap[envVar.name];
          if (providerName) {
            const aiKey = aiKeys.find(k => k.provider === providerName);
            if (aiKey?.api_key) {
              configured = true;
              currentValue = aiKey.api_key;
            }
          }

          if (envVar.name === 'OPENAI_ORGANIZATION_ID') {
            const openaiKey = aiKeys.find(k => k.provider === 'openai');
            if (openaiKey?.organization_id) {
              configured = true;
              currentValue = openaiKey.organization_id;
            }
          }

          if (envVar.name === 'SEEDREAM_SECRET_KEY') {
            const seedreamKey = aiKeys.find(k => k.provider === 'seedream');
            if (seedreamKey?.api_secret) {
              configured = true;
              currentValue = seedreamKey.api_secret;
            }
          }

          if (envVar.name === 'VEO3_PROJECT_ID') {
            const veo3Key = aiKeys.find(k => k.provider === 'veo3');
            if (veo3Key?.project_id) {
              configured = true;
              currentValue = veo3Key.project_id;
            }
          }

          if (envVar.name === 'DEEPSEEK_BASE_URL') {
            const deepseekKey = aiKeys.find(k => k.provider === 'deepseek');
            if (deepseekKey?.base_url) {
              configured = true;
              currentValue = deepseekKey.base_url;
            }
          }
        }

        if (integrationCreds) {
          const creds = integrationCreds as Array<{ integration_name: string; credentials_json: Record<string, string>; is_active: boolean }>;
          
          const googleServices = ['gmail', 'google_drive', 'google_sheets', 'google_docs', 'google_calendar'];
          const googleCred = creds.find(c => googleServices.includes(c.integration_name));
          
          if (googleCred?.credentials_json) {
            if (envVar.name === 'GOOGLE_CLIENT_ID' && googleCred.credentials_json.client_id) {
              configured = true;
              currentValue = googleCred.credentials_json.client_id;
            }
            if (envVar.name === 'GOOGLE_CLIENT_SECRET' && googleCred.credentials_json.client_secret) {
              configured = true;
              currentValue = googleCred.credentials_json.client_secret;
            }
            if (envVar.name === 'GOOGLE_REFRESH_TOKEN' && googleCred.credentials_json.refresh_token) {
              configured = true;
              currentValue = googleCred.credentials_json.refresh_token;
            }
          }
        }

        if (dbConnections) {
          for (const db of dbConnections) {
            if (db.database_type === 'mssql') {
              if (envVar.name === 'MSSQL_HOST') { configured = true; currentValue = db.sql_server; }
              if (envVar.name === 'MSSQL_PORT') { configured = true; currentValue = db.sql_port || '1433'; }
              if (envVar.name === 'MSSQL_DATABASE') { configured = true; currentValue = db.sql_database; }
              if (envVar.name === 'MSSQL_USER') { configured = true; currentValue = db.sql_username; }
              if (envVar.name === 'MSSQL_PASSWORD') { configured = true; currentValue = db.sql_password; }
            }
            if (db.database_type === 'mysql') {
              if (envVar.name === 'MYSQL_HOST') { configured = true; currentValue = db.sql_server; }
              if (envVar.name === 'MYSQL_PORT') { configured = true; currentValue = db.sql_port || '3306'; }
              if (envVar.name === 'MYSQL_DATABASE') { configured = true; currentValue = db.sql_database; }
              if (envVar.name === 'MYSQL_USER') { configured = true; currentValue = db.sql_username; }
              if (envVar.name === 'MYSQL_PASSWORD') { configured = true; currentValue = db.sql_password; }
            }
            if (db.database_type === 'postgresql') {
              if (envVar.name === 'POSTGRES_HOST') { configured = true; currentValue = db.sql_server; }
              if (envVar.name === 'POSTGRES_PORT') { configured = true; currentValue = db.sql_port || '5432'; }
              if (envVar.name === 'POSTGRES_DATABASE') { configured = true; currentValue = db.sql_database; }
              if (envVar.name === 'POSTGRES_USER') { configured = true; currentValue = db.sql_username; }
              if (envVar.name === 'POSTGRES_PASSWORD') { configured = true; currentValue = db.sql_password; }
            }
          }
        }

        return {
          ...envVar,
          configured,
          currentValue: currentValue || undefined,
        };
      });

      setEnvVariables(updatedVars);
    } catch (err) {
      console.error('Error checking configured variables:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVariables = envVariables.filter(v => {
    const matchesCategory = activeCategory === 'all' || v.category === activeCategory;
    const matchesSearch = searchTerm === '' || 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const copyToClipboard = async (text: string, name: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(name);
      toast.success(`${name} copiado!`);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  const generateEnvFileContent = () => {
    const lines: string[] = ['# Variáveis de Ambiente para Railway/n8n', '# Gerado automaticamente - Edite os valores conforme necessário', ''];

    ENV_CATEGORIES.forEach(cat => {
      const catVars = envVariables.filter(v => v.category === cat.id);
      if (catVars.length > 0) {
        lines.push(`# ========== ${cat.label} ==========`);
        catVars.forEach(v => {
          const value = v.currentValue || v.example || 'SEU_VALOR_AQUI';
          lines.push(`# ${v.description}`);
          lines.push(`${v.name}=${value}`);
          lines.push('');
        });
      }
    });

    return lines.join('\n');
  };

  const copyAllAsEnvFile = async () => {
    const content = generateEnvFileContent();
    try {
      await navigator.clipboard.writeText(content);
      setCopiedAll(true);
      toast.success('Arquivo .env copiado para a área de transferência!');
      setTimeout(() => setCopiedAll(false), 3000);
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  const downloadEnvFile = () => {
    const content = generateEnvFileContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env.railway';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo .env.railway baixado!');
  };

  const configuredCount = envVariables.filter(v => v.configured).length;
  const requiredCount = envVariables.filter(v => v.required).length;
  const requiredConfiguredCount = envVariables.filter(v => v.required && v.configured).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={checkConfiguredVariables} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={downloadEnvFile}>
            <Download className="h-4 w-4 mr-2" />
            Download .env
          </Button>
          <Button size="sm" onClick={copyAllAsEnvFile}>
            {copiedAll ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copiar Tudo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total de Variáveis</p>
                <p className="text-2xl font-bold">{envVariables.length}</p>
              </div>
              <Key className="h-6 w-6 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Configuradas</p>
                <p className="text-2xl font-bold text-green-600">{configuredCount}</p>
              </div>
              <Check className="h-6 w-6 text-green-600/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Obrigatórias</p>
                <p className="text-2xl font-bold">
                  <span className={requiredConfiguredCount === requiredCount ? 'text-green-600' : 'text-orange-500'}>
                    {requiredConfiguredCount}
                  </span>
                  <span className="text-muted-foreground text-lg">/{requiredCount}</span>
                </p>
              </div>
              <AlertCircle className="h-6 w-6 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Configure as variáveis no Railway em: <code className="bg-muted px-1 rounded">Settings → Variables</code>. 
          As variáveis marcadas como "Configurado" já possuem valores salvos.
        </AlertDescription>
      </Alert>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3">
        <Input
          placeholder="Buscar variável..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="text-xs">
              Todas ({envVariables.length})
            </TabsTrigger>
            {ENV_CATEGORIES.map(cat => {
              const count = envVariables.filter(v => v.category === cat.id).length;
              return (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs gap-1">
                  {cat.icon}
                  <span className="hidden sm:inline">{cat.label}</span> ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Variables List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {filteredVariables.map((envVar) => (
            <Card key={envVar.name} className={envVar.configured ? 'border-green-500/30 bg-green-500/5' : ''}>
              <CardContent className="py-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-sm font-semibold text-primary">{envVar.name}</code>
                      {envVar.required && (
                        <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                      )}
                      {envVar.configured && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                          <Check className="h-3 w-3 mr-1" /> Configurado
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {ENV_CATEGORIES.find(c => c.id === envVar.category)?.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{envVar.description}</p>
                    {envVar.currentValue ? (
                      <p className="text-xs text-green-600 mt-1 font-mono truncate">
                        Valor: {envVar.currentValue.length > 30 ? envVar.currentValue.substring(0, 30) + '...' : envVar.currentValue}
                      </p>
                    ) : envVar.example ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Exemplo: <code className="bg-muted px-1 rounded">{envVar.example}</code>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(
                        `${envVar.name}=${envVar.currentValue || envVar.example || ''}`,
                        envVar.name
                      )}
                    >
                      {copiedItem === envVar.name ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {filteredVariables.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma variável encontrada para os filtros selecionados.
        </div>
      )}
    </div>
  );
};

export default RailwayVariables;
