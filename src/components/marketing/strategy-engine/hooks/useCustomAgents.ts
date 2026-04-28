import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ensureCollaborationDirective } from '../agent-cards';

export interface CustomAgent {
  id: string;
  estabelecimento_id: string;
  agent_key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  system_prompt: string;
  dependencies: string[];
  output_schema: Record<string, any>;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  agent_card_json?: any;
  knowledge_base_type?: string;
  knowledge_base_files?: any;
}

export function useCustomAgents(estabelecimentoId: string | undefined) {
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('strategy_custom_agents')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativo', true)
      .order('ordem');

    if (!error && data) {
      setCustomAgents(data as unknown as CustomAgent[]);
    }
    setLoading(false);
  }, [estabelecimentoId]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const createAgent = async (agent: Partial<CustomAgent> & { agent_card_json?: any }) => {
    if (!estabelecimentoId) return null;

    const payload = {
      estabelecimento_id: estabelecimentoId,
      agent_key: agent.agent_key!,
      name: agent.name!,
      icon: agent.icon || '🤖',
      color: agent.color || '#8B5CF6',
      description: agent.description || '',
      system_prompt: ensureCollaborationDirective(agent.system_prompt || ''),
      dependencies: agent.dependencies || [],
      output_schema: agent.output_schema || {},
      ordem: agent.ordem || 100,
      agent_card_json: agent.agent_card_json || null,
      knowledge_base_type: agent.knowledge_base_type || 'internal',
    };

    const { data, error } = await supabase
      .from('strategy_custom_agents')
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      toast.error(`Erro ao criar agente: ${error.message}`);
      return null;
    }
    toast.success(`Agente "${agent.name}" criado!`);
    await fetchAgents();
    return data as unknown as CustomAgent;
  };

  const updateAgent = async (id: string, updates: Partial<CustomAgent>) => {
    const normalizedUpdates = {
      ...updates,
      ...(typeof updates.system_prompt === 'string'
        ? { system_prompt: ensureCollaborationDirective(updates.system_prompt) }
        : {}),
    };

    const { error } = await supabase
      .from('strategy_custom_agents')
      .update(normalizedUpdates as any)
      .eq('id', id);

    if (error) {
      toast.error(`Erro ao atualizar: ${error.message}`);
      return false;
    }
    await fetchAgents();
    return true;
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase
      .from('strategy_custom_agents')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
      return false;
    }
    toast.success('Agente excluído');
    await fetchAgents();
    return true;
  };

  return { customAgents, loading, createAgent, updateAgent, deleteAgent, refetch: fetchAgents };
}
