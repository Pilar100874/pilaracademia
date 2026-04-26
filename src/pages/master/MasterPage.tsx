import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Shield, Plus, Trash2, Building2, Users, ArrowLeft, Pencil, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

function useIsMaster() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-master", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_master_admin", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return data === true;
    },
  });
}

export default function MasterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: isMaster, isLoading: checkingRole } = useIsMaster();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [editing, setEditing] = useState<{ id: string; name: string; slug: string } | null>(null);

  const { data: clinics, isLoading } = useQuery({
    queryKey: ["master-clinics"],
    enabled: !!isMaster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id,name,slug,created_at,owner_user_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: rolesByClinic } = useQuery({
    queryKey: ["master-roles"],
    enabled: !!isMaster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id,user_id,clinic_id,role");
      if (error) throw error;
      return data;
    },
  });

  const createClinic = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome da clínica");
      if (!adminEmail.trim()) throw new Error("Informe o e-mail do admin");
      if (adminPassword.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres");

      const { data, error } = await supabase.functions.invoke("admin-create-clinic", {
        body: {
          name: name.trim(),
          slug: slug.trim(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword,
        },
      });
      if (error) {
        const msg = (data as any)?.error ?? error.message;
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Clínica e admin criados com sucesso");
      setCreateOpen(false);
      setName(""); setSlug(""); setAdminName(""); setAdminEmail(""); setAdminPassword("");
      qc.invalidateQueries({ queryKey: ["master-clinics"] });
      qc.invalidateQueries({ queryKey: ["master-roles"] });
    },
    onError: (e: any) => {
      console.error("[master] createClinic failed", e);
      toast.error(e?.message ?? "Erro ao criar clínica");
    },
  });

  const deleteClinic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clínica removida");
      qc.invalidateQueries({ queryKey: ["master-clinics"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateClinic = useMutation({
    mutationFn: async (payload: { id: string; name: string; slug: string }) => {
      const cleanName = payload.name.trim();
      let cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (!cleanName) throw new Error("Informe o nome");
      if (!cleanSlug) cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase
        .from("clinics")
        .update({ name: cleanName, slug: cleanSlug })
        .eq("id", payload.id);
      if (error) {
        if (error.code === "23505") throw new Error("Já existe uma clínica com esse slug");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Clínica atualizada");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["master-clinics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar"),
  });

  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isMaster) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center space-y-4">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Esta área é exclusiva do master admin. Seu usuário não tem essa permissão.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">Voltar</Button>
        </Card>
      </div>
    );
  }

  const adminCount = (clinicId: string) =>
    rolesByClinic?.filter(r => r.clinic_id === clinicId).length ?? 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" /> Painel Master
              </h1>
              <p className="text-sm text-muted-foreground">Gerencie todas as clínicas da plataforma</p>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova clínica</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar clínica</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome da clínica *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Studio Pilates" />
                </div>
                <div>
                  <Label>Slug (URL) — opcional</Label>
                  <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="studio-pilates" />
                  <p className="text-xs text-muted-foreground mt-1">Se vazio, geramos a partir do nome.</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold mb-2">Administrador da clínica</p>
                  <div className="space-y-3">
                    <div>
                      <Label>Nome do admin</Label>
                      <Input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Maria Silva" />
                    </div>
                    <div>
                      <Label>E-mail *</Label>
                      <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@clinica.com" />
                    </div>
                    <div>
                      <Label>Senha inicial *</Label>
                      <Input type="text" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="mín. 6 caracteres" />
                      <p className="text-xs text-muted-foreground mt-1">
                        O admin será obrigado a trocar a senha no primeiro login.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={() => createClinic.mutate()} disabled={createClinic.isPending}>
                  {createClinic.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !clinics?.length ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhuma clínica cadastrada ainda.
          </Card>
        ) : (
          <div className="grid gap-3">
            {clinics.map(c => (
              <Card key={c.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{c.slug}</Badge>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {adminCount(c.id)} membros</span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Excluir "${c.name}"? Esta ação não pode ser desfeita.`)) {
                        deleteClinic.mutate(c.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar clínica</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={editing.slug}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              onClick={() => editing && updateClinic.mutate(editing)}
              disabled={updateClinic.isPending}
            >
              {updateClinic.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
