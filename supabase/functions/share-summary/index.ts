// Edge function pública: retorna o resumo de um link de compartilhamento
// validando o token, expiração e aplicando rate limiting por IP.
//
// Endpoint: POST /functions/v1/share-summary
// Body: { token: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { reportSections, sanitizeReport, aggregateReportDays } from "../_shared/professionalReport.ts";

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

    const userId = share.user_id;
    const periodDays = share.period_days || 30;
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - periodDays + 1);
    const startDate = start.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const endDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const read = async (table: string, dateColumn: string | null, parent?: { column: string; ids: string[] }) => {
      const rows: any[] = [];
      if (parent && !parent.ids.length) return rows;
      for (let offset = 0; ; offset += 1000) {
        let query = admin.from(table).select('*');
        query = parent ? query.in(parent.column, parent.ids) : query.eq('user_id', userId);
        if (dateColumn) query = query.gte(dateColumn, dateColumn === 'week_start' ? startDate : `${startDate}T00:00:00-03:00`).lt(dateColumn, dateColumn === 'week_start' ? `${endDate}T23:59:59` : `${endDate}T23:59:59.999-03:00`);
        const { data, error } = await query.order('id').range(offset, offset + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if ((data?.length ?? 0) < 1000) break;
      }
      return rows;
    };
    const { data: profile, error: profileError } = await admin.from('profiles')
      .select('name,gender,birth_date,height_cm,weight_kg,goal,activity_level,daily_calories,daily_calories_override,daily_protein,daily_protein_override,daily_carbs,daily_carbs_override,daily_fat,daily_fat_override,daily_liquid_ml,daily_liquid_ml_override')
      .eq('user_id', userId).maybeSingle();
    if (profileError) throw profileError;
    const entries = await Promise.all(reportSections.map(async section => [section.key, await read(section.key, section.date)] as const));
    const records: Record<string, any[]> = Object.fromEntries(entries);
    const workoutExercises = await read('workout_exercises', null, { column: 'workout_plan_id', ids: records.workout_plans.map(row => row.id) });
    records.workout_plans = records.workout_plans.map(row => ({ ...row, exercises: workoutExercises.filter(ex => ex.workout_plan_id === row.id).sort((a, b) => a.order_index - b.order_index) }));
    const kitItems = await read('food_kit_items', null, { column: 'kit_id', ids: records.food_kits.map(row => row.id) });
    records.food_kits = records.food_kits.map(row => ({ ...row, items: kitItems.filter(item => item.kit_id === row.id).map(item => ({ quantity: item.quantity, unit: item.unit, product: records.custom_products.find(product => product.id === item.product_id)?.name ?? 'Produto' })) }));
    // No storage capability is exposed by a public report. Media stays in the owner's authenticated app.
    const stripMedia = (value: any): any => {
      if (Array.isArray(value)) return value.map(stripMedia);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/url|hash/i.test(key)).map(([key, item]) => [key, stripMedia(item)]));
      return value;
    };
    const sections = reportSections.map(section => ({ key: section.key, title: section.title, records: stripMedia(sanitizeReport(records[section.key])) }));
    const dailyArray = aggregateReportDays(records.food_entries, records.liquid_entries, records.exercise_entries);

    // 5. Update view count (cumulativo no share)
    await admin
      .from("share_summaries")
      .update({
        view_count: (share.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", share.id);

    const payload = {
      generated_at: new Date().toISOString(), period_days: periodDays, expires_at: share.expires_at,
      start_date: startDate, end_date: endDate, profile: sanitizeReport(profile ?? {}),
      weight_series: records.weight_history.map(w => ({ date: w.recorded_at, weight_kg: w.weight_kg })),
      daily_totals: dailyArray, sections,
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
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
