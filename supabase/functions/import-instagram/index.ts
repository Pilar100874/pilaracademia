// Importa vídeos de um post/reel do Instagram (incluindo carrossel) usando
// o ator "apify/instagram-scraper" via API síncrona do Apify.
// Token de API global: APIFY_API_TOKEN (secret no projeto).

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

interface VideoItem {
  url: string;
}

/**
 * Roda o ator apify/instagram-scraper de forma síncrona e devolve os vídeos
 * encontrados (1 ou N para carrossel).
 */
async function fetchInstagramVideos(
  rawUrl: string,
  apifyToken: string,
): Promise<{ videos: VideoItem[]; raw?: unknown; error?: string }> {
  // run-sync-get-dataset-items roda o ator e devolve o dataset diretamente.
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
    return { videos: [], error: `Apify fetch error: ${(e as Error).message}` };
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return {
      videos: [],
      error: `Apify HTTP ${res.status}: ${txt.slice(0, 250)}`,
    };
  }

  const items = await res.json().catch(() => null);
  if (!Array.isArray(items) || items.length === 0) {
    return { videos: [], error: "Apify retornou dataset vazio" };
  }

  const item = items[0] as any;
  const videos: VideoItem[] = [];

  // Carrossel: childPosts[]
  const children = item?.childPosts;
  if (Array.isArray(children) && children.length > 0) {
    for (const c of children) {
      const v = c?.videoUrl || c?.video_url;
      if (typeof v === "string" && v) videos.push({ url: v });
    }
  }

  // Post único (ou se carrossel não trouxe nada, tenta o pai)
  if (videos.length === 0) {
    const v = item?.videoUrl || item?.video_url;
    if (typeof v === "string" && v) videos.push({ url: v });
  }

  return { videos, raw: item };
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
    const apifyToken = Deno.env.get("APIFY_API_TOKEN");

    if (!apifyToken) {
      return json(500, {
        error: "APIFY_API_TOKEN não configurado no servidor",
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json(401, { error: "Sessão inválida" });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

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

    const { videos, error: scrapeErr } = await fetchInstagramVideos(
      url,
      apifyToken,
    );
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
