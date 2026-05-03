---
name: Background analysis
description: Bioimpedância e exames de sangue analisam em background com toast de progresso + botão "Ver" para abrir a página correspondente
type: feature
---
- Provider `BackgroundAnalysisProvider` em `src/contexts/BackgroundAnalysisContext.tsx` envolve a app (após `AuthProvider`).
- Expõe `startBioimpedance(file)` e `startBloodExam(file)`. Cada job mostra `toast.loading` persistente e converte em `toast.success` com action "Ver análise"/"Ver exame" ao terminar.
- Bioimpedância: navega para `/body-analysis?id={created.id}` — `BodyAnalysisPage` lê o `?id=` via `useSearchParams` e pré-seleciona a análise.
- Exame de sangue: navega para `/bioimpedance?tab=blood` — `BioimpedancePage` controla a aba via `?tab=` em `useSearchParams`.
- `BloodExamUploadDialog` foi simplificado: só dispara o job e fecha; toda a lógica vive no provider.
- `BodyAnalysisPage.handleFile` apenas chama `startBioimpedance`. Sincronia de perfil (peso/altura/sexo) acontece dentro do provider.
