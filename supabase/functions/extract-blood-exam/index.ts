// Edge function: extrai marcadores de exame de sangue a partir do texto extraído do PDF
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  rawText: z.string().trim().min(20, 'Texto muito curto').max(200_000, 'Texto muito longo'),
});

const SYSTEM_PROMPT = `Você é um especialista em interpretar exames laboratoriais brasileiros (Lavoisier, Dasa, Fleury, Sabin, Hermes Pardini, DB, Delboni, Alta, etc.) para uso em um app de nutrição e treino.
Receberá o texto bruto de um exame de sangue (em português). Extraia os marcadores principais e devolva via tool call.

REGRAS DE EXTRAÇÃO:
- Extraia TODOS os marcadores numéricos relevantes: hemograma completo (eritrócitos, hemoglobina, hematócrito, VCM, HCM, CHCM, RDW, leucócitos, neutrófilos, linfócitos, monócitos, eosinófilos, basófilos, plaquetas, VPM), glicose, insulina, HOMA-IR, hemoglobina glicada (HbA1c), perfil lipídico (colesterol total, HDL, LDL, VLDL, triglicérides, não-HDL), TSH, T4 livre/total, T3, testosterona total/livre, SHBG, estradiol, progesterona, cortisol, DHEA, vitamina D (25-OH), B12, ácido fólico, ferro sérico, ferritina, transferrina, saturação de transferrina, creatinina, ureia, TGO/AST, TGP/ALT, GGT, fosfatase alcalina, bilirrubinas, ácido úrico, PCR (proteína C reativa), PSA, sódio, potássio, cálcio, magnésio, fósforo, albumina.
- O texto pode vir SUJO (cabeçalhos/rodapés repetidos a cada página, "Pág. X de Y", QR tokens, assinaturas eletrônicas). IGNORE esse ruído e foque nos resultados.
- Os valores podem aparecer separados da unidade ou da faixa por quebras de linha/tabelas. Reconstrua mentalmente a tabela. Ex.: "Hemoglobina 14,1 g/dL" com referência "12,0 a 15,0 g/dL". Use vírgula OU ponto como decimal — converta para ponto.
- Para contagens grandes ("177.000 /µL", "7.740 /µL") o ponto é separador de milhar — converta para o número inteiro correto (177000, 7740).
- "value" é número (ponto decimal). "unit" é a unidade do laudo. "ref_min"/"ref_max" são os limites de referência numéricos. Quando a referência for "Inferior a X" ou "< X", use ref_min=null e ref_max=X. Quando for "Superior a X" ou "> X", use ref_min=X e ref_max=null.
- "status": calcule a partir do valor vs faixa — "low" (< ref_min), "normal" (dentro), "high" (> ref_max), "borderline" (até 5% da borda). Se o laudo marcar com ícone (✓ normal, ⚠ alterado), use isso como confirmação. Se não houver referência, "unknown".
- "category": uma de "hemograma", "glicemia", "lipidios", "hormonios", "vitaminas_minerais", "rim_figado", "outros".
- "key": chave snake_case estável em português (ex.: "hemoglobina", "glicose_jejum", "colesterol_hdl", "tsh", "vitamina_d", "ferritina"). "label": rótulo amigável.

CAMPOS GERAIS:
- "summary": resumo didático em português simples (3-6 frases) destacando o que está bem, o que merece atenção e o impacto geral. Sem jargão. NUNCA use termos em inglês como cutting, bulking.
- "alerts": avisos curtos para marcadores fora da faixa que afetam dieta/treino (ex.: "Glicemia de jejum elevada — reduzir carboidratos refinados").
- "diet_recommendations": orientações alimentares acionáveis baseadas nos resultados.
- "collected_at": data da coleta no formato YYYY-MM-DD. Procure por "DATA COLETA", "DATA COLETA/RECEBIMENTO", "Data da Ficha", "Coletado em", "Recebido em", "Data da coleta". Datas brasileiras vêm como DD/MM/AAAA — converta. Se não achar, null.
- "lab_name": nome do laboratório (ex.: "Lavoisier", "Fleury", "Dasa", "Sabin", "Hermes Pardini"). Lavoisier faz parte do grupo Dasa — se ver ambos, use "Lavoisier".`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Entrada inválida', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { rawText } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const tools = [{
      type: 'function',
      function: {
        name: 'register_blood_exam',
        description: 'Registra os marcadores extraídos do exame de sangue.',
        parameters: {
          type: 'object',
          properties: {
            collected_at: { type: ['string', 'null'] },
            lab_name: { type: ['string', 'null'] },
            summary: { type: 'string' },
            markers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  label: { type: 'string' },
                  value: { type: ['number', 'null'] },
                  unit: { type: ['string', 'null'] },
                  ref_min: { type: ['number', 'null'] },
                  ref_max: { type: ['number', 'null'] },
                  status: { type: 'string', enum: ['low', 'normal', 'high', 'borderline', 'unknown'] },
                  category: { type: 'string' },
                  note: { type: ['string', 'null'] },
                },
                required: ['key', 'label', 'value', 'unit', 'status', 'category'],
                additionalProperties: false,
              },
            },
            alerts: { type: 'array', items: { type: 'string' } },
            diet_recommendations: { type: 'array', items: { type: 'string' } },
          },
          required: ['summary', 'markers', 'alerts', 'diet_recommendations'],
          additionalProperties: false,
        },
      },
    }];

    // Limpa ruído típico de laudos brasileiros (cabeçalhos/rodapés repetidos a cada página)
    const NOISE_PATTERNS: RegExp[] = [
      /Atendimento ao (cliente|m[eé]dico)[^\n]*/gi,
      /\(11\)\s*\d{4}\s*\d{4}/g,
      /www\.[a-z0-9.-]+\.com\.br/gi,
      /NAM\s*-\s*N[úu]cleo de Assessoria M[eé]dica:?\s*[\d-]+/gi,
      /Laborat[óo]rio registrado no CRM\/SP[^\n]*/gi,
      /Sob a responsabilidade do Dr\.[^\n]*/gi,
      /Laudo tamb[ée]m dispon[íi]vel ao m[ée]dico prescritor[^\n]*/gi,
      /Valide seu laudo com o QR Code[^\n]*/gi,
      /valida\.dasa\.com\.br/gi,
      /Token:\s*`?[A-Za-z0-9_-]+`?/g,
      /Hash:\s*[a-f0-9]{20,}/gi,
      /P[áa]g\.\s*\d+\s*de\s*\d+/gi,
      /Assinado eletronicamente por:[^\n]*/gi,
      /Respons[áa]vel:\s*Dr\.[^\n]*/gi,
      /Data da gera[çc][ãa]o:[^\n]*/gi,
      /A interpreta[çc][ãa]o dos resultados[^\n]*/gi,
      /!\[[^\]]*\]\([^)]+\)/g, // imagens markdown
    ];
    let cleaned = rawText;
    for (const re of NOISE_PATTERNS) cleaned = cleaned.replace(re, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();

    const truncated = cleaned.length > 90000 ? cleaned.slice(0, 90000) : cleaned;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Texto do exame:\n\n${truncated}` },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: 'register_blood_exam' } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de uso da IA atingido. Tente novamente em alguns instantes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos da IA esgotados.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, t);
      return new Response(JSON.stringify({ error: 'Falha ao analisar exame' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error('IA não retornou os marcadores');

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('extract-blood-exam error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
