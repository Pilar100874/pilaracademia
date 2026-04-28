import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalogConfig, FONT_OPTIONS } from './types';
import { Palette, Type, Eye, Hash, Table } from 'lucide-react';

interface StepInfoProps {
  config: CatalogConfig;
  onChange: (config: Partial<CatalogConfig>) => void;
}

export const StepInfo: React.FC<StepInfoProps> = ({ config, onChange }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-light tracking-tight">Configurações do Catálogo</h2>
        <p className="text-muted-foreground text-sm">
          Defina as configurações gerais do seu catálogo
        </p>
      </div>

      {/* Name Input */}
      <div className="space-y-3">
        <Label htmlFor="catalog-name" className="text-sm font-medium">
          Nome do Catálogo
        </Label>
        <Input
          id="catalog-name"
          value={config.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex: Catálogo Primavera 2024"
          className="h-12 text-base border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary transition-colors"
        />
      </div>

      {/* Colors */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Palette className="h-4 w-4" />
          <span>Cores</span>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="primary-color" className="text-xs text-muted-foreground uppercase tracking-wider">
              Primária
            </Label>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl shadow-sm border cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: config.primaryColor }}
                onClick={() => document.getElementById('primary-color')?.click()}
              />
              <Input
                id="primary-color"
                type="color"
                value={config.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="sr-only"
              />
              <Input
                value={config.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="flex-1 h-10 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="secondary-color" className="text-xs text-muted-foreground uppercase tracking-wider">
              Secundária
            </Label>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl shadow-sm border cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: config.secondaryColor }}
                onClick={() => document.getElementById('secondary-color')?.click()}
              />
              <Input
                id="secondary-color"
                type="color"
                value={config.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                className="sr-only"
              />
              <Input
                value={config.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                className="flex-1 h-10 font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Font */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Type className="h-4 w-4" />
          <span>Tipografia</span>
        </div>
        <Select value={config.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4" />
          <span>Exibição</span>
        </div>
        
        <div className="space-y-3">
          <div 
            className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            onClick={() => onChange({ showPrices: !config.showPrices })}
          >
            <div className="space-y-0.5">
              <p className="font-medium text-sm">Exibir Preços</p>
              <p className="text-xs text-muted-foreground">Mostrar preços dos produtos nas páginas</p>
            </div>
            <Switch
              checked={config.showPrices}
              onCheckedChange={(v) => onChange({ showPrices: v })}
            />
          </div>

          <div 
            className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            onClick={() => onChange({ showPriceTable: !config.showPriceTable })}
          >
            <div className="flex items-center gap-3">
              <Table className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="font-medium text-sm">Tabela de Preços</p>
                <p className="text-xs text-muted-foreground">Incluir tabela de preços no final do catálogo</p>
              </div>
            </div>
            <Switch
              checked={config.showPriceTable ?? true}
              onCheckedChange={(v) => onChange({ showPriceTable: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
