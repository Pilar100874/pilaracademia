---
name: Exercise Library
description: Reusable exercise templates decoupled from workout plans, with custom user categories, video sources (YouTube/Instagram/Upload), and video thumbnails
type: feature
---
- Exercises are stored in `exercise_library` table, decoupled from workout plans, and can be reused across plans.
- Each user manages their own categories via `exercise_categories` table (CRUD). Exercises reference a category via nullable `category_id` (ON DELETE SET NULL).
- Categories are created inline from the exercise create/edit dialog ("+ Criar nova categoria" option in the Select).
- Both the library page and the SelectExerciseDialog include a category dropdown filter.

### Video sources
- `video_type` accepts `youtube | upload | instagram | null`.
- **YouTube**: full IFrame API control — autoplay (muted), looping over `video_start_seconds`/`video_end_seconds`, controls/timeline disabled.
- **Upload**: HTML5 video, autoplay muted, loop within trimmed range, controls disabled.
- **Instagram**: simple official embed (`/p/{shortcode}/embed/captioned/`). No autoplay, no loop, no time trimming, no custom controls — Instagram's chrome is shown. Use Upload (downloaded MP4) for full control.

### Thumbnails
- Priority: first image > VideoThumbnail > Dumbbell placeholder.
- YouTube: `img.youtube.com/vi/{id}/hqdefault.jpg`.
- Upload: frame captured at `video_start_seconds` via hidden <video> + canvas.
- Instagram: gradient placeholder + Instagram icon (no public thumbnail API without server-side oEmbed).
