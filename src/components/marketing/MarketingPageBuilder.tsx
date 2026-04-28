import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserClinicRole } from '@/hooks/useUserClinicRole';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Eye, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Block {
  id: string;
  type: 'hero' | 'text' | 'cta' | 'image';
  content: any;
}

interface LandingPage {
  id?: string;
  slug: string;
  title: string;
  description: string;
  blocks: Block[];
  status: 'draft' | 'published';
}

const empty: LandingPage = { slug: '', title: '', description: '', blocks: [], status: 'draft' };

const MarketingPageBuilder: React.FC = () => {
  const { data: clinicInfo } = useUserClinicRole();
  const activeClinicId = clinicInfo?.clinicId ?? null;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LandingPage>(empty);

  const { data: pages = [] } = useQuery({
    queryKey: ['marketing-pages', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('marketing_landing_pages')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeClinicId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: LandingPage) => {
      if (!activeClinicId || !user) throw new Error('Sem clínica');
      const payload: any = {
        clinic_id: activeClinicId,
        slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        title: data.title,
        description: data.description || null,
        blocks: data.blocks,
        status: data.status,
      };
      if (data.id) {
        const { error } = await supabase.from('marketing_landing_pages').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        payload.created_by = user.id;
        const { error } = await supabase.from('marketing_landing_pages').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Salvo!');
      queryClient.invalidateQueries({ queryKey: ['marketing-pages'] });
      setOpen(false);
      setEditing(empty);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_landing_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido');
      queryClient.invalidateQueries({ queryKey: ['marketing-pages'] });
    },
  });

  const addBlock = (type: Block['type']) => {
    const defaults: Record<string, any> = {
      hero: { title: 'Título principal', subtitle: 'Subtítulo', buttonText: 'Saiba mais' },
      text: { content: 'Seu texto aqui...' },
      cta: { label: 'Agende sua aula', url: '#' },
      image: { url: '', alt: '' },
    };
    setEditing({
      ...editing,
      blocks: [...editing.blocks, { id: crypto.randomUUID(), type, content: defaults[type] }],
    });
  };

  const updateBlock = (id: string, content: any) => {
    setEditing({ ...editing, blocks: editing.blocks.map(b => b.id === id ? { ...b, content } : b) });
  };

  const removeBlock = (id: string) => {
    setEditing({ ...editing, blocks: editing.blocks.filter(b => b.id !== id) });
  };

  const openNew = () => { setEditing(empty); setOpen(true); };
  const openEdit = (p: any) => { setEditing({ ...p, blocks: p.blocks || [] }); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova Página</Button>
      </div>

      <div className="grid gap-2">
        {pages.map((p: any) => (
          <Card key={p.id} className="p-3">
            <div className="flex items-start gap-3">
              <Globe className={`h-5 w-5 mt-1 ${p.status === 'published' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{p.title}</span>
                  <Badge variant={p.status === 'published' ? 'default' : 'secondary'}>{p.status}</Badge>
                  <code className="text-xs text-muted-foreground">/{p.slug}</code>
                  {p.view_count > 0 && <Badge variant="outline">{p.view_count} views</Badge>}
                </div>
                {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
              </div>
              <div className="flex gap-1">
                {p.status === 'published' && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/p/${p.id}`} target="_blank" rel="noopener"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {pages.length === 0 && <div className="text-center text-sm text-muted-foreground py-12">Nenhuma página.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? 'Editar' : 'Nova'} Landing Page</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Título</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="promo-pilates" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label>Blocos da página</Label>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => addBlock('hero')}>+ Hero</Button>
                  <Button size="sm" variant="outline" onClick={() => addBlock('text')}>+ Texto</Button>
                  <Button size="sm" variant="outline" onClick={() => addBlock('image')}>+ Imagem</Button>
                  <Button size="sm" variant="outline" onClick={() => addBlock('cta')}>+ CTA</Button>
                </div>
              </div>
              <div className="space-y-2">
                {editing.blocks.map((b) => (
                  <Card key={b.id} className="p-2">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">{b.type}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => removeBlock(b.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    {b.type === 'hero' && (
                      <div className="space-y-1">
                        <Input placeholder="Título" value={b.content.title} onChange={(e) => updateBlock(b.id, { ...b.content, title: e.target.value })} />
                        <Input placeholder="Subtítulo" value={b.content.subtitle} onChange={(e) => updateBlock(b.id, { ...b.content, subtitle: e.target.value })} />
                      </div>
                    )}
                    {b.type === 'text' && (
                      <Textarea value={b.content.content} onChange={(e) => updateBlock(b.id, { ...b.content, content: e.target.value })} rows={3} />
                    )}
                    {b.type === 'image' && (
                      <Input placeholder="URL da imagem" value={b.content.url} onChange={(e) => updateBlock(b.id, { ...b.content, url: e.target.value })} />
                    )}
                    {b.type === 'cta' && (
                      <div className="space-y-1">
                        <Input placeholder="Texto do botão" value={b.content.label} onChange={(e) => updateBlock(b.id, { ...b.content, label: e.target.value })} />
                        <Input placeholder="URL" value={b.content.url} onChange={(e) => updateBlock(b.id, { ...b.content, url: e.target.value })} />
                      </div>
                    )}
                  </Card>
                ))}
                {editing.blocks.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Adicione blocos acima.</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Button size="sm" variant={editing.status === 'draft' ? 'default' : 'outline'} onClick={() => setEditing({ ...editing, status: 'draft' })}>Rascunho</Button>
              <Button size="sm" variant={editing.status === 'published' ? 'default' : 'outline'} onClick={() => setEditing({ ...editing, status: 'published' })}>Publicado</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(editing)} disabled={!editing.title.trim() || !editing.slug.trim() || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingPageBuilder;
