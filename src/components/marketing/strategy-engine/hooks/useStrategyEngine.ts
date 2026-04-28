import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentExecution } from '../types';
import { toast } from 'sonner';
import { AGENT_ORDER, AGENT_INFO, AGENT_DEPENDENCIES } from '../types';
import { AGENT_CARDS } from '../agent-cards';
import jsPDF from 'jspdf';

export function useStrategyEngine(projectId: string | null, onRefetch: () => void, agentOrder: string[] = AGENT_ORDER, agentInfo: Record<string, { name: string; icon: string; color: string; description: string }> = AGENT_INFO) {
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      onRefetch();
    }, 3000);
  }, [onRefetch]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Start/stop polling based on running agents
  useEffect(() => {
    if (runningAgents.size > 0 || isPipelineRunning) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [runningAgents.size, isPipelineRunning, startPolling, stopPolling]);

  const addRunning = (agent: string) => {
    setRunningAgents(prev => new Set([...prev, agent]));
  };

  const removeRunning = (agent: string) => {
    setRunningAgents(prev => {
      const next = new Set(prev);
      next.delete(agent);
      return next;
    });
  };

  const executeAgent = async (agentType: string) => {
    if (!projectId) return;
    if (runningAgents.has(agentType)) return; // Already running
    addRunning(agentType);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'execute_agent', projectId, agentType }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success(`${agentInfo[agentType]?.name || agentType} concluído!`);
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro em ${agentInfo[agentType]?.name || agentType}: ${err.message}`);
    } finally {
      removeRunning(agentType);
    }
  };

  const executeAllAgents = async (dependencyMap?: Record<string, string[]>) => {
    if (!projectId) return;
    toast.info('Executando agentes em ordem de dependência...');
    
    // Use provided dependency map or fall back to hardcoded
    const depsMap = dependencyMap || AGENT_DEPENDENCIES;
    
    // Execute sequentially respecting dependencies
    const completed = new Set<string>();
    const remaining = [...agentOrder];
    
    while (remaining.length > 0) {
      // Find agents whose dependencies are all completed
      const ready = remaining.filter(a => {
        const deps = depsMap[a] ?? [];
        return deps.every(d => completed.has(d));
      });
      
      if (ready.length === 0) {
        toast.error('Dependências cíclicas detectadas — alguns agentes não puderam rodar.');
        break;
      }
      
      // Execute one at a time to ensure sequential memory reading
      for (const agentType of ready) {
        await executeAgent(agentType);
        completed.add(agentType);
      }
      remaining.splice(0, remaining.length, ...remaining.filter(a => !ready.includes(a)));
    }
    
    toast.success('🎉 Todos os agentes finalizados!');
    onRefetch();
  };

  const runPipeline = async () => {
    if (!projectId) return;
    setIsPipelineRunning(true);
    toast.info(`Pipeline iniciado! Executando ${agentOrder.length} agentes especializados...`);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'run_pipeline', projectId }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success('🎉 Pipeline concluído com sucesso!');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro no pipeline: ${err.message}`);
    } finally {
      setIsPipelineRunning(false);
      onRefetch();
    }
  };

  const sendChatMessage = async (message: string): Promise<string | null> => {
    if (!projectId) return null;
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'chat', projectId, message }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      onRefetch();
      return data.message;
    } catch (err: any) {
      toast.error(`Erro no chat: ${err.message}`);
      return null;
    } finally {
      setChatLoading(false);
    }
  };

  const validateArtifact = async (artifactId: string, content: any) => {
    try {
      const validators = ['clareza', 'especificidade', 'voc', 'diferenciacao', 'consistencia'];
      const results: Record<string, any> = {};

      for (const v of validators) {
        const { data } = await supabase.functions.invoke('strategy-engine', {
          body: { action: 'validate', validatorType: v, artifactContent: content }
        });
        if (data?.success) results[v] = data.validation;
      }

      return results;
    } catch (err: any) {
      toast.error(`Erro na validação: ${err.message}`);
      return null;
    }
  };

  const approveArtifact = async (artifactId: string) => {
    try {
      await supabase
        .from('strategy_artifacts')
        .update({ status: 'approved' } as any)
        .eq('id', artifactId);
      toast.success('Artefato aprovado!');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const rejectArtifact = async (artifactId: string) => {
    try {
      await supabase
        .from('strategy_artifacts')
        .update({ status: 'rejected' } as any)
        .eq('id', artifactId);
      toast.warning('Artefato rejeitado');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const reviseArtifact = async (artifactId: string, agentType: string) => {
    if (!projectId) return;
    addRunning(agentType);
    toast.info(`Revisando ${AGENT_INFO[agentType]?.name}...`);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'revise', projectId, agentType, artifactId }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success(`${AGENT_INFO[agentType]?.name} revisado!`);
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro na revisão: ${err.message}`);
    } finally {
      removeRunning(agentType);
    }
  };

  const updateArtifactContent = async (artifactId: string, content: any) => {
    try {
      await supabase
        .from('strategy_artifacts')
        .update({ conteudo: content } as any)
        .eq('id', artifactId);

      // Also update strategic memory
      const { data: artifact } = await supabase
        .from('strategy_artifacts')
        .select('tipo, project_id')
        .eq('id', artifactId)
        .single();

      if (artifact) {
        const { data: project } = await supabase
          .from('strategy_projects')
          .select('strategic_memory')
          .eq('id', artifact.project_id)
          .single();

        if (project) {
          const memory = (project.strategic_memory as Record<string, any>) || {};
          memory[artifact.tipo] = content;
          await supabase
            .from('strategy_projects')
            .update({ strategic_memory: memory } as any)
            .eq('id', artifact.project_id);
        }
      }

      toast.success('Conteúdo atualizado');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro ao atualizar: ${err.message}`);
    }
  };

  // Structured line types for professional PDF rendering
  type PdfLine = { type: 'heading'; text: string } | { type: 'subheading'; text: string } | { type: 'body'; text: string } | { type: 'bullet'; text: string; level: number } | { type: 'keyvalue'; label: string; value: string } | { type: 'spacer' };

  const extractStructured = (value: any, depth = 0): PdfLine[] => {
    if (value === null || value === undefined) return [];
    if (typeof value === 'string') {
      const t = value.trim();
      return t ? [{ type: 'body', text: t }] : [];
    }
    if (typeof value === 'number' || typeof value === 'boolean') return [{ type: 'body', text: String(value) }];

    if (Array.isArray(value)) {
      const lines: PdfLine[] = [];
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          lines.push({ type: 'bullet', text: item.trim(), level: depth });
        } else if (typeof item === 'object' && item !== null) {
          lines.push(...extractStructured(item, depth + 1));
        }
      }
      return lines;
    }

    if (typeof value === 'object') {
      const lines: PdfLine[] = [];
      for (const [key, val] of Object.entries(value)) {
        const label = key.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        if (typeof val === 'string' && val.trim()) {
          // Short values as key-value, long values as heading + body
          if (val.length > 120) {
            lines.push({ type: depth === 0 ? 'heading' : 'subheading', text: label });
            lines.push({ type: 'body', text: val.trim() });
            lines.push({ type: 'spacer' });
          } else {
            lines.push({ type: 'keyvalue', label, value: val.trim() });
          }
        } else if (typeof val === 'number' || typeof val === 'boolean') {
          lines.push({ type: 'keyvalue', label, value: String(val) });
        } else if (Array.isArray(val)) {
          lines.push({ type: depth === 0 ? 'heading' : 'subheading', text: label });
          for (const item of val) {
            if (typeof item === 'string' && item.trim()) {
              lines.push({ type: 'bullet', text: item.trim(), level: depth });
            } else if (typeof item === 'object' && item !== null) {
              lines.push(...extractStructured(item, depth + 1));
            }
          }
          lines.push({ type: 'spacer' });
        } else if (typeof val === 'object' && val !== null) {
          lines.push({ type: depth === 0 ? 'heading' : 'subheading', text: label });
          lines.push(...extractStructured(val, depth + 1));
          lines.push({ type: 'spacer' });
        }
      }
      return lines;
    }
    return [];
  };

  // Legacy helper for summary extraction
  const extractText = (value: any): string[] => {
    return extractStructured(value).filter(l => l.type !== 'spacer').map(l => {
      if (l.type === 'keyvalue') return `${l.label}: ${l.value}`;
      if (l.type === 'bullet') return `- ${l.text}`;
      return l.text;
    });
  };

  // Extract a rich condensed summary: all key insights as key-value + top bullets (NO truncation)
  const extractCondensedLines = (conteudo: any): PdfLine[] => {
    if (!conteudo || typeof conteudo !== 'object') {
      if (typeof conteudo === 'string') return [{ type: 'body', text: conteudo }];
      return [];
    }
    const lines: PdfLine[] = [];
    for (const [key, val] of Object.entries(conteudo)) {
      const label = key.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (typeof val === 'string' && val.trim()) {
        lines.push({ type: 'keyvalue', label, value: val.trim() });
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        lines.push({ type: 'keyvalue', label, value: String(val) });
      } else if (Array.isArray(val)) {
        const items = val.filter(v => typeof v === 'string' && v.trim()).slice(0, 5);
        if (items.length > 0) {
          lines.push({ type: 'subheading', text: label });
          for (const item of items) {
            lines.push({ type: 'bullet', text: (item as string).trim(), level: 0 });
          }
          if (val.length > 5) lines.push({ type: 'body', text: `(+${val.length - 5} itens)` });
        } else {
          const objItems = val.filter(v => typeof v === 'object' && v !== null).slice(0, 3);
          if (objItems.length > 0) {
            lines.push({ type: 'subheading', text: label });
            for (const obj of objItems) {
              const firstEntries = Object.entries(obj).slice(0, 3);
              const summary = firstEntries.map(([k, v]) => `${k.replace(/[_-]/g, ' ')}: ${String(v)}`).join(' | ');
              lines.push({ type: 'bullet', text: summary, level: 0 });
            }
            if (val.length > 3) lines.push({ type: 'body', text: `(+${val.length - 3} itens)` });
          }
        }
      } else if (typeof val === 'object' && val !== null) {
        const subEntries = Object.entries(val).filter(([, v]) => typeof v === 'string' || typeof v === 'number');
        if (subEntries.length > 0) {
          lines.push({ type: 'subheading', text: label });
          for (const [sk, sv] of subEntries) {
            const sl = sk.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            lines.push({ type: 'keyvalue', label: sl, value: String(sv) });
          }
        }
      }
    }
    return lines;
  };

  // Strip emojis, normalize accents and unicode for PDF (jsPDF default font has limited Unicode support)
  const sanitizeForPDF = (str: string): string => {
    // Remove emojis
    let clean = str.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]|[\u{2700}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu, '');
    // Replace common unicode chars that jsPDF can't render
    clean = clean.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/—/g, '-').replace(/–/g, '-').replace(/…/g, '...').replace(/•/g, '-');
    // Normalize accented characters to ASCII for reliable jsPDF rendering
    const accentMap: Record<string, string> = {
      'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
      'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
      'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
      'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
      'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
      'ç': 'c', 'ñ': 'n',
      'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A',
      'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
      'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
      'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
      'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
      'Ç': 'C', 'Ñ': 'N',
      '™': '(TM)', '®': '(R)', '©': '(C)',
      '°': 'o', '²': '2', '³': '3',
    };
    clean = clean.replace(/[^\x00-\x7F]/g, ch => accentMap[ch] || '');
    return clean.trim();
  };
  const stripEmoji = sanitizeForPDF;

  const buildPDF = (arts: any[], mode: 'resumida' | 'completa', projectName: string) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mL = 22;
    const mR = 22;
    const cW = pageW - mL - mR;
    let y = 0;

    // Font sizes per mode
    const fs = mode === 'resumida'
      ? { title: 11, sub: 9, label: 8.5, body: 8.5, bullet: 8.5, small: 7.5 }
      : { title: 13, sub: 10.5, label: 10, body: 10, bullet: 9.5, small: 8 };
    const lineH = mode === 'resumida' ? 4 : 5;
    // Max content width for text wrapping to prevent cut-off
    const maxTextW = cW - 8;

    // Shared: render page header + footer
    const renderPageChrome = () => {
      // Top bar
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageW, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      const label = mode === 'resumida' ? 'RESUMO EXECUTIVO' : 'ESTRATEGIA COMPLETA';
      doc.text(label, pageW - mR, 11, { align: 'right' });
      doc.text(sanitizeForPDF(projectName).substring(0, 55), mL, 11);
      // Bottom: page number + line
      doc.setDrawColor(200, 200, 210);
      doc.line(mL, pageH - 16, pageW - mR, pageH - 16);
      doc.setTextColor(140, 140, 155);
      doc.setFontSize(7);
      doc.text(`Pagina ${doc.getNumberOfPages()}`, pageW / 2, pageH - 10, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y = 36;
    };

    const newPage = () => { doc.addPage(); renderPageChrome(); };
    const check = (n: number) => { if (y + n > pageH - 22) newPage(); };

    // Justify a single line of text within a given width
    const justifyLine = (text: string, x: number, maxW: number, fontSize: number) => {
      doc.setFontSize(fontSize);
      const textW = doc.getTextWidth(text);
      if (textW <= 0 || maxW <= 0) { doc.text(text, x, y); return; }
      // Only justify if text fills at least 70% of available width
      if (textW < maxW * 0.7 || text.split(' ').length < 3) {
        doc.text(text, x, y);
        return;
      }
      const words = text.split(' ');
      if (words.length <= 1) { doc.text(text, x, y); return; }
      const totalWordsW = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
      const totalSpacing = maxW - totalWordsW;
      const spacePerGap = totalSpacing / (words.length - 1);
      let cx = x;
      for (let i = 0; i < words.length; i++) {
        doc.text(words[i], cx, y);
        cx += doc.getTextWidth(words[i]) + spacePerGap;
      }
    };

    // Fixed label column width for key-value alignment
    const kvLabelCol = mode === 'resumida' ? 38 : 42;

    // Shared render for structured lines
    const renderLines = (lines: PdfLine[], agentColor: [number, number, number]) => {
      const [cr, cg, cb] = agentColor;
      for (const line of lines) {
        switch (line.type) {
          case 'heading': {
            check(lineH * 3);
            y += lineH;
            doc.setFontSize(fs.sub);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(line.text.toUpperCase(), mL + 2, y);
            y += 1.5;
            doc.setDrawColor(cr, cg, cb);
            doc.setLineWidth(0.6);
            const tw = Math.min(doc.getTextWidth(line.text.toUpperCase()), cW * 0.4);
            doc.line(mL + 2, y, mL + 2 + tw, y);
            doc.setLineWidth(0.2);
            y += lineH;
            doc.setFont('helvetica', 'normal');
            break;
          }
          case 'subheading': {
            check(lineH * 2);
            y += lineH * 0.8;
            doc.setFontSize(fs.sub);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(50, 55, 75);
            doc.text(line.text, mL + 4, y);
            y += lineH;
            doc.setFont('helvetica', 'normal');
            break;
          }
          case 'keyvalue': {
            check(lineH + 2);
            // Render label with fixed-width column for alignment
            doc.setFontSize(fs.label);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(45, 50, 65);
            const lbl = line.label + ':';
            // Compute dynamic label width but ensure minimum alignment
            const actualLblW = doc.getTextWidth(lbl + '  ');
            const useLblW = Math.max(actualLblW, kvLabelCol);
            doc.text(lbl, mL + 6, y);
            // Value starts at fixed offset for alignment
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(65, 65, 80);
            const valX = mL + 6 + useLblW;
            const valSpace = pageW - mR - valX - 2;
            if (valSpace > 30) {
              const wrapped = doc.splitTextToSize(line.value, valSpace);
              for (let w = 0; w < wrapped.length; w++) {
                if (w > 0) { y += lineH; check(lineH); }
                justifyLine(wrapped[w], valX, valSpace, fs.label);
              }
            } else {
              // Fallback: value on next line, full width
              y += lineH;
              const wrapped = doc.splitTextToSize(line.value, maxTextW - 6);
              for (const wl of wrapped) {
                check(lineH);
                justifyLine(wl, mL + 10, maxTextW - 10, fs.label);
                y += lineH;
              }
              y -= lineH;
            }
            y += lineH;
            break;
          }
          case 'bullet': {
            check(lineH + 1);
            const indent = 6 + (line.level * 6);
            doc.setFontSize(fs.bullet);
            doc.setTextColor(65, 65, 80);
            doc.setFillColor(cr, cg, cb);
            doc.circle(mL + indent + 1.2, y - 1, 0.9, 'F');
            const bX = mL + indent + 4.5;
            const bW = pageW - mR - bX - 2;
            const wrapped = doc.splitTextToSize(line.text, bW);
            for (let wi = 0; wi < wrapped.length; wi++) {
              check(lineH);
              justifyLine(wrapped[wi], bX, bW, fs.bullet);
              y += lineH;
            }
            break;
          }
          case 'body': {
            check(lineH + 1);
            doc.setFontSize(fs.body);
            doc.setTextColor(55, 55, 70);
            doc.setFont('helvetica', 'normal');
            const bX = mL + 3;
            const bW = pageW - mR - bX - 2;
            const wrapped = doc.splitTextToSize(line.text, bW);
            for (let wi = 0; wi < wrapped.length; wi++) {
              check(lineH);
              // Don't justify last line of a paragraph
              if (wi < wrapped.length - 1) {
                justifyLine(wrapped[wi], bX, bW, fs.body);
              } else {
                doc.text(wrapped[wi], bX, y);
              }
              y += lineH;
            }
            y += 1;
            break;
          }
          case 'spacer': {
            y += lineH * 0.6;
            break;
          }
        }
      }
    };

    // === COVER PAGE ===
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, pageH, 'F');
    // Accent line
    doc.setFillColor(99, 102, 241);
    doc.rect(mL, 85, 50, 3, 'F');
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('Estrategia de', mL, 108);
    doc.setFontSize(30);
    doc.text('Marketing Digital', mL, 124);
    doc.setFont('helvetica', 'normal');
    // Project name
    doc.setFontSize(12);
    doc.setTextColor(190, 195, 215);
    const pLines = doc.splitTextToSize(stripEmoji(projectName), cW);
    doc.text(pLines, mL, 145);
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(150, 155, 175);
    doc.text(mode === 'resumida' ? 'Versao Resumida' : 'Versao Completa', mL, 170);
    doc.text(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }), mL, 180);
    doc.setFontSize(8);
    doc.setTextColor(120, 125, 145);
    doc.text(`${arts.length} secoes geradas por IA`, mL, pageH - 25);

    // === TABLE OF CONTENTS (complete only) ===
    if (mode === 'completa') {
      newPage();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Sumario', mL, y);
      y += 10;
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.8);
      doc.line(mL, y, mL + 30, y);
      doc.setLineWidth(0.2);
      y += 8;
      doc.setFont('helvetica', 'normal');
      for (let i = 0; i < arts.length; i++) {
        const inf = agentInfo[arts[i].tipo];
        // Always use agent name, not artifact titulo
        const t = stripEmoji(inf?.name || arts[i].tipo);
        doc.setFontSize(10);
        doc.setTextColor(55, 55, 70);
        doc.text(`${i + 1}.  ${t}`, mL + 4, y);
        const tw = doc.getTextWidth(`${i + 1}.  ${t}`);
        doc.setTextColor(180, 180, 190);
        const dotsStart = mL + 4 + tw + 3;
        const dotsEnd = pageW - mR - 15;
        if (dotsEnd > dotsStart) {
          const dots = '.'.repeat(Math.floor((dotsEnd - dotsStart) / 1.8));
          doc.setFontSize(7);
          doc.text(dots, dotsStart, y);
        }
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.text(`${i + 3}`, pageW - mR - 8, y, { align: 'right' });
        y += 7;
      }
    }

    // === CONTENT ===
    if (mode === 'resumida') newPage();

    for (let i = 0; i < arts.length; i++) {
      if (mode === 'completa') newPage();

      const art = arts[i];
      const info = agentInfo[art.tipo];
      // Always use agent name for consistent naming
      const title = stripEmoji(info?.name || art.tipo);
      const color = info?.color || '#6366F1';
      const cr = parseInt(color.slice(1, 3), 16);
      const cg = parseInt(color.slice(3, 5), 16);
      const cb = parseInt(color.slice(5, 7), 16);

      // Get agent mission/summary for the PDF
      const agentCard = AGENT_CARDS[art.tipo];
      const agentMission = agentCard?.mission || '';
      const agentRole = agentCard?.role || info?.description || '';

      if (mode === 'resumida') {
        // --- COMPACT SECTION ---
        check(22);
        // Color bar + number + title
        doc.setFillColor(cr, cg, cb);
        doc.rect(mL, y - 2, 3, 9, 'F');
        doc.setFontSize(fs.title);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`${i + 1}. ${title}`, mL + 7, y + 4);
        doc.setFont('helvetica', 'normal');
        y += 12;

        // Agent summary (compact)
        if (agentMission) {
          doc.setFontSize(fs.small);
          doc.setTextColor(100, 105, 125);
          doc.setFont('helvetica', 'italic');
          const missionLines = doc.splitTextToSize(sanitizeForPDF(agentMission), cW - 14);
          for (const ml of missionLines) {
            check(lineH);
            doc.text(ml, mL + 7, y);
            y += lineH;
          }
          doc.setFont('helvetica', 'normal');
          y += 2;
        }

        const condensed = extractCondensedLines(art.conteudo).map(l => {
          if (l.type === 'keyvalue') return { ...l, label: sanitizeForPDF(l.label), value: sanitizeForPDF(l.value) };
          if (l.type === 'spacer') return l;
          return { ...l, text: sanitizeForPDF((l as any).text) };
        }) as PdfLine[];

        if (condensed.length === 0) {
          doc.setFontSize(fs.small);
          doc.setTextColor(150, 150, 160);
          doc.setFont('helvetica', 'italic');
          doc.text('Conteudo pendente', mL + 7, y);
          doc.setFont('helvetica', 'normal');
          y += lineH;
        } else {
          renderLines(condensed, [cr, cg, cb]);
        }

        // Separator
        y += 2;
        doc.setDrawColor(215, 218, 225);
        doc.line(mL + 7, y, pageW - mR, y);
        y += 5;

      } else {
        // --- FULL SECTION ---
        // Section header bar
        doc.setFillColor(cr, cg, cb);
        doc.roundedRect(mL, y - 4, cW, 18, 2, 2, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${i + 1}. ${title}`, mL + 8, y + 7);
        doc.setFont('helvetica', 'normal');
        y += 22;

        // Agent mission summary
        if (agentMission) {
          doc.setFontSize(9);
          doc.setTextColor(80, 85, 105);
          doc.setFont('helvetica', 'italic');
          const missionWrapped = doc.splitTextToSize(sanitizeForPDF(agentMission), cW - 4);
          for (const ml of missionWrapped) {
            check(lineH);
            doc.text(ml, mL + 2, y);
            y += lineH;
          }
          doc.setFont('helvetica', 'normal');
          y += 2;
        }

        // Agent role description
        if (agentRole) {
          doc.setFontSize(8);
          doc.setTextColor(120, 125, 145);
          doc.setFont('helvetica', 'normal');
          const roleWrapped = doc.splitTextToSize(sanitizeForPDF(agentRole), cW - 4);
          for (const rl of roleWrapped) {
            check(lineH);
            doc.text(rl, mL + 2, y);
            y += lineH;
          }
          y += 3;
        }

        const structured = extractStructured(art.conteudo).map(l => {
          if (l.type === 'keyvalue') return { ...l, label: sanitizeForPDF(l.label), value: sanitizeForPDF(l.value) };
          if (l.type === 'spacer') return l;
          return { ...l, text: sanitizeForPDF((l as any).text) };
        }) as PdfLine[];

        if (structured.length === 0) {
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 160);
          doc.setFont('helvetica', 'italic');
          doc.text('Conteudo pendente', mL + 2, y);
          doc.setFont('helvetica', 'normal');
          y += lineH;
        } else {
          renderLines(structured, [cr, cg, cb]);
        }
      }
    }

    return doc;
  };

  const exportPDF = async (pid: string, mode: 'resumida' | 'completa' = 'completa') => {
    try {
      const { data: arts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', pid)
        .order('created_at');

      if (!arts?.length) { toast.error('Nenhum artefato para exportar'); return; }

      // Get project name
      const { data: proj } = await supabase
        .from('strategy_projects')
        .select('nome, descricao_negocio')
        .eq('id', pid)
        .single();

      const projectName = proj?.nome || 'Projeto de Marketing';
      const doc = buildPDF(arts, mode, projectName);
      const suffix = mode === 'resumida' ? '-resumo' : '-completa';
      doc.save(`estrategia-marketing${suffix}.pdf`);
      toast.success(`PDF ${mode === 'resumida' ? 'resumido' : 'completo'} exportado!`);
    } catch (err: any) {
      toast.error(`Erro ao exportar PDF: ${err.message}`);
    }
  };

  const exportMarkdown = async (pid: string) => {
    try {
      const { data: arts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', pid)
        .order('created_at');

      if (!arts?.length) { toast.error('Nenhum artefato'); return; }

      let md = '# Estratégia de Marketing\n\n';
      for (const art of arts) {
        md += `## ${art.titulo}\n\n`;
        md += '```json\n' + JSON.stringify(art.conteudo, null, 2) + '\n```\n\n';
      }

      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'estrategia-marketing.md';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Markdown exportado!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const exportJSON = async (pid: string) => {
    try {
      const { data: arts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', pid)
        .order('created_at');

      if (!arts?.length) { toast.error('Nenhum artefato'); return; }

      const exportData = arts.reduce((acc: any, art: any) => {
        acc[art.tipo] = art.conteudo;
        return acc;
      }, {});

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'estrategia-marketing.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON exportado!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const exportSinglePDF = async (pid: string, artifactType: string) => {
    try {
      const { data: arts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', pid)
        .eq('tipo', artifactType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!arts?.length) { toast.error('Nenhum artefato encontrado'); return; }

      const { data: proj } = await supabase
        .from('strategy_projects')
        .select('nome')
        .eq('id', pid)
        .single();

      const projectName = proj?.nome || 'Projeto';
      const doc = buildPDF(arts, 'completa', projectName);
      const agentName = agentInfo[artifactType]?.name || artifactType;
      doc.save(`${agentName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success(`PDF de "${agentName}" exportado!`);
    } catch (err: any) {
      toast.error(`Erro ao exportar: ${err.message}`);
    }
  };

  const feedbackArtifact = async (artifactId: string, feedback: 'positive' | 'negative') => {
    try {
      const metadata = { feedback, timestamp: new Date().toISOString() };
      await supabase
        .from('strategy_artifacts')
        .update({ status: feedback === 'positive' ? 'approved' : 'needs_revision' } as any)
        .eq('id', artifactId);
      toast.success(feedback === 'positive' ? '👍 Feedback positivo registrado!' : '👎 Marcado para melhoria');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const deleteArtifact = async (artifactId: string) => {
    try {
      await supabase
        .from('strategy_artifacts')
        .delete()
        .eq('id', artifactId);
      toast.success('Artefato excluído');
      onRefetch();
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`);
    }
  };

  return {
    executeAgent,
    executeAllAgents,
    runPipeline,
    sendChatMessage,
    validateArtifact,
    approveArtifact,
    rejectArtifact,
    reviseArtifact,
    updateArtifactContent,
    exportPDF,
    exportSinglePDF,
    exportMarkdown,
    exportJSON,
    feedbackArtifact,
    deleteArtifact,
    runningAgents,
    isPipelineRunning,
    chatLoading
  };
}
