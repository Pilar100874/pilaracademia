// Edge function pública: retorna o resumo de um link de compartilhamento
// validando o token, expiração e aplicando rate limiting por IP.
//
// Endpoint: POST /functions/v1/share-summary
// Body: { token: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Limites de rate limiting
const RATE_LIMIT_PER_IP_PER_MIN = 20; // mesmo IP: 20 req/min em qualquer link
const RATE_LIMIT_PER_LINK_PER_IP_PER_HOUR = 60; // mesmo link + IP: 60/hora

const BodySchema = z.object({
  token: z.string().trim().min(10).max(64),
});

interface AggregatedDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  liquid_ml: number;
  burned: number;
  hasWorkout: boolean;
}

async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get("SUPABASE_JWKS") ?? "share-summary-salt";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Token inválido", details: parsed.error.flatten().fieldErrors },
        400,
      );
    }
    const { token } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);
    const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 500);

    // 1. Look up share record
    const { data: share, error: shareErr } = await admin
      .from("share_summaries")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (shareErr || !share) {
      return jsonResponse({ error: "Link não encontrado" }, 404);
    }
    if (share.revoked) {
      return jsonResponse({ error: "Este link foi revogado" }, 410);
    }
    if (new Date(share.expires_at) < new Date()) {
      return jsonResponse({ error: "Link expirado" }, 410);
    }

    // 2. Rate limit checks (por IP global e por link+IP)
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();

    const [globalCount, perLinkCount] = await Promise.all([
      admin
        .from("share_summary_views")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("viewed_at", oneMinAgo),
      admin
        .from("share_summary_views")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .eq("share_id", share.id)
        .gte("viewed_at", oneHourAgo),
    ]);

    if ((globalCount.count ?? 0) >= RATE_LIMIT_PER_IP_PER_MIN) {
      return jsonResponse(
        { error: "Muitas requisições. Aguarde um instante." },
        429,
      );
    }
    if ((perLinkCount.count ?? 0) >= RATE_LIMIT_PER_LINK_PER_IP_PER_HOUR) {
      return jsonResponse(
        { error: "Limite de visualizações deste link atingido." },
        429,
      );
    }

    // Registra a visualização ANTES de processar (proteção contra spam)
    await admin.from("share_summary_views").insert({
      share_id: share.id,
      ip_hash: ipHash,
      user_agent: userAgent,
    });

    // 3. Fetch user data (read-only)
    const userId = share.user_id;
    const periodDays = share.period_days || 30;
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    const sinceISO = since.toISOString();

    const [
      profileRes,
      foodsRes,
      liquidsRes,
      exercisesRes,
      weightRes,
      bodyAnalysesRes,
      bloodExamsRes,
    ] = await Promise.all([
      admin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin
        .from("food_entries")
        .select("consumed_at, calories, protein, carbs, fat")
        .eq("user_id", userId)
        .gte("consumed_at", sinceISO),
      admin
        .from("liquid_entries")
        .select("consumed_at, amount_ml")
        .eq("user_id", userId)
        .gte("consumed_at", sinceISO),
      admin
        .from("exercise_entries")
        .select("performed_at, calories_burned, name")
        .eq("user_id", userId)
        .gte("performed_at", sinceISO),
      admin
        .from("weight_history")
        .select("recorded_at, weight_kg")
        .eq("user_id", userId)
        .gte("recorded_at", sinceISO)
        .order("recorded_at", { ascending: true }),
      admin
        .from("body_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(2),
      admin
        .from("blood_exams")
        .select("*")
        .eq("user_id", userId)
        .order("collected_at", { ascending: false, nullsFirst: false })
        .limit(3),
    ]);

    // 4. Aggregate daily totals
    const days = new Map<string, AggregatedDay>();
    for (let i = 0; i < periodDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.set(key, {
        date: key,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        liquid_ml: 0,
        burned: 0,
        hasWorkout: false,
      });
    }

    for (const f of foodsRes.data ?? []) {
      const k = String(f.consumed_at).slice(0, 10);
      const b = days.get(k);
      if (!b) continue;
      b.calories += Number(f.calories) || 0;
      b.protein += Number(f.protein) || 0;
      b.carbs += Number(f.carbs) || 0;
      b.fat += Number(f.fat) || 0;
    }
    for (const l of liquidsRes.data ?? []) {
      const k = String(l.consumed_at).slice(0, 10);
      const b = days.get(k);
      if (!b) continue;
      b.liquid_ml += Number(l.amount_ml) || 0;
    }
    for (const e of exercisesRes.data ?? []) {
      const k = String(e.performed_at).slice(0, 10);
      const b = days.get(k);
      if (!b) continue;
      b.burned += Number(e.calories_burned) || 0;
      b.hasWorkout = true;
    }

    const dailyArray = Array.from(days.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // 5. Update view count (cumulativo no share)
    await admin
      .from("share_summaries")
      .update({
        view_count: (share.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", share.id);

    // 6. Build sanitized payload (do not leak emails, ids, raw text)
    const profile = profileRes.data || {};
    const lastBody = bodyAnalysesRes.data?.[0];

    const payload = {
      generated_at: new Date().toISOString(),
      period_days: periodDays,
      expires_at: share.expires_at,
      profile: {
        name: profile.name ?? null,
        gender: profile.gender ?? null,
        birth_date: profile.birth_date ?? null,
        height_cm: profile.height_cm ?? null,
        weight_kg: profile.weight_kg ?? null,
        goal: profile.goal ?? null,
        activity_level: profile.activity_level ?? null,
        daily_calories: profile.daily_calories_override ?? profile.daily_calories ?? null,
        daily_protein: profile.daily_protein_override ?? profile.daily_protein ?? null,
        daily_carbs: profile.daily_carbs_override ?? profile.daily_carbs ?? null,
        daily_fat: profile.daily_fat_override ?? profile.daily_fat ?? null,
        daily_liquid_ml: profile.daily_liquid_ml_override ?? profile.daily_liquid_ml ?? null,
      },
      weight_series: (weightRes.data ?? []).map((w: any) => ({
        date: String(w.recorded_at).slice(0, 10),
        weight_kg: Number(w.weight_kg),
      })),
      daily_totals: dailyArray,
      latest_body_analysis: lastBody
        ? {
            created_at: lastBody.created_at,
            extracted: lastBody.extracted_data ?? null,
            summary: lastBody.summary ?? null,
          }
        : null,
      blood_exams: (bloodExamsRes.data ?? []).map((e: any) => ({
        collected_at: e.collected_at,
        lab_name: e.lab_name,
        summary: e.summary,
        markers: (e.markers || []).map((m: any) => ({
          key: m.key,
          label: m.label,
          value: m.value,
          unit: m.unit,
          ref_min: m.ref_min ?? null,
          ref_max: m.ref_max ?? null,
          status: m.status,
          category: m.category,
        })),
      })),
    };

    return jsonResponse({ data: payload });
  } catch (e) {
    console.error("share-summary error", e);
    return jsonResponse({ error: "Erro interno" }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
