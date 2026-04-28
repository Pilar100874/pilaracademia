import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Save, BookOpen, Loader2 } from 'lucide-react';
import { CatalogConfig, CatalogPage, WIZARD_STEPS, GroupFieldConfig } from './types';
import { CatalogWizardSteps } from './CatalogWizardSteps';
import { StepInfo } from './StepInfo';
import { StepCover } from './StepCover';
import { StepProducts } from './StepProducts';
import { StepGroupImages } from './StepGroupImages';
import { StepGroupFields } from './StepGroupFields';
import { StepBackcover } from './StepBackcover';
import { StepPreview } from './StepPreview';
import { SavedCatalogsList } from './SavedCatalogsList';
import { useSavedCatalogs, SavedCatalog } from './hooks/useSavedCatalogs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ViewMode = 'list' | 'editor';

const MarketingCatalogo: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentStep, setCurrentStep] = useState(0);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [groupImages, setGroupImages] = useState<Record<string, string>>({});
  const [groupPrompts, setGroupPrompts] = useState<Record<string, string>>({});
  const [groupFieldConfigs, setGroupFieldConfigs] = useState<GroupFieldConfig[]>([]);

  const [config, setConfig] = useState<CatalogConfig>({
    name: '',
    pages: [],
    primaryColor: '#0f172a',
    secondaryColor: '#64748b',
    fontFamily: 'Inter, sans-serif',
    showPrices: true,
    showCodes: true,
    showPriceTable: true,
    groupFieldConfigs: [],
  });

  const [coverPage, setCoverPage] = useState<CatalogPage>({
    id: 'cover',
    type: 'cover',
    title: '',
    subtitle: '',
    backgroundColor: '#0f172a',
  });

  const [productsPage, setProductsPage] = useState<CatalogPage>({
    id: 'products',
    type: 'products',
    products: [],
    layout: 'grid-3',
  });

  const [backcoverPage, setBackcoverPage] = useState<CatalogPage>({
    id: 'backcover',
    type: 'backcover',
    title: 'Entre em Contato',
    backgroundColor: '#0f172a',
    contactInfo: {},
  });

  const { 
    catalogs, 
    isLoading, 
    isSaving, 
    saveCatalog, 
    deleteCatalog, 
    duplicateCatalog,
    updateCatalogStatus 
  } = useSavedCatalogs(estabelecimentoId);

  useEffect(() => {
    const storedId = localStorage.getItem('estabelecimentoId');
    if (storedId) {
      setEstabelecimentoId(storedId);
    }
  }, []);

  const resetForm = () => {
    setConfig({
      name: '',
      pages: [],
      primaryColor: '#0f172a',
      secondaryColor: '#64748b',
      fontFamily: 'Inter, sans-serif',
      showPrices: true,
      showCodes: true,
      showPriceTable: true,
      groupFieldConfigs: [],
    });
    setCoverPage({
      id: 'cover',
      type: 'cover',
      title: '',
      subtitle: '',
      backgroundColor: '#0f172a',
    });
    setProductsPage({
      id: 'products',
      type: 'products',
      products: [],
      layout: 'grid-3',
    });
    setBackcoverPage({
      id: 'backcover',
      type: 'backcover',
      title: 'Entre em Contato',
      backgroundColor: '#0f172a',
      contactInfo: {},
    });
    setCurrentStep(0);
    setEditingCatalogId(null);
    setImagePrompt('');
    setGroupImages({});
    setGroupPrompts({});
    setGroupFieldConfigs([]);
  };

  const handleCreateNew = () => {
    resetForm();
    setViewMode('editor');
  };

  const handleEditCatalog = (catalog: SavedCatalog) => {
    setEditingCatalogId(catalog.id);
    setConfig(catalog.config);
    if (catalog.cover_page) setCoverPage(catalog.cover_page);
    if (catalog.products_page) setProductsPage(catalog.products_page);
    if (catalog.backcover_page) setBackcoverPage(catalog.backcover_page);
    // Restore group field configs
    if (catalog.config.groupFieldConfigs) {
      setGroupFieldConfigs(catalog.config.groupFieldConfigs);
    }
    // Restore group images
    if (catalog.config.groupImages) {
      setGroupImages(catalog.config.groupImages);
    }
    setCurrentStep(0);
    setViewMode('editor');
  };

  const handleDeleteCatalog = async (id: string) => {
    await deleteCatalog(id);
  };

  const handleDuplicateCatalog = async (catalog: SavedCatalog) => {
    await duplicateCatalog(catalog);
  };

  const handleUpdateCatalogStatus = async (id: string, ativo: boolean, dataValidade: string | null, dataIndeterminada: boolean) => {
    return await updateCatalogStatus(id, ativo, dataValidade, dataIndeterminada);
  };

  const handleGeneratePDF = (catalog: SavedCatalog) => {
    // Load the catalog and go directly to preview step
    setEditingCatalogId(catalog.id);
    setConfig({
      ...catalog.config,
      name: catalog.nome,
    });
    if (catalog.cover_page) setCoverPage(catalog.cover_page);
    if (catalog.products_page) setProductsPage(catalog.products_page);
    if (catalog.backcover_page) setBackcoverPage(catalog.backcover_page);
    if (catalog.config.groupFieldConfigs) {
      setGroupFieldConfigs(catalog.config.groupFieldConfigs);
    }
    if (catalog.config.groupImages) {
      setGroupImages(catalog.config.groupImages);
    }
    setCurrentStep(6); // Go directly to preview step
    setViewMode('editor');
  };

  const handleBackToList = () => {
    setViewMode('list');
    resetForm();
  };

  const handleSaveClick = () => {
    setSaveName(config.name || '');
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = async () => {
    if (!saveName.trim()) return;
    
    const updatedConfig = { 
      ...config, 
      name: saveName,
      groupImages,
      groupFieldConfigs 
    };
    
    // Use cover background image as thumbnail
    const thumbnail = coverPage.backgroundImage || coverPage.logoUrl || undefined;
    
    await saveCatalog(
      saveName,
      updatedConfig,
      coverPage,
      productsPage,
      backcoverPage,
      thumbnail,
      editingCatalogId || undefined
    );
    
    setSaveDialogOpen(false);
    setConfig(updatedConfig);
    
    if (!editingCatalogId) {
      // If it's a new catalog, we could optionally go back to list
      // For now, we stay in editor mode
    }
  };

  const updateConfig = (updates: Partial<CatalogConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return config.name.trim().length > 0;
      case 1:
        return true;
      case 2:
        return (productsPage.products?.length || 0) > 0;
      case 3:
        return true; // Groups step
      case 4:
        return true; // Backcover step
      case 5:
        return true; // Preview step
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1 && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleGroupImageChange = (groupId: string, imageUrl: string) => {
    setGroupImages(prev => ({ ...prev, [groupId]: imageUrl }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepInfo config={config} onChange={updateConfig} />;
      case 1:
        return (
          <StepCover
            page={coverPage}
            onChange={(newPage) => {
              setCoverPage(newPage);
            }}
            onPromptChange={setImagePrompt}
            imagePrompt={imagePrompt}
            primaryColor={config.primaryColor}
            catalogName={config.name}
            businessType={config.businessType}
            estabelecimentoId={estabelecimentoId}
          />
        );
      case 2:
        return (
          <StepProducts
            page={productsPage}
            onChange={setProductsPage}
            estabelecimentoId={estabelecimentoId}
            showPrices={config.showPrices}
            showCodes={config.showCodes}
          />
        );
      case 3:
        return (
          <StepGroupImages
            productsPage={productsPage}
            groupImages={groupImages}
            onGroupImageChange={handleGroupImageChange}
            groupPrompts={groupPrompts}
            onGroupPromptChange={(groupId, prompt) => setGroupPrompts(prev => ({ ...prev, [groupId]: prompt }))}
            estabelecimentoId={estabelecimentoId}
          />
        );
      case 4:
        return (
          <StepGroupFields
            productsPage={productsPage}
            groupFieldConfigs={groupFieldConfigs}
            onGroupFieldConfigChange={(configs) => {
              setGroupFieldConfigs(configs);
              updateConfig({ groupFieldConfigs: configs });
            }}
          />
        );
      case 5:
        return (
          <StepBackcover
            page={backcoverPage}
            onChange={setBackcoverPage}
            primaryColor={config.primaryColor}
            logoUrl={coverPage.logoUrl}
            estabelecimentoId={estabelecimentoId || 'default'}
          />
        );
      case 6:
        return (
          <StepPreview
            config={config}
            coverPage={coverPage}
            productsPage={productsPage}
            backcoverPage={backcoverPage}
            groupImages={groupImages}
          />
        );
      default:
        return null;
    }
  };

  if (!estabelecimentoId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Nenhum estabelecimento selecionado</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Selecione um estabelecimento para começar a criar catálogos de produtos
        </p>
      </div>
    );
  }

  // Show saved catalogs list
  if (viewMode === 'list') {
    return (
      <SavedCatalogsList
        catalogs={catalogs}
        isLoading={isLoading}
        onCreateNew={handleCreateNew}
        onEdit={handleEditCatalog}
        onDelete={handleDeleteCatalog}
        onDuplicate={handleDuplicateCatalog}
        onGeneratePDF={handleGeneratePDF}
        onUpdateStatus={handleUpdateCatalogStatus}
      />
    );
  }

  // Show catalog editor
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="rounded-lg -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {editingCatalogId ? 'Editar Catálogo' : 'Criar Catálogo'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Monte seu catálogo de produtos em poucos passos
          </p>
        </div>
        <Button
          onClick={handleSaveClick}
          disabled={!config.name.trim() || isSaving}
          className="rounded-xl"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      {/* Wizard Steps */}
      <CatalogWizardSteps
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      {/* Step Content */}
      <div className="bg-card rounded-2xl border p-6 md:p-8">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {currentStep < WIZARD_STEPS.length - 1 && (
          <Button 
            onClick={handleNext} 
            disabled={!canProceed()}
            className="rounded-xl"
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Catálogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">Nome do Catálogo</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Ex: Catálogo Primavera 2024"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfirm} disabled={!saveName.trim() || isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingCatalogId ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingCatalogo;
