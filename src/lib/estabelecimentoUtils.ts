/**
 * Compatibility shim: maps `estabelecimento_id` (CRM Pilar concept) to `clinic_id` (Pilar Calorias concept).
 * Allows ported marketing components to work without rewrites.
 */
import { supabase } from "@/integrations/supabase/client";

export async function getEstabelecimentoId(estabelecimentoId?: string): Promise<string | null> {
  if (estabelecimentoId) return estabelecimentoId;

  const stored = localStorage.getItem("activeClinicId") || localStorage.getItem("clinicId");
  if (stored) return stored;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("user_roles")
      .select("clinic_id, role")
      .eq("user_id", user.id);

    const roles = data ?? [];
    const staffRow = roles.find((r) =>
      ["clinic_admin", "instructor", "receptionist"].includes(r.role as string)
    );
    const fallback = roles.find((r) => r.clinic_id);
    const clinicId = staffRow?.clinic_id ?? fallback?.clinic_id ?? null;
    if (clinicId) localStorage.setItem("activeClinicId", clinicId);
    return clinicId;
  } catch (e) {
    console.error("getEstabelecimentoId error:", e);
    return null;
  }
}

export async function isSystemAdmin(): Promise<boolean> {
  return isEstabelecimentoAdmin();
}

export async function isEstabelecimentoAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["master_admin", "clinic_admin"]);
    return !!data && data.length > 0;
  } catch (e) {
    console.error("isEstabelecimentoAdmin error:", e);
    return false;
  }
}

export async function isAnyAdmin(): Promise<boolean> {
  return isEstabelecimentoAdmin();
}

export async function getUserIdFromAuth(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
