import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Zap, MoreVertical, Edit, Trash2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import NovaAutomacaoDialog from "@/components/marketing/NovaAutomacaoDialog";

export default function MarketingAutomacoes() {
  const { openSubmenu } = useLayout();
  const [automacoes, setAutomacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedAutomacao, setSelectedAutomacao] = useState<any>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [variablesDialogOpen, setVariablesDialogOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateDescription, setDuplicateDescription] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [automacaoToExecute, setAutomacaoToExecute] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    loadAutomacoes();
  }, []);

  const loadAutomacoes = async () => {
    try {
      console.log("Carregando automações...");
      const estabelecimentoId = await getEstabelecimentoId();
      console.log("Estabelecimento ID:", estabelecimentoId);
      
      if (!estabelecimentoId) {
        console.error("Estabelecimento ID não encontrado");
        toast.error("Não foi possível identificar o estabelecimento");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("marketing_automations" as any)
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

      console.log("Dados retornados:", data);
      console.log("Erro (se houver):", error);

      if (error) {
        console.error("Erro na query:", error);
        throw error;
      }
      
      setAutomacoes(data || []);
      console.log("Automações carregadas com sucesso:", data?.length || 0);
    } catch (error) {
      console.error("Erro ao carregar automações:", error);
      toast.error("Erro ao carregar automações");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("marketing_automations" as any)
        .update({ active: !currentActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(!currentActive ? "Automação ativada!" : "Automação desativada!");
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao atualizar automação:", error);
      toast.error("Erro ao atualizar automação");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a automação "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from("marketing_automations" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Automação excluída com sucesso!");
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao excluir automação:", error);
      toast.error("Erro ao excluir automação");
    }
  };

  const getTipoDisparoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      manual: "Manual",
      automatico: "Automático",
      data: "Por Data",
    };
    return labels[tipo] || tipo;
  };

  const handleRename = async () => {
    if (!renameName.trim()) {
      toast.error("Por favor, informe um nome");
      return;
    }
    if (!selectedAutomacao) return;

    setIsRenaming(true);
    try {
      const { error } = await supabase
        .from("marketing_automations" as any)
        .update({ 
          name: renameName.trim(),
          description: renameDescription.trim()
        })
        .eq("id", selectedAutomacao.id);

      if (error) throw error;
      toast.success("Automação renomeada com sucesso!");
      setRenameDialogOpen(false);
      setRenameName("");
      setRenameDescription("");
      setSelectedAutomacao(null);
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao renomear:", error);
      toast.error("Erro ao renomear automação");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateName.trim()) {
      toast.error("Por favor, informe um nome");
      return;
    }
    if (!selectedAutomacao) return;

    setIsDuplicating(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento");
        return;
      }

      const { error } = await supabase
        .from("marketing_automations" as any)
        .insert({
          name: duplicateName.trim(),
          description: duplicateDescription.trim(),
          config: selectedAutomacao.config,
          active: false,
          estabelecimento_id: estabelecimentoId,
        });

      if (error) throw error;
      toast.success("Automação duplicada com sucesso!");
      setDuplicateDialogOpen(false);
      setDuplicateName("");
      setDuplicateDescription("");
      setSelectedAutomacao(null);
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao duplicar:", error);
      toast.error("Erro ao duplicar automação");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleExecute = async () => {
    if (!automacaoToExecute) return;
    
    setIsExecuting(true);
    try {
      const webhookId = automacaoToExecute.config?.webhook_id;
      if (!webhookId) {
        toast.error("Webhook não configurado para esta automação");
        return;
      }

      // Buscar o webhook para pegar URL e método
      const { data: webhook, error: webhookError } = await supabase
        .from("webhooks")
        .select("url, method")
        .eq("id", webhookId)
        .single();

      if (webhookError || !webhook) {
        toast.error("Webhook não encontrado");
        return;
      }

      // Executar o webhook com as variáveis configuradas
      const variables = automacaoToExecute.config?.variaveis || {};
      
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        throw new Error(`Erro na execução: ${response.statusText}`);
      }

      toast.success("Automação executada com sucesso!");
      setExecuteDialogOpen(false);
      setAutomacaoToExecute(null);
    } catch (error) {
      console.error("Erro ao executar automação:", error);
      toast.error("Erro ao executar automação");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 md:space-y-8 animate-fade-in bg-background dark:bg-background min-h-full">
      <div>
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <SubMenuHeader 
            title="Marketing"
            onOpenSubmenu={() => openSubmenu("Marketing")}
          />
          <h1 className="text-base sm:text-lg font-bold text-foreground">Automações de Marketing</h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configure automações de marketing para diferentes contextos
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Card 
          className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-primary/30 h-full flex flex-col"
          onClick={() => setDialogOpen(true)}
        >
          <CardHeader className="flex-1 p-3 sm:p-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <CardTitle className="text-base sm:text-lg">Criar Nova Automação</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Configure uma nova automação de marketing com webhooks e triggers personalizados
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto p-3 sm:p-4 pt-0">
            <Button className="w-full text-sm sm:text-base h-9 sm:h-10">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Criar Automação
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-full">
              <CardHeader className="p-3 sm:p-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted mb-3 sm:mb-4"></div>
                <div className="h-5 sm:h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 sm:h-4 bg-muted rounded w-full"></div>
              </CardHeader>
            </Card>
          ))
        ) : (
          automacoes.map((automacao) => (
            <Card
              key={automacao.id}
              className="hover:shadow-lg transition-all relative group h-full flex flex-col"
            >
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                <DropdownMenu open={openMenuId === automacao.id} onOpenChange={(open) => setOpenMenuId(open ? automacao.id : null)}>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                      <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setSelectedAutomacao(automacao);
                      setDialogOpen(true);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setSelectedAutomacao(automacao);
                      setRenameName(automacao.name);
                      setRenameDescription(automacao.description || "");
                      setRenameDialogOpen(true);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setSelectedAutomacao(automacao);
                      setDuplicateName(`${automacao.name} (cópia)`);
                      setDuplicateDescription(automacao.description || "");
                      setDuplicateDialogOpen(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setSelectedAutomacao(automacao);
                      setVariablesDialogOpen(true);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Gerenciar Variáveis
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      handleToggleActive(automacao.id, automacao.active);
                    }}>
                      <Power className="w-4 h-4 mr-2" />
                      {automacao.active ? "Desativar" : "Ativar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        handleDelete(automacao.id, automacao.name);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardHeader className="flex-1 p-3 sm:p-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="flex-1 text-base sm:text-lg">{automacao.name}</CardTitle>
                  {automacao.active && (
                    <Badge variant="default" className="bg-green-500 text-xs">
                      Ativa
                    </Badge>
                  )}
                </div>
                {automacao.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">{automacao.description}</p>
                )}
                <CardDescription className="text-xs sm:text-sm">
                  {getTipoDisparoLabel(automacao.config?.tipo_disparo)} • 
                  Criada {formatDistanceToNow(new Date(automacao.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </CardDescription>
              </CardHeader>
              {automacao.active && (
                <CardContent className="mt-auto p-3 sm:p-4 pt-0">
                  <Button 
                    className="w-full text-sm sm:text-base h-9 sm:h-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAutomacaoToExecute(automacao);
                      setExecuteDialogOpen(true);
                    }}
                  >
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Executar Automação
                  </Button>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {!loading && automacoes.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted mx-auto mb-3 sm:mb-4 flex items-center justify-center">
            <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
          </div>
          <p className="text-sm sm:text-base text-muted-foreground px-4">
            Você ainda não tem automações criadas. Clique no card acima para criar sua primeira automação!
          </p>
        </div>
      )}

      <NovaAutomacaoDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedAutomacao(null);
        }}
        onSuccess={loadAutomacoes}
        automationToEdit={selectedAutomacao}
      />

      {/* Dialog de Renomear */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Automação</DialogTitle>
            <DialogDescription>
              Digite um novo nome para a automação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Nome da automação"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={renameDescription}
                onChange={(e) => setRenameDescription(e.target.value)}
                placeholder="Descrição (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={isRenaming}>
              {isRenaming ? "Renomeando..." : "Renomear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Duplicar */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Automação</DialogTitle>
            <DialogDescription>
              Digite um nome para a automação duplicada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Nome da automação"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={duplicateDescription}
                onChange={(e) => setDuplicateDescription(e.target.value)}
                placeholder="Descrição (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicate} disabled={isDuplicating}>
              {isDuplicating ? "Duplicando..." : "Duplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Gerenciar Variáveis */}
      <Dialog open={variablesDialogOpen} onOpenChange={setVariablesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Variáveis do Webhook</DialogTitle>
            <DialogDescription>
              Configure os valores das variáveis de entrada e saída
            </DialogDescription>
          </DialogHeader>
          {selectedAutomacao && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Automação: {selectedAutomacao.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Webhook ID: {selectedAutomacao.config?.webhook_id || "Não configurado"}
                </p>
              </div>

              {/* Seção de Variáveis de Entrada */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Variáveis de Entrada</h4>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  {selectedAutomacao.config?.variaveis && Object.keys(selectedAutomacao.config.variaveis).length > 0 ? (
                    Object.entries(selectedAutomacao.config.variaveis).map(([key, value]: [string, any]) => (
                      <div key={key} className="space-y-2">
                        <Label className="text-sm">{key}</Label>
                        <Input
                          value={value || ""}
                          disabled
                          className="bg-background"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma variável de entrada configurada</p>
                  )}
                </div>
              </div>

              {/* Seção de Variáveis de Saída */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Variáveis de Saída</h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    As variáveis de saída são definidas pelo webhook e estarão disponíveis após a execução
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVariablesDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Execução */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Executar Automação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja executar esta automação agora?
            </DialogDescription>
          </DialogHeader>
          {automacaoToExecute && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm font-medium">Automação: {automacaoToExecute.name}</p>
                {automacaoToExecute.description && (
                  <p className="text-sm text-muted-foreground">{automacaoToExecute.description}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Tipo: {getTipoDisparoLabel(automacaoToExecute.config?.tipo_disparo)}
                </p>
              </div>
              {automacaoToExecute.config?.variaveis && Object.keys(automacaoToExecute.config.variaveis).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Variáveis que serão enviadas:</p>
                  <div className="p-3 bg-muted/30 rounded text-xs font-mono">
                    {JSON.stringify(automacaoToExecute.config.variaveis, null, 2)}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setExecuteDialogOpen(false);
                setAutomacaoToExecute(null);
              }}
              disabled={isExecuting}
            >
              Cancelar
            </Button>
            <Button onClick={handleExecute} disabled={isExecuting}>
              {isExecuting ? "Executando..." : "Executar Agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
