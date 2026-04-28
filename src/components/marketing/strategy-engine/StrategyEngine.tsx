import React, { useState } from 'react';
import { StrategyProjectsList } from './StrategyProjectsList';
import { StrategyProjectDetail } from './StrategyProjectDetail';
import { StrategyAdminPanel } from './StrategyAdminPanel';
import { StrategyManual } from './StrategyManual';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, FolderKanban, Shield, BookOpen } from 'lucide-react';

export function StrategyEngine() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'projects' | 'admin' | 'manual'>('projects');

  if (selectedProjectId) {
    return (
      <StrategyProjectDetail
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Motor de Estratégia com IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Transforme descrições de negócio em estratégias completas de marketing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeSection === 'projects' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('projects')}
          >
            <FolderKanban className="h-4 w-4 mr-1" />
            Projetos
          </Button>
          <Button
            variant={activeSection === 'admin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('admin')}
          >
            <Shield className="h-4 w-4 mr-1" />
            Admin
          </Button>
          <Button
            variant={activeSection === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('manual')}
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Manual
          </Button>
        </div>
      </div>

      {activeSection === 'projects' ? (
        <StrategyProjectsList onSelectProject={setSelectedProjectId} />
      ) : activeSection === 'admin' ? (
        <StrategyAdminPanel />
      ) : (
        <StrategyManual />
      )}
    </div>
  );
}
