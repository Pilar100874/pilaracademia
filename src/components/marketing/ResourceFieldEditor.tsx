import React, { useMemo, useState } from 'react';
import { Plus, Trash2, GripVertical, Upload, Image as ImageIcon, Music, FileText, Video, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceField, FieldType, FIELD_TYPE_LABELS, FieldOption } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResourceFieldEditorProps {
  field: ResourceField;
  allFields: ResourceField[];
  onChange: (field: ResourceField) => void;
  onRemove: () => void;
}

export const ResourceFieldEditor: React.FC<ResourceFieldEditorProps> = ({
  field,
  allFields,
  onChange,
  onRemove,
}) => {
  const needsOptions = ['radio_selection', 'selection_image', 'selection_audio', 'selection_video', 'selection_text', 'selection_text_image'].includes(field.type);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Check if field name is empty
  const isEmptyName = !field.name.trim();

  // Check if field name has spaces
  const hasSpaces = /\s/.test(field.name);

  // Check if field name has special characters (only allow letters, numbers and underscore)
  const hasSpecialChars = /[^a-zA-Z0-9_]/.test(field.name);

  // Check if field name is duplicate
  const isDuplicateName = useMemo(() => {
    if (isEmptyName) return false;
    return allFields.some(
      (f) => f.id !== field.id && f.name.trim().toLowerCase() === field.name.trim().toLowerCase()
    );
  }, [field.name, field.id, allFields, isEmptyName]);

  const hasNameError = isEmptyName || isDuplicateName || hasSpaces || hasSpecialChars;

  // Sanitize field name on change - remove spaces and special chars
  const handleNameChange = (value: string) => {
    // Replace spaces with underscores and remove special chars
    const sanitized = value.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    onChange({ ...field, name: sanitized });
  };

  const handleAddOption = () => {
    const newOption: FieldOption = {
      id: crypto.randomUUID(),
      label: '',
      value: '',
    };
    onChange({
      ...field,
      options: [...(field.options || []), newOption],
    });
  };

  const handleUpdateOption = (index: number, updates: Partial<FieldOption>) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = { ...newOptions[index], ...updates };
    onChange({ ...field, options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = (field.options || []).filter((_, i) => i !== index);
    onChange({ ...field, options: newOptions });
  };

  const handleFileUpload = async (index: number, file: File, type: 'image' | 'audio' | 'video') => {
    setUploadingIndex(index);
    
    try {
      // Get user's estabelecimento_id
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();

      if (!usuarioData?.estabelecimento_id) {
        toast.error('Estabelecimento não encontrado');
        return;
      }

      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${usuarioData.estabelecimento_id}/marketing/${fileName}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('marketing-assets')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload do arquivo');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('marketing-assets')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update option with permanent URL
      if (type === 'image') {
        handleUpdateOption(index, { imageUrl: publicUrl });
      } else if (type === 'audio') {
        handleUpdateOption(index, { audioUrl: publicUrl });
      } else {
        handleUpdateOption(index, { videoUrl: publicUrl });
      }

      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao fazer upload');
    } finally {
      setUploadingIndex(null);
    }
  };

  const renderSelectionOptions = () => {
    if (!needsOptions) return null;

    return (
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            {field.type === 'selection_image' && 'Imagens para Seleção'}
            {field.type === 'selection_audio' && 'Áudios para Seleção'}
            {field.type === 'selection_video' && 'Vídeos para Seleção'}
            {field.type === 'selection_text' && 'Textos para Seleção'}
            {field.type === 'selection_text_image' && 'Textos com Imagem de Referência'}
            {field.type === 'radio_selection' && 'Opções'}
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {(field.options || []).map((option, index) => (
            <div key={option.id} className="space-y-2 p-3 bg-background rounded-lg border">
              <div className="flex gap-2">
                <Input
                  value={option.label}
                  onChange={(e) => handleUpdateOption(index, { label: e.target.value })}
                  placeholder="Título/Label"
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOption(index)}
                  className="h-8 w-8 p-0 text-destructive shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Radio Selection - apenas valor texto */}
              {field.type === 'radio_selection' && (
                <Input
                  value={option.value}
                  onChange={(e) => handleUpdateOption(index, { value: e.target.value })}
                  placeholder="Valor"
                  className="h-8 text-sm"
                />
              )}

              {/* Seleção de Texto - textarea para texto longo */}
              {field.type === 'selection_text' && (
                <Textarea
                  value={option.value}
                  onChange={(e) => handleUpdateOption(index, { value: e.target.value })}
                  placeholder="Digite o texto completo aqui..."
                  rows={4}
                  className="text-sm"
                />
              )}

              {/* Seleção de Texto com Imagem - textarea + upload de imagem de referência */}
              {field.type === 'selection_text_image' && (
                <div className="space-y-3">
                  <Textarea
                    value={option.value}
                    onChange={(e) => handleUpdateOption(index, { value: e.target.value })}
                    placeholder="Digite o texto completo aqui..."
                    rows={4}
                    className="text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={option.imageUrl || ''}
                        onChange={(e) => handleUpdateOption(index, { imageUrl: e.target.value })}
                        placeholder="URL da Imagem de referência ou faça upload"
                        className="h-8 text-sm"
                        disabled={uploadingIndex === index}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 relative shrink-0"
                        disabled={uploadingIndex === index}
                        asChild
                      >
                        <label className="cursor-pointer">
                          {uploadingIndex === index ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3 mr-1" />
                          )}
                          {uploadingIndex === index ? 'Enviando...' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            disabled={uploadingIndex === index}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(index, file, 'image');
                            }}
                          />
                        </label>
                      </Button>
                    </div>
                    {option.imageUrl && (
                      <div className="w-16 h-16 rounded border overflow-hidden shrink-0">
                        <img 
                          src={option.imageUrl} 
                          alt={option.label} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Seleção de Imagem - upload de imagem */}
              {field.type === 'selection_image' && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={option.imageUrl || ''}
                      onChange={(e) => handleUpdateOption(index, { imageUrl: e.target.value })}
                      placeholder="URL da Imagem ou faça upload"
                      className="h-8 text-sm"
                      disabled={uploadingIndex === index}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 relative shrink-0"
                      disabled={uploadingIndex === index}
                      asChild
                    >
                      <label className="cursor-pointer">
                        {uploadingIndex === index ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1" />
                        )}
                        {uploadingIndex === index ? 'Enviando...' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={uploadingIndex === index}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(index, file, 'image');
                          }}
                        />
                      </label>
                    </Button>
                  </div>
                  {option.imageUrl && (
                    <div className="w-12 h-12 rounded border overflow-hidden shrink-0">
                      <img 
                        src={option.imageUrl} 
                        alt={option.label} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Seleção de Áudio - upload de áudio */}
              {field.type === 'selection_audio' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={option.audioUrl || ''}
                      onChange={(e) => handleUpdateOption(index, { audioUrl: e.target.value })}
                      placeholder="URL do Áudio ou faça upload"
                      className="h-8 text-sm flex-1"
                      disabled={uploadingIndex === index}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 relative shrink-0"
                      disabled={uploadingIndex === index}
                      asChild
                    >
                      <label className="cursor-pointer">
                        {uploadingIndex === index ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1" />
                        )}
                        {uploadingIndex === index ? 'Enviando...' : 'Upload'}
                        <input
                          type="file"
                          accept="audio/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={uploadingIndex === index}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(index, file, 'audio');
                          }}
                        />
                      </label>
                    </Button>
                  </div>
                  {option.audioUrl && (
                    <audio controls className="w-full h-8">
                      <source src={option.audioUrl} />
                    </audio>
                  )}
                </div>
              )}

              {/* Seleção de Vídeo - upload de vídeo */}
              {field.type === 'selection_video' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={option.videoUrl || ''}
                      onChange={(e) => handleUpdateOption(index, { videoUrl: e.target.value })}
                      placeholder="URL do Vídeo ou faça upload"
                      className="h-8 text-sm flex-1"
                      disabled={uploadingIndex === index}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 relative shrink-0"
                      disabled={uploadingIndex === index}
                      asChild
                    >
                      <label className="cursor-pointer">
                        {uploadingIndex === index ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1" />
                        )}
                        {uploadingIndex === index ? 'Enviando...' : 'Upload'}
                        <input
                          type="file"
                          accept="video/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={uploadingIndex === index}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(index, file, 'video');
                          }}
                        />
                      </label>
                    </Button>
                  </div>
                  {option.videoUrl && (
                    <video controls className="w-full max-h-32 rounded-lg">
                      <source src={option.videoUrl} />
                    </video>
                  )}
                </div>
              )}
            </div>
          ))}

          {(field.options?.length || 0) === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm border border-dashed rounded-lg">
              {field.type === 'selection_image' && 'Adicione imagens para o usuário escolher'}
              {field.type === 'selection_audio' && 'Adicione áudios para o usuário escolher'}
              {field.type === 'selection_video' && 'Adicione vídeos para o usuário escolher'}
              {field.type === 'selection_text' && 'Adicione textos para o usuário escolher'}
              {field.type === 'selection_text_image' && 'Adicione textos com imagens de referência para o usuário escolher'}
              {field.type === 'radio_selection' && 'Adicione opções para a seleção'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-start gap-3">
        <div className="cursor-grab text-muted-foreground mt-2">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Nome do Campo <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={field.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="nome_campo"
                  className={`h-9 ${hasNameError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {hasNameError && (
                  <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                )}
              </div>
              {isEmptyName && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Nome obrigatório
                </p>
              )}
              {isDuplicateName && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Nome duplicado
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Label (Exibição)</Label>
              <Input
                value={field.label}
                onChange={(e) => onChange({ ...field, label: e.target.value })}
                placeholder="Nome do Campo"
                className="h-9"
              />
            </div>
          </div>

          {/* Tipo do Campo - Apenas exibição */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Tipo:</Label>
            <Badge variant="secondary" className="text-xs">
              {FIELD_TYPE_LABELS[field.type]}
            </Badge>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => onChange({ ...field, required: checked })}
                disabled={field.hidden}
              />
              <Label className="text-xs">Obrigatório</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={field.hidden || false}
                onCheckedChange={(checked) => onChange({ ...field, hidden: checked, required: checked ? false : field.required })}
              />
              <Label className="text-xs text-amber-600">Campo Oculto</Label>
            </div>
          </div>

          {field.hidden && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                👁️‍🗨️ Este campo não será exibido no wizard, mas seu valor será enviado ao webhook.
                {field.defaultValue ? ` Valor padrão: "${field.defaultValue}"` : ' Configure um valor padrão ou opções.'}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Texto de Apoio</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
              placeholder="Digite aqui..."
              className="h-9"
            />
          </div>

          {/* Info para tipos de mídia */}
          {['media_image', 'media_audio', 'media_video'].includes(field.type) && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {field.type === 'media_image' && '📷 O usuário irá fazer upload de uma imagem ao usar este recurso.'}
                {field.type === 'media_audio' && '🎵 O usuário irá fazer upload de um áudio ao usar este recurso.'}
                {field.type === 'media_video' && '🎬 O usuário irá fazer upload de um vídeo ao usar este recurso.'}
              </p>
            </div>
          )}

          {/* Opções para tipos de seleção */}
          {renderSelectionOptions()}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};