export interface N8nCredentialType {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  campos_json: CredentialField[];
}

export interface CredentialField {
  nome: string;
  label: string;
  tipo: 'text' | 'password' | 'number';
  obrigatorio: boolean;
}

export interface N8nCredential {
  id: string;
  estabelecimento_id: string;
  credential_type_id: string;
  nome: string;
  valores_criptografados: Record<string, string>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  credential_type?: N8nCredentialType;
}

export interface N8nNodeType {
  id: string;
  tipo: string;
  nome_display: string;
  descricao: string | null;
  categoria: string | null;
  icone: string | null;
  cor: string | null;
  parametros_schema: Record<string, ParameterSchema>;
  credential_type_id: string | null;
  credential_type?: N8nCredentialType;
}

export interface ParameterSchema {
  type: 'string' | 'number' | 'select' | 'code' | 'json' | 'array' | 'boolean';
  default?: any;
  options?: string[];
  label?: string;
}

export interface N8nWorkflow {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  flow_data: WorkflowData;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  connections: Record<string, ConnectionData>;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, { id: string; name: string }>;
}

export interface ConnectionData {
  main: Array<Array<{ node: string; type: string; index: number }>>;
}

export interface EditorNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: N8nNodeType;
    parameters: Record<string, any>;
    credentialId?: string;
    credentialName?: string;
  };
}

export interface EditorEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}
