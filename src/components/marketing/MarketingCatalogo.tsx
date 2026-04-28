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
import { Plus, Pencil, Trash2, BookOpen, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface Item { id: string; name: string; price: string; description: string; image: string; }
interface Catalog { id?: string; name: string; description: string; items: Item[]; cover_url: string; }
const empty: Catalog = { name: '', description: '', items: [], cover_url: '' };

const MarketingCatalogo: React.FC = () => {
  const { data: clinicInfo } = useUserClinicRole();
  const activeClinicId = clinicInfo?.clinicId ?? null;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Catalog>(empty);

  const { data: catalogs = [] } = useQuery({
    queryKey: ['marketing-catalogs', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase.from('marketing_catalogs').select('*').eq('clinic_id', activeClinicId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeClinicId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Catalog) => {
      if (!activeClinicId || !user) throw new Error('Sem clínica');
      const payload: any = {
        clinic_id: activeClinicId,
        name: data.name,
        description: data.description || null,
        items: data.items,
        cover_url: data.cover_url || null,
      };
      if (data.id) {
        const { error } = await supabase.from('marketing_catalogs').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        payload.created_by = user.id;
        const { error } = await supabase.from('marketing_catalogs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Salvo!');
      queryClient.invalidateQueries({ queryKey: ['marketing-catalogs'] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('marketing_catalogs').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing-catalogs'] }),
  });

  const addItem = () => setEditing({ ...editing, items: [...editing.items, { id: crypto.randomUUID(), name: '', price: '', description: '', image: '' }] });
  const updateItem = (id: string, patch: Partial<Item>) => setEditing({ ...editing, items: editing.items.map(i => i.id === id ? { ...i, ...patch } : i) });
  const removeItem = (id: string) => setEditing({ ...editing, items: editing.items.filter(i => i.id !== id) });

  const handlePrint = (c: any) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${c.name}</title><style>
      body{font-family:Georgia,serif;padding:40px;max-width:800px;margin:auto}
      h1{font-size:32px;border-bottom:2px solid #333;padding-bottom:10px}
      .item{display:flex;gap:20px;padding:20px 0;border-bottom:1px solid #ddd;page-break-inside:avoid}
      .item img{width:120px;height:120px;object-fit:cover;border-radius:8px}
      .price{font-weight:bold;color:#0a7d3a}
    </style></head><body>
      <h1>${c.name}</h1>
      ${c.description ? `<p>${c.description}</p>` : ''}
      ${(c.items || []).map((i: Item) => `
        <div class="item">
          ${i.image ? `<img src="${i.image}" />` : ''}
          <div><h3>${i.name}</h3><p>${i.description || ''}</p>${i.price ? `<p class="price">${i.price}</p>` : ''}</div>
        </div>
      `).join('')}
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo Catálogo</Button></div>

      <div className="grid gap-2">
        {catalogs.map((c: any) => (
          <Card key={c.id} className="p-3">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 mt-1 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-medium">{c.name}</span><Badge variant="outline">{(c.items || []).length} itens</Badge></div>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => handlePrint(c)} title="Imprimir / PDF"><Printer className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing({ ...c, items: c.items || [] }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
        {catalogs.length === 0 && <div className="text-center text-sm text-muted-foreground py-12">Nenhum catálogo.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? 'Editar' : 'Novo'} Catálogo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div><Label>URL da capa</Label><Input value={editing.cover_url} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} /></div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2"><Label>Itens</Label><Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Item</Button></div>
              <div className="space-y-2">
                {editing.items.map((i) => (
                  <Card key={i.id} className="p-2 space-y-1">
                    <div className="flex gap-2">
                      <Input placeholder="Nome" value={i.name} onChange={(e) => updateItem(i.id, { name: e.target.value })} />
                      <Input placeholder="R$ 99,00" className="w-28" value={i.price} onChange={(e) => updateItem(i.id, { price: e.target.value })} />
                      <Button size="sm" variant="ghost" onClick={() => removeItem(i.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                    <Input placeholder="URL da imagem" value={i.image} onChange={(e) => updateItem(i.id, { image: e.target.value })} />
                    <Textarea rows={2} placeholder="Descrição" value={i.description} onChange={(e) => updateItem(i.id, { description: e.target.value })} />
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(editing)} disabled={!editing.name.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingCatalogo;
