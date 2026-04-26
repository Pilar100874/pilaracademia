import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const caller = userData.user;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verifica se o caller é master_admin
    const { data: isMaster, error: roleErr } = await admin.rpc("is_master_admin", {
      _user_id: caller.id,
    });
    if (roleErr) throw roleErr;
    if (!isMaster) {
      return new Response(JSON.stringify({ error: "Apenas o master pode criar clínicas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    let slug = String(body.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const adminEmail = String(body.adminEmail ?? "").trim().toLowerCase();
    const adminPassword = String(body.adminPassword ?? "");
    const adminName = String(body.adminName ?? "").trim() || adminEmail.split("@")[0];

    if (!name) throw new Error("Informe o nome da clínica");
    if (!adminEmail) throw new Error("Informe o e-mail do admin");
    if (!adminPassword || adminPassword.length < 6)
      throw new Error("Senha deve ter ao menos 6 caracteres");
    if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Verifica slug único
    const { data: existing } = await admin
      .from("clinics")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) throw new Error(`Já existe uma clínica com o slug "${slug}"`);

    // Tenta achar usuário existente; se não houver, cria
    let ownerId: string | null = null;
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("email", adminEmail)
      .maybeSingle();

    if (existingProfile?.user_id) {
      ownerId = existingProfile.user_id;
      // atualiza a senha desse usuário (master define a senha inicial)
      const { error: updErr } = await admin.auth.admin.updateUserById(ownerId, {
        password: adminPassword,
      });
      if (updErr) throw updErr;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { name: adminName },
      });
      if (createErr) throw createErr;
      ownerId = created.user!.id;
    }

    // Cria clínica
    const { data: clinic, error: clinicErr } = await admin
      .from("clinics")
      .insert({ name, slug, owner_user_id: ownerId })
      .select()
      .single();
    if (clinicErr) throw clinicErr;

    // Cria role clinic_admin
    const { error: roleInsErr } = await admin.from("user_roles").insert({
      user_id: ownerId,
      clinic_id: clinic.id,
      role: "clinic_admin",
    });
    if (roleInsErr && roleInsErr.code !== "23505") throw roleInsErr;

    // Marca para trocar a senha no primeiro login
    await admin
      .from("user_security_flags")
      .upsert({ user_id: ownerId, must_change_password: true }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ ok: true, clinic, ownerId, adminEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("admin-create-clinic error", e);
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
