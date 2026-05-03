---
name: Workout Cooldown
description: "Alongamento Final" é um plano global único por usuário (workout_plans.is_cooldown_plan=true), gerenciado por botão dedicado na WorkoutsPage (CooldownPlanDialog) — não fica mais dentro do menu de criar treino. WorkoutViewerDialog pergunta ao finalizar se quer rodar a sequência.
type: feature
---

- Tabela `workout_plans` tem coluna `is_cooldown_plan` (boolean, único por usuário via partial unique index).
- `useWorkoutPlans` expõe `cooldownPlan` separado de `workoutPlans` (lista regular já filtrada).
- `CooldownPlanDialog` cria o plano sob demanda com `name: 'Alongamento Final'` e `is_cooldown_plan: true`.
- Botão "Alongamento" no header da `WorkoutsPage` abre esse dialog.
- `WorkoutViewerDialog` usa `cooldownPlan?.exercises` como sequência de cooldown; energy mode não é aplicado durante o cooldown.
- Coluna legada `workout_exercises.is_cooldown` e `workout_plans.cooldown_enabled` permanecem no schema mas não são mais usadas pela UI.
