import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, MessageCircle, Trash2, Link2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ConfirmProvider';

const NO_STUDENT = '__none__';

type ShareLink = {
  id: string;
  token: string;
  student_id: string | null;
  expires_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  active: boolean;
  created_at: string;
};

type Student = { id: string; full_name: string; phone: string | null };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clinicId: string;
  sequenceId: string;
  sequenceName: string;
  /** Pre-select a student in the picker (used from "live session" flow). */
  initialStudentId?: string | null;
}

function buildShareUrl(token: string) {
  return `${window.location.origin}/s/${token}`;
}

function buildWhatsAppUrl(phone: string | null, message: string) {
  const cleaned = (phone || '').replace(/\D/g, '');
  const base = cleaned ? `https://wa.me/${cleaned}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function ShareSequenceDialog({ open, onOpenChange, clinicId, sequenceId, sequenceName, initialStudentId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [studentId, setStudentId] = useState<string>(initialStudentId || NO_STUDENT);
  const [days, setDays] = useState<string>('30');

  useEffect(() => {
    if (open) {
      setStudentId(initialStudentId || NO_STUDENT);
      setDays('30');
    }
  }, [open, initialStudentId]);

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['clinic-students-for-share', clinicId],
    enabled: open && !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_students')
        .select('id,full_name,phone')
        .eq('clinic_id', clinicId)
        .eq('active', true)
        .order('full_name');
      if (error) throw error;
      return (data || []) as Student[];
    },
  });

  const { data: links = [], isLoading: loadingLinks } = useQuery<ShareLink[]>({
    queryKey: ['sequence-share-links', sequenceId],
    enabled: open && !!sequenceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sequence_share_links')
        .select('id,token,student_id,expires_at,view_count,last_viewed_at,active,created_at')
        .eq('sequence_id', sequenceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ShareLink[];
    },
  });

  const createLink = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sem usuário');
      const expires_at = days && days !== '0'
        ? new Date(Date.now() + parseInt(days) * 86400_000).toISOString()
        : null;
      const { data, error } = await supabase
        .from('sequence_share_links')
        .insert({
          sequence_id: sequenceId,
          clinic_id: clinicId,
          student_id: studentId === NO_STUDENT ? null : studentId,
          created_by: user.id,
          expires_at,
        })
        .select('id,token,student_id,expires_at,view_count,last_viewed_at,active,created_at')
        .single();
      if (error) throw error;
      return data as ShareLink;
    },
    onSuccess: (link) => {
      qc.invalidateQueries({ queryKey: ['sequence-share-links', sequenceId] });
      const student = students.find(s => s.id === link.student_id) || null;
      const url = buildShareUrl(link.token);
      const greeting = student ? `Olá, ${student.full_name.split(' ')[0]}! ` : '';
      const message = `${greeting}Aqui está sua sequência de exercícios "${sequenceName}":\n\n${url}`;
      window.open(buildWhatsAppUrl(student?.phone || null, message), '_blank', 'noopener');
      toast.success('Link criado e WhatsApp aberto');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao criar link'),
  });

  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sequence_share_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-share-links', sequenceId] });
      toast.success('Link removido');
    },
  });

  const copyLink = (token: string) => {
    const url = buildShareUrl(token);
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copiado'),
      () => toast.error('Não foi possível copiar')
    );
  };

  const reSendWhats = (link: ShareLink) => {
    const student = students.find(s => s.id === link.student_id) || null;
    const url = buildShareUrl(link.token);
    const greeting = student ? `Olá, ${student.full_name.split(' ')[0]}! ` : '';
    const message = `${greeting}Aqui está sua sequência de exercícios "${sequenceName}":\n\n${url}`;
    window.open(buildWhatsAppUrl(student?.phone || null, message), '_blank', 'noopener');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Enviar sequência por WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
            <Label className="text-xs">Aluno (opcional)</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STUDENT}>— Sem aluno (link genérico) —</SelectItem>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}{s.phone ? ` · ${s.phone}` : ' · sem telefone'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <Label className="text-xs">Validade (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={days}
                  onChange={e => setDays(e.target.value)}
                  placeholder="0 = sem expiração"
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={() => createLink.mutate()}
                  disabled={createLink.isPending}
                >
                  {createLink.isPending
                    ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    : <MessageCircle className="h-4 w-4 mr-1.5" />}
                  Gerar e enviar
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Vamos abrir o WhatsApp com a mensagem pronta. Se o aluno tiver telefone cadastrado,
              ele já vai pré-preenchido.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Links já criados
            </Label>
            {loadingLinks ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : links.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum link gerado ainda.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {links.map(link => {
                  const student = students.find(s => s.id === link.student_id);
                  const expired = link.expires_at && new Date(link.expires_at) < new Date();
                  return (
                    <div key={link.id} className="p-2.5 rounded-lg border bg-card flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {student ? student.full_name : 'Link genérico'}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex gap-2 flex-wrap">
                          <span>{link.view_count} visualização{link.view_count === 1 ? '' : 'es'}</span>
                          {link.expires_at && (
                            <span className={expired ? 'text-destructive' : ''}>
                              {expired ? 'expirado' : `expira ${new Date(link.expires_at).toLocaleDateString('pt-BR')}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Copiar link" onClick={() => copyLink(link.token)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Reenviar pelo WhatsApp" onClick={() => reSendWhats(link)}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Remover link"
                        onClick={async () => { if (await confirm({ description: 'Remover este link?', destructive: true })) removeLink.mutate(link.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
