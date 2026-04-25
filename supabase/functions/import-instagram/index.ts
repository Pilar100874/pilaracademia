// Edge function: importa vídeos de um post/reel do Instagram (incluindo carrossel)
// Faz download do(s) MP4(s), envia para o bucket exercise-videos e cria
// um item em exercise_library para cada vídeo.

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

// User-Agent de browser real (sem isso o Instagram bloqueia)
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

interface VideoItem {
  url: string;
  width?: number;
  height?: number;
}

/**
 * Tenta múltiplas estratégias para extrair os vídeos de um post.
 * Retorna a lista de vídeos encontrados (1 para post simples, N para carrossel).
 */
async function fetchInstagramVideos(shortcode: string): Promise<VideoItem[]> {
  const videos: VideoItem[] = [];

  // Estratégia 1: endpoint embed (mais estável, não exige login)
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  const embedRes = await fetch(embedUrl, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (embedRes.ok) {
    const html = await embedRes.text();

    // Procura o JSON com dados do post (TimeSliceImpl / additionalDataLoaded)
    const jsonMatches = [
      ...html.matchAll(/"video_url":"([^"]+\.mp4[^"]*)"/g),
      ...html.matchAll(/"video_versions":\s*\[\s*\{[^}]*"url":"([^"]+)"/g),
    ];

    const seen = new Set<string>();
    for (const m of jsonMatches) {
      let url = m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/\\"/g, '"');
      try {
        url = JSON.parse(`"${url}"`);
      } catch {
        // ignora
      }
      if (!seen.has(url)) {
        seen.add(url);
        videos.push({ url });
      }
    }
  }

  // Estratégia 2: oembed-like página principal (fallback)
  if (videos.length === 0) {
    const pageUrl = `https://www.instagram.com/p/${shortcode}/`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const og = html.match(/<meta property="og:video"\s+content="([^"]+)"/);
      if (og) {
        videos.push({ url: og[1].replace(/&amp;/g, "&") });
      }
    }
  }

  return videos;
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

    // Cliente para validar o usuário
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json(401, { error: "Sessão inválida" });
    }
    const userId = userData.user.id;

    // Cliente admin para upload + insert
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

    const videos = await fetchInstagramVideos(shortcode);
    if (videos.length === 0) {
      return json(404, {
        error:
          "Nenhum vídeo encontrado. O post pode ser privado, ter só imagens, ou o Instagram bloqueou o acesso.",
      });
    }

    const created: Array<{ id: string; name: string; video_url: string }> = [];
    const errors: string[] = [];

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      try {
        // Baixa o MP4
        const videoRes = await fetch(v.url, {
          headers: { "User-Agent": UA, Referer: "https://www.instagram.com/" },
        });
        if (!videoRes.ok) {
          errors.push(`Vídeo ${i + 1}: HTTP ${videoRes.status}`);
          continue;
        }
        const buf = new Uint8Array(await videoRes.arrayBuffer());

        if (buf.byteLength < 1024) {
          errors.push(`Vídeo ${i + 1}: arquivo vazio`);
          continue;
        }

        // Upload pro storage
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
