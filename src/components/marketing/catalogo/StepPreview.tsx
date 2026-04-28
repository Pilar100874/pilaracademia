import React, { useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, ChevronLeft, ChevronRight, Package, FileText, Phone, Mail, Globe, MapPin, Layers, Table } from 'lucide-react';
import { CatalogConfig, CatalogPage, CatalogProduct, LAYOUT_OPTIONS, ProductGroup, GroupFieldConfig, PRODUCT_FIELDS } from './types';
import { cn } from '@/lib/utils';
import { pdf } from '@react-pdf/renderer';
import { CatalogPDFDocument } from './PDFDocument';
import { toast } from 'sonner';
interface StepPreviewProps {
  config: CatalogConfig;
  coverPage: CatalogPage;
  productsPage: CatalogPage;
  backcoverPage: CatalogPage;
  groupImages?: Record<string, string>;
}

interface PageInfo {
  type: 'cover' | 'group-header' | 'products' | 'price-table' | 'backcover';
  groupName?: string;
  products?: CatalogProduct[];
  startIdx?: number;
  pageNumber?: number;
  priceTableData?: { groupName: string; products: CatalogProduct[] }[];
}

export const StepPreview: React.FC<StepPreviewProps> = ({
  config,
  coverPage,
  productsPage,
  backcoverPage,
  groupImages = {},
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const products = productsPage.products || [];
  const layout = productsPage.layout || 'grid-3';
  const layoutConfig = LAYOUT_OPTIONS.find((l) => l.value === layout) || LAYOUT_OPTIONS[1];
  const productsPerPage = layout === 'list' ? 4 : layoutConfig.cols * 2;
  const groupByCategory = productsPage.groupByCategory ?? true;

  // Group products
  const groupedProducts = useMemo((): ProductGroup[] => {
    if (!groupByCategory) {
      return [{ id: 'all', nome: 'Todos os Produtos', products }];
    }

    const groupMap = new Map<string, { id: string; nome: string; products: CatalogProduct[]; descritivo_catalogo?: string }>();
    products.forEach(product => {
      const groupName = product.grupo_nome || 'Outros';
      const groupId = product.grupo_id || `outros_${groupName.replace(/\s+/g, '_').toLowerCase()}`;
      
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { 
          id: groupId, 
          nome: groupName, 
          products: [],
          descritivo_catalogo: product.grupo_descritivo_catalogo
        });
      }
      groupMap.get(groupId)!.products.push(product);
    });

    return Array.from(groupMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [products, groupByCategory]);

  // Build pages array
  const pages = useMemo((): PageInfo[] => {
    const result: PageInfo[] = [{ type: 'cover', pageNumber: 1 }];
    let pageNum = 2;

    groupedProducts.forEach(group => {
      // Always create group header page for each group when groupByCategory is enabled
      if (groupByCategory) {
        result.push({ type: 'group-header', groupName: group.nome, pageNumber: pageNum++ });
      }
      
      const totalProductPages = Math.ceil(group.products.length / productsPerPage);
      for (let i = 0; i < totalProductPages; i++) {
        result.push({
          type: 'products',
          groupName: group.nome,
          products: group.products.slice(i * productsPerPage, (i + 1) * productsPerPage),
          startIdx: i * productsPerPage,
          pageNumber: pageNum++,
        });
      }
    });

    // Add price table pages only if enabled - sorted alphabetically by group, products sorted alphabetically
    if (config.showPriceTable !== false) {
      const sortedGroupsForPriceTable = [...groupedProducts]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(group => ({
          groupName: group.nome,
          products: [...group.products].sort((a, b) => a.nome.localeCompare(b.nome))
        }));
      
      // Calculate how many products fit per price table page (approximately 25-30 rows)
      const ROWS_PER_PRICE_PAGE = 28;
      let currentPricePageProducts: { groupName: string; products: CatalogProduct[] }[] = [];
      let currentRowCount = 0;
      
      sortedGroupsForPriceTable.forEach(group => {
        // Each group header takes 1 row
        const groupRows = 1 + group.products.length;
        
        if (currentRowCount + groupRows > ROWS_PER_PRICE_PAGE && currentPricePageProducts.length > 0) {
          // Push current page and start new one
          result.push({ type: 'price-table', priceTableData: currentPricePageProducts, pageNumber: pageNum++ });
          currentPricePageProducts = [];
          currentRowCount = 0;
        }
        
        currentPricePageProducts.push(group);
        currentRowCount += groupRows;
      });
      
      // Push remaining products
      if (currentPricePageProducts.length > 0) {
        result.push({ type: 'price-table', priceTableData: currentPricePageProducts, pageNumber: pageNum++ });
      }
    }

    result.push({ type: 'backcover', pageNumber: pageNum });
    return result;
  }, [groupedProducts, productsPerPage, groupByCategory]);

  const totalPages = pages.length;
  const currentYear = new Date().getFullYear();

  const formatPrice = (price?: number) => {
    if (!price) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  // Fixed A4 dimensions in pixels (for preview)
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;

  const generatePDF = async () => {
    setGenerating(true);
    toast.loading('Gerando PDF...', { id: 'pdf-gen' });

    try {
      // Generate PDF using @react-pdf/renderer
      const blob = await pdf(
        <CatalogPDFDocument
          config={config}
          coverPage={coverPage}
          productsPage={productsPage}
          backcoverPage={backcoverPage}
          groupImages={groupImages}
          groupedProducts={groupedProducts}
          pages={pages}
        />
      ).toBlob();

      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.name || 'catalogo'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF gerado com sucesso!', { id: 'pdf-gen' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF', { id: 'pdf-gen' });
    } finally {
      setGenerating(false);
    }
  };

  // Cover Page - Using inline styles for reliable PDF rendering
  const renderCoverPage = () => {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box'
        }}
      >
        {/* Top White Header Section */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '105px 30px 0 30px', 
          textAlign: 'center' 
        }}>
          <h1 style={{ 
            fontFamily: 'Times New Roman, Times, serif', 
            fontWeight: 700,
            fontSize: '48px',
            color: '#111827',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin: 0
          }}>
            {coverPage.title || config.name || 'CATALOG'}
          </h1>
          {coverPage.subtitle && (
            <p style={{ 
              fontFamily: 'Helvetica Neue, Arial, sans-serif', 
              fontWeight: 300,
              fontSize: '11px',
              color: '#9ca3af',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              marginTop: '16px'
            }}>
              {coverPage.subtitle}
            </p>
          )}
          {/* Year with decorative lines */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '16px', 
            marginTop: '20px' 
          }}>
            <div style={{ width: '56px', height: '1px', backgroundColor: '#9ca3af' }} />
            <span style={{ 
              fontFamily: 'Helvetica Neue, Arial, sans-serif', 
              fontWeight: 300,
              fontSize: '16px',
              color: '#4b5563',
              letterSpacing: '0.2em'
            }}>
              {currentYear}
            </span>
            <div style={{ width: '56px', height: '1px', backgroundColor: '#9ca3af' }} />
          </div>
        </div>

        {/* Main Image Area */}
        <div style={{ 
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#e5e7eb',
          margin: '38px 19px 151px 19px',
          flex: 1,
          minHeight: 0
        }}>
          {coverPage.backgroundImage ? (
            <img 
              src={coverPage.backgroundImage}
              alt="Cover"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top'
              }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, #d1d5db, #9ca3af)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>Sem imagem de fundo</span>
            </div>
          )}
        </div>

        {/* Bottom Footer Section */}
        <div style={{ 
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '0 19px 19px 19px'
        }}>
          {/* Logo bottom left */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {coverPage.logoUrl ? (
              <img 
                src={coverPage.logoUrl} 
                alt="Logo" 
                style={{ width: '113px', height: '113px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ 
                width: '113px', 
                height: '113px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '8px', color: '#9ca3af', textTransform: 'uppercase' }}>Logo</span>
              </div>
            )}
          </div>

          {/* Website right */}
          {backcoverPage.contactInfo?.website && (
            <span style={{ 
              fontFamily: 'Helvetica Neue, Arial, sans-serif', 
              fontWeight: 300,
              fontSize: '11px',
              color: '#9ca3af',
              letterSpacing: '0.35em',
              textTransform: 'uppercase'
            }}>
              {backcoverPage.contactInfo.website}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Group Header - Using inline styles for reliable PDF rendering
  const renderGroupHeader = (groupName: string) => {
    const group = groupedProducts.find(g => g.nome === groupName);
    const groupImage = group ? groupImages[group.id] : undefined;
    const groupDescription = group?.descritivo_catalogo;
    
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          fontFamily: config.fontFamily
        }}
      >
        {/* Background Image */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}>
          {groupImage ? (
            <img 
              src={groupImage} 
              alt={groupName} 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1a1a1a'
            }} />
          )}
          {/* Dark overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)'
          }} />
        </div>

        {/* Bottom-left positioned content */}
        <div style={{ 
          position: 'absolute', 
          bottom: '40px',
          left: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          maxWidth: '450px',
        }}>
          {/* Primary color stripe with group name - on top */}
          <div style={{ 
            backgroundColor: config.primaryColor || '#1a1a2e',
            padding: '20px 25px',
            minWidth: '180px',
          }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '1px',
              margin: 0,
            }}>
              <span style={{ fontWeight: 300 }}>Linha </span>
              {groupName}
            </h2>
            <p style={{ 
              fontSize: '10px', 
              color: 'rgba(255, 255, 255, 0.7)', 
              letterSpacing: '0.5px',
              margin: '6px 0 0 0',
            }}>
              {group?.products.length || 0} produtos
            </p>
          </div>
          
          {/* Group description text - below the box */}
          {groupDescription && (
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: '16px 20px',
              marginTop: '12px',
              maxWidth: '400px',
              borderRadius: '4px',
            }}>
              <p style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.7,
                textAlign: 'left',
                margin: 0,
              }}>
                {groupDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to get selected fields for a group, organized by category
  const getGroupFieldsByCategory = (groupName?: string): Record<string, string[]> => {
    const selectedFields = getGroupFields(groupName);
    
    const fieldsByCategory: Record<string, string[]> = {
      'Dados Básicos': [],
      'Dados do Frete': [],
      'Embalagem': [],
    };
    
    PRODUCT_FIELDS.forEach(field => {
      if (selectedFields.includes(field.key)) {
        fieldsByCategory[field.category].push(field.key);
      }
    });
    
    return fieldsByCategory;
  };

  // Helper to get selected fields for a group
  const getGroupFields = (groupName?: string): string[] => {
    if (!config.groupFieldConfigs || config.groupFieldConfigs.length === 0) {
      return ['codigo', 'descricao'];
    }
    
    if (!groupName) {
      // Return first config's fields or default
      return config.groupFieldConfigs[0]?.selectedFields || ['codigo', 'descricao'];
    }
    
    // Find group by name in grouped products
    const group = groupedProducts.find(g => g.nome === groupName);
    
    // Try to find by groupId first
    if (group) {
      const fieldConfig = config.groupFieldConfigs.find(c => c.groupId === group.id);
      if (fieldConfig?.selectedFields && fieldConfig.selectedFields.length > 0) {
        console.log('[StepPreview] Found config by groupId:', group.id, fieldConfig.selectedFields);
        return fieldConfig.selectedFields;
      }
    }
    
    // Try to find by groupName
    const fieldConfigByName = config.groupFieldConfigs.find(c => c.groupName === groupName);
    if (fieldConfigByName?.selectedFields && fieldConfigByName.selectedFields.length > 0) {
      console.log('[StepPreview] Found config by groupName:', groupName, fieldConfigByName.selectedFields);
      return fieldConfigByName.selectedFields;
    }
    
    console.log('[StepPreview] No config found for group:', groupName, 'Available configs:', config.groupFieldConfigs);
    return ['codigo', 'descricao'];
  };

  // Helper to get field label
  const getFieldLabel = (key: string): string => {
    const field = PRODUCT_FIELDS.find(f => f.key === key);
    return field?.label || key;
  };

  // Helper to format field value
  const formatFieldValue = (product: CatalogProduct, key: string): string => {
    const value = (product as any)[key];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'number') {
      if (key.includes('preco') || key.includes('valor')) {
        return `R$ ${value.toFixed(2)}`;
      }
      return value.toString();
    }
    return String(value);
  };

  // Product Page - Reference design: clean header with "Linha + GroupName", dynamic columns
  const renderProductPage = (pageProducts: typeof products, groupName?: string, pageNumber?: number) => {
    const displayGroupName = groupName || 'Produtos';
    const selectedFields = getGroupFields(groupName);
    const fieldsByCategory = getGroupFieldsByCategory(groupName);
    
    // Check which categories have fields selected
    const hasBasicFields = fieldsByCategory['Dados Básicos'].length > 0;
    const hasFreteFields = fieldsByCategory['Dados do Frete'].length > 0;
    const hasEmbalagemFields = fieldsByCategory['Embalagem'].length > 0;

    // Get grid styles based on layout
    const getGridStyles = () => {
      switch (layout) {
        case 'list':
          return { display: 'flex', flexDirection: 'column' as const, gap: '12px' };
        case 'grid-2':
          return { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' };
        case 'grid-3':
          return { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' };
        case 'grid-4':
          return { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' };
        default:
          return { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' };
      }
    };

    const getTextSize = () => {
      switch (layout) {
        case 'list': return { name: '14px', field: '12px', label: '8px' };
        case 'grid-2': return { name: '11px', field: '8px', label: '7px' };
        default: return { name: '9px', field: '7px', label: '6px' };
      }
    };

    const textSize = getTextSize();
    
    return (
      <div
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'white',
          position: 'relative',
          overflow: 'hidden',
          padding: '12mm',
          fontFamily: config.fontFamily,
          boxSizing: 'border-box'
        }}
      >
        {/* Header Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '48px', lineHeight: 1.1, margin: 0 }}>
            <span style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300, color: '#4b5563' }}>
              Linha{' '}
            </span>
            <span style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, color: '#111827' }}>
              {displayGroupName}
            </span>
          </h2>
        </div>

        {/* Products Grid */}
        <div style={{ flex: 1 }}>
          <div style={getGridStyles()}>
            {pageProducts.map((product, idx) => (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  flexDirection: layout === 'list' ? 'row' : 'column',
                  alignItems: layout === 'list' ? 'flex-start' : 'stretch',
                  gap: layout === 'list' ? '16px' : '0',
                  padding: layout === 'list' ? '12px' : '0',
                  backgroundColor: layout === 'list' ? '#f9fafb' : 'transparent',
                  borderRadius: layout === 'list' ? '4px' : '0'
                }}
              >
                {/* Product Image Container */}
                <div style={{
                  position: 'relative',
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  width: layout === 'list' ? '80px' : '100%',
                  height: layout === 'list' ? '80px' : 'auto',
                  aspectRatio: layout === 'list' ? undefined : '1/1',
                  flexShrink: 0
                }}>
                  {product.foto_url ? (
                    <img
                      src={product.foto_url}
                      alt={product.nome}
                      style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package style={{ color: '#d1d5db', width: layout === 'list' ? '32px' : '40px', height: layout === 'list' ? '32px' : '40px' }} />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div style={{ flex: 1, minWidth: 0, paddingTop: layout === 'list' ? '0' : '8px' }}>
                  {/* Product Name - Always shown */}
                  <h4 style={{ 
                    fontWeight: 600, 
                    color: '#1f2937', 
                    margin: 0,
                    fontSize: textSize.name,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {product.nome}
                  </h4>
                  
                  {/* Dados Básicos Section */}
                  {hasBasicFields && (
                    <div style={{ marginTop: '4px' }}>
                      {layout === 'list' && (
                        <p style={{ fontSize: textSize.label, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', margin: 0 }}>Dados Básicos</p>
                      )}
                      <div style={{ color: '#6b7280', fontSize: textSize.field }}>
                        {fieldsByCategory['Dados Básicos'].map((fieldKey, i, arr) => {
                          const value = formatFieldValue(product, fieldKey);
                          const validValues = arr.filter(k => formatFieldValue(product, k) !== '-');
                          const currentValidIndex = validValues.indexOf(fieldKey);
                          if (value === '-') return null;
                          return (
                            <span key={fieldKey}>
                              <span style={{ color: '#9ca3af' }}>{getFieldLabel(fieldKey)}: </span>
                              <span style={{ color: '#374151' }}>{value}</span>
                              {currentValidIndex < validValues.length - 1 && <span style={{ color: '#d1d5db' }}> • </span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Dados do Frete Section */}
                  {hasFreteFields && (
                    <div style={{ marginTop: '4px' }}>
                      {layout === 'list' && (
                        <p style={{ fontSize: textSize.label, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', margin: 0 }}>Dados do Frete</p>
                      )}
                      <div style={{ color: '#6b7280', fontSize: textSize.field }}>
                        {fieldsByCategory['Dados do Frete'].map((fieldKey, i, arr) => {
                          const value = formatFieldValue(product, fieldKey);
                          const validValues = arr.filter(k => formatFieldValue(product, k) !== '-');
                          const currentValidIndex = validValues.indexOf(fieldKey);
                          if (value === '-') return null;
                          return (
                            <span key={fieldKey}>
                              <span style={{ color: '#9ca3af' }}>{getFieldLabel(fieldKey)}: </span>
                              <span style={{ color: '#374151' }}>{value}</span>
                              {currentValidIndex < validValues.length - 1 && <span style={{ color: '#d1d5db' }}> • </span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Embalagem Section */}
                  {hasEmbalagemFields && (
                    <div style={{ marginTop: '4px' }}>
                      {layout === 'list' && (
                        <p style={{ fontSize: textSize.label, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', margin: 0 }}>Embalagem</p>
                      )}
                      <div style={{ color: '#6b7280', fontSize: textSize.field }}>
                        {fieldsByCategory['Embalagem'].map((fieldKey, i, arr) => {
                          const value = formatFieldValue(product, fieldKey);
                          const validValues = arr.filter(k => formatFieldValue(product, k) !== '-');
                          const currentValidIndex = validValues.indexOf(fieldKey);
                          if (value === '-') return null;
                          return (
                            <span key={fieldKey}>
                              <span style={{ color: '#9ca3af' }}>{getFieldLabel(fieldKey)}: </span>
                              <span style={{ color: '#374151' }}>{value}</span>
                              {currentValidIndex < validValues.length - 1 && <span style={{ color: '#d1d5db' }}> • </span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with page number */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '16px' }}>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>
            {String(pageNumber || 1).padStart(2, '0')}
          </span>
        </div>
      </div>
    );
  };

  // Back Cover - Using inline styles for reliable PDF rendering
  const renderBackcoverPage = () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: config.fontFamily,
        boxSizing: 'border-box'
      }}
    >
      {/* Background */}
      {backcoverPage.backgroundImage ? (
        <>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${backcoverPage.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)'
          }} />
        </>
      ) : (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: backcoverPage.backgroundColor || '#1a1a1a'
        }} />
      )}

      {/* Left Side - Decorative */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: 0
          }}>
            <span style={{ 
              fontFamily: 'Times New Roman, Times, serif', 
              fontStyle: 'italic', 
              display: 'block' 
            }}>
              {currentYear}
            </span>
          </h2>
        </div>
      </div>

      {/* Right Side - Contact Info */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '50%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px',
        backgroundColor: 'rgba(255,255,255,0.05)'
      }}>
        <div>
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '30px', 
              fontWeight: 300, 
              color: '#ffffff',
              margin: 0
            }}>
              <span style={{ 
                fontFamily: 'Times New Roman, Times, serif', 
                fontStyle: 'italic', 
                color: 'rgba(255,255,255,0.6)' 
              }}>
                Product
              </span>
              {' '}
              <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>CATALOG</span>
            </h3>
            <div style={{ 
              width: '64px', 
              height: '2px', 
              backgroundColor: 'rgba(255,255,255,0.3)', 
              marginTop: '8px' 
            }} />
          </div>

          <div>
            <p style={{ 
              fontSize: '14px', 
              color: 'rgba(255,255,255,0.6)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              marginBottom: '16px'
            }}>
              {backcoverPage.title || 'Entre em contato'}
            </p>
            
            <div>
              {backcoverPage.contactInfo?.phone && (
                <div style={{ 
                  color: 'rgba(255,255,255,0.8)',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '14px' }}>{backcoverPage.contactInfo.phone}</span>
                </div>
              )}
              {backcoverPage.contactInfo?.email && (
                <div style={{ 
                  color: 'rgba(255,255,255,0.8)',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '14px' }}>{backcoverPage.contactInfo.email}</span>
                </div>
              )}
              {backcoverPage.contactInfo?.website && (
                <div style={{ 
                  color: 'rgba(255,255,255,0.8)',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '14px' }}>{backcoverPage.contactInfo.website}</span>
                </div>
              )}
              {backcoverPage.contactInfo?.address && (
                <div style={{ 
                  color: 'rgba(255,255,255,0.8)',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '14px' }}>{backcoverPage.contactInfo.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Price Table Page - Alphabetical list of products with prices grouped by category
  const renderPriceTablePage = (priceTableData: { groupName: string; products: CatalogProduct[] }[]) => (
    <div
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'hidden',
        padding: '12mm',
        fontFamily: config.fontFamily,
        boxSizing: 'border-box'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Tabela de Preços
        </h2>
        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Lista completa de produtos por grupo</p>
      </div>

      {/* Price Table */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: '600', color: '#374151', width: '15%' }}>Código</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: '600', color: '#374151', width: '60%' }}>Produto</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: '600', color: '#374151', width: '25%' }}>Preço</th>
            </tr>
          </thead>
          <tbody>
            {priceTableData.map((group, groupIdx) => (
              <React.Fragment key={group.groupName}>
                {/* Group Header Row */}
                <tr style={{ backgroundColor: '#1f2937' }}>
                  <td colSpan={3} style={{ padding: '6px 8px', fontWeight: 'bold', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '8px' }}>
                    {group.groupName}
                  </td>
                </tr>
                {/* Product Rows */}
                {group.products.map((product, productIdx) => (
                  <tr 
                    key={product.id} 
                    style={{ 
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: productIdx % 2 === 0 ? 'white' : '#fafafa'
                    }}
                  >
                    <td style={{ padding: '4px 8px', color: '#4b5563', fontFamily: 'monospace' }}>{product.codigo || '-'}</td>
                    <td style={{ padding: '4px 8px', color: '#1f2937' }}>{product.nome}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: '600', color: '#111827' }}>
                      {product.preco_tabela ? formatPrice(product.preco_tabela) : '-'}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', marginTop: '8px', borderTop: '1px solid #e5e7eb' }}>
        <span style={{ fontSize: '8px', color: '#9ca3af' }}>
          {config.name || 'Catálogo'} - {currentYear}
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          Tabela de Preços
        </span>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    const pageInfo = pages[currentPage];
    
    switch (pageInfo.type) {
      case 'cover':
        return renderCoverPage();
      case 'group-header':
        return renderGroupHeader(pageInfo.groupName!);
      case 'products':
        return renderProductPage(pageInfo.products!, pageInfo.groupName, pageInfo.pageNumber);
      case 'price-table':
        return renderPriceTablePage(pageInfo.priceTableData!);
      case 'backcover':
        return renderBackcoverPage();
      default:
        return null;
    }
  };

  const getPageLabel = () => {
    const pageInfo = pages[currentPage];
    switch (pageInfo.type) {
      case 'cover': return 'Capa';
      case 'group-header': return `Seção: ${pageInfo.groupName}`;
      case 'products': return pageInfo.groupName || 'Produtos';
      case 'price-table': return 'Tabela de Preços';
      case 'backcover': return 'Contracapa';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Preview do Catálogo</h3>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-lg font-normal">
              <FileText className="h-3 w-3 mr-1" />
              {products.length} produtos
            </Badge>
            <Badge variant="secondary" className="rounded-lg font-normal">
              <Layers className="h-3 w-3 mr-1" />
              {groupedProducts.length} grupo{groupedProducts.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary" className="rounded-lg font-normal">
              {totalPages} páginas
            </Badge>
          </div>
        </div>
        <Button onClick={generatePDF} disabled={generating} size="lg" className="rounded-xl">
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Baixar PDF
        </Button>
      </div>

      {/* Main Preview */}
      <div className="rounded-2xl overflow-hidden bg-muted/30 border">
        {/* Navigation */}
        <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0 || generating}
            className="rounded-lg"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm font-medium">
            {getPageLabel()} <span className="text-muted-foreground">({currentPage + 1}/{totalPages})</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1 || generating}
            className="rounded-lg"
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Page View */}
        <div className="flex justify-center p-8 bg-muted/20 overflow-auto">
          <div
            ref={pdfRef}
            className="bg-white shadow-2xl rounded-lg overflow-hidden flex-shrink-0"
            style={{
              width: `${A4_WIDTH_PX}px`,
              height: `${A4_HEIGHT_PX}px`,
            }}
          >
            {renderCurrentPage()}
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      <ScrollArea className="w-full pb-2">
        <div className="flex gap-3">
          {pages.map((pageInfo, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              disabled={generating}
              className={cn(
                "flex-shrink-0 w-20 h-28 rounded-xl border-2 overflow-hidden transition-all",
                currentPage === i 
                  ? "border-primary shadow-lg scale-105" 
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <div 
                className={cn(
                  "w-full h-full flex flex-col items-center justify-center text-xs gap-1 p-1",
                  (pageInfo.type === 'cover' || pageInfo.type === 'backcover' || pageInfo.type === 'group-header' || pageInfo.type === 'price-table')
                    ? "text-white bg-gray-900" 
                    : "bg-white text-gray-600 border"
                )}
              >
                {pageInfo.type === 'cover' ? (
                  <>
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Capa</span>
                  </>
                ) : pageInfo.type === 'backcover' ? (
                  <>
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Contra</span>
                  </>
                ) : pageInfo.type === 'group-header' ? (
                  <>
                    <Layers className="h-4 w-4" />
                    <span className="font-medium text-center line-clamp-2">{pageInfo.groupName}</span>
                  </>
                ) : pageInfo.type === 'price-table' ? (
                  <>
                    <Table className="h-4 w-4" />
                    <span className="font-medium text-center">Preços</span>
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    <span className="font-medium text-center line-clamp-2">{pageInfo.groupName}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
