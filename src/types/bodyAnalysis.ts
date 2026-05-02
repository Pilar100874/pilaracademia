export interface ExtractedBioimpedance {
  measured_at?: string | null;
  sex?: 'male' | 'female' | 'unknown' | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  bmi?: number | null;
  body_fat_pct?: number | null;
  fat_mass_kg?: number | null;
  lean_mass_kg?: number | null;
  muscle_mass_kg?: number | null;
  skeletal_muscle_kg?: number | null;
  bone_mass_kg?: number | null;
  body_water_kg?: number | null;
  protein_mass_kg?: number | null;
  visceral_fat?: number | null;
  bmr_kcal?: number | null;
  whr?: number | null;
  body_age?: number | null;
  score?: number | null;
  segmental_fat?: Partial<Record<'trunk_kg' | 'left_arm_kg' | 'right_arm_kg' | 'left_leg_kg' | 'right_leg_kg', number>>;
  segmental_muscle?: Partial<Record<'trunk_kg' | 'left_arm_kg' | 'right_arm_kg' | 'left_leg_kg' | 'right_leg_kg', number>>;
}

export interface BodyPlanCalories {
  tdee: number;
  target: number;
  delta?: number;
  activity_factor?: number;
}

export interface BodyPlanMacros {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  water_ml?: number;
}

export interface BodyPlanTrainingIntent {
  focus: string;
  split: string;
  frequency_per_week: number;
  session_minutes?: number;
  intensity?: 'leve' | 'moderada' | 'alta';
  priority_muscle_groups?: string[];
  volume_note?: string;
}

export interface BodyPlanCardio {
  type?: 'LISS' | 'HIIT' | 'MISTO';
  sessions_per_week?: number;
  minutes_per_session?: number;
  daily_steps?: number;
}

export interface BodyPlanProjectionPoint {
  weight_kg?: number;
  body_fat_pct?: number;
  muscle_mass_kg?: number;
}

export interface BodyPlanProjection {
  day_30?: BodyPlanProjectionPoint;
  day_60?: BodyPlanProjectionPoint;
  day_90?: BodyPlanProjectionPoint;
}

export interface BodyPlanAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
}

export interface BodyPlanPhase {
  phase: string;
  weeks: string;
  calories?: number;
  training?: string;
  cardio?: string;
  focus: string;
}

/** Narrative output for end-user (situation → plan → next steps). */
export interface BodyPlanNarrative {
  situation: string;
  plan: string;
  next_steps: string[];
}

/** Concrete exercise picked from the user's library to fulfill the training intent. */
export interface RecommendedExercise {
  exercise_id: string;
  name: string;
  reason?: string;
  sets?: number;
  reps?: number;
}

/** Comparison vs the previous analysis (only present when one exists). */
export interface BodyPlanDelta {
  weight_kg?: number;
  body_fat_pct?: number;
  muscle_mass_kg?: number;
  visceral_fat?: number;
  score?: number;
  /** Days between previous and current measurement. */
  days_between?: number;
  /** AI-generated commentary on progress. */
  commentary?: string;
  /** Adjustments suggested for the new periodization. */
  periodization_adjustment?: string;
}

export interface BodyPlan {
  extracted: ExtractedBioimpedance;
  profile_label: string;
  classification: {
    body_profile: 'obeso' | 'sobrepeso_muscular' | 'falso_magro' | 'atletico' | 'baixa_massa_muscular' | 'saudavel';
    metabolic_state: 'saudavel' | 'risco_moderado' | 'risco_elevado';
    muscle_level: 'baixo' | 'medio' | 'alto';
  };
  goal: {
    primary: 'cutting' | 'recomposicao' | 'hipertrofia' | 'manutencao';
    target_weight_kg?: number;
    target_body_fat_pct?: number;
    timeframe_weeks?: number;
  };
  calories: BodyPlanCalories;
  macros: BodyPlanMacros;
  training_intent: BodyPlanTrainingIntent;
  cardio?: BodyPlanCardio;
  diet_rules?: string[];
  periodization?: BodyPlanPhase[];
  projection?: BodyPlanProjection;
  alerts?: BodyPlanAlert[];
  score: number;
  summary: string;
  narrative?: BodyPlanNarrative;
  recommended_exercises?: RecommendedExercise[];
  delta?: BodyPlanDelta;
}

export interface BodyAnalysisRow {
  id: string;
  user_id: string;
  image_url: string | null;
  measured_at: string | null;
  extracted: ExtractedBioimpedance;
  plan: BodyPlan;
  summary: string | null;
  score: number | null;
  profile_label: string | null;
  goal: string | null;
  created_at: string;
  updated_at: string;
}
