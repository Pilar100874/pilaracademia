---
name: Exercise Library
description: Reusable exercise templates decoupled from workout plans, with custom user categories and video thumbnails
type: feature
---
- Exercises are stored in `exercise_library` table, decoupled from workout plans, and can be reused across plans.
- Each user manages their own categories via `exercise_categories` table (CRUD). Exercises reference a category via nullable `category_id` (ON DELETE SET NULL).
- Categories are created inline from the exercise create/edit dialog ("+ Criar nova categoria" option in the Select).
- Both the library page and the SelectExerciseDialog (used when adding exercises to a workout) include a category dropdown filter (options: "Todas as categorias", "Sem categoria", and each user category).
- Library page allows deleting a category from the filter row when one is selected; deleting only removes the category, not the exercises.
- Listings show a category badge next to sets/reps when the exercise has one.
- Thumbnails priority: first image > video thumbnail (VideoThumbnail component) > Dumbbell placeholder. VideoThumbnail uses YouTube's hqdefault for YouTube videos and captures the frame at `video_start_seconds` for uploaded videos via a hidden <video> + canvas.
