import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Edit, 
  Trash2, 
  Copy, 
  Plus,
  Calendar,
  FileText,
  Loader2,
  Download,
  ToggleLeft,
  ToggleRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { SavedCatalog } from './hooks/useSavedCatalogs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SavedCatalogsListProps {
  catalogs: SavedCatalog[];
  isLoading: boolean;
  onCreateNew: () => void;
  onEdit: (catalog: SavedCatalog) => void;
  onDelete: (id: string) => void;
  onDuplicate: (catalog: SavedCatalog) => void;
  onGeneratePDF?: (catalog: SavedCatalog) => void;
  onUpdateStatus?: (id: string, ativo: boolean, dataValidade: string | null, dataIndeterminada: boolean) => Promise<boolean>;
}

export const SavedCatalogsList: React.FC<SavedCatalogsListProps> = ({
  catalogs,
  isLoading,
  onCreateNew,
  onEdit,
  onDelete,
  onDuplicate,
  onGeneratePDF,
  onUpdateStatus,
}) => {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<SavedCatalog | null>(null);
  const [tempAtivo, setTempAtivo] = useState(true);
  const [tempDataIndeterminada, setTempDataIndeterminada] = useState(true);
  const [tempDataValidade, setTempDataValidade] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const handleOpenStatusDialog = (catalog: SavedCatalog) => {
    setSelectedCatalog(catalog);
    setTempAtivo(catalog.ativo);
    setTempDataIndeterminada(catalog.data_indeterminada);
    setTempDataValidade(catalog.data_validade ? format(new Date(catalog.data_validade), 'yyyy-MM-dd') : '');
    setStatusDialogOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedCatalog || !onUpdateStatus) return;
    
    setIsSavingStatus(true);
    try {
      const dataValidade = tempDataIndeterminada ? null : (tempDataValidade ? new Date(tempDataValidade).toISOString() : null);
      await onUpdateStatus(selectedCatalog.id, tempAtivo, dataValidade, tempDataIndeterminada);
      setStatusDialogOpen(false);
    } finally {
      setIsSavingStatus(false);
    }
  };

  const isExpired = (catalog: SavedCatalog) => {
    if (catalog.data_indeterminada || !catalog.data_validade) return false;
    return new Date(catalog.data_validade) <= new Date();
  };

  const getStatusBadge = (catalog: SavedCatalog) => {
    if (!catalog.ativo) {
      return <Badge variant="secondary" className="text-xs">Inativo</Badge>;
    }
    if (isExpired(catalog)) {
      return <Badge variant="destructive" className="text-xs">Expirado</Badge>;
    }
    return <Badge variant="default" className="text-xs bg-green-500">Ativo</Badge>;
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Meus Catálogos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie seus catálogos de produtos salvos
          </p>
        </div>
        <Button onClick={onCreateNew} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Novo Catálogo
        </Button>
      </div>

      {/* Catalogs Grid */}
      {catalogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum catálogo salvo</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Crie seu primeiro catálogo de produtos para começar
          </p>
          <Button onClick={onCreateNew} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Catálogo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogs.map((catalog) => (
            <div
              key={catalog.id}
              className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Thumbnail */}
              <div className="aspect-[4/3] bg-muted relative">
                {catalog.thumbnail ? (
                  <img
                    src={catalog.thumbnail}
                    alt={catalog.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate flex-1">{catalog.nome}</h3>
                    {getStatusBadge(catalog)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(catalog.updated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {!catalog.data_indeterminada && catalog.data_validade && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        Validade: {format(new Date(catalog.data_validade), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {isExpired(catalog) && (
                        <AlertCircle className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{catalog.products_page?.products?.length || 0} produtos</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 rounded-lg"
                    onClick={() => onEdit(catalog)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                  {onGeneratePDF && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => onGeneratePDF(catalog)}
                      title="Gerar PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onUpdateStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => handleOpenStatusDialog(catalog)}
                      title="Configurar status"
                    >
                      {catalog.ativo ? (
                        <ToggleRight className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => onDuplicate(catalog)}
                    title="Duplicar"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir catálogo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O catálogo "{catalog.nome}" será
                          permanentemente excluído.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(catalog.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Configuration Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Status do Catálogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ativo">Catálogo Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Desative para ocultar o catálogo
                </p>
              </div>
              <Switch
                id="ativo"
                checked={tempAtivo}
                onCheckedChange={setTempAtivo}
              />
            </div>

            {/* Indeterminate Date Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="indeterminada">Data Indeterminada</Label>
                <p className="text-xs text-muted-foreground">
                  Sem data de expiração definida
                </p>
              </div>
              <Switch
                id="indeterminada"
                checked={tempDataIndeterminada}
                onCheckedChange={(checked) => {
                  setTempDataIndeterminada(checked);
                  if (checked) {
                    setTempDataValidade('');
                  }
                }}
              />
            </div>

            {/* Validity Date */}
            {!tempDataIndeterminada && (
              <div className="space-y-2">
                <Label htmlFor="validade">Data de Validade</Label>
                <Input
                  id="validade"
                  type="date"
                  value={tempDataValidade}
                  onChange={(e) => setTempDataValidade(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
                <p className="text-xs text-muted-foreground">
                  O catálogo será desativado automaticamente após esta data
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveStatus} 
              disabled={isSavingStatus || (!tempDataIndeterminada && !tempDataValidade)}
            >
              {isSavingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
