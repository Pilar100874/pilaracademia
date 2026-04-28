import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";

interface NovaAutomacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  automationToEdit?: any;
}

interface WebhookVariable {
  name: string;
  type: string;
  required: boolean;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  method: string;
  variables: WebhookVariable[];
}

export default function NovaAutomacaoDialog({
  open,
  onOpenChange,
  onSuccess,
  automationToEdit,
}: NovaAutomacaoDialogProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoDisparo, setTipoDisparo] = useState<"manual" | "automatico" | "data">("manual");
  
  // Manual
  const [localDisponivel, setLocalDisponivel] = useState("");
  
  // Automático
  const [areaAutomatica, setAreaAutomatica] = useState("");
  const [eventoAutomatico, setEventoAutomatico] = useState("");
  
  // Por data
  const [periodicidade, setPeriodicidade] = useState("");
  const [diaSemana, setDiaSemana] = useState("");
  const [diaMes, setDiaMes] = useState("");
  const [horario, setHorario] = useState("");
  
  // Webhook
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookSelecionado, setWebhookSelecionado] = useState("");
  const [variaveisWebhook, setVariaveisWebhook] = useState<Record<string, string>>({});
  
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadWebhooks();
    }
  }, [open]);

  useEffect(() => {
    if (webhookSelecionado) {
      const webhook = webhooks.find(w => w.id === webhookSelecionado);
      if (webhook?.variables) {
        const initialVars: Record<string, string> = {};
        webhook.variables.forEach(v => {
          initialVars[v.name] = "";
        });
        setVariaveisWebhook(initialVars);
      }
    } else {
      setVariaveisWebhook({});
    }
  }, [webhookSelecionado, webhooks]);

  useEffect(() => {
    if (open && automationToEdit) {
      setNome(automationToEdit.name || "");
      setDescricao(automationToEdit.description || "");
      const cfg = automationToEdit.config || {};
      setTipoDisparo(cfg.tipo_disparo || "manual");
      setLocalDisponivel(cfg.local_disponivel || "");
      setAreaAutomatica(cfg.area || "");
      setEventoAutomatico(cfg.evento || "");
      setPeriodicidade(cfg.periodicidade || "");
      setDiaSemana(cfg.dia_semana || "");
      setDiaMes(cfg.dia_mes || "");
      setHorario(cfg.horario || "");
      setWebhookSelecionado(cfg.webhook_id || "");
      setVariaveisWebhook(cfg.variaveis || {});
    } else if (open && !automationToEdit) {
      // Resetar ao abrir para criar nova
      setNome("");
      setDescricao("");
      setTipoDisparo("manual");
      setLocalDisponivel("");
      setAreaAutomatica("");
      setEventoAutomatico("");
      setPeriodicidade("");
      setDiaSemana("");
      setDiaMes("");
      setHorario("");
      setWebhookSelecionado("");
      setVariaveisWebhook({});
    }
  }, [open, automationToEdit]);

  const loadWebhooks = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true);

      if (error) throw error;
      
      // Filtrar webhooks que têm "automacoes" ou "campanha" em usage_locations
      const filteredData = (data || []).filter((webhook: any) => {
        const locations = webhook.usage_locations || [];
        return locations.includes("automacoes") || locations.includes("campanha");
      });
      
      // Parse variables from JSON
      const parsedWebhooks = filteredData.map(webhook => ({
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        method: webhook.method,
        variables: Array.isArray(webhook.variables) 
          ? (webhook.variables as unknown as WebhookVariable[])
          : []
      }));
      
      setWebhooks(parsedWebhooks);
    } catch (error) {
      console.error("Erro ao carregar webhooks:", error);
    }
  };

  const handleCreate = async () => {
    if (!nome.trim()) {
      toast.error("Por favor, informe um nome para a automação");
      return;
    }

    if (!webhookSelecionado) {
      toast.error("Por favor, selecione um webhook");
      return;
    }

    setIsCreating(true);

    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento");
        return;
      }

      // Montar configuração baseado no tipo
      let config: any = {
        tipo_disparo: tipoDisparo,
        webhook_id: webhookSelecionado,
        variaveis: variaveisWebhook,
      };

      if (tipoDisparo === "manual") {
        config.local_disponivel = localDisponivel;
      } else if (tipoDisparo === "automatico") {
        config.area = areaAutomatica;
        config.evento = eventoAutomatico;
      } else if (tipoDisparo === "data") {
        config.periodicidade = periodicidade;
        config.dia_semana = diaSemana;
        config.dia_mes = diaMes;
        config.horario = horario;
      }

      if (automationToEdit?.id) {
        const { error } = await supabase
          .from("marketing_automations" as any)
          .update({
            name: nome.trim(),
            description: descricao.trim(),
            config: config,
          })
          .eq("id", automationToEdit.id);

        if (error) throw error;
        toast.success("Automação atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("marketing_automations" as any)
          .insert({
            name: nome.trim(),
            description: descricao.trim(),
            config: config,
            active: true,
            estabelecimento_id: estabelecimentoId,
          });

        if (error) throw error;
        toast.success("Automação criada com sucesso!");
      }

      // Resetar estado e fechar
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar automação:", error);
      toast.error("Erro ao salvar automação");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNome("");
    setDescricao("");
    setTipoDisparo("manual");
    setLocalDisponivel("");
    setAreaAutomatica("");
    setEventoAutomatico("");
    setPeriodicidade("");
    setDiaSemana("");
    setDiaMes("");
    setHorario("");
    setWebhookSelecionado("");
    setVariaveisWebhook({});
  };

  const selectedWebhook = webhooks.find(w => w.id === webhookSelecionado);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Automação</DialogTitle>
          <DialogDescription>
            Configure uma nova automação de marketing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Automação</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Boas-vindas novos clientes"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição da Automação</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o objetivo desta automação"
              rows={3}
            />
          </div>

          {/* Tipo de Disparo */}
          <div className="space-y-3">
            <Label>Tipo de Disparo</Label>
            <RadioGroup value={tipoDisparo} onValueChange={(value: any) => setTipoDisparo(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal cursor-pointer">Manual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="automatico" id="automatico" />
                <Label htmlFor="automatico" className="font-normal cursor-pointer">Automático</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="data" id="data" />
                <Label htmlFor="data" className="font-normal cursor-pointer">Por Data</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Condicional: Manual */}
          {tipoDisparo === "manual" && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <Label>Local onde vai ficar disponível</Label>
              <Select value={localDisponivel} onValueChange={setLocalDisponivel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bot">Bot</SelectItem>
                  <SelectItem value="orcamento">Tela de Orçamento</SelectItem>
                  <SelectItem value="calendario">Calendário</SelectItem>
                  <SelectItem value="marketing">Tela Marketing</SelectItem>
                  <SelectItem value="empresa">Tela Empresa</SelectItem>
                  <SelectItem value="contatos">Tela Contatos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Condicional: Automático */}
          {tipoDisparo === "automatico" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label>Selecione a área</Label>
                <Select value={areaAutomatica} onValueChange={setAreaAutomatica}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="calendario">Calendário</SelectItem>
                    <SelectItem value="orcamento">Orçamento</SelectItem>
                    <SelectItem value="empresas">Empresas</SelectItem>
                    <SelectItem value="contatos">Contatos</SelectItem>
                    <SelectItem value="agenda">Agenda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {areaAutomatica && (
                <div className="space-y-2">
                  <Label>Quando executar</Label>
                  <Select value={eventoAutomatico} onValueChange={setEventoAutomatico}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="criar">Ao criar</SelectItem>
                      <SelectItem value="modificar">Ao modificar</SelectItem>
                      <SelectItem value="mudar_status">Ao mudar status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Condicional: Por Data */}
          {tipoDisparo === "data" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label>Periodicidade</Label>
                <Select value={periodicidade} onValueChange={setPeriodicidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a periodicidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">Todo dia</SelectItem>
                    <SelectItem value="semanal">1 vez por semana</SelectItem>
                    <SelectItem value="quinzenal">A cada 15 dias</SelectItem>
                    <SelectItem value="mensal">1 vez por mês</SelectItem>
                    <SelectItem value="anual">1 vez por ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodicidade === "semanal" && (
                <div className="space-y-2">
                  <Label>Dia da semana</Label>
                  <Select value={diaSemana} onValueChange={setDiaSemana}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Domingo</SelectItem>
                      <SelectItem value="1">Segunda-feira</SelectItem>
                      <SelectItem value="2">Terça-feira</SelectItem>
                      <SelectItem value="3">Quarta-feira</SelectItem>
                      <SelectItem value="4">Quinta-feira</SelectItem>
                      <SelectItem value="5">Sexta-feira</SelectItem>
                      <SelectItem value="6">Sábado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(periodicidade === "mensal" || periodicidade === "quinzenal" || periodicidade === "anual") && (
                <div className="space-y-2">
                  <Label>Dia do mês</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={diaMes}
                    onChange={(e) => setDiaMes(e.target.value)}
                    placeholder="Ex: 15"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Seleção de Webhook */}
          <div className="space-y-2">
            <Label>Webhook</Label>
            <Select value={webhookSelecionado} onValueChange={setWebhookSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um webhook" />
              </SelectTrigger>
              <SelectContent>
                {webhooks.map((webhook) => (
                  <SelectItem key={webhook.id} value={webhook.id}>
                    {webhook.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {webhooks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum webhook ativo encontrado. Configure webhooks primeiro.
              </p>
            )}
          </div>

          {/* Variáveis do Webhook */}
          {selectedWebhook && selectedWebhook.variables && selectedWebhook.variables.length > 0 && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-semibold">Variáveis do Webhook</Label>
              {selectedWebhook.variables.map((variable) => (
                <div key={variable.name} className="space-y-2">
                  <Label htmlFor={`var-${variable.name}`} className="text-sm">
                    {variable.name}
                    {variable.required && <span className="text-destructive ml-1">*</span>}
                    <span className="text-muted-foreground ml-2">({variable.type})</span>
                  </Label>
                  <Input
                    id={`var-${variable.name}`}
                    value={variaveisWebhook[variable.name] || ""}
                    onChange={(e) => setVariaveisWebhook({
                      ...variaveisWebhook,
                      [variable.name]: e.target.value,
                    })}
                    placeholder={`Digite o valor para ${variable.name}`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Info do Webhook Selecionado */}
          {selectedWebhook && (
            <div className="p-3 bg-primary/5 rounded-lg text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Método:</span>
                <code className="px-2 py-0.5 bg-background rounded text-xs">{selectedWebhook.method}</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold">URL:</span>
                <code className="px-2 py-0.5 bg-background rounded text-xs break-all flex-1">
                  {selectedWebhook.url}
                </code>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Criando..." : "Criar Automação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
