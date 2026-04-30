import { useRef, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Package, Droplets, Upload, Loader2, ScanLine, UtensilsCrossed } from 'lucide-react';
import { CustomProduct } from '@/hooks/useCustomProducts';
import { FieldError } from '@/components/FieldError';

interface ProductFormProps {
  isEdit: boolean;
  editingProduct: CustomProduct | null;
  formName: string;
  setFormName: (v: string) => void;
  formBrand: string;
  setFormBrand: (v: string) => void;
  formBarcode: string;
  setFormBarcode: (v: string) => void;
  formCalories: string;
  setFormCalories: (v: string) => void;
  formProtein: string;
  setFormProtein: (v: string) => void;
  formCarbs: string;
  setFormCarbs: (v: string) => void;
  formFat: string;
  setFormFat: (v: string) => void;
  formFiber: string;
  setFormFiber: (v: string) => void;
  formSodium: string;
  setFormSodium: (v: string) => void;
  formSaturatedFat: string;
  setFormSaturatedFat: (v: string) => void;
  formTransFat: string;
  setFormTransFat: (v: string) => void;
  formRefQuantity: string;
  setFormRefQuantity: (v: string) => void;
  formRefUnit: string;
  setFormRefUnit: (v: string) => void;
  formIsLiquid: boolean;
  setFormIsLiquid: (v: boolean) => void;
  formImageUrl: string;
  formPackageWeight: string;
  setFormPackageWeight: (v: string) => void;
  formPackageUnits: string;
  setFormPackageUnits: (v: string) => void;
  formPackageVolume: string;
  setFormPackageVolume: (v: string) => void;
  imagePreview: string | null;
  isUploading: boolean;
  isSearchingBarcode: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenBarcodeScanner: () => void;
  onZoomImage: (url: string) => void;
  onCancel: () => void;
  onSave: () => void;
  nameError?: string | null;
  nameInputRef?: React.Ref<HTMLInputElement>;
  onNameInteract?: () => void;
}

export function ProductForm({
  isEdit,
  editingProduct,
  formName,
  setFormName,
  formBrand,
  setFormBrand,
  formBarcode,
  setFormBarcode,
  formCalories,
  setFormCalories,
  formProtein,
  setFormProtein,
  formCarbs,
  setFormCarbs,
  formFat,
  setFormFat,
  formFiber,
  setFormFiber,
  formSodium,
  setFormSodium,
  formSaturatedFat,
  setFormSaturatedFat,
  formTransFat,
  setFormTransFat,
  formRefQuantity,
  setFormRefQuantity,
  formRefUnit,
  setFormRefUnit,
  formIsLiquid,
  setFormIsLiquid,
  formImageUrl,
  formPackageWeight,
  setFormPackageWeight,
  formPackageUnits,
  setFormPackageUnits,
  formPackageVolume,
  setFormPackageVolume,
  imagePreview,
  isUploading,
  isSearchingBarcode,
  onFileChange,
  onOpenBarcodeScanner,
  onZoomImage,
  onCancel,
  onSave,
  nameError,
  nameInputRef,
  onNameInteract,
}: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayImageUrl = imagePreview || formImageUrl;

  return (
    <div className="space-y-4 pt-2">
      {/* Image upload */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => displayImageUrl && onZoomImage(displayImageUrl)}
          className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          ) : displayImageUrl ? (
            <img src={displayImageUrl} alt="Preview" className="h-full w-full object-cover" />
          ) : formIsLiquid ? (
            <Droplets className="h-6 w-6 text-sky-500" />
          ) : (
            <UtensilsCrossed className="h-6 w-6 text-primary" />
          )}
        </button>
        <div className="flex-1">
          <label className="text-sm text-muted-foreground mb-1 block">Imagem do produto</label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {formImageUrl || imagePreview ? 'Trocar imagem' : 'Selecionar imagem'}
              </>
            )}
          </Button>
        </div>
      </div>

      {isEdit && editingProduct && (
        <div className="p-2 rounded-lg bg-secondary/50 text-center">
          <p className="text-xs text-muted-foreground">Código de barras</p>
          <p className="font-mono text-sm">{editingProduct.barcode}</p>
        </div>
      )}

      {!isEdit && (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground block">Código de barras</label>
          <div className="flex gap-2">
            <Input 
              value={formBarcode} 
              onChange={(e) => setFormBarcode(e.target.value)} 
              placeholder="Deixe em branco para gerar"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onOpenBarcodeScanner}
              disabled={isSearchingBarcode}
            >
              {isSearchingBarcode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Escaneie para preencher automaticamente
          </p>
        </div>
      )}

      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
        <Input
          ref={nameInputRef}
          value={formName}
          onChange={(e) => { setFormName(e.target.value); onNameInteract?.(); }}
          placeholder="Nome do produto"
          aria-invalid={!!nameError}
        />
        <FieldError message={nameError} />
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Marca</label>
        <Input value={formBrand} onChange={(e) => setFormBrand(e.target.value)} placeholder="Opcional" />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-sky-500/10">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-sky-500" />
          <Label htmlFor="is-liquid-form" className="text-sm">Produto líquido</Label>
        </div>
        <Switch 
          id="is-liquid-form" 
          checked={formIsLiquid} 
          onCheckedChange={(checked) => {
            setFormIsLiquid(checked);
            if (checked) setFormRefUnit('ml');
            else setFormRefUnit('g');
          }} 
        />
      </div>

      {/* Package info section */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Informações da Embalagem
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Preencha para calcular consumo por porção ou unidade
        </p>
        
        {formIsLiquid ? (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Volume total (ml)</label>
            <Input 
              inputMode="numeric"
              pattern="[0-9]*"
              value={formPackageVolume} 
              onChange={(e) => setFormPackageVolume(e.target.value.replace(/[^0-9]/g, ''))} 
              placeholder="Ex: 350"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Peso total (g)</label>
              <Input 
                inputMode="numeric"
                pattern="[0-9]*"
                value={formPackageWeight} 
                onChange={(e) => setFormPackageWeight(e.target.value.replace(/[^0-9]/g, ''))} 
                placeholder="Ex: 500"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Unidades</label>
              <Input 
                inputMode="numeric"
                pattern="[0-9]*"
                value={formPackageUnits} 
                onChange={(e) => setFormPackageUnits(e.target.value.replace(/[^0-9]/g, ''))} 
                placeholder="Ex: 10"
              />
            </div>
            {formPackageWeight && formPackageUnits && Number(formPackageUnits) > 0 && (
              <div className="col-span-2 text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                Cada unidade: <strong>{(Number(formPackageWeight) / Number(formPackageUnits)).toFixed(0)}g</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-1">Informações Nutricionais</p>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Por</span>
          <Input 
            inputMode="numeric"
            pattern="[0-9]*"
            value={formRefQuantity} 
            onChange={(e) => setFormRefQuantity(e.target.value.replace(/[^0-9]/g, ''))} 
            className="w-20 h-8 text-sm"
          />
          <span className="text-xs text-muted-foreground">{formIsLiquid ? 'ml' : 'g'}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Calorias</label>
            <Input inputMode="decimal" pattern="[0-9]*" value={formCalories} onChange={(e) => setFormCalories(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Proteína (g)</label>
            <Input inputMode="decimal" pattern="[0-9]*" value={formProtein} onChange={(e) => setFormProtein(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Carboidratos (g)</label>
            <Input inputMode="decimal" pattern="[0-9]*" value={formCarbs} onChange={(e) => setFormCarbs(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Gorduras (g)</label>
            <Input inputMode="decimal" pattern="[0-9]*" value={formFat} onChange={(e) => setFormFat(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fibras (g)</label>
            <Input inputMode="decimal" pattern="[0-9]*" value={formFiber} onChange={(e) => setFormFiber(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sódio (mg)</label>
            <Input inputMode="decimal" pattern="[0-9]*" value={formSodium} onChange={(e) => setFormSodium(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">G. Saturada (g)</label>
            <Input inputMode="decimal" pattern="[0-9]*" value={formSaturatedFat} onChange={(e) => setFormSaturatedFat(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">G. Trans (g)</label>
            <Input inputMode="decimal" pattern="[0-9]*" value={formTransFat} onChange={(e) => setFormTransFat(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={onSave}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
