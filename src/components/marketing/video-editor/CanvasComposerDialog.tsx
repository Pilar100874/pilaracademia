import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, Palette, Home, LayoutTemplate, Image, Type, Shapes, Sticker, Sparkles, Layers, BookText, QrCode } from 'lucide-react';
import { CanvasProvider, useCanvas } from '@/contexts/CanvasContext';
import CanvasWorkspace from '@/components/canvas/CanvasWorkspace';
import { FloatingObjectToolbar } from '@/components/editor/FloatingObjectToolbar';
import { ObjectActionsMenu } from '@/components/editor/ObjectActionsMenu';
import ProjectsPanel from '@/components/editor/panels/ProjectsPanel';
import ImagesPanel from '@/components/editor/panels/ImagesPanel';
import TextPanel from '@/components/editor/panels/TextPanel';
import ShapesPanel from '@/components/editor/panels/ShapesPanel';
import ElementsPanel from '@/components/editor/panels/ElementsPanel';
import AIPanel from '@/components/editor/panels/AIPanel';
import TemplatesPanel from '@/components/editor/panels/TemplatesPanel';
import TextTemplatesPanel from '@/components/editor/panels/TextTemplatesPanel';
import FontPanel from '@/components/editor/panels/FontPanel';
import ColorPanel from '@/components/editor/panels/ColorPanel';
import ImageEffectsPanel from '@/components/editor/panels/ImageEffectsPanel';
import LayersPanel from '@/components/editor/LayersPanel';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import BarcodePanel from '@/components/editor/panels/BarcodePanel';
import { toast } from '@/lib/toast-config';

interface CanvasComposerDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (imageDataUrl: string, canvasJson: string) => void;
  initialCanvasJson?: string;
}

// Inline sidebar to avoid DesktopSidebar's `fixed` positioning issues inside dialog
const InlineSidebar: React.FC<{ activePanel: string; onPanelChange: (panel: string) => void }> = ({ activePanel, onPanelChange }) => {
  const tools = [
    { id: 'design', icon: Home, label: 'Início' },
    { id: 'templates', icon: LayoutTemplate, label: 'Modelos' },
    { id: 'text-templates', icon: BookText, label: 'Modelos de Texto' },
    { id: 'images', icon: Image, label: 'Imagens' },
    { id: 'text', icon: Type, label: 'Texto' },
    { id: 'shapes', icon: Shapes, label: 'Formas' },
    { id: 'elements', icon: Sticker, label: 'Elementos' },
    { id: 'barcode', icon: QrCode, label: 'Códigos' },
    { id: 'ai', icon: Sparkles, label: 'IA' },
    { id: 'layers', icon: Layers, label: 'Camadas' },
  ];

  return (
    <div className="w-16 bg-card border-r flex flex-col items-center py-4 gap-1.5 shrink-0 overflow-y-auto">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activePanel === tool.id;
        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`w-11 h-11 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                    : 'hover:bg-accent text-muted-foreground hover:scale-105'
                }`}
                onClick={() => onPanelChange(tool.id)}
              >
                <Icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="z-[9999]">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

const CanvasComposerInner: React.FC<{
  onClose: () => void;
  onConfirm: (imageDataUrl: string, canvasJson: string) => void;
  initialCanvasJson?: string;
}> = ({ onClose, onConfirm, initialCanvasJson }) => {
  const { fabricCanvas } = useCanvas();
  const [activePanel, setActivePanel] = useState('images');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [userSelectedPanel, setUserSelectedPanel] = useState(true);
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);
  

  // Listen to canvas selection
  useEffect(() => {
    if (!fabricCanvas) return;
    const handleSelection = () => {
      const active = fabricCanvas.getActiveObject();
      const objType = active ? (active as any).type : null;
      setSelectedObjectType(objType);
      if (objType && !userSelectedPanel) setIsPanelOpen(true);
    };
    const handleCleared = () => setSelectedObjectType(null);

    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', handleCleared);
    return () => {
      fabricCanvas.off('selection:created', handleSelection);
      fabricCanvas.off('selection:updated', handleSelection);
      fabricCanvas.off('selection:cleared', handleCleared);
    };
  }, [fabricCanvas, userSelectedPanel]);

  // Load initial canvas JSON if re-editing
  useEffect(() => {
    if (!fabricCanvas || !initialCanvasJson) return;
    // Use a small delay to ensure canvas is fully initialized
    const timer = setTimeout(() => {
      try {
        const json = JSON.parse(initialCanvasJson);
        fabricCanvas.loadFromJSON(json).then(() => {
          fabricCanvas.renderAll();
          console.log('Canvas loaded from JSON:', fabricCanvas.getObjects().length, 'objects');
        });
      } catch (e) {
        console.error('Erro ao carregar canvas:', e);
      }
    }, 100);
    return () => clearTimeout(timer);
    // Only run once when fabricCanvas becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvas]);

  const handleConfirm = useCallback(async () => {
    // Try context canvas first, then window fallback
    const canvas = fabricCanvas || (window as any).fabricCanvas;
    if (!canvas) {
      toast.error('Canvas não está pronto. Tente novamente.');
      return;
    }

    const objects = canvas.getObjects();
    if (!objects || objects.length === 0) {
      toast.error('Canvas está vazio. Adicione elementos antes de usar.');
      return;
    }

    try {
      // Deselect all to avoid selection handles in export
      canvas.discardActiveObject();
      
      // Temporarily set transparent background for video compositing
      const originalBg = canvas.backgroundColor;
      canvas.backgroundColor = 'transparent';
      canvas.renderAll();

      // Small delay to ensure render is complete
      await new Promise(r => setTimeout(r, 200));

      // Calculate bounding box of all objects to crop tightly
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      objects.forEach((obj: any) => {
        const bound = obj.getBoundingRect();
        if (bound.left < minX) minX = bound.left;
        if (bound.top < minY) minY = bound.top;
        if (bound.left + bound.width > maxX) maxX = bound.left + bound.width;
        if (bound.top + bound.height > maxY) maxY = bound.top + bound.height;
      });

      // Add a small padding (4px)
      const pad = 4;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(canvas.width || 1920, maxX + pad);
      maxY = Math.min(canvas.height || 1080, maxY + pad);

      const cropW = maxX - minX;
      const cropH = maxY - minY;

      // Export only the cropped region
      const multiplier = 2;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropW * multiplier;
      tempCanvas.height = cropH * multiplier;
      const tempCtx = tempCanvas.getContext('2d');

      // Render full canvas to an offscreen element first
      const fullDataUrl = canvas.toDataURL({ format: 'png', multiplier });
      
      // Restore original background
      canvas.backgroundColor = originalBg;
      canvas.renderAll();

      const json = JSON.stringify(canvas.toJSON());

      // Load full image then crop
      const fullImg = new window.Image();
      fullImg.onload = () => {
        if (tempCtx) {
          tempCtx.drawImage(
            fullImg,
            minX * multiplier, minY * multiplier,
            cropW * multiplier, cropH * multiplier,
            0, 0,
            cropW * multiplier, cropH * multiplier
          );
        }
        const croppedDataUrl = tempCanvas.toDataURL('image/png');

        if (!croppedDataUrl || croppedDataUrl.length < 200) {
          toast.error('Falha ao exportar canvas. Tente novamente.');
          return;
        }

        console.log('Canvas exported (cropped):', { objectCount: objects.length, crop: { minX, minY, cropW, cropH }, dataUrlLength: croppedDataUrl.length });
        onConfirm(croppedDataUrl, json);
      };
      fullImg.onerror = () => {
        // Fallback: use full image
        onConfirm(fullDataUrl, json);
      };
      fullImg.src = fullDataUrl;
    } catch (e) {
      console.error('Erro ao exportar canvas:', e);
      toast.error('Erro ao exportar o canvas');
    }
  }, [fabricCanvas, onConfirm]);

  const handlePanelChange = (panel: string) => {
    if (panel === activePanel && isPanelOpen && userSelectedPanel) {
      setIsPanelOpen(false);
      setUserSelectedPanel(false);
    } else {
      setActivePanel(panel);
      setIsPanelOpen(true);
      setUserSelectedPanel(true);
    }
  };

  const renderPanel = () => {
    if (userSelectedPanel) {
      switch (activePanel) {
        case 'design': return <ProjectsPanel />;
        case 'templates': return <TemplatesPanel />;
        case 'text-templates': return <TextTemplatesPanel />;
        case 'images': return <ImagesPanel />;
        case 'text': return <TextPanel />;
        case 'shapes': return <ShapesPanel />;
        case 'elements': return <ElementsPanel />;
        case 'barcode': return <BarcodePanel />;
        case 'ai': return <AIPanel />;
        case 'layers': return <LayersPanel />;
        case 'properties': return <PropertiesPanel />;
        case 'fonts': return <FontPanel />;
        case 'colors': return <ColorPanel />;
        case 'effects': return <ImageEffectsPanel />;
        default: return <ProjectsPanel />;
      }
    }

    if (selectedObjectType === 'textbox' || selectedObjectType === 'text' || selectedObjectType === 'i-text') {
      return <FontPanel />;
    }
    if (selectedObjectType === 'image') {
      return activePanel === 'effects' ? <ImageEffectsPanel /> : <PropertiesPanel />;
    }
    if (selectedObjectType) {
      return <ColorPanel />;
    }

    switch (activePanel) {
      case 'design': return <ProjectsPanel />;
      case 'templates': return <TemplatesPanel />;
      case 'text-templates': return <TextTemplatesPanel />;
      case 'images': return <ImagesPanel />;
      case 'text': return <TextPanel />;
      case 'shapes': return <ShapesPanel />;
      case 'elements': return <ElementsPanel />;
      case 'barcode': return <BarcodePanel />;
      case 'ai': return <AIPanel />;
      case 'layers': return <LayersPanel />;
      case 'properties': return <PropertiesPanel />;
      default: return <ImagesPanel />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          Criar Composição para Vídeo
        </h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} className="gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} className="gap-1.5 text-xs">
            <Check className="h-3.5 w-3.5" /> Usar no Vídeo
          </Button>
        </div>
      </div>

      {/* Canvas area with full tooling */}
      <div className="flex-1 flex overflow-hidden">
        {/* Inline sidebar (not fixed) */}
        <InlineSidebar activePanel={activePanel} onPanelChange={handlePanelChange} />

        {/* Panel content */}
        {isPanelOpen && (
          <div className="w-72 border-r bg-card overflow-y-auto shrink-0">
            {renderPanel()}
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-muted/30" data-canvas-area>
          <CanvasWorkspace selectedSize="medio" />
          <FloatingObjectToolbar />
          <ObjectActionsMenu />
        </div>
      </div>
    </div>
  );
};

const CanvasComposerDialog: React.FC<CanvasComposerDialogProps> = ({
  open,
  onClose,
  onConfirm,
  initialCanvasJson,
}) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden [&>button]:hidden" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Criar Composição Canvas</DialogTitle>
        </VisuallyHidden>
        {open && (
          <CanvasProvider>
            <CanvasComposerInner
              onClose={onClose}
              onConfirm={onConfirm}
              initialCanvasJson={initialCanvasJson}
            />
          </CanvasProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CanvasComposerDialog;
