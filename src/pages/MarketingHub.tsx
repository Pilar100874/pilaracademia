import React, { useState } from 'react';
import {
  Target, 
  Palette, 
  Zap, 
  Megaphone,
  PanelLeft,
  PanelLeftClose,
  LucideIcon,
  Wand2,
  FolderOpen,
  Workflow,
  Key,
  Link2,
  Server,
  GitBranch,
  BookOpen,
  Send,
  Sparkles,
  Clapperboard,
  Brain,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Import existing components
import MarketingCanvas from './MarketingCanvas';
import MarketingAutomacoes from './MarketingAutomacoes';
import MarketingCampanhas from './MarketingCampanhas';
import MarketingRecursos from '@/components/marketing/MarketingRecursos';
import MarketingGaleria from '@/components/marketing/MarketingGaleria';

import IntegrationCredentialsManager from '@/components/marketing/IntegrationCredentialsManager';
import ResourceN8nGenerator from '@/components/marketing/ResourceN8nGenerator';
import RailwayVariables from '@/components/marketing/RailwayVariables';
import { N8nWorkflowEditor } from '@/components/marketing/n8n-editor';
import { MarketingCatalogo } from '@/components/marketing/catalogo';
import { EnvioMassaMarketing } from '@/components/marketing/EnvioMassaMarketing';
import { AICreativeStudio } from '@/components/marketing/ai-studio';
import { VideoTimelineEditor } from '@/components/marketing/video-editor';
import AISettingsPage from '@/components/marketing/ai-studio/AISettingsPage';
import { StrategyEngine } from '@/components/marketing/strategy-engine';
import PageBuilder from '@/components/marketing/page-builder/PageBuilder';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const tabItems: TabItem[] = [
  { id: 'strategy-engine', label: 'Motor de Estratégia', icon: Brain, description: 'Estratégia completa de marketing com agentes de IA' },
  { id: 'ai-studio', label: 'AI Creative Studio', icon: Sparkles, description: 'Crie conteúdo com IA: imagens, vídeos, áudio e música' },
  { id: 'video-editor', label: 'Editor de Vídeo', icon: Clapperboard, description: 'Timeline completa com efeitos, cortes e transições' },
  { id: 'config-apis', label: 'Config APIs', icon: Key, description: 'Gerencie chaves de API dos serviços de IA pagos' },
  { id: 'envio-massa', label: 'Envio em Massa', icon: Send, description: 'Dispare mensagens para múltiplos contatos' },
  { id: 'galeria', label: 'Galeria', icon: FolderOpen, description: 'Visualize o conteúdo criado' },
  { id: 'catalogo', label: 'Catálogo', icon: BookOpen, description: 'Gere catálogos de produtos em PDF' },
  { id: 'automacoes', label: 'Automações', icon: Zap, description: 'Fluxos automatizados de marketing' },
  { id: 'campanhas', label: 'Campanhas', icon: Megaphone, description: 'Gestão de campanhas' },
  { id: 'page-builder', label: 'Page Builder', icon: Globe, description: 'Crie sites de página única com drag-and-drop' },
  { id: 'canvas', label: 'Canvas', icon: Palette, description: 'Editor visual de conteúdo' },
  { id: 'integrations', label: 'Integrações', icon: Link2, description: 'Google, MS SQL e outros' },

];

const MarketingHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('ai-studio');
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const currentTabItem = tabItems.find(t => t.id === activeTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;

  const handleEditImageFromGallery = (imageUrl: string, resourceName?: string) => {
    sessionStorage.setItem('marketingCanvasInitialImage', JSON.stringify({
      url: imageUrl,
      resourceName: resourceName || 'Imagem da Galeria',
    }));
    setActiveTab('canvas');
  };

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case 'strategy-engine':
        return <StrategyEngine />;
      case 'ai-studio':
        return <AICreativeStudio />;
      case 'video-editor':
        return <VideoTimelineEditor />;
      case 'config-apis':
        return <AISettingsPage />;
      case 'envio-massa':
        return <EnvioMassaMarketing />;
      case 'recursos':
        return <MarketingRecursos />;
      case 'galeria':
        return <MarketingGaleria onEditImage={handleEditImageFromGallery} />;
      case 'catalogo':
        return <MarketingCatalogo />;
      case 'n8n-generator':
        return <ResourceN8nGenerator />;
      case 'railway-env':
        return <RailwayVariables />;
      case 'page-builder':
        return <PageBuilder />;
      case 'canvas':
        return <MarketingCanvas onClose={() => setActiveTab('recursos')} />;
      case 'automacoes':
        return <MarketingAutomacoes />;
      case 'campanhas':
        return <MarketingCampanhas />;
      case 'integrations':
        return <IntegrationCredentialsManager />;
      case 'n8n-editor':
        return <N8nWorkflowEditor />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Marketing
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Gestão de campanhas e automações de marketing
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col lg:flex-row">
          {/* Mobile: Select dropdown */}
          <div className="lg:hidden border-b bg-muted/30 p-3">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <CurrentIcon className="h-4 w-4" />
                    <span>{currentTabItem.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <SelectItem key={tab.id} value={tab.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Sidebar menu */}
          <div className={cn(
            "hidden lg:flex lg:flex-col lg:border-r lg:bg-muted/20 lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 transition-all duration-300",
            isMenuCollapsed ? "lg:w-16" : "lg:w-64"
          )}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} 
              className="mb-2 self-end"
            >
              {isMenuCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <TooltipProvider delayDuration={0}>
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const menuButton = (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left w-full",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isMenuCollapsed && "justify-center"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", !isActive && "opacity-70")} />
                    {!isMenuCollapsed && <span className="truncate">{tab.label}</span>}
                  </button>
                );
                if (isMenuCollapsed) {
                  return (
                    <Tooltip key={tab.id}>
                      <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                      <TooltipContent side="right">{tab.label}</TooltipContent>
                    </Tooltip>
                  );
                }
                return menuButton;
              })}
            </TooltipProvider>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-3 sm:p-6">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <TabsContent 
                  key={tab.id} 
                  value={tab.id} 
                  className="mt-0"
                  forceMount={tab.id === 'ai-studio' ? true : undefined}
                  style={tab.id === 'ai-studio' && !isActive ? { display: 'none' } : undefined}
                >
                  <Card className="h-full">
                    <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        {tab.label}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {tab.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                      {tab.id === 'ai-studio' ? renderTabContent(tab.id) : (isActive && renderTabContent(tab.id))}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default MarketingHub;
