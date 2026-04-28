import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CatalogProduct } from './types';

interface Category {
  id: string;
  nome: string;
}

interface Group {
  id: string;
  nome: string;
}

export function useCatalogProducts(estabelecimentoId: string | null) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!estabelecimentoId) return;
    loadCategories();
    loadGroups();
  }, [estabelecimentoId]);

  useEffect(() => {
    if (!estabelecimentoId) return;
    loadProducts();
  }, [estabelecimentoId, selectedCategory, selectedGroup, searchTerm]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('produto_categorias')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId!)
        .order('nome');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('produto_grupos')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId!)
        .order('nome');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadProducts = async () => {
    if (!estabelecimentoId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('produtos')
        .select(`
          id,
          nome,
          descricao,
          foto_url,
          preco_tabela,
          codigo,
          categoria_id,
          grupo_id,
          largura,
          altura,
          comprimento,
          gramatura,
          peso_unitario,
          numero_folhas,
          embalagem_largura,
          embalagem_altura,
          embalagem_comprimento,
          embalagem_peso,
          cubagem,
          valor_seguro,
          empilhamento_maximo,
          fragil,
          observacoes_frete,
          ean_13,
          ean_14_1,
          ean_14_2,
          produto_categorias(nome),
          produto_grupos(id, nome, descritivo_catalogo)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('nome');

      if (selectedCategory) {
        query = query.eq('categoria_id', selectedCategory);
      }

      if (selectedGroup) {
        query = query.eq('grupo_id', selectedGroup);
      }

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      const mappedProducts: CatalogProduct[] = (data || []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        foto_url: p.foto_url,
        preco_tabela: p.preco_tabela,
        codigo: p.codigo,
        categoria_nome: p.produto_categorias?.nome,
        grupo_nome: p.produto_grupos?.nome,
        grupo_id: p.produto_grupos?.id || p.grupo_id,
        grupo_descritivo_catalogo: p.produto_grupos?.descritivo_catalogo,
        // Dados Básicos
        largura: p.largura,
        altura: p.altura,
        comprimento: p.comprimento,
        gramatura: p.gramatura,
        peso_unitario: p.peso_unitario,
        numero_folhas: p.numero_folhas,
        // Dados do Frete
        embalagem_largura: p.embalagem_largura,
        embalagem_altura: p.embalagem_altura,
        embalagem_comprimento: p.embalagem_comprimento,
        embalagem_peso: p.embalagem_peso,
        cubagem: p.cubagem,
        valor_seguro: p.valor_seguro,
        empilhamento_maximo: p.empilhamento_maximo,
        fragil: p.fragil,
        observacoes_frete: p.observacoes_frete,
        // Embalagem
        ean_13: p.ean_13,
        ean_14_1: p.ean_14_1,
        ean_14_2: p.ean_14_2,
      }));

      setProducts(mappedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    categories,
    groups,
    loading,
    selectedCategory,
    setSelectedCategory,
    selectedGroup,
    setSelectedGroup,
    searchTerm,
    setSearchTerm,
    refreshProducts: loadProducts,
  };
}
