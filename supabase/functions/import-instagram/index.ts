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

const RAPIDAPI_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

// Endpoints conhecidos da "Instagram Scraper Stable API" (thetechguy32744) que
// retornam os dados de um post/reel a partir do shortcode. Tentamos em ordem
// até obter sucesso, pois o nome exato do endpoint varia entre versões.
const POST_ENDPOINTS = [
  "get_media_info.php",
  "get_post_info.php",
  "get_media.php",
  "get_post.php",
  "get_reel.php",
  "post_info.php",
  "media_info.php",
];

function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

interface VideoItem {
  url: string;
}

// Percorre recursivamente o JSON e extrai todas as URLs de vídeo (.mp4) que
// encontrar, agrupadas por "container" (carousel item) quando possível.
function collectVideosFromNode(node: any): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const visit = (obj: any) => {
    if (!obj) return;
    if (typeof obj === "string") {
      if (
        /^https?:\/\/[^"\s]+\.mp4(\?|$)/i.test(obj) &&
        !seen.has(obj)
      ) {
        seen.add(obj);
        found.push(obj);
      }
      return;
    }
    if (Array.isArray(obj)) {
      for (const v of obj) visit(v);
      return;
    }
    if (typeof obj === "object") {
      // priorizar campos clássicos primeiro, na ordem
      const priorityKeys = [
        "video_url",
        "video_versions",
        "videos",
        "playback_url",
        "src",
      ];
      for (const k of priorityKeys) {
        if (k in obj) visit(obj[k]);
      }
      for (const k of Object.keys(obj)) {
        if (priorityKeys.includes(k)) continue;
        visit(obj[k]);
      }
    }
  };

  visit(node);
  return found;
}

// Extrai vídeos respeitando estrutura de carrossel quando presente.
function extractVideos(node: any): VideoItem[] {
  if (!node) return [];

  const root = node?.data ?? node?.items?.[0] ?? node;

  const videos: VideoItem[] = [];

  // 1) Tenta carousel_media (formato Instagram Graph)
  const carousel =
    root?.carousel_media ??
    root?.carousel ??
    root?.media?.carousel_media ??
    root?.edge_sidecar_to_children?.edges;

  if (Array.isArray(carousel) && carousel.length > 0) {
    for (const item of carousel) {
      const it = item?.node ?? item;
      const urls = collectVideosFromNode(it);
      if (urls[0]) videos.push({ url: urls[0] });
    }
    if (videos.length > 0) return videos;
  }

  // 2) Post único
  const single =
    root?.video_url ||
    root?.video_versions?.[0]?.url ||
    root?.videos?.[0]?.url ||
    root?.media?.video_url;
  if (single && typeof single === "string") {
    return [{ url: single }];
  }

  // 3) Fallback: varre tudo procurando .mp4
  const all = collectVideosFromNode(root);
  return all.map((u) => ({ url: u }));
}

async function fetchInstagramVideos(
  rawUrl: string,
  shortcode: string,
  apiKey: string,
): Promise<{ videos: VideoItem[]; raw?: unknown; error?: string }> {
  const attempts: string[] = [];

  for (const ep of POST_ENDPOINTS) {
    // tenta com vários nomes de parâmetros comuns
    const variants = [
      `post_code=${encodeURIComponent(shortcode)}`,
      `shortcode=${encodeURIComponent(shortcode)}`,
      `code=${encodeURIComponent(shortcode)}`,
      `url=${encodeURIComponent(rawUrl)}`,
    ];

    for (const qs of variants) {
      const apiUrl = `https://${RAPIDAPI_HOST}/${ep}?${qs}`;
      let res: Response;
      try {
        res = await fetch(apiUrl, {
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": RAPIDAPI_HOST,
          },
        });
      } catch (e) {
        attempts.push(`${ep}?${qs} → fetch error: ${(e as Error).message}`);
        continue;
      }

      if (res.status === 404) {
        attempts.push(`${ep} → 404 (endpoint não existe)`);
        // próximo endpoint (sem testar outras variantes)
        break;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        attempts.push(`${ep}?${qs} → HTTP ${res.status}: ${txt.slice(0, 120)}`);
        continue;
      }

      const data = await res.json().catch(() => null);
      if (!data) {
        attempts.push(`${ep}?${qs} → JSON inválido`);
        continue;
      }

      const videos = extractVideos(data);
      if (videos.length > 0) {
        return { videos, raw: data };
      }
      attempts.push(`${ep}?${qs} → 200 mas sem vídeos`);
      // passar para próxima variante / endpoint
    }
  }

  return {
    videos: [],
    error:
      `Não foi possível obter o vídeo. Tentativas:\n${attempts.slice(0, 10).join("\n")}`,
  };
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

    const { videos, error: scrapeErr } = await fetchInstagramVideos(url, shortcode, apiKey);
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
