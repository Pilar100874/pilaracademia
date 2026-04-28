import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StrategyProject, AgentExecution, StrategyArtifact, ChatMessage } from '../types';
import { toast } from 'sonner';

export function useStrategyProjects(estabelecimentoId: string | undefined) {
  const [projects, setProjects] = useState<StrategyProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!estabelecimentoId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('strategy_projects')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects((data || []) as unknown as StrategyProject[]);
    }
    setLoading(false);
  }, [estabelecimentoId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async (nome: string, descricao: string, _userId: string) => {
    if (!estabelecimentoId) {
      toast.error('Estabelecimento não encontrado');
      return null;
    }

    // Get auth user id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Você precisa estar logado para criar projetos');
      return null;
    }

    // Get usuario record to use as user_id
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!usuario) {
      toast.error('Perfil de usuário não encontrado');
      return null;
    }

    const { data, error } = await supabase
      .from('strategy_projects')
      .insert({
        nome,
        descricao_negocio: descricao,
        estabelecimento_id: estabelecimentoId,
        user_id: usuario.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      toast.error('Erro ao criar projeto: ' + error.message);
      return null;
    }
    await fetchProjects();
    return data as unknown as StrategyProject;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('strategy_projects').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir projeto');
    } else {
      await fetchProjects();
    }
  };

  return { projects, loading, createProject, deleteProject, refetch: fetchProjects };
}

export function useProjectDetail(projectId: string | null) {
  const [project, setProject] = useState<StrategyProject | null>(null);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [artifacts, setArtifacts] = useState<StrategyArtifact[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const initialLoadDone = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    if (!initialLoadDone.current) setLoading(true);

    const [projRes, execRes, artRes, chatRes] = await Promise.all([
      supabase.from('strategy_projects').select('*').eq('id', projectId).single(),
      supabase.from('strategy_agent_executions').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('strategy_artifacts').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('strategy_chat_messages').select('*').eq('project_id', projectId).order('created_at'),
    ]);

    if (projRes.data) setProject(projRes.data as unknown as StrategyProject);
    setExecutions((execRes.data || []) as unknown as AgentExecution[]);
    
    // Deduplicate artifacts: keep only the latest per tipo
    const allArts = (artRes.data || []) as unknown as StrategyArtifact[];
    const latestByType = new Map<string, StrategyArtifact>();
    for (const art of allArts) {
      const existing = latestByType.get(art.tipo);
      if (!existing || new Date(art.created_at) > new Date(existing.created_at)) {
        latestByType.set(art.tipo, art);
      }
    }
    setArtifacts(Array.from(latestByType.values()));
    
    setChatMessages((chatRes.data || []) as unknown as ChatMessage[]);
    setLoading(false);
    initialLoadDone.current = true;
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { project, executions, artifacts, chatMessages, loading, refetch: fetchAll };
}
