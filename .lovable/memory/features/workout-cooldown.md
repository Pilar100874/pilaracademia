---
name: Workout Cooldown (Final de Treino)
description: Optional cooldown/stretching section per workout, triggered on finish
type: feature
---
- `workout_exercises.is_cooldown` (bool) marks an exercise as part of the final stretching routine.
- `workout_plans.cooldown_enabled` (bool, default true) toggles whether the routine is active.
- WorkoutPlanDialog shows a separate "Final de treino (alongamento)" section with a Switch and its own add button (`addingCooldown` state controls if next library pick goes to cooldown).
- WorkoutViewerDialog: header has a "Finalizar" button. On press (or reaching last main exercise), shows a prompt offering "Fazer alongamento final" (if `hasCooldown`) or "Encerrar agora". Cooldown phase ignores energy mode adjustments.
