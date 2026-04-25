// Importa vídeos de um post/reel do Instagram (incluindo carrossel) usando
// a API "instagram-scraper-api2" do RapidAPI. A chave é lida da tabela
// user_settings.instagram_api_key do próprio usuário.

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

const RAPIDAPI_HOST = "instagram-scraper-api2.p.rapidapi.com";

function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

interface VideoItem {
  url: string;
}

/**
 * Chama o endpoint /v1/post_info do instagram-scraper-api2 e devolve a lista
 * de vídeos (1 ou N para carrossel).
 */
async function fetchInstagramVideos(
  rawUrl: string,
  apiKey: string,
): Promise<{ videos: VideoItem[]; raw?: unknown; error?: string }> {
  const apiUrl =
    `https://${RAPIDAPI_HOST}/v1/post_info?code_or_id_or_url=${encodeURIComponent(rawUrl)}&include_insights=false`;

  const res = await fetch(apiUrl, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return {
      videos: [],
      error: `RapidAPI HTTP ${res.status}: ${txt.slice(0, 200)}`,
    };
  }

  const data = await res.json().catch(() => null);
  if (!data) return { videos: [], error: "Resposta inválida da RapidAPI" };

  const node = (data as any).data ?? data;
  const videos: VideoItem[] = [];

  // Carrossel: carousel_media[]
  const carousel = node?.carousel_media;
  if (Array.isArray(carousel) && carousel.length > 0) {
    for (const item of carousel) {
      const v =
        item?.video_url ||
        item?.video_versions?.[0]?.url ||
        item?.videos?.[0]?.url;
      if (v && typeof v === "string") videos.push({ url: v });
    }
  } else {
    const single =
      node?.video_url ||
      node?.video_versions?.[0]?.url ||
      node?.videos?.[0]?.url;
    if (single && typeof single === "string") videos.push({ url: single });
  }

  return { videos, raw: node };
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json(401, { error: "Sessão inválida" });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Lê a chave do RapidAPI das configurações do usuário
    const { data: settings } = await admin
      .from("user_settings")
      .select("instagram_api_key")
      .eq("user_id", userId)
      .maybeSingle();

    const apiKey = settings?.instagram_api_key?.trim();
    if (!apiKey) {
      return json(400, {
        error:
          "Chave da API do Instagram não configurada. Vá em Configurações da Biblioteca e cole sua chave do RapidAPI.",
        needs_api_key: true,
      });
    }

    const body = await req.json().catch(() => ({}));
    const { url, category_id, name_prefix } = body as {
      url?: string;
      category_id?: string | null;
      name_prefix?: string;
    };

    if (!url || typeof url !== "string") {
      return json(400, { error: "URL é obrigatória" });
    }

    const shortcode = extractShortcode(url);
    if (!shortcode) {
      return json(400, { error: "URL do Instagram inválida" });
    }

    const { videos, error: scrapeErr } = await fetchInstagramVideos(url, apiKey);
    if (scrapeErr) {
      return json(502, { error: scrapeErr });
    }
    if (videos.length === 0) {
      return json(404, {
        error:
          "Nenhum vídeo encontrado nesse post. Verifique se é público e contém vídeos.",
      });
    }

    const created: Array<{ id: string; name: string; video_url: string }> = [];
    const errors: string[] = [];

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      try {
        const videoRes = await fetch(v.url);
        if (!videoRes.ok) {
          errors.push(`Vídeo ${i + 1}: HTTP ${videoRes.status}`);
          continue;
        }
        const buf = new Uint8Array(await videoRes.arrayBuffer());

        if (buf.byteLength < 1024) {
          errors.push(`Vídeo ${i + 1}: arquivo vazio`);
          continue;
        }

        const path = `${userId}/instagram-${shortcode}-${i + 1}-${Date.now()}.mp4`;
        const { error: upErr } = await admin.storage
          .from("exercise-videos")
          .upload(path, buf, { contentType: "video/mp4", upsert: false });

        if (upErr) {
          errors.push(`Vídeo ${i + 1}: upload falhou - ${upErr.message}`);
          continue;
        }

        const { data: pub } = admin.storage
          .from("exercise-videos")
          .getPublicUrl(path);

        const baseName = name_prefix?.trim() || `Instagram ${shortcode}`;
        const exName =
          videos.length > 1 ? `${baseName} (${i + 1})` : baseName;

        const { data: ex, error: insErr } = await admin
          .from("exercise_library")
          .insert({
            user_id: userId,
            name: exName,
            image_urls: [],
            default_sets: 3,
            default_reps: 12,
            video_type: "upload",
            video_url: pub.publicUrl,
            video_start_seconds: null,
            video_end_seconds: null,
            category_id: category_id || null,
          })
          .select()
          .single();

        if (insErr) {
          errors.push(`Vídeo ${i + 1}: ${insErr.message}`);
          continue;
        }

        created.push({
          id: ex.id,
          name: ex.name,
          video_url: pub.publicUrl,
        });
      } catch (e) {
        errors.push(`Vídeo ${i + 1}: ${(e as Error).message}`);
      }
    }

    return json(200, {
      success: created.length > 0,
      created_count: created.length,
      total_videos: videos.length,
      created,
      errors,
    });
  } catch (e) {
    console.error("import-instagram error:", e);
    return json(500, { error: (e as Error).message });
  }
});
