import { useState } from 'react';
import { ProductFormDialog } from './ProductFormDialog';
import { ProductConsumptionDialog } from './ProductConsumptionDialog';
import { CustomProduct } from '@/hooks/useCustomProducts';

interface ManualEntryFormProps {
  onSubmit: (name: string, nutrition: any, quantity: number, unit: string) => void;
  onClose: () => void;
}

export function ManualEntryForm({ onSubmit, onClose }: ManualEntryFormProps) {
  const [savedProduct, setSavedProduct] = useState<CustomProduct | null>(null);
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);

  const handleProductSaved = (product: CustomProduct) => {
    setSavedProduct(product);
    setShowConsumptionDialog(true);
  };

  const handleConsumptionSuccess = () => {
    setShowConsumptionDialog(false);
    setSavedProduct(null);
    onClose();
  };

  // If showing consumption dialog after product is saved
  if (showConsumptionDialog && savedProduct) {
    return (
      <ProductConsumptionDialog
        product={savedProduct}
        open={showConsumptionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowConsumptionDialog(false);
            setSavedProduct(null);
            onClose();
          }
        }}
        onSuccess={handleConsumptionSuccess}
      />
    );
  }

  // Show product form first
  return (
    <ProductFormDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      onProductSaved={handleProductSaved}
      title="Cadastrar Produto Manual"
    />
  );
}
