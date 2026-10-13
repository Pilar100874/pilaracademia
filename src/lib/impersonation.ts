import { supabase } from '@/integrations/supabase/client';

const KEY = 'pilar-admin-return-session';

export function getImpersonation(): { email: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return { email: JSON.parse(raw).targetEmail };
  } catch {
    return null;
  }
}

export async function startImpersonation(userId: string) {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new Error('Sem sessão');
  const { data, error } = await supabase.functions.invoke('admin-impersonate', { body: { userId } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  localStorage.setItem(
    KEY,
    JSON.stringify({
      access_token: s.session.access_token,
      refresh_token: s.session.refresh_token,
      targetEmail: data.email,
    }),
  );
  const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
  if (vErr) {
    localStorage.removeItem(KEY);
    throw vErr;
  }
  window.location.href = '/';
}

export async function stopImpersonation() {
  const raw = localStorage.getItem(KEY);
  localStorage.removeItem(KEY);
  if (raw) {
    const { access_token, refresh_token } = JSON.parse(raw);
    await supabase.auth.signOut({ scope: 'local' });
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (!error) {
      window.location.href = '/admin/users';
      return;
    }
  }
  await supabase.auth.signOut({ scope: 'local' });
  window.location.href = '/auth';
}
