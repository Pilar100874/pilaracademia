import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { N8nCredentialType, N8nCredential, N8nNodeType, N8nWorkflow } from '../types';
import { toast } from 'sonner';

export function useNodeTypes() {
  return useQuery({
    queryKey: ['n8n-node-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('n8n_node_types')
        .select(`
          *,
          credential_type:n8n_credential_types(*)
        `)
        .order('categoria', { ascending: true });
      
      if (error) throw error;
      return data as unknown as N8nNodeType[];
    },
  });
}

export function useCredentialTypes() {
  return useQuery({
    queryKey: ['n8n-credential-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('n8n_credential_types')
        .select('*')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data as unknown as N8nCredentialType[];
    },
  });
}

export function useCredentials(estabelecimentoId: string | undefined) {
  return useQuery({
    queryKey: ['n8n-credentials', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      
      const { data, error } = await supabase
        .from('n8n_credenciais')
        .select(`
          *,
          credential_type:n8n_credential_types(*)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data as unknown as N8nCredential[];
    },
    enabled: !!estabelecimentoId,
  });
}

export function useCreateCredential() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (credential: Omit<N8nCredential, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('n8n_credenciais')
        .insert(credential)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-credentials'] });
      toast.success('Credencial salva com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar credencial: ' + error.message);
    },
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('n8n_credenciais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-credentials'] });
      toast.success('Credencial excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir credencial: ' + error.message);
    },
  });
}

export function useWorkflows(estabelecimentoId: string | undefined) {
  return useQuery({
    queryKey: ['n8n-workflows', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      
      const { data, error } = await supabase
        .from('n8n_workflows')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as N8nWorkflow[];
    },
    enabled: !!estabelecimentoId,
  });
}

export function useSaveWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workflow: Partial<N8nWorkflow> & { estabelecimento_id: string }) => {
      if (workflow.id) {
        const { data, error } = await supabase
          .from('n8n_workflows')
          .update({
            nome: workflow.nome,
            descricao: workflow.descricao,
            flow_data: workflow.flow_data as any,
            ativo: workflow.ativo,
          })
          .eq('id', workflow.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('n8n_workflows')
          .insert({
            estabelecimento_id: workflow.estabelecimento_id,
            nome: workflow.nome || 'Novo Workflow',
            descricao: workflow.descricao,
            flow_data: workflow.flow_data as any,
            ativo: false,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-workflows'] });
      toast.success('Workflow salvo com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar workflow: ' + error.message);
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('n8n_workflows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-workflows'] });
      toast.success('Workflow excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir workflow: ' + error.message);
    },
  });
}
