import React, { useState } from 'react';
import {
  Target,
  Palette,
  Zap,
  Megaphone,
  PanelLeft,
  PanelLeftClose,
  LucideIcon,
  FolderOpen,
  Key,
  Link2,
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
import { BottomNav } from '@/components/BottomNav';
import { PageMotion } from '@/components/PageMotion';

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

const ComingSoon: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Em portagem</div>
    <h3 className="font-serif text-2xl">{label}</h3>
    <p className="text-sm text-muted-foreground max-w-md">
      Este aplicativo está sendo migrado do CRM Pilar. Será habilitado em breve.
    </p>
  </div>
);

const MarketingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('strategy-engine');
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const currentTabItem = tabItems.find(t => t.id === activeTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;

  return (
    <PageMotion>
      <div className="min-h-screen pb-20 bg-background flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
          <h1 className="font-serif text-lg sm:text-2xl font-bold flex items-center gap-2">
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
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 text-left w-full",
                        isActive
                          ? "bg-primary text-primary-foreground"
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
                return (
                  <TabsContent key={tab.id} value={tab.id} className="mt-0">
                    <Card className="h-full">
                      <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-serif">
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          {tab.label}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          {tab.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6">
                        <ComingSoon label={tab.label} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </div>
          </Tabs>
        </div>

        <BottomNav />
      </div>
    </PageMotion>
  );
};

export default MarketingPage;
