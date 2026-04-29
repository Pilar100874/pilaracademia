import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';
import { PageMotion } from '@/components/PageMotion';
import { Link2, Search, Users, CheckCircle2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Platform = 'gympass' | 'totalpass' | 'classpass' | 'outro';

const PLATFORM_LABELS: Record<Platform, string> = {
  gympass: 'Gympass / Wellhub',
  totalpass: 'TotalPass',
  classpass: 'ClassPass',
  outro: 'Outro',
};

interface UnmatchedCheckin {
  id: string;
  platform: Platform;
  checkin_at: string;
  student_name: string | null;
  student_email: string | null;
  student_document: string | null;
  external_user_id: string | null;
  amount: number | null;
}

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export default function ReconcileCheckinsPage() {
  const { activeClinicId, activeClinic } = useUserRoles();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Check-ins não casados (student_id IS NULL)
  const { data: unmatched = [], isLoading } = useQuery({
    queryKey: ['unmatched-checkins', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('external_pass_checkins')
        .select('id, platform, checkin_at, student_name, student_email, student_document, external_user_id, amount')
        .eq('clinic_id', activeClinicId)
        .is('student_id', null)
        .order('checkin_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as UnmatchedCheckin[];
    },
    enabled: !!activeClinicId,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['clinic-students-reconcile', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('clinic_students')
        .select('id, full_name, email')
        .eq('clinic_id', activeClinicId)
        .eq('active', true)
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeClinicId,
  });

  // Agrupa por (plataforma + nome + e-mail + external_user_id) para mostrar 1 linha por aluno externo
  const groups = useMemo(() => {
    const map = new Map<string, {
      key: string;
      platform: Platform;
      student_name: string | null;
      student_email: string | null;
      student_document: string | null;
      external_user_id: string | null;
      count: number;
      latest: string;
      total_amount: number;
      ids: string[];
    }>();
    for (const c of unmatched) {
      const key = [
        c.platform,
        c.external_user_id ?? '',
        normalize(c.student_email ?? ''),
        normalize(c.student_name ?? ''),
        c.student_document ?? '',
      ].join('|');
      const ex = map.get(key);
      if (ex) {
        ex.count++;
        ex.total_amount += c.amount ?? 0;
        ex.ids.push(c.id);
        if (c.checkin_at > ex.latest) ex.latest = c.checkin_at;
      } else {
        map.set(key, {
          key,
          platform: c.platform,
          student_name: c.student_name,
          student_email: c.student_email,
          student_document: c.student_document,
          external_user_id: c.external_user_id,
          count: 1,
          latest: c.checkin_at,
          total_amount: c.amount ?? 0,
          ids: [c.id],
        });
      }
    }
    let arr = Array.from(map.values());
    if (search.trim()) {
      const q = normalize(search);
      arr = arr.filter(
        (g) =>
          normalize(g.student_name ?? '').includes(q) ||
          normalize(g.student_email ?? '').includes(q) ||
          (g.student_document ?? '').includes(q),
      );
    }
    return arr.sort((a, b) => b.latest.localeCompare(a.latest));
  }, [unmatched, search]);

  const link = useMutation({
    mutationFn: async (args: {
      group: (typeof groups)[number];
      studentId: string;
    }) => {
      if (!activeClinicId) throw new Error('Sem clínica ativa');
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Sem usuário');

      // 1) Vincula todos os check-ins do grupo ao aluno
      const { error: updErr } = await supabase
        .from('external_pass_checkins')
        .update({ student_id: args.studentId })
        .in('id', args.group.ids);
      if (updErr) throw updErr;

      // 2) Cria identidade externa para lembrar o vínculo nas próximas importações
      const { error: idErr } = await supabase
        .from('student_external_identities')
        .upsert(
          {
            clinic_id: activeClinicId,
            student_id: args.studentId,
            platform: args.group.platform,
            external_user_id: args.group.external_user_id,
            external_email: args.group.student_email,
            external_document: args.group.student_document,
            external_name: args.group.student_name ?? '',
            linked_by: userId,
          },
          {
            onConflict: 'clinic_id,platform,external_user_id',
            ignoreDuplicates: true,
          },
        );
      if (idErr) throw idErr;
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.group.count} check-in(s) vinculado(s)`);
      queryClient.invalidateQueries({ queryKey: ['unmatched-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['student-external-identities'] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
    onSettled: () => setLinkingId(null),
  });

  const ignore = useMutation({
    mutationFn: async (group: (typeof groups)[number]) => {
      const { error } = await supabase
        .from('external_pass_checkins')
        .delete()
        .in('id', group.ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Check-ins descartados');
      queryClient.invalidateQueries({ queryKey: ['unmatched-checkins'] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  if (!activeClinic) return <div className="p-8 text-center text-muted-foreground">Carregando…</div>;

  return (
    <PageMotion>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <ClinicPageHeader
          icon={Link2}
          title="Conciliar check-ins"
          subtitle="Vincule manualmente os check-ins que o sistema não identificou. O vínculo é lembrado pra sempre."
        />

        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou documento…"
              className="pl-9"
            />
          </div>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Carregando…
          </div>
        ) : groups.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-serif text-2xl mb-1">Tudo conciliado</h3>
            <p className="text-sm text-muted-foreground">
              {search
                ? 'Nenhum check-in não casado bate com a busca.'
                : 'Não há check-ins pendentes de vinculação.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {groups.length} pessoa(s) externa(s) sem aluno vinculado
            </div>
            {groups.map((g) => (
              <Card key={g.key} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{PLATFORM_LABELS[g.platform]}</Badge>
                      <Badge variant="secondary">
                        {g.count} check-in{g.count > 1 ? 's' : ''}
                      </Badge>
                      {g.total_amount > 0 && (
                        <Badge variant="outline">
                          R$ {g.total_amount.toFixed(2).replace('.', ',')}
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium truncate">
                      {g.student_name || <span className="text-muted-foreground italic">Sem nome</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[g.student_email, g.student_document, g.external_user_id]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Último check-in: {format(new Date(g.latest), "dd 'de' MMM yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Popover
                      open={linkingId === g.key}
                      onOpenChange={(o) => setLinkingId(o ? g.key : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button size="sm">
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          Vincular aluno
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Buscar aluno…" />
                          <CommandList>
                            <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                            <CommandGroup>
                              {students.map((s) => (
                                <CommandItem
                                  key={s.id}
                                  value={`${s.full_name} ${s.email ?? ''}`}
                                  onSelect={() => link.mutate({ group: g, studentId: s.id })}
                                  disabled={link.isPending}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{s.full_name}</span>
                                    {s.email && (
                                      <span className="text-xs text-muted-foreground">{s.email}</span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Descartar ${g.count} check-in(s) deste registro? Não pode ser desfeito.`)) {
                          ignore.mutate(g);
                        }
                      }}
                      disabled={ignore.isPending}
                      title="Descartar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageMotion>
  );
}
