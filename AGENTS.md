# Project Rules

- Exercise visual naming runs through a database-deduplicated server queue with leases, bounded batches, terminal AI pauses, and wake-on-enqueue/drain-only scheduling; successful names propagate transactionally to linked workouts. Why: naming must continue with the app closed without duplicate AI calls or repeated completed work.

- Dialogs with action buttons keep the actions in a non-scrolling footer: `DialogContent` is a flex column (`flex flex-col overflow-hidden p-0`) with a fixed header, a `min-h-0 flex-1 overflow-y-auto` body and a `shrink-0 border-t` footer, and always carry `min-w-0` so a long `whitespace-nowrap` label cannot widen the panel past the viewport. Why: on phones and tablets the dialog is a flex item, so its intrinsic min-content width used to push content off-screen and hide the action buttons.

- Sets/reps are per exercise (`workout_exercises.sets/reps`), editable in the workout editor and suggested per exercise by AI; `workout_plans.sets/reps` is the default copied on insert when missing and pushed to all exercises only when the plan value changes; `exercise_library.default_sets/reps` are deprecated. Why: users tune each exercise while keeping a one-step "apply to all".

- Gestor accounts (role `gestor`) own members via `managed_users`; members read the gestor's library through RLS, and member restrictions (no workout/library creation) are UI-only and lifted while the gestor is impersonating. Why: the gestor works inside the member account using the member's own session.

- Manager evolution summaries use the authenticated `manager-users` summary action, authorize ownership or master role before reading, paginate records and aggregate daily entries in America/Sao_Paulo; missing daily records stay null, not zero. Why: clinical data must stay scoped to authorized managers and charts must not imply unrecorded consumption or activity.
