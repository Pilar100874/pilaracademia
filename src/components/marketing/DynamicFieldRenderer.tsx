import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResourceField } from './types';
import { Upload, Image as ImageIcon, Music, Check, Link, Search, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DynamicFieldRendererProps {
  field: ResourceField;
  value: any;
  onChange: (value: any) => void;
}

interface Produto {
  id: string;
  nome: string;
  foto_url?: string | null;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  field,
  value,
  onChange,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageSelectionMode, setImageSelectionMode] = useState<'options' | 'upload' | 'url'>('options');
  const [imageUrl, setImageUrl] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchProduto, setSearchProduto] = useState('');
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  useEffect(() => {
    if (field.type === 'product_name' || field.type === 'product_image') {
      loadProdutos();
    }
  }, [field.type]);

  const loadProdutos = async () => {
    setLoadingProdutos(true);
    try {
      const { data } = await supabase
        .from('produtos')
        .select('id, nome, foto_url')
        .limit(50);
      
      if (data) {
        setProdutos(data as Produto[]);
      }
    } catch (error) {
      console.error('Error loading produtos:', error);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onChange({ type: 'file', file, previewUrl: url });
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (url) {
      setPreviewUrl(url);
      onChange({ type: 'url', url });
    }
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomImagePreview(url);
      onChange({ type: 'file', file, previewUrl: url });
    }
  };

  const handleCustomImageUrlChange = (url: string) => {
    setCustomImageUrl(url);
    if (url) {
      setCustomImagePreview(url);
      onChange({ type: 'url', url });
    }
  };

  const handleSelectProduto = (produto: Produto) => {
    setSelectedProduto(produto);
    if (field.type === 'product_name') {
      onChange({ productId: produto.id, productName: produto.nome, value: produto.nome });
    }
  };

  const handleSelectProdutoImage = (produto: Produto, imageUrl: string) => {
    setSelectedProduto(produto);
    onChange({ productId: produto.id, productName: produto.nome, imageUrl, value: imageUrl });
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchProduto.toLowerCase())
  );

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={value || false}
              onCheckedChange={onChange}
            />
            <span className="text-sm text-muted-foreground">
              {field.placeholder || 'Ativar'}
            </span>
          </div>
        );

      case 'radio_selection':
        return (
          <ScrollArea className="max-h-64 border rounded-lg">
            <div className="p-2 space-y-1">
              {field.options?.map((option) => {
                const isSelected = value === option.value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-primary'
                        : 'border-muted-foreground/40'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm flex-1">{option.label}</span>
                  </button>
                );
              })}
              {(!field.options || field.options.length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Nenhuma opção configurada
                </p>
              )}
            </div>
          </ScrollArea>
        );

      case 'selection_image':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {field.options?.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.imageUrl || option.value)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                  value === (option.imageUrl || option.value)
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {option.imageUrl ? (
                  <img
                    src={option.imageUrl}
                    alt={option.label}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <span className="text-xs text-white font-medium">{option.label}</span>
                </div>
                {value === (option.imageUrl || option.value) && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        );
      case 'media_image':
        return (
          <div className="space-y-4">
            <Tabs value={imageInputMode} onValueChange={(v) => setImageInputMode(v as 'upload' | 'url')}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Link className="h-3.5 w-3.5" />
                  URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="relative"
                      asChild
                    >
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Escolher Arquivo
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </Button>
                    {value?.type === 'file' && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Arquivo selecionado
                      </span>
                    )}
                  </div>
                  {previewUrl && (
                    <div className="relative w-40 h-40 rounded-lg overflow-hidden border bg-muted">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="mt-3">
                <div className="space-y-3">
                  <Input
                    value={imageUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  {previewUrl && (
                    <div className="relative w-40 h-40 rounded-lg overflow-hidden border bg-muted">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        );

      case 'media_audio':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="relative"
                asChild
              >
                <label>
                  <Music className="h-4 w-4 mr-2" />
                  Upload Áudio
                  <input
                    type="file"
                    accept="audio/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
              {value && <span className="text-sm text-muted-foreground">Arquivo selecionado</span>}
            </div>
            {previewUrl && (
              <audio controls src={previewUrl} className="w-full" />
            )}
          </div>
        );

      case 'media_video':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="relative"
                asChild
              >
                <label>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Upload Vídeo
                  <input
                    type="file"
                    accept="video/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
              {value && <span className="text-sm text-muted-foreground">Arquivo selecionado</span>}
            </div>
            {previewUrl && (
              <video controls src={previewUrl} className="w-full max-w-md rounded-lg" />
            )}
          </div>
        );

      case 'selection_audio':
        return (
          <ScrollArea className="max-h-64 border rounded-lg">
            <div className="p-2 space-y-2">
              {field.options?.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange(option.audioUrl || option.value)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    value === (option.audioUrl || option.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-medium text-sm block mb-1">{option.label}</span>
                      {option.audioUrl && (
                        <audio controls className="w-full h-8" onClick={(e) => e.stopPropagation()}>
                          <source src={option.audioUrl} />
                        </audio>
                      )}
                    </div>
                    {value === (option.audioUrl || option.value) && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        );

      case 'selection_video':
        return (
          <ScrollArea className="max-h-80 border rounded-lg">
            <div className="p-2 space-y-3">
              {field.options?.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange(option.videoUrl || option.value)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    value === (option.videoUrl || option.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-sm">{option.label}</span>
                    {value === (option.videoUrl || option.value) && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                  {option.videoUrl && (
                    <video 
                      controls 
                      className="w-full max-h-32 rounded-lg" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <source src={option.videoUrl} />
                    </video>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        );
        
      case 'selection_text':
        return (
          <Select value={value || ""} onValueChange={(val) => onChange(val)}>
            <SelectTrigger 
              className="w-full" 
              onPointerDown={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent 
              className="bg-background border shadow-lg max-h-60"
              style={{ zIndex: 999999 }}
              position="popper"
              sideOffset={4}
            >
              {field.options?.map((option) => {
                const optionValue = option.value || option.label || option.id;
                return (
                  <SelectItem key={option.id} value={optionValue}>
                    {option.label}
                  </SelectItem>
                );
              })}
              {(!field.options || field.options.length === 0) && (
                <div className="text-center text-sm text-muted-foreground py-4 px-2">
                  Nenhuma opção configurada
                </div>
              )}
            </SelectContent>
          </Select>
        );

      case 'selection_text_image':
        return (
          <ScrollArea className="max-h-80 border rounded-lg">
            <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {field.options?.map((option) => {
                const isSelected = value === option.value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`relative flex flex-col items-center p-2 rounded-lg text-center transition-all ${
                      isSelected
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'hover:bg-muted border border-border'
                    }`}
                  >
                    {option.imageUrl ? (
                      <div className="w-full aspect-square rounded-lg overflow-hidden mb-2">
                        <img 
                          src={option.imageUrl} 
                          alt={option.label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center mb-2">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-xs font-medium line-clamp-2">{option.label}</span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
              {(!field.options || field.options.length === 0) && (
                <p className="col-span-full text-center text-sm text-muted-foreground py-4">
                  Nenhuma opção configurada
                </p>
              )}
            </div>
          </ScrollArea>
        );

      case 'product_name':
        return (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchProduto}
                onChange={(e) => setSearchProduto(e.target.value)}
                placeholder="Buscar produto..."
                className="pl-9"
              />
            </div>

            {loadingProdutos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredProdutos.map((produto) => (
                    <button
                      key={produto.id}
                      type="button"
                      onClick={() => handleSelectProduto(produto)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all ${
                        value?.productId === produto.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{produto.nome}</span>
                      {value?.productId === produto.id && (
                        <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                  {filteredProdutos.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Nenhum produto encontrado
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}

          </div>
        );

      case 'product_image':
        return (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchProduto}
                onChange={(e) => setSearchProduto(e.target.value)}
                placeholder="Buscar produto..."
                className="pl-9"
              />
            </div>

            {loadingProdutos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2 space-y-3">
                  {filteredProdutos.map((produto) => (
                    <div key={produto.id} className="space-y-2">
                      <div className="flex items-center gap-2 px-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{produto.nome}</span>
                      </div>
                      
                      {produto.foto_url ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 px-2">
                          <button
                            type="button"
                            onClick={() => handleSelectProdutoImage(produto, produto.foto_url!)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                              value?.imageUrl === produto.foto_url
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <img
                              src={produto.foto_url}
                              alt={produto.nome}
                              className="w-full h-full object-cover"
                            />
                            {value?.imageUrl === produto.foto_url && (
                              <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground px-2">
                          Sem imagem disponível
                        </p>
                      )}
                    </div>
                  ))}
                  {filteredProdutos.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Nenhum produto encontrado
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}

          </div>
        );

      default:
        return <Input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      {renderField()}
      {field.placeholder && (
        <p className="text-xs text-muted-foreground">
          {field.placeholder}
        </p>
      )}
    </div>
  );
};
