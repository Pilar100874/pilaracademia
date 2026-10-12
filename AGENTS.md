# Project Rules

- Exercise visual naming runs through a database-deduplicated server queue with leases, bounded batches, terminal AI pauses, and wake-on-enqueue/drain-only scheduling; successful names propagate transactionally to linked workouts. Why: naming must continue with the app closed without duplicate AI calls or repeated completed work.

- Dialogs with action buttons keep the actions in a non-scrolling footer: `DialogContent` is a flex column (`flex flex-col overflow-hidden p-0`) with a fixed header, a `min-h-0 flex-1 overflow-y-auto` body and a `shrink-0 border-t` footer, and always carry `min-w-0` so a long `whitespace-nowrap` label cannot widen the panel past the viewport. Why: on phones and tablets the dialog is a flex item, so its intrinsic min-content width used to push content off-screen and hide the action buttons.
