// Converte um exercício existente cujo video_type='instagram' (iframe pesado)
// em um vídeo MP4 hospedado no storage `exercise-videos` (video_type='upload').
// Usa o ator apify/instagram-scraper para resolver a URL final do MP4.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

async function fetchFirstInstagramVideo(
  rawUrl: string,
  apifyToken: string,
): Promise<{ videoUrl: string | null; error?: string }> {
  const apiUrl =
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(apifyToken)}&timeout=120`;
  const input = {
    directUrls: [rawUrl],
    resultsType: "details",
    resultsLimit: 1,
    addParentData: false,
  };
  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (e) {
    return { videoUrl: null, error: `Apify fetch error: ${(e as Error).message}` };
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { videoUrl: null, error: `Apify HTTP ${res.status}: ${txt.slice(0, 250)}` };
  }
  const items = await res.json().catch(() => null);
  if (!Array.isArray(items) || items.length === 0) {
    return { videoUrl: null, error: "Apify retornou dataset vazio" };
  }
  const item = items[0] as any;

  // Carrossel: pega o primeiro filho com vídeo
  const children = item?.childPosts;
  if (Array.isArray(children) && children.length > 0) {
    for (const c of children) {
      const v = c?.videoUrl || c?.video_url;
      if (typeof v === "string" && v) return { videoUrl: v };
    }
  }
  const v = item?.videoUrl || item?.video_url;
  if (typeof v === "string" && v) return { videoUrl: v };
  return { videoUrl: null, error: "Post não contém vídeo" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Não autenticado" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const globalApifyToken = Deno.env.get("APIFY_API_TOKEN");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Sessão inválida" });
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: settings } = await admin
      .from("user_settings")
      .select("instagram_api_key")
      .eq("user_id", userId)
      .maybeSingle();
    const personalToken = (settings?.instagram_api_key as string | null)?.trim();
    const personalTokenValid = personalToken && personalToken.startsWith("apify_api_");
    const apifyToken = personalTokenValid ? personalToken : globalApifyToken;
    if (!apifyToken) {
      return json(500, { error: "Nenhum token Apify configurado." });
    }

    const body = await req.json().catch(() => ({}));
    const { exercise_id } = body as { exercise_id?: string };
    if (!exercise_id || typeof exercise_id !== "string") {
      return json(400, { error: "exercise_id é obrigatório" });
    }

    const { data: ex, error: exErr } = await admin
      .from("exercise_library")
      .select("id, user_id, name, video_type, video_url")
      .eq("id", exercise_id)
      .maybeSingle();
    if (exErr || !ex) return json(404, { error: "Exercício não encontrado" });
    if (ex.user_id !== userId) return json(403, { error: "Sem permissão" });
    if (ex.video_type !== "instagram" || !ex.video_url) {
      return json(400, { error: "Exercício não é do tipo Instagram" });
    }

    const shortcode = extractShortcode(ex.video_url);
    if (!shortcode) return json(400, { error: "URL do Instagram inválida" });

    const { videoUrl, error: scrapeErr } = await fetchFirstInstagramVideo(
      ex.video_url,
      apifyToken,
    );
    if (scrapeErr || !videoUrl) {
      return json(502, { error: scrapeErr || "Vídeo não encontrado" });
    }

    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) return json(502, { error: `Download falhou: HTTP ${videoRes.status}` });
    const buf = new Uint8Array(await videoRes.arrayBuffer());
    if (buf.byteLength < 1024) return json(502, { error: "Arquivo vazio" });

    const path = `${userId}/instagram-${shortcode}-${Date.now()}.mp4`;
    const { error: upErr } = await admin.storage
      .from("exercise-videos")
      .upload(path, buf, { contentType: "video/mp4", upsert: false });
    if (upErr) return json(500, { error: `Upload falhou: ${upErr.message}` });

    const { data: pub } = admin.storage.from("exercise-videos").getPublicUrl(path);

    const { error: updErr } = await admin
      .from("exercise_library")
      .update({
        video_type: "upload",
        video_url: pub.publicUrl,
        video_start_seconds: null,
        video_end_seconds: null,
      })
      .eq("id", exercise_id);
    if (updErr) return json(500, { error: `Update falhou: ${updErr.message}` });

    return json(200, {
      success: true,
      exercise_id,
      video_url: pub.publicUrl,
      size_bytes: buf.byteLength,
    });
  } catch (e) {
    console.error("convert-instagram-to-storage error:", e);
    return json(500, { error: (e as Error).message });
  }
});
