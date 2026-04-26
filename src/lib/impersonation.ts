import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'pilar:impersonation';

export type ImpersonationContext = {
  // info to display in the banner
  label: string;
  // mode used to know how to "go back"
  origin: 'master' | 'clinic_staff';
  // master/staff email (so the user knows how to log back in)
  originatorEmail: string;
};

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

  const { data, error } = await supabase.functions.invoke('impersonate-user', {
    body: payload,
  });
  if (error) throw error;
  if (!data?.email || !data?.password) throw new Error('Resposta inválida do servidor');

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
 * Logs out and clears impersonation context.
 * The originator (master/staff) will need to log in again with their own credentials.
 */
export async function endImpersonation() {
  const ctx = getImpersonationContext();
  clearImpersonationContext();
  await supabase.auth.signOut();
  return ctx;
}
