import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Check, X, Loader2, Globe } from 'lucide-react';
import { useExerciseExtras, type ExerciseExtra } from '@/hooks/useExerciseExtras';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useAuth } from '@/hooks/useAuth';

interface ManageExtrasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageExtrasDialog({ open, onOpenChange }: ManageExtrasDialogProps) {
  const { user } = useAuth();
  const { extras, isLoading, createExtra, updateExtra, deleteExtra } = useExerciseExtras();

  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [toDelete, setToDelete] = useState<ExerciseExtra | null>(null);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createExtra.mutateAsync({ name, icon: newIcon.trim() || null });
      setNewName('');
      setNewIcon('');
    } catch {
      /* toast tratado */
    }
  };

  const startEdit = (e: ExerciseExtra) => {
    setEditingId(e.id);
    setEditName(e.name);
    setEditIcon(e.icon ?? '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    try {
      await updateExtra.mutateAsync({
        id: editingId,
        name,
        icon: editIcon.trim() || null,
      });
      setEditingId(null);
    } catch {
      /* toast tratado */
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Equipamentos extras</DialogTitle>
            <DialogDescription>
              Gerencie os equipamentos (bola, halter, elástico, arco, caixa…) usados nos seus exercícios.
            </DialogDescription>
          </DialogHeader>

          {/* Criar novo */}
          <div className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-2">
            <Label className="text-xs">Adicionar equipamento</Label>
            <div className="flex gap-2">
              <Input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value.slice(0, 2))}
                placeholder="🏐"
                className="h-9 w-14 text-center"
                aria-label="Ícone (emoji opcional)"
              />
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Ex.: Bola, Halter, Elástico..."
                className="h-9 flex-1"
              />
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim() || createExtra.isPending}
                className="h-9"
              >
                {createExtra.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : extras.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground italic">
                Nenhum equipamento extra cadastrado ainda.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {extras.map((ex) => {
                  const isEditing = editingId === ex.id;
                  const isOwn = ex.user_id === user?.id && !ex.is_global;
                  return (
                    <li key={ex.id} className="py-2 flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            value={editIcon}
                            onChange={(e) => setEditIcon(e.target.value.slice(0, 2))}
                            className="h-8 w-12 text-center"
                            placeholder="🏐"
                          />
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEdit();
                              } else if (e.key === 'Escape') {
                                setEditingId(null);
                              }
                            }}
                            className="h-8 flex-1"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={saveEdit}
                            disabled={updateExtra.isPending || !editName.trim()}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="w-8 text-center text-lg leading-none">
                            {ex.icon || '•'}
                          </span>
                          <span className="flex-1 text-sm truncate flex items-center gap-1.5">
                            {ex.name}
                            {ex.is_global && (
                              <Globe className="h-3 w-3 text-muted-foreground" aria-label="Global" />
                            )}
                          </span>
                          {isOwn && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => startEdit(ex)}
                                title="Renomear"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setToDelete(ex)}
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir equipamento?"
        description={`"${toDelete?.name}" será removido. Os exercícios vinculados deixarão de ter este equipamento.`}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteExtra.mutateAsync(toDelete.id);
            setToDelete(null);
          } catch {
            /* toast tratado */
          }
        }}
      />
    </>
  );
}
