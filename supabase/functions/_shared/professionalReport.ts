export const reportSections = [
  { key: 'food_entries', title: 'Alimentação', date: 'consumed_at' },
  { key: 'liquid_entries', title: 'Hidratação', date: 'consumed_at' },
  { key: 'exercise_entries', title: 'Atividades realizadas', date: 'performed_at' },
  { key: 'weight_history', title: 'Histórico de peso', date: 'recorded_at' },
  { key: 'glycemia_entries', title: 'Glicemia', date: 'measured_at' },
  { key: 'body_measurements', title: 'Medidas com trena', date: 'measured_at' },
  { key: 'health_metrics', title: 'Sinais vitais, sono e atividade do relógio', date: 'recorded_at' },
  { key: 'body_analyses', title: 'Bioimpedância', date: 'created_at' },
  { key: 'blood_exams', title: 'Exames de sangue', date: 'created_at' },
  { key: 'progress_photos', title: 'Fotos de progresso', date: 'taken_at' },
  { key: 'workout_plans', title: 'Treinos e exercícios', date: null },
  { key: 'food_preferences', title: 'Preferências alimentares', date: null },
  { key: 'weekly_menus', title: 'Cardápios e listas de compras', date: 'week_start' },
  { key: 'custom_products', title: 'Produtos cadastrados', date: null },
  { key: 'food_kits', title: 'Kits de alimentos', date: null },
] as const;

const excluded = new Set(['id', 'user_id', 'email', 'clinic_id', 'product_id', 'kit_id', 'workout_plan_id', 'exercise_library_id', 'raw_text', 'plan', 'score', 'updated_at']);
export function sanitizeReport(value: unknown): any {
  if (Array.isArray(value)) return value.map(sanitizeReport);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !excluded.has(key) && !/token|password|secret|access_key/i.test(key)).map(([key, item]) => [key, sanitizeReport(item)]));
  return value;
}

export const reportLabels: Record<string, string> = {
  name: 'Nome', gender: 'Sexo', birth_date: 'Nascimento', height_cm: 'Altura (cm)', weight_kg: 'Peso (kg)', goal: 'Objetivo', activity_level: 'Nível de atividade',
  calories: 'Calorias (kcal)', protein: 'Proteína (g)', carbs: 'Carboidratos (g)', fat: 'Gordura (g)', fiber: 'Fibra (g)', sodium: 'Sódio (mg)', saturated_fat: 'Gordura saturada (g)', trans_fat: 'Gordura trans (g)', quantity: 'Quantidade', unit: 'Unidade', source: 'Origem',
  consumed_at: 'Consumido em', performed_at: 'Realizado em', recorded_at: 'Registrado em', measured_at: 'Medido em', created_at: 'Cadastrado em', collected_at: 'Coleta', taken_at: 'Foto em', week_start: 'Início da semana',
  amount_ml: 'Volume (ml)', liquid_ml: 'Líquidos (ml)', is_liquid: 'É líquido', type: 'Tipo', duration_minutes: 'Duração (min)', calories_burned: 'Calorias gastas (kcal)', exercise_type: 'Atividade', glucose_mg_dl: 'Glicemia (mg/dL)', measurement_type: 'Momento da medição',
  neck_cm: 'Pescoço (cm)', shoulders_cm: 'Ombros (cm)', chest_cm: 'Peito (cm)', waist_cm: 'Cintura (cm)', abdomen_cm: 'Abdômen (cm)', hip_cm: 'Quadril (cm)', arm_left_cm: 'Braço esquerdo (cm)', arm_right_cm: 'Braço direito (cm)', forearm_left_cm: 'Antebraço esquerdo (cm)', forearm_right_cm: 'Antebraço direito (cm)', thigh_left_cm: 'Coxa esquerda (cm)', thigh_right_cm: 'Coxa direita (cm)', calf_left_cm: 'Panturrilha esquerda (cm)', calf_right_cm: 'Panturrilha direita (cm)',
  metric_type: 'Indicador', value: 'Valor', value2: 'Segundo valor', extracted: 'Índices da bioimpedância', summary: 'Resumo', markers: 'Marcadores', alerts: 'Alertas', lab_name: 'Laboratório', status: 'Classificação', ref_min: 'Referência mínima', ref_max: 'Referência máxima', label: 'Marcador', key: 'Identificação do marcador', category: 'Categoria',
  notes: 'Observações', description: 'Descrição', exercises: 'Exercícios', items: 'Itens', objective: 'Objetivo do treino', ai_rationale: 'Motivo do treino', ai_reason: 'Motivo', sets: 'Séries', reps: 'Repetições', rest_seconds: 'Descanso (s)', order_index: 'Ordem', days_of_week: 'Dias da semana', cooldown_enabled: 'Alongamento final', is_cooldown: 'Alongamento',
  restrictions: 'Restrições', favorite_foods: 'Alimentos favoritos', disliked_foods: 'Alimentos evitados', menu: 'Cardápio', shopping_list: 'Lista de compras', diet_recommendations: 'Sugestões alimentares',
  body_fat_pct: 'Gordura corporal (%)', muscle_mass_kg: 'Massa muscular (kg)', lean_mass_kg: 'Massa magra (kg)', body_water_pct: 'Água corporal (%)', bone_mass_kg: 'Massa óssea (kg)', bmr_kcal: 'Metabolismo basal (kcal)', visceral_fat: 'Gordura visceral', metabolic_age: 'Idade metabólica', segmental_fat: 'Gordura por região', segmental_muscle: 'Músculo por região',
  image_url: 'Foto', image_urls: 'Fotos', file_url: 'Laudo', video_url: 'Vídeo', file_name: 'Nome do laudo', angle: 'Posição da foto', brand: 'Marca', barcode: 'Código de barras', reference_quantity: 'Quantidade de referência', reference_unit: 'Unidade de referência',
};
export const reportLabel = (key: string) => reportLabels[key] ?? key.replace(/_/g, ' ');

export function aggregateReportDays(food: any[], liquids: any[], activities: any[]) {
  const days = new Map<string, any>();
  const day = (timestamp: string) => {
    const date = new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    if (!days.has(date)) days.set(date, { date, calories: null, protein: null, carbs: null, fat: null, liquid_ml: null, burned: null, hasWorkout: false });
    return days.get(date);
  };
  const add = (row: any, key: string, value: any) => { if (value != null) row[key] = (row[key] ?? 0) + Number(value); };
  for (const entry of food) { const row = day(entry.consumed_at); for (const key of ['calories', 'protein', 'carbs', 'fat']) add(row, key, entry[key]); if (entry.is_liquid) add(row, 'liquid_ml', entry.liquid_ml); }
  for (const entry of liquids) add(day(entry.consumed_at), 'liquid_ml', entry.amount_ml);
  for (const entry of activities) { const row = day(entry.performed_at); add(row, 'burned', entry.calories_burned); row.hasWorkout = true; }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
