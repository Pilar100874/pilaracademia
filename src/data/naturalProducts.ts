// Lista de alimentos naturais com valores nutricionais por 100g
// Fonte: Tabela TACO (Tabela Brasileira de Composição de Alimentos)

export interface NaturalProduct {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  saturated_fat: number;
  trans_fat: number;
  reference_quantity: number;
  reference_unit: string;
  is_liquid: boolean;
  is_natural: true;
}

export const NATURAL_PRODUCT_CATEGORIES = [
  { id: 'frutas', name: 'Frutas', emoji: '🍎' },
  { id: 'verduras', name: 'Verduras e Legumes', emoji: '🥬' },
  { id: 'carnes', name: 'Carnes', emoji: '🥩' },
  { id: 'aves', name: 'Aves', emoji: '🍗' },
  { id: 'peixes', name: 'Peixes e Frutos do Mar', emoji: '🐟' },
  { id: 'ovos', name: 'Ovos e Laticínios', emoji: '🥚' },
  { id: 'graos', name: 'Grãos e Cereais', emoji: '🌾' },
  { id: 'oleaginosas', name: 'Oleaginosas', emoji: '🥜' },
  { id: 'tubérculos', name: 'Tubérculos', emoji: '🥔' },
];

export const NATURAL_PRODUCTS: NaturalProduct[] = [
  // === FRUTAS ===
  { id: 'nat_banana', name: 'Banana prata', category: 'frutas', calories: 98, protein: 1.3, carbs: 26, fat: 0.1, fiber: 2, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_maca', name: 'Maçã', category: 'frutas', calories: 56, protein: 0.3, carbs: 15.2, fat: 0, fiber: 1.3, sodium: 0, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_laranja', name: 'Laranja', category: 'frutas', calories: 37, protein: 1, carbs: 8.9, fat: 0.1, fiber: 0.8, sodium: 0, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_manga', name: 'Manga', category: 'frutas', calories: 64, protein: 0.4, carbs: 16.7, fat: 0.3, fiber: 1.6, sodium: 0, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_mamao', name: 'Mamão papaia', category: 'frutas', calories: 40, protein: 0.5, carbs: 10.4, fat: 0.1, fiber: 1, sodium: 3, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_abacaxi', name: 'Abacaxi', category: 'frutas', calories: 48, protein: 0.9, carbs: 12.3, fat: 0.1, fiber: 1, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_morango', name: 'Morango', category: 'frutas', calories: 30, protein: 0.9, carbs: 6.8, fat: 0.3, fiber: 1.7, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_melancia', name: 'Melancia', category: 'frutas', calories: 33, protein: 0.9, carbs: 8.1, fat: 0, fiber: 0.1, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_uva', name: 'Uva', category: 'frutas', calories: 53, protein: 0.7, carbs: 13.6, fat: 0.2, fiber: 0.9, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_pera', name: 'Pera', category: 'frutas', calories: 53, protein: 0.6, carbs: 14, fat: 0.1, fiber: 3, sodium: 0, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_abacate', name: 'Abacate', category: 'frutas', calories: 96, protein: 1.2, carbs: 6, fat: 8.4, fiber: 6.3, sodium: 2, saturated_fat: 2.3, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_kiwi', name: 'Kiwi', category: 'frutas', calories: 51, protein: 1.3, carbs: 11.5, fat: 0.6, fiber: 2.7, sodium: 2, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_acai', name: 'Açaí polpa', category: 'frutas', calories: 58, protein: 0.8, carbs: 6.2, fat: 3.9, fiber: 2.6, sodium: 4, saturated_fat: 1, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_goiaba', name: 'Goiaba', category: 'frutas', calories: 54, protein: 1.1, carbs: 13, fat: 0.4, fiber: 6.2, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_maracuja', name: 'Maracujá polpa', category: 'frutas', calories: 68, protein: 2, carbs: 12.3, fat: 2.1, fiber: 1.1, sodium: 6, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },

  // === VERDURAS E LEGUMES ===
  { id: 'nat_alface', name: 'Alface', category: 'verduras', calories: 11, protein: 1.3, carbs: 1.7, fat: 0.2, fiber: 1, sodium: 3, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_tomate', name: 'Tomate', category: 'verduras', calories: 15, protein: 1.1, carbs: 3.1, fat: 0.2, fiber: 1.2, sodium: 2, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_cenoura', name: 'Cenoura', category: 'verduras', calories: 34, protein: 1.3, carbs: 7.7, fat: 0.2, fiber: 3.2, sodium: 3, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_brocolis', name: 'Brócolis', category: 'verduras', calories: 25, protein: 3.6, carbs: 4.4, fat: 0.5, fiber: 2.9, sodium: 7, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_couve', name: 'Couve', category: 'verduras', calories: 27, protein: 2.9, carbs: 4.3, fat: 0.5, fiber: 3.1, sodium: 10, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_espinafre', name: 'Espinafre', category: 'verduras', calories: 17, protein: 2, carbs: 2.6, fat: 0.2, fiber: 2.1, sodium: 55, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_cebola', name: 'Cebola', category: 'verduras', calories: 39, protein: 1.7, carbs: 8.9, fat: 0.1, fiber: 2.2, sodium: 2, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_pepino', name: 'Pepino', category: 'verduras', calories: 10, protein: 0.9, carbs: 2, fat: 0.1, fiber: 1.1, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_abobrinha', name: 'Abobrinha', category: 'verduras', calories: 15, protein: 1.4, carbs: 3, fat: 0.1, fiber: 1.6, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_berinjela', name: 'Berinjela', category: 'verduras', calories: 19, protein: 1.2, carbs: 4.5, fat: 0.1, fiber: 2.9, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_pimentao', name: 'Pimentão', category: 'verduras', calories: 21, protein: 1.2, carbs: 4.9, fat: 0.1, fiber: 0.8, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_vagem', name: 'Vagem', category: 'verduras', calories: 25, protein: 2.4, carbs: 4.2, fat: 0.2, fiber: 2.4, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_chuchu', name: 'Chuchu', category: 'verduras', calories: 17, protein: 0.8, carbs: 4.1, fat: 0.1, fiber: 1.4, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_abobora', name: 'Abóbora', category: 'verduras', calories: 33, protein: 1.4, carbs: 7.5, fat: 0.1, fiber: 1.6, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_repolho', name: 'Repolho', category: 'verduras', calories: 17, protein: 0.9, carbs: 4, fat: 0.1, fiber: 1.9, sodium: 7, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_couve_flor', name: 'Couve-flor', category: 'verduras', calories: 23, protein: 1.9, carbs: 4.5, fat: 0.2, fiber: 2.4, sodium: 5, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_rucula', name: 'Rúcula', category: 'verduras', calories: 17, protein: 2.7, carbs: 2.2, fat: 0.3, fiber: 0.8, sodium: 4, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },

  // === CARNES ===
  { id: 'nat_patinho', name: 'Carne bovina patinho', category: 'carnes', calories: 133, protein: 21.4, carbs: 0, fat: 4.9, fiber: 0, sodium: 45, saturated_fat: 1.9, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_alcatra', name: 'Carne bovina alcatra', category: 'carnes', calories: 150, protein: 21.9, carbs: 0, fat: 6.7, fiber: 0, sodium: 51, saturated_fat: 2.8, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_contrafile', name: 'Carne bovina contrafilé', category: 'carnes', calories: 194, protein: 22.3, carbs: 0, fat: 11.4, fiber: 0, sodium: 47, saturated_fat: 4.5, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_picanha', name: 'Carne bovina picanha', category: 'carnes', calories: 209, protein: 19.4, carbs: 0, fat: 14.2, fiber: 0, sodium: 50, saturated_fat: 5.5, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_carne_moida', name: 'Carne moída', category: 'carnes', calories: 212, protein: 18.4, carbs: 0, fat: 15.2, fiber: 0, sodium: 56, saturated_fat: 6.2, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_costela', name: 'Costela bovina', category: 'carnes', calories: 373, protein: 17.2, carbs: 0, fat: 33.4, fiber: 0, sodium: 55, saturated_fat: 14.1, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_figado', name: 'Fígado bovino', category: 'carnes', calories: 141, protein: 20.3, carbs: 4.1, fat: 4.8, fiber: 0, sodium: 66, saturated_fat: 1.6, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_suino_lombo', name: 'Lombo suíno', category: 'carnes', calories: 176, protein: 23, carbs: 0, fat: 8.8, fiber: 0, sodium: 48, saturated_fat: 3.1, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_suino_pernil', name: 'Pernil suíno', category: 'carnes', calories: 186, protein: 20.7, carbs: 0, fat: 10.9, fiber: 0, sodium: 52, saturated_fat: 3.8, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_bacon', name: 'Bacon', category: 'carnes', calories: 468, protein: 18.5, carbs: 0, fat: 43.9, fiber: 0, sodium: 1230, saturated_fat: 15.4, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },

  // === AVES ===
  { id: 'nat_frango_peito', name: 'Peito de frango', category: 'aves', calories: 119, protein: 23.1, carbs: 0, fat: 2.5, fiber: 0, sodium: 53, saturated_fat: 0.7, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_frango_coxa', name: 'Coxa de frango', category: 'aves', calories: 161, protein: 18.6, carbs: 0, fat: 9.2, fiber: 0, sodium: 69, saturated_fat: 2.5, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_frango_sobrecoxa', name: 'Sobrecoxa de frango', category: 'aves', calories: 163, protein: 17.8, carbs: 0, fat: 9.8, fiber: 0, sodium: 65, saturated_fat: 2.7, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_frango_asa', name: 'Asa de frango', category: 'aves', calories: 215, protein: 18.3, carbs: 0, fat: 15.4, fiber: 0, sodium: 68, saturated_fat: 4.3, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_peru_peito', name: 'Peito de peru', category: 'aves', calories: 104, protein: 23.8, carbs: 0, fat: 0.7, fiber: 0, sodium: 55, saturated_fat: 0.2, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },

  // === PEIXES E FRUTOS DO MAR ===
  { id: 'nat_tilapia', name: 'Tilápia', category: 'peixes', calories: 89, protein: 18.4, carbs: 0, fat: 1.7, fiber: 0, sodium: 42, saturated_fat: 0.5, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_salmao', name: 'Salmão', category: 'peixes', calories: 170, protein: 19.3, carbs: 0, fat: 10.4, fiber: 0, sodium: 48, saturated_fat: 2.3, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_atum', name: 'Atum', category: 'peixes', calories: 118, protein: 25.5, carbs: 0, fat: 1.2, fiber: 0, sodium: 45, saturated_fat: 0.3, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_sardinha', name: 'Sardinha', category: 'peixes', calories: 164, protein: 21.1, carbs: 0, fat: 8.6, fiber: 0, sodium: 65, saturated_fat: 1.9, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_bacalhau', name: 'Bacalhau', category: 'peixes', calories: 136, protein: 29.1, carbs: 0, fat: 1.4, fiber: 0, sodium: 1460, saturated_fat: 0.3, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_camarao', name: 'Camarão', category: 'peixes', calories: 82, protein: 17.6, carbs: 0, fat: 1.1, fiber: 0, sodium: 224, saturated_fat: 0.2, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_lula', name: 'Lula', category: 'peixes', calories: 72, protein: 15.4, carbs: 1.4, fat: 0.9, fiber: 0, sodium: 150, saturated_fat: 0.2, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },

  // === OVOS E LATICÍNIOS ===
  { id: 'nat_ovo', name: 'Ovo de galinha', category: 'ovos', calories: 146, protein: 13.3, carbs: 0.6, fat: 9.5, fiber: 0, sodium: 146, saturated_fat: 2.6, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_ovo_clara', name: 'Clara de ovo', category: 'ovos', calories: 43, protein: 9.8, carbs: 1.6, fat: 0, fiber: 0, sodium: 150, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_ovo_gema', name: 'Gema de ovo', category: 'ovos', calories: 353, protein: 16.1, carbs: 0.3, fat: 31.9, fiber: 0, sodium: 42, saturated_fat: 10, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_leite_integral', name: 'Leite integral', category: 'ovos', calories: 61, protein: 3.2, carbs: 4.7, fat: 3.5, fiber: 0, sodium: 48, saturated_fat: 2.3, trans_fat: 0, reference_quantity: 100, reference_unit: 'ml', is_liquid: true, is_natural: true },
  { id: 'nat_leite_desnatado', name: 'Leite desnatado', category: 'ovos', calories: 35, protein: 3.4, carbs: 5, fat: 0.1, fiber: 0, sodium: 55, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'ml', is_liquid: true, is_natural: true },
  { id: 'nat_iogurte_natural', name: 'Iogurte natural', category: 'ovos', calories: 51, protein: 4.1, carbs: 6.1, fat: 3, fiber: 0, sodium: 52, saturated_fat: 1.7, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_queijo_minas', name: 'Queijo minas', category: 'ovos', calories: 264, protein: 17.4, carbs: 3.2, fat: 20.2, fiber: 0, sodium: 460, saturated_fat: 12.1, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_queijo_mucarela', name: 'Queijo muçarela', category: 'ovos', calories: 330, protein: 22.6, carbs: 3, fat: 25.2, fiber: 0, sodium: 581, saturated_fat: 15.7, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_ricota', name: 'Ricota', category: 'ovos', calories: 140, protein: 12.6, carbs: 3.8, fat: 8.1, fiber: 0, sodium: 68, saturated_fat: 5, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_cottage', name: 'Queijo cottage', category: 'ovos', calories: 101, protein: 13.6, carbs: 2.7, fat: 4.3, fiber: 0, sodium: 405, saturated_fat: 2.3, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },

  // === GRÃOS E CEREAIS ===
  { id: 'nat_arroz_branco', name: 'Arroz branco cozido', category: 'graos', calories: 128, protein: 2.5, carbs: 28.1, fat: 0.2, fiber: 1.6, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_arroz_integral', name: 'Arroz integral cozido', category: 'graos', calories: 124, protein: 2.6, carbs: 25.8, fat: 1, fiber: 2.7, sodium: 1, saturated_fat: 0.2, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_feijao', name: 'Feijão carioca cozido', category: 'graos', calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5, fiber: 8.5, sodium: 2, saturated_fat: 0.1, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_feijao_preto', name: 'Feijão preto cozido', category: 'graos', calories: 77, protein: 4.5, carbs: 14, fat: 0.5, fiber: 8.4, sodium: 2, saturated_fat: 0.1, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_lentilha', name: 'Lentilha cozida', category: 'graos', calories: 93, protein: 6.3, carbs: 16.3, fat: 0.5, fiber: 7.9, sodium: 2, saturated_fat: 0.1, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_grao_bico', name: 'Grão de bico cozido', category: 'graos', calories: 130, protein: 6.7, carbs: 19.3, fat: 2.4, fiber: 5.4, sodium: 4, saturated_fat: 0.3, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_aveia', name: 'Aveia em flocos', category: 'graos', calories: 394, protein: 14, carbs: 66.6, fat: 8.5, fiber: 9.1, sodium: 5, saturated_fat: 1.5, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_quinoa', name: 'Quinoa cozida', category: 'graos', calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8, sodium: 7, saturated_fat: 0.2, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_milho', name: 'Milho cozido', category: 'graos', calories: 96, protein: 3.2, carbs: 19.1, fat: 1.4, fiber: 2.4, sodium: 1, saturated_fat: 0.2, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },

  // === OLEAGINOSAS ===
  { id: 'nat_amendoim', name: 'Amendoim', category: 'oleaginosas', calories: 544, protein: 27.2, carbs: 20.3, fat: 43.9, fiber: 8.1, sodium: 5, saturated_fat: 6.8, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_castanha_caju', name: 'Castanha de caju', category: 'oleaginosas', calories: 570, protein: 18.5, carbs: 29.1, fat: 46.3, fiber: 3.7, sodium: 10, saturated_fat: 8.1, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_castanha_para', name: 'Castanha do Pará', category: 'oleaginosas', calories: 643, protein: 14.5, carbs: 15.1, fat: 63.5, fiber: 7.9, sodium: 2, saturated_fat: 15.1, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_nozes', name: 'Nozes', category: 'oleaginosas', calories: 620, protein: 14, carbs: 18.4, fat: 59, fiber: 5.2, sodium: 2, saturated_fat: 6, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_amendoas', name: 'Amêndoas', category: 'oleaginosas', calories: 581, protein: 18.6, carbs: 29.5, fat: 47.3, fiber: 11.6, sodium: 1, saturated_fat: 3.5, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },

  // === TUBÉRCULOS ===
  { id: 'nat_batata', name: 'Batata cozida', category: 'tubérculos', calories: 52, protein: 1.2, carbs: 11.9, fat: 0.1, fiber: 1.3, sodium: 2, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_batata_doce', name: 'Batata doce cozida', category: 'tubérculos', calories: 77, protein: 0.6, carbs: 18.4, fat: 0.1, fiber: 2.2, sodium: 8, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_mandioca', name: 'Mandioca cozida', category: 'tubérculos', calories: 125, protein: 0.6, carbs: 30.1, fat: 0.3, fiber: 1.6, sodium: 1, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_inhame', name: 'Inhame cozido', category: 'tubérculos', calories: 97, protein: 2, carbs: 23.2, fat: 0.1, fiber: 1.7, sodium: 4, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
  { id: 'nat_cara', name: 'Cará cozido', category: 'tubérculos', calories: 77, protein: 1.6, carbs: 18.4, fat: 0.1, fiber: 1.5, sodium: 3, saturated_fat: 0, trans_fat: 0, reference_quantity: 100, reference_unit: 'g', is_liquid: false, is_natural: true },
];

// Helper to convert natural product to custom product format
export function naturalToCustomProduct(natural: NaturalProduct): any {
  return {
    id: natural.id,
    name: natural.name,
    barcode: natural.id,
    brand: null,
    image_url: null,
    calories: natural.calories,
    protein: natural.protein,
    carbs: natural.carbs,
    fat: natural.fat,
    saturated_fat: natural.saturated_fat,
    trans_fat: natural.trans_fat,
    fiber: natural.fiber,
    sodium: natural.sodium,
    reference_quantity: natural.reference_quantity,
    reference_unit: natural.reference_unit,
    is_liquid: natural.is_liquid,
    package_total_weight: null,
    package_total_units: null,
    package_volume_ml: null,
    is_natural: true,
    category: natural.category,
  };
}

export function getCategoryInfo(categoryId: string) {
  return NATURAL_PRODUCT_CATEGORIES.find(c => c.id === categoryId);
}
