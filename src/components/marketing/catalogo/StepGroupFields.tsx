import React, { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CatalogPage, CatalogProduct, GroupFieldConfig, PRODUCT_FIELDS } from './types';
import { Settings2, Package, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ProductGroup {
  id: string;
  nome: string;
  products: CatalogProduct[];
}

interface StepGroupFieldsProps {
  productsPage: CatalogPage;
  groupFieldConfigs: GroupFieldConfig[];
  onGroupFieldConfigChange: (configs: GroupFieldConfig[]) => void;
}

// Group fields by category
const fieldsByCategory = PRODUCT_FIELDS.reduce((acc, field) => {
  const category = field.category;
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(field);
  return acc;
}, {} as Record<string, typeof PRODUCT_FIELDS[number][]>);

const categories = Object.keys(fieldsByCategory);

export const StepGroupFields: React.FC<StepGroupFieldsProps> = ({
  productsPage,
  groupFieldConfigs,
  onGroupFieldConfigChange,
}) => {
  const products = productsPage.products || [];
  const groupByCategory = productsPage.groupByCategory ?? true;

  // Group products
  const groupedProducts = useMemo((): ProductGroup[] => {
    if (!groupByCategory) {
      return [{ id: 'all', nome: 'Todos os Produtos', products }];
    }

    const groupMap = new Map<string, { id: string; nome: string; products: CatalogProduct[] }>();
    products.forEach(product => {
      const groupName = product.grupo_nome || 'Outros';
      const groupId = product.grupo_id || `outros_${groupName.replace(/\s+/g, '_').toLowerCase()}`;
      
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { id: groupId, nome: groupName, products: [] });
      }
      groupMap.get(groupId)!.products.push(product);
    });

    return Array.from(groupMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [products, groupByCategory]);

  const getGroupConfig = (groupId: string): GroupFieldConfig | undefined => {
    return groupFieldConfigs.find(c => c.groupId === groupId);
  };

  const isFieldSelected = (groupId: string, fieldKey: string): boolean => {
    const config = getGroupConfig(groupId);
    return config?.selectedFields.includes(fieldKey) ?? false;
  };

  const handleFieldToggle = (groupId: string, groupName: string, fieldKey: string) => {
    const existingConfig = getGroupConfig(groupId);
    
    if (existingConfig) {
      const newFields = existingConfig.selectedFields.includes(fieldKey)
        ? existingConfig.selectedFields.filter(f => f !== fieldKey)
        : [...existingConfig.selectedFields, fieldKey];
      
      const newConfigs = groupFieldConfigs.map(c =>
        c.groupId === groupId ? { ...c, selectedFields: newFields } : c
      );
      onGroupFieldConfigChange(newConfigs);
    } else {
      const newConfig: GroupFieldConfig = {
        groupId,
        groupName,
        selectedFields: [fieldKey],
      };
      onGroupFieldConfigChange([...groupFieldConfigs, newConfig]);
    }
  };

  const handleSelectAll = (groupId: string, groupName: string) => {
    const allFieldKeys = PRODUCT_FIELDS.map(f => f.key);
    const existingConfig = getGroupConfig(groupId);
    
    if (existingConfig && existingConfig.selectedFields.length === allFieldKeys.length) {
      // Deselect all
      const newConfigs = groupFieldConfigs.map(c =>
        c.groupId === groupId ? { ...c, selectedFields: [] } : c
      );
      onGroupFieldConfigChange(newConfigs);
    } else {
      // Select all
      if (existingConfig) {
        const newConfigs = groupFieldConfigs.map(c =>
          c.groupId === groupId ? { ...c, selectedFields: allFieldKeys } : c
        );
        onGroupFieldConfigChange(newConfigs);
      } else {
        const newConfig: GroupFieldConfig = {
          groupId,
          groupName,
          selectedFields: allFieldKeys,
        };
        onGroupFieldConfigChange([...groupFieldConfigs, newConfig]);
      }
    }
  };

  const handleSelectCategory = (groupId: string, groupName: string, category: string) => {
    const categoryFields = fieldsByCategory[category].map(f => f.key as string);
    const existingConfig = getGroupConfig(groupId);
    const currentFields = existingConfig?.selectedFields || [];
    
    const allCategorySelected = categoryFields.every(f => currentFields.includes(f));
    
    let newFields: string[];
    if (allCategorySelected) {
      // Remove all category fields
      newFields = currentFields.filter(f => !categoryFields.includes(f));
    } else {
      // Add all category fields
      newFields = [...new Set([...currentFields, ...categoryFields])];
    }
    
    if (existingConfig) {
      const newConfigs = groupFieldConfigs.map(c =>
        c.groupId === groupId ? { ...c, selectedFields: newFields } : c
      );
      onGroupFieldConfigChange(newConfigs);
    } else {
      const newConfig: GroupFieldConfig = {
        groupId,
        groupName,
        selectedFields: newFields,
      };
      onGroupFieldConfigChange([...groupFieldConfigs, newConfig]);
    }
  };

  const isCategoryFullySelected = (groupId: string, category: string): boolean => {
    const config = getGroupConfig(groupId);
    const categoryFields = fieldsByCategory[category].map(f => f.key);
    return categoryFields.every(f => config?.selectedFields.includes(f));
  };

  const isCategoryPartiallySelected = (groupId: string, category: string): boolean => {
    const config = getGroupConfig(groupId);
    const categoryFields = fieldsByCategory[category].map(f => f.key);
    const selectedCount = categoryFields.filter(f => config?.selectedFields.includes(f)).length;
    return selectedCount > 0 && selectedCount < categoryFields.length;
  };

  if (groupedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Nenhum produto selecionado</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Selecione produtos na etapa anterior para configurar os campos exibidos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-light tracking-tight">Campos por Grupo</h2>
        <p className="text-muted-foreground text-sm">
          Selecione quais campos do produto serão exibidos em cada grupo
        </p>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-6">
          {groupedProducts.map((group) => {
            const config = getGroupConfig(group.id);
            const allSelected = config?.selectedFields.length === PRODUCT_FIELDS.length;
            
            return (
              <div
                key={group.id}
                className="border rounded-xl p-5 bg-card"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Settings2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{group.nome}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.products.length} produto(s) • {config?.selectedFields.length || 0} campo(s) selecionado(s)
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSelectAll(group.id, group.nome)}
                    className="text-xs text-primary hover:underline"
                  >
                    {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>

                {/* Fields by Category */}
                <div className="space-y-3">
                  {categories.map((category) => {
                    const fields = fieldsByCategory[category];
                    const isFullySelected = isCategoryFullySelected(group.id, category);
                    const isPartiallySelected = isCategoryPartiallySelected(group.id, category);
                    
                    return (
                      <Collapsible key={category} defaultOpen={category === 'Dados Básicos'}>
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isFullySelected}
                                className={cn(isPartiallySelected && "opacity-50")}
                                onCheckedChange={() => handleSelectCategory(group.id, group.nome, category)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="font-medium text-sm">{category}</span>
                              <span className="text-xs text-muted-foreground">
                                ({fields.filter(f => isFieldSelected(group.id, f.key)).length}/{fields.length})
                              </span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="p-3 grid grid-cols-2 gap-2 border-t">
                              {fields.map((field) => (
                                <div
                                  key={field.key}
                                  className="flex items-center space-x-3 p-2 rounded-lg bg-muted/30 hover:bg-muted transition-colors cursor-pointer"
                                  onClick={() => handleFieldToggle(group.id, group.nome, field.key)}
                                >
                                  <Checkbox
                                    id={`${group.id}-${field.key}`}
                                    checked={isFieldSelected(group.id, field.key)}
                                    onCheckedChange={() => handleFieldToggle(group.id, group.nome, field.key)}
                                  />
                                  <Label
                                    htmlFor={`${group.id}-${field.key}`}
                                    className="text-xs cursor-pointer flex-1"
                                  >
                                    {field.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
