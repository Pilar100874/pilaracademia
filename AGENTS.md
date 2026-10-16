# Project Rules

- Professional sharing uses a common section catalog for PDF and public reports; paginate owner-scoped reads, scope child rows through owned parents, strip account identifiers and storage URLs from public payloads, and preserve token expiry/revocation. Why: complete health sharing must not silently truncate history or widen access to other users and private media.

- Help content lives in a shared topic catalog consumed by the full help page and contextual help drawer. Why: both entry points must describe the same current features without duplicating stale instructions.

- Exercise visual naming runs through a database-deduplicated server queue with leases, bounded batches, terminal AI pauses, and wake-on-enqueue/drain-only scheduling; successful names propagate transactionally to linked workouts. Why: naming must continue with the app closed without duplicate AI calls or repeated completed work.

- Dialogs with action buttons keep the actions in a non-scrolling footer: `DialogContent` is a flex column (`flex flex-col overflow-hidden p-0`) with a fixed header, a `min-h-0 flex-1 overflow-y-auto` body and a `shrink-0 border-t` footer, and always carry `min-w-0` so a long `whitespace-nowrap` label cannot widen the panel past the viewport. Why: on phones and tablets the dialog is a flex item, so its intrinsic min-content width used to push content off-screen and hide the action buttons.

- Sets/reps are per exercise (`workout_exercises.sets/reps`), editable in the workout editor and suggested per exercise by AI; `workout_plans.sets/reps` is the default copied on insert when missing and pushed to all exercises only when the plan value changes; `exercise_library.default_sets/reps` are deprecated. Why: users tune each exercise while keeping a one-step "apply to all".

- Rest duration is persisted per exercise in `workout_exercises.rest_seconds`, with a default for creators that omit it. Why: AI generation, editing and playback must share a real database field rather than a client-only type.

- Gestor accounts (role `gestor`) own members via `managed_users`; members read the gestor's library through RLS, and member restrictions (no workout/library creation) are UI-only and lifted while the gestor is impersonating. Why: the gestor works inside the member account using the member's own session.

- Manager evolution summaries use the authenticated `manager-users` summary action, authorize ownership or master role before reading, paginate records and aggregate daily entries in America/Sao_Paulo; missing daily records stay null, not zero. Why: clinical data must stay scoped to authorized managers and charts must not imply unrecorded consumption or activity.

- Watch (Galaxy Watch/Wear OS) sync runs only in the native Capacitor app via `@capgo/capacitor-health` (Health Connect on Android, HealthKit on iOS); all entry points must guard with `Capacitor.isNativePlatform()` so the web app never touches native health APIs. Why: browsers cannot read Health Connect, and the web build must keep working without native plugins.
- Direct scale reading (Proscan Voice / Fitdays-family) runs only in the native Capacitor app via `@capacitor-community/bluetooth-le` in `src/lib/scaleBle.ts` (service 0xFFB0; AC02 8-byte and ICOMON 20-byte dialects); all entry points must guard with `Capacitor.isNativePlatform()`. Why: browsers cannot use Bluetooth LE here, and the web build must keep working without native plugins.
- The body silhouette in `src/components/HumanBodyFigure.tsx` takes a sex key (male/female/neutral) from its caller — exam `sex` in the bioimpedance report, profile `gender` in the measurements views — and uses it only for base proportions and anatomical clamps, never for stored values; arms are separate shapes drawn over the torso. Why: the same measurements must read as a masculine or feminine body without the drawing breaking or bending the arms around wide hips.
