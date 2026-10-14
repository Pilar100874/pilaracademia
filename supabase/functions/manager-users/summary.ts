import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export async function memberSummary(admin: SupabaseClient, userId: string, days: number) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days + 1);
  const startDate = days === 0 ? '1970-01-01' : start.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const endDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const read = async (table: string, fields: string, dateColumn: string) => {
    const rows: Record<string, any>[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.from(table).select(fields).eq('user_id', userId)
        .gte(dateColumn, `${startDate}T00:00:00-03:00`).lt(dateColumn, `${endDate}T23:59:59.999-03:00`)
        .order(dateColumn).order('id').range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
    return rows;
  };
  const [profileResult, latestWeight, weights, food, liquids, activities, glucose, body, exams, checkins, workoutsResult] = await Promise.all([
    admin.from('profiles').select('name,email,birth_date,gender,height_cm,weight_kg,goal,activity_level,created_at,daily_calories,daily_calories_override,daily_protein,daily_protein_override,daily_carbs,daily_carbs_override,daily_fat,daily_fat_override,daily_liquid_ml,daily_liquid_ml_override').eq('user_id', userId).single(),
    admin.from('weight_history').select('weight_kg,recorded_at').eq('user_id', userId).lte('recorded_at', `${endDate}T23:59:59.999-03:00`).order('recorded_at', { ascending: false }).limit(1),
    read('weight_history', 'id,weight_kg,recorded_at', 'recorded_at'),
    read('food_entries', 'id,calories,protein,carbs,fat,fiber,is_liquid,liquid_ml,consumed_at', 'consumed_at'),
    read('liquid_entries', 'id,amount_ml,type,consumed_at', 'consumed_at'),
    read('exercise_entries', 'id,name,exercise_type,duration_minutes,calories_burned,performed_at', 'performed_at'),
    read('glycemia_entries', 'id,glucose_mg_dl,measurement_type,measured_at,notes', 'measured_at'),
    read('body_analyses', 'id,extracted,score,summary,measured_at,created_at', 'created_at'),
    read('blood_exams', 'id,markers,summary,alerts,status,collected_at,created_at,lab_name', 'created_at'),
    read('weekly_checkins', 'id,period_start,period_end,adherence_score,summary,highlights,recommendations,created_at', 'period_end'),
    admin.from('workout_plans').select('id,name,objective,days_of_week,sets,reps').eq('user_id', userId).order('name'),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (latestWeight.error) throw latestWeight.error;
  if (workoutsResult.error) throw workoutsResult.error;
  const daily = new Map<string, Record<string, any>>();
  const day = (timestamp: string) => {
    const date = new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    if (!daily.has(date)) daily.set(date, { date, calories: null, protein: null, carbs: null, fat: null, fiber: null, liquids: null, minutes: null, burned: null, sessions: null, foodCount: 0 });
    return daily.get(date) as Record<string, any>;
  };
  const add = (row: Record<string, any>, key: string, value: number) => { row[key] = (row[key] ?? 0) + (Number(value) || 0); };
  for (const entry of food) {
    const row = day(entry.consumed_at);
    for (const key of ['calories', 'protein', 'carbs', 'fat', 'fiber']) add(row, key, entry[key]);
    row.foodCount++;
    if (entry.is_liquid && entry.liquid_ml) add(row, 'liquids', entry.liquid_ml);
  }
  for (const entry of liquids) add(day(entry.consumed_at), 'liquids', entry.amount_ml);
  for (const entry of activities) {
    const row = day(entry.performed_at);
    add(row, 'minutes', entry.duration_minutes);
    add(row, 'burned', entry.calories_burned);
    add(row, 'sessions', 1);
  }
  return { profile: profileResult.data, currentWeight: latestWeight.data?.[0] ?? null, startDate, endDate,
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)), weights, activities, glucose, body, exams, checkins, workouts: workoutsResult.data ?? [] };
}