import React, { useState, useEffect } from 'react';
import { ResourcesList } from './ResourcesList';
import { ResourceFormDialog } from './ResourceFormDialog';
import { ContentWizardDialog } from './ContentWizardDialog';
import { MarketingResource, ResourceField, PublishChannel, ReturnType, FormStep } from './types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface DBMarketingResource {
  id: string;
  estabelecimento_id: string;
  name: string;
  description: string | null;
  return_type: string;
  fields: ResourceField[];
  steps: FormStep[] | null;
  save_location: string | null;
  n8n_webhook_url: string | null;
  n8n_publish_webhook_url: string | null;
  publish_channels: string[] | null;
  auto_publish_enabled: boolean | null;
  webhook_has_response: boolean | null;
  created_at: string;
  updated_at: string;
}

const mapDBToResource = (db: DBMarketingResource): MarketingResource => ({
  id: db.id,
  name: db.name,
  description: db.description || undefined,
  returnType: db.return_type as ReturnType,
  fields: db.fields || [],
  steps: db.steps || [],
  saveLocation: db.save_location || undefined,
  n8nWebhookUrl: db.n8n_webhook_url || undefined,
  n8nPublishWebhookUrl: db.n8n_publish_webhook_url || undefined,
  publishChannels: (db.publish_channels || []) as PublishChannel[],
  autoPublishEnabled: db.auto_publish_enabled || false,
  webhookHasResponse: db.webhook_has_response ?? true,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

interface WizardState {
  resource: MarketingResource;
  initialFieldValues?: Record<string, any>;
  presetId?: string;
  presetName?: string;
}

const MarketingRecursos: React.FC = () => {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [resources, setResources] = useState<MarketingResource[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<MarketingResource | undefined>();
  const [wizardState, setWizardState] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem('estabelecimentoId');
    if (cached) {
      setEstabelecimentoId(cached);
    }
  }, []);

  useEffect(() => {
    if (estabelecimentoId) {
      loadResources();
    } else {
      setLoading(false);
    }
  }, [estabelecimentoId]);

  const loadResources = async () => {
    if (!estabelecimentoId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_resources')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((item: any) => mapDBToResource(item as DBMarketingResource));
      setResources(mapped);
    } catch (error) {
      console.error('Erro ao carregar recursos:', error);
      toast.error('Erro ao carregar recursos');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResource = async (resource: MarketingResource) => {
    if (!estabelecimentoId) {
      toast.error('Estabelecimento não encontrado');
      return;
    }

    try {
      const dbData = {
        estabelecimento_id: estabelecimentoId,
        name: resource.name,
        description: resource.description || null,
        return_type: resource.returnType,
        fields: resource.fields as any,
        steps: resource.steps as any,
        save_location: resource.saveLocation || null,
        n8n_webhook_url: resource.n8nWebhookUrl || null,
        n8n_publish_webhook_url: resource.n8nPublishWebhookUrl || null,
        publish_channels: resource.publishChannels || [],
        auto_publish_enabled: resource.autoPublishEnabled || false,
        webhook_has_response: resource.webhookHasResponse ?? true,
      };

      if (editingResource) {
        // Update existing
        const { error } = await supabase
          .from('marketing_resources')
          .update(dbData)
          .eq('id', resource.id);

        if (error) throw error;
        toast.success('Recurso atualizado!');
      } else {
        // Create new
        const { error } = await supabase
          .from('marketing_resources')
          .insert(dbData);

        if (error) throw error;
        toast.success('Recurso criado!');
      }

      await loadResources();
      setEditingResource(undefined);
    } catch (error) {
      console.error('Erro ao salvar recurso:', error);
      toast.error('Erro ao salvar recurso');
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    try {
      const { error } = await supabase
        .from('marketing_resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;

      setResources((prev) => prev.filter((r) => r.id !== resourceId));
      toast.success('Recurso removido');
    } catch (error) {
      console.error('Erro ao remover recurso:', error);
      toast.error('Erro ao remover recurso');
    }
  };

  const handleEditResource = (resource: MarketingResource) => {
    setEditingResource(resource);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingResource(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <ResourcesList
        resources={resources}
        onCreateNew={() => setIsFormOpen(true)}
        onEdit={handleEditResource}
        onDelete={handleDeleteResource}
        onUseResource={(resource, preset) => setWizardState({ 
          resource, 
          initialFieldValues: preset?.field_values,
          presetId: preset?.id,
          presetName: preset?.nome
        })}
      />

      <ResourceFormDialog
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveResource}
        resource={editingResource}
      />

      {wizardState && (
        <ContentWizardDialog
          open={!!wizardState}
          onClose={() => setWizardState(null)}
          resource={wizardState.resource}
          initialFieldValues={wizardState.initialFieldValues}
          presetId={wizardState.presetId}
          presetName={wizardState.presetName}
        />
      )}
    </div>
  );
};

export default MarketingRecursos;
