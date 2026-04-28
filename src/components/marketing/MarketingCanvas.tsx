import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Brush, Eraser, Download, Trash2, Type, Palette } from 'lucide-react';
import { toast } from 'sonner';

type Tool = 'brush' | 'eraser' | 'text';

const COLORS = ['#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

const MarketingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(4);
  const [textInput, setTextInput] = useState('');
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    if (tool === 'text' && textInput) {
      ctx.fillStyle = color;
      ctx.font = `${size * 6}px sans-serif`;
      ctx.fillText(textInput, x, y);
      return;
    }
    setDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? size * 4 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-${Date.now()}.png`;
    a.click();
    toast.success('Imagem baixada!');
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <Button size="sm" variant={tool === 'brush' ? 'default' : 'outline'} onClick={() => setTool('brush')}><Brush className="h-4 w-4" /></Button>
          <Button size="sm" variant={tool === 'eraser' ? 'default' : 'outline'} onClick={() => setTool('eraser')}><Eraser className="h-4 w-4" /></Button>
          <Button size="sm" variant={tool === 'text' ? 'default' : 'outline'} onClick={() => setTool('text')}><Type className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-1"><Palette className="h-4 w-4" />
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-primary' : 'border-border'}`}
              style={{ background: c }} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Tamanho</Label>
          <input type="range" min={1} max={30} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          <span className="text-xs w-6">{size}</span>
        </div>
        {tool === 'text' && <Input value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Texto" className="w-40" />}
        <div className="flex gap-1 ml-auto">
          <Button size="sm" variant="outline" onClick={clear}><Trash2 className="h-4 w-4 mr-1" />Limpar</Button>
          <Button size="sm" onClick={download}><Download className="h-4 w-4 mr-1" />Baixar</Button>
        </div>
      </Card>

      <div className="border rounded-md overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={1080}
          height={720}
          className="w-full h-auto cursor-crosshair touch-none"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
      </div>
    </div>
  );
};

export default MarketingCanvas;
