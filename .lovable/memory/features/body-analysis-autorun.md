---
name: Body Analysis Autorun
description: Análise corporal por IA (Gemini) dos vídeos da biblioteca de exercícios — colunas, edge function e auto-otimizador em background
type: feature
---
- Colunas em `exercise_library`: `body_analysis jsonb`, `aesthetic_analysis jsonb`, `body_analyzed_at timestamptz`.
- `body_analysis` tem 17 chaves agrupadas (Tronco/Core, Membros inferiores, Membros superiores). `aesthetic_analysis` tem 6 chaves (flacidez, retenção, assimetria, postura, gordura localizada, definição muscular). Cada valor é 0-100 (independente — NÃO somam 100).
- Constantes/labels canônicos vivem em `src/lib/exerciseAnalysis.ts` (compartilhado pela UI). `topBodyAreas(analysis, n)` retorna as N áreas com maior %.
- Edge function `analyze-exercise-video` (config `verify_jwt = false`): baixa o vídeo, faz base64, envia inline_data ao Gemini 2.5 Flash via Lovable AI Gateway, força output estruturado por **tool calling** (`classify_exercise`). Limite ~30MB por vídeo. Trata 429/402.
- Hook `useBodyAnalysisAutorun(exercises)` em `ExerciseLibraryPage`: roda 1 vídeo por vez quando a aba está visível, atualiza o react-query cache imediatamente após cada sucesso (progresso persiste se a aba fechar) e marca falhas em `sessionStorage` (`pilar:body-analysis-failed`) para evitar loops. Pula `video_type === 'instagram'`.
- Card do exercício na biblioteca: mostra inline as TOP 3 áreas trabalhadas (badges discretas com `nome • %`).
- Padrão idêntico ao auto-otimizador de vídeo já existente — não confundir os dois (otimização re-codifica o arquivo; análise classifica conteúdo).
