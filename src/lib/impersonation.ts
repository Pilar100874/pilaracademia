import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'pilar:impersonation';
const SESSION_BACKUP_KEY = 'pilar:impersonation:originSession';

export type ImpersonationContext = {
  // info to display in the banner
  label: string;
  // mode used to know how to "go back"
  origin: 'master' | 'clinic_staff';
  // master/staff email (so the user knows how to log back in)
  originatorEmail: string;
};

type SavedSession = {
  access_token: string;
  refresh_token: string;
};

function saveOriginSession(s: SavedSession) {
  try { sessionStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(s)); } catch {/* noop */}
}
function getOriginSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_BACKUP_KEY);
    return raw ? JSON.parse(raw) as SavedSession : null;
  } catch { return null; }
}
function clearOriginSession() {
  try { sessionStorage.removeItem(SESSION_BACKUP_KEY); } catch {/* noop */}
}

export function setImpersonationContext(ctx: ImpersonationContext) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {/* noop */}
}

export function getImpersonationContext(): ImpersonationContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationContext) : null;
  } catch {
    return null;
  }
}

export function clearImpersonationContext() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {/* noop */}
}

type ImpersonatePayload =
  | { mode: 'master_to_clinic_owner'; clinicId: string }
  | { mode: 'clinic_to_student'; studentId: string };

/**
 * Calls the edge function, signs in as the target user and persists context
 * so we can render a "go back" banner.
 *
 * Returns the new logged-in user's email.
 */
export async function impersonate(
  payload: ImpersonatePayload,
  uiLabel: string,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const originatorEmail = sessionData.session?.user?.email || '';
  const originAccess = sessionData.session?.access_token;
  const originRefresh = sessionData.session?.refresh_token;

  const { data, error } = await supabase.functions.invoke('impersonate-user', {
    body: payload,
  });
  if (error) throw error;
  if (data?.same_user) {
    // Already logged in as the target — skip sign-in, no banner needed.
    return (await supabase.auth.getUser()).data.user?.email || '';
  }
  if (!data?.email || !data?.password) throw new Error('Resposta inválida do servidor');

  // Backup origin session BEFORE signing in as the target user
  if (originAccess && originRefresh) {
    saveOriginSession({ access_token: originAccess, refresh_token: originRefresh });
  }

  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
  if (signErr) throw signErr;

  setImpersonationContext({
    label: uiLabel,
    origin: payload.mode === 'master_to_clinic_owner' ? 'master' : 'clinic_staff',
    originatorEmail,
  });

  return data.email as string;
}

/**
 * Ends impersonation. If we have a backed-up origin session (master/staff),
 * restore it transparently so the user goes back to where they came from
 * without re-entering credentials. Otherwise sign out.
 */
export async function endImpersonation(): Promise<{
  ctx: ImpersonationContext | null;
  restored: boolean;
}> {
  const ctx = getImpersonationContext();
  const saved = getOriginSession();
  clearImpersonationContext();

  if (saved) {
    // Replace current (impersonated) session with the original one
    const { error } = await supabase.auth.setSession({
      access_token: saved.access_token,
      refresh_token: saved.refresh_token,
    });
    clearOriginSession();
    if (!error) {
      return { ctx, restored: true };
    }
    // Fallback to sign out if restore failed (e.g. token expired)
  }

  clearOriginSession();
  await supabase.auth.signOut();
  return { ctx, restored: false };
}
