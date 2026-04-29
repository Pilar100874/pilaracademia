---
name: Exercise Library
description: Reusable exercise templates decoupled from workout plans, with custom user categories (multi-category, with subcategories), video sources (YouTube/Instagram/Upload), and video thumbnails
type: feature
---
- Exercises are stored in `exercise_library`, decoupled from workout plans, reusable across plans.
- **Categories are MULTI-VALUED**: junction table `exercise_library_categories(exercise_id, category_id)`. Each exercise can belong to several categories AND subcategories simultaneously.
  - Hook `useExerciseLibrary` returns `category_ids: string[]` (loaded via parallel fetch + grouped client-side).
  - Legacy column `exercise_library.category_id` is kept and auto-mirrored (trigger `sync_exercise_primary_category`) to the FIRST category in the junction so older code paths and RLS keep working.
  - `toggleExerciseCategory` mutation in `useExerciseLibrary` adds/removes a single link with optimistic cache updates. Use this for multi-pickers.
- Categories support **subcategories** via nullable `parent_id` (self-FK, ON DELETE CASCADE). Selects render hierarchical with `↳` and indentation. The library filter is exact-match (filtering by a parent does NOT include children — user must select the subcategory explicitly), but with multi-category you can simply add both the parent AND the child to an exercise.
- **Category creation/management lives ONLY in the Exercise Library page**. The exercise create/edit dialog only lets the user pick from the existing tree.
- The **full-screen video preview** (`VideoPreviewDialog`) is now a multi-select picker:
  - Top row: parent categories (with `▾` marker if they have children).
  - For every parent that is selected (or has any selected child), a sub-row appears below showing all its children — labeled with the parent name.
  - Clicking a pill toggles ON/OFF (does NOT auto-advance). Navigation between videos happens ONLY via the prev/next buttons or `←`/`→` arrow keys.

### Video sources
- `video_type` accepts `youtube | upload | instagram | null`.
- **YouTube**: full IFrame API control — autoplay (muted), looping over `video_start_seconds`/`video_end_seconds`, controls/timeline disabled.
- **Upload**: HTML5 video, autoplay muted, loop within trimmed range, controls disabled.
- **Instagram**: simple official embed. No autoplay, loop, time trimming or custom controls.

### Thumbnails
- Priority: first image > VideoThumbnail > Dumbbell placeholder.
- YouTube: `img.youtube.com/vi/{id}/hqdefault.jpg`.
- Upload: frame captured at `video_start_seconds` via hidden <video> + canvas.
- Instagram: gradient placeholder + Instagram icon.

### Video preview popup
- Clicking a thumbnail in the library (when not in selection mode) opens a Dialog with `ExerciseVideoPlayer` autoplaying and looping the trimmed range.

### Video compression
- Uploads (single + bulk) and Instagram imports are auto-recompressed to ~720p WebM via `src/lib/compressVideo.ts` using MediaRecorder + canvas.
- A background auto-optimizer in `ExerciseLibraryPage` runs on mount and re-encodes legacy MP4s one-at-a-time while the tab is visible. Failures are tracked in `sessionStorage` to avoid retry loops.
