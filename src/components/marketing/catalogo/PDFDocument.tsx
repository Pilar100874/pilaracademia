import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { CatalogConfig, CatalogPage, CatalogProduct, LAYOUT_OPTIONS, ProductGroup, PRODUCT_FIELDS } from './types';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 700 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmSU5fBBc9.ttf', fontWeight: 300 },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  // Cover styles
  coverContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  coverHeader: {
    backgroundColor: '#ffffff',
    padding: '40pt 30pt 0 30pt',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: '#111827',
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 9,
    fontWeight: 300,
    color: '#9ca3af',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 12,
    textAlign: 'center',
  },
  coverYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  coverYearLine: {
    width: 40,
    height: 1,
    backgroundColor: '#9ca3af',
  },
  coverYear: {
    fontSize: 12,
    fontWeight: 300,
    color: '#4b5563',
    letterSpacing: 2,
    marginHorizontal: 12,
  },
  coverImageArea: {
    flex: 1,
    margin: '30pt 15pt 115pt 15pt',
    backgroundColor: '#e5e7eb',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: '0 15pt 15pt 15pt',
  },
  coverLogo: {
    width: 85,
    height: 85,
    objectFit: 'contain',
  },
  coverWebsite: {
    fontSize: 8,
    fontWeight: 300,
    color: '#9ca3af',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Group header styles
  groupContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  groupImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  groupImagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#6b7280',
  },
  groupTextContainer: {
    position: 'absolute',
    left: 35,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupTextInner: {
    transform: 'rotate(-90deg)',
    transformOrigin: 'center',
  },
  groupTextLinha: {
    fontSize: 60,
    fontWeight: 300,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: -1,
  },
  groupTextName: {
    fontSize: 60,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: -1,
    marginTop: 4,
  },
  // Product page styles
  productPageContainer: {
    width: '100%',
    height: '100%',
    padding: 35,
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
  },
  productPageHeader: {
    marginBottom: 20,
  },
  productPageTitle: {
    fontSize: 28,
  },
  productPageTitleLight: {
    fontWeight: 300,
    color: '#6b7280',
  },
  productPageTitleBold: {
    fontWeight: 700,
    color: '#111827',
  },
  productsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  // Grid cards - using fixed widths for reliability
  productCard2: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 15,
    display: 'flex',
    flexDirection: 'column',
  },
  productCard3: {
    width: '31%',
    marginRight: '2%',
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  productCard4: {
    width: '23%',
    marginRight: '2%',
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  productCardList: {
    width: '100%',
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
    borderRadius: 4,
  },
  productImageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: '80%',
    height: '80%',
    objectFit: 'contain',
  },
  productImageListContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    flexShrink: 0,
  },
  productImageList: {
    width: '85%',
    height: '85%',
    objectFit: 'contain',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
  },
  productNameSize2: { fontSize: 11 },
  productNameSize3: { fontSize: 9 },
  productNameSize4: { fontSize: 8 },
  productNameSizeList: { fontSize: 12 },
  productField: {
    marginTop: 2,
  },
  productFieldSize2: { fontSize: 8 },
  productFieldSize3: { fontSize: 7 },
  productFieldSize4: { fontSize: 6 },
  productFieldSizeList: { fontSize: 9 },
  productFieldLabel: {
    color: '#9ca3af',
  },
  productFieldValue: {
    color: '#4b5563',
  },
  productPageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 15,
    marginTop: 'auto',
  },
  pageNumber: {
    fontSize: 8,
    color: '#9ca3af',
  },
  // Price table styles
  priceTableContainer: {
    width: '100%',
    height: '100%',
    padding: 35,
    backgroundColor: '#ffffff',
  },
  priceTableHeader: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  priceTableTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  priceTableSubtitle: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 3,
  },
  priceTableContent: {
    flex: 1,
  },
  priceTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
  },
  priceTableHeaderCell: {
    fontSize: 7,
    fontWeight: 600,
    color: '#374151',
    paddingHorizontal: 6,
  },
  priceTableGroupRow: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  priceTableGroupName: {
    fontSize: 7,
    fontWeight: 700,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  priceTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 3,
  },
  priceTableRowAlt: {
    backgroundColor: '#fafafa',
  },
  priceTableCell: {
    fontSize: 7,
    paddingHorizontal: 6,
  },
  priceTableCellCode: {
    width: '15%',
    color: '#4b5563',
    fontFamily: 'Courier',
  },
  priceTableCellName: {
    width: '60%',
    color: '#1f2937',
  },
  priceTableCellPrice: {
    width: '25%',
    textAlign: 'right',
    fontWeight: 600,
    color: '#111827',
  },
  priceTableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  priceTableFooterText: {
    fontSize: 6,
    color: '#9ca3af',
  },
  // Backcover styles
  backcoverContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
  },
  backcoverBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  backcoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backcoverLeft: {
    width: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backcoverYear: {
    fontSize: 36,
    fontWeight: 300,
    color: 'rgba(255, 255, 255, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  backcoverLogo: {
    height: 48,
    objectFit: 'contain',
    marginTop: 24,
    opacity: 0.8,
  },
  backcoverRight: {
    width: '50%',
    justifyContent: 'center',
    padding: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backcoverTitle: {
    fontSize: 22,
    fontWeight: 300,
    color: '#ffffff',
  },
  backcoverTitleItalic: {
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  backcoverTitleBold: {
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  backcoverLine: {
    width: 48,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 6,
    marginBottom: 24,
  },
  backcoverContactLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  backcoverContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backcoverContactIcon: {
    fontSize: 10,
    marginRight: 10,
  },
  backcoverContactText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Product placeholder
  productPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPlaceholderText: {
    fontSize: 8,
    color: '#9ca3af',
  },
});

interface PDFDocumentProps {
  config: CatalogConfig;
  coverPage: CatalogPage;
  productsPage: CatalogPage;
  backcoverPage: CatalogPage;
  groupImages?: Record<string, string>;
  groupedProducts: ProductGroup[];
  pages: PageInfo[];
}

interface PageInfo {
  type: 'cover' | 'group-header' | 'products' | 'price-table' | 'backcover';
  groupName?: string;
  products?: CatalogProduct[];
  startIdx?: number;
  pageNumber?: number;
  priceTableData?: { groupName: string; products: CatalogProduct[] }[];
}

const formatPrice = (price?: number) => {
  if (!price) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};

// Cover Page Component
const CoverPage: React.FC<{
  coverPage: CatalogPage;
  backcoverPage: CatalogPage;
  config: CatalogConfig;
  currentYear: number;
}> = ({ coverPage, backcoverPage, config, currentYear }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.coverContainer}>
      {/* Header */}
      <View style={styles.coverHeader}>
        <Text style={styles.coverTitle}>
          {coverPage.title || config.name || 'CATALOG'}
        </Text>
        {coverPage.subtitle && (
          <Text style={styles.coverSubtitle}>{coverPage.subtitle}</Text>
        )}
        <View style={styles.coverYearContainer}>
          <View style={styles.coverYearLine} />
          <Text style={styles.coverYear}>{currentYear}</Text>
          <View style={styles.coverYearLine} />
        </View>
      </View>

      {/* Image Area */}
      <View style={styles.coverImageArea}>
        {coverPage.backgroundImage ? (
          <Image src={coverPage.backgroundImage} style={styles.coverImage} />
        ) : (
          <View style={{ flex: 1, backgroundColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 10 }}>Sem imagem de fundo</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.coverFooter}>
        {coverPage.logoUrl ? (
          <Image src={coverPage.logoUrl} style={styles.coverLogo} />
        ) : (
          <View style={{ width: 85, height: 85, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 6, color: '#9ca3af' }}>LOGO</Text>
          </View>
        )}
        {backcoverPage.contactInfo?.website && (
          <Text style={styles.coverWebsite}>{backcoverPage.contactInfo.website}</Text>
        )}
      </View>
    </View>
  </Page>
);

// Group Header Page Component - Stripe with description layout
const GroupHeaderPage: React.FC<{
  groupName: string;
  groupImage?: string;
  productCount: number;
  primaryColor?: string;
  groupDescription?: string;
}> = ({ groupName, groupImage, productCount, primaryColor = '#1a1a2e', groupDescription }) => (
  <Page size="A4" style={styles.page}>
    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Background */}
      {groupImage ? (
        <Image src={groupImage} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#1a1a1a' }} />
      )}
      
      {/* Dark overlay */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)' }} />
      
      {/* Bottom-left positioned content - 4cm from bottom and left */}
      <View style={{ 
        position: 'absolute', 
        bottom: 113,
        left: 113,
        flexDirection: 'column',
        alignItems: 'flex-start',
        maxWidth: 400,
      }}>
        {/* Primary color stripe with group name - on top */}
        <View style={{ 
          backgroundColor: primaryColor,
          paddingVertical: 20,
          paddingHorizontal: 25,
          minWidth: 180,
        }}>
          <Text style={{
            fontSize: 28,
            color: '#ffffff',
            letterSpacing: 1,
          }}>
            <Text style={{ fontWeight: 300 }}>Linha </Text>
            <Text style={{ fontWeight: 700 }}>{groupName}</Text>
          </Text>
          <Text style={{ 
            fontSize: 10, 
            color: 'rgba(255, 255, 255, 0.7)', 
            marginTop: 6,
            letterSpacing: 0.5,
          }}>
            {productCount} produtos
          </Text>
        </View>
        
        {/* Group description text - below the box */}
        {groupDescription && (
          <View style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: 16,
            marginTop: 12,
            maxWidth: 350,
          }}>
            <Text style={{
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.7,
              textAlign: 'left',
            }}>
              {groupDescription}
            </Text>
          </View>
        )}
      </View>
    </View>
  </Page>
);

// Product Page Component
const ProductPage: React.FC<{
  products: CatalogProduct[];
  groupName?: string;
  pageNumber?: number;
  layout: string;
  config: CatalogConfig;
  groupFieldConfigs?: { groupId: string; groupName: string; selectedFields: string[] }[];
  groupedProducts: ProductGroup[];
}> = ({ products, groupName, pageNumber, layout, config, groupFieldConfigs, groupedProducts }) => {
  const displayGroupName = groupName || 'Produtos';
  
  // Get selected fields for this group
  const getGroupFields = (): string[] => {
    if (!groupFieldConfigs || groupFieldConfigs.length === 0) {
      return ['codigo', 'descricao'];
    }
    
    if (!groupName) {
      return groupFieldConfigs[0]?.selectedFields || ['codigo', 'descricao'];
    }
    
    const group = groupedProducts.find(g => g.nome === groupName);
    if (group) {
      const fieldConfig = groupFieldConfigs.find(c => c.groupId === group.id);
      if (fieldConfig?.selectedFields && fieldConfig.selectedFields.length > 0) {
        return fieldConfig.selectedFields;
      }
    }
    
    const fieldConfigByName = groupFieldConfigs.find(c => c.groupName === groupName);
    if (fieldConfigByName?.selectedFields && fieldConfigByName.selectedFields.length > 0) {
      return fieldConfigByName.selectedFields;
    }
    
    return ['codigo', 'descricao'];
  };

  const selectedFields = getGroupFields();
  
  const getFieldLabel = (key: string): string => {
    const field = PRODUCT_FIELDS.find(f => f.key === key);
    return field?.label || key;
  };

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

  // Get card style based on layout
  const getCardStyle = () => {
    switch (layout) {
      case 'grid-2': return styles.productCard2;
      case 'grid-3': return styles.productCard3;
      case 'grid-4': return styles.productCard4;
      case 'list': return styles.productCardList;
      default: return styles.productCard3;
    }
  };

  const getNameStyle = () => {
    switch (layout) {
      case 'grid-2': return styles.productNameSize2;
      case 'grid-3': return styles.productNameSize3;
      case 'grid-4': return styles.productNameSize4;
      case 'list': return styles.productNameSizeList;
      default: return styles.productNameSize3;
    }
  };

  const getFieldStyle = () => {
    switch (layout) {
      case 'grid-2': return styles.productFieldSize2;
      case 'grid-3': return styles.productFieldSize3;
      case 'grid-4': return styles.productFieldSize4;
      case 'list': return styles.productFieldSizeList;
      default: return styles.productFieldSize3;
    }
  };

  // Get image height and card width based on layout (in points - A4 is 595pt x 842pt, with 70pt padding = 525pt content width)
  const getLayoutConfig = () => {
    switch (layout) {
      case 'grid-2': return { cols: 2, imageHeight: 150, cardWidth: 252, gap: 20, fontSize: { name: 11, field: 9 } };
      case 'grid-3': return { cols: 3, imageHeight: 110, cardWidth: 165, gap: 15, fontSize: { name: 9, field: 7 } };
      case 'grid-4': return { cols: 4, imageHeight: 85, cardWidth: 120, gap: 12, fontSize: { name: 8, field: 6 } };
      case 'list': return { cols: 1, imageHeight: 60, cardWidth: 525, gap: 8, fontSize: { name: 11, field: 9 } };
      default: return { cols: 3, imageHeight: 110, cardWidth: 165, gap: 15, fontSize: { name: 9, field: 7 } };
    }
  };

  const layoutCfg = getLayoutConfig();

  // Split products into rows
  const rows: CatalogProduct[][] = [];
  for (let i = 0; i < products.length; i += layoutCfg.cols) {
    rows.push(products.slice(i, i + layoutCfg.cols));
  }

  return (
    <Page size="A4" style={styles.page}>
      <View style={{ width: '100%', height: '100%', padding: 35, backgroundColor: '#ffffff' }}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 28 }}>
            <Text style={{ fontWeight: 300, color: '#6b7280' }}>Linha </Text>
            <Text style={{ fontWeight: 700, color: '#111827' }}>{displayGroupName}</Text>
          </Text>
        </View>

        {/* Products */}
        <View style={{ flex: 1 }}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: layoutCfg.gap }}>
              {row.map((product, colIdx) => {
                if (layout === 'list') {
                  // List layout - horizontal card
                  return (
                    <View 
                      key={product.id} 
                      style={{ 
                        width: layoutCfg.cardWidth,
                        flexDirection: 'row', 
                        padding: 10, 
                        backgroundColor: '#f9fafb',
                        borderRadius: 4,
                      }}
                    >
                      {/* Image */}
                      <View style={{ 
                        width: 60, 
                        height: 60, 
                        backgroundColor: '#ffffff', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        {product.foto_url ? (
                          <Image src={product.foto_url} style={{ width: 50, height: 50, objectFit: 'contain' }} />
                        ) : (
                          <View style={{ width: 50, height: 50, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 8, color: '#9ca3af' }}>SEM IMG</Text>
                          </View>
                        )}
                      </View>
                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: layoutCfg.fontSize.name, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                          {product.nome.length > 45 ? product.nome.substring(0, 45) + '...' : product.nome}
                        </Text>
                        {selectedFields.slice(0, 3).map((fieldKey) => {
                          const value = formatFieldValue(product, fieldKey);
                          if (value === '-') return null;
                          return (
                            <Text key={fieldKey} style={{ fontSize: layoutCfg.fontSize.field, marginTop: 1 }}>
                              <Text style={{ color: '#9ca3af' }}>{getFieldLabel(fieldKey)}: </Text>
                              <Text style={{ color: '#4b5563' }}>{value}</Text>
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  );
                } else {
                  // Grid layout - vertical card
                  return (
                    <View 
                      key={product.id} 
                      style={{ 
                        width: layoutCfg.cardWidth,
                        marginRight: colIdx < row.length - 1 ? layoutCfg.gap : 0,
                      }}
                    >
                      {/* Image */}
                      <View style={{ 
                        width: layoutCfg.cardWidth, 
                        height: layoutCfg.imageHeight, 
                        backgroundColor: '#f3f4f6', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        marginBottom: 6,
                      }}>
                        {product.foto_url ? (
                          <Image 
                            src={product.foto_url} 
                            style={{ 
                              width: layoutCfg.imageHeight * 0.8, 
                              height: layoutCfg.imageHeight * 0.8, 
                              objectFit: 'contain' 
                            }} 
                          />
                        ) : (
                          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 8, color: '#9ca3af' }}>SEM IMAGEM</Text>
                          </View>
                        )}
                      </View>
                      {/* Info */}
                      <View>
                        <Text style={{ fontSize: layoutCfg.fontSize.name, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                          {product.nome.length > 25 ? product.nome.substring(0, 25) + '...' : product.nome}
                        </Text>
                        {selectedFields.slice(0, 2).map((fieldKey) => {
                          const value = formatFieldValue(product, fieldKey);
                          if (value === '-') return null;
                          return (
                            <Text key={fieldKey} style={{ fontSize: layoutCfg.fontSize.field, marginTop: 1 }}>
                              <Text style={{ color: '#9ca3af' }}>{getFieldLabel(fieldKey)}: </Text>
                              <Text style={{ color: '#4b5563' }}>{value}</Text>
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  );
                }
              })}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 10 }}>
          <Text style={{ fontSize: 9, color: '#9ca3af' }}>{String(pageNumber || 1).padStart(2, '0')}</Text>
        </View>
      </View>
    </Page>
  );
};

// Price Table Page Component
const PriceTablePage: React.FC<{
  priceTableData: { groupName: string; products: CatalogProduct[] }[];
  config: CatalogConfig;
  currentYear: number;
}> = ({ priceTableData, config, currentYear }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.priceTableContainer}>
      {/* Header */}
      <View style={styles.priceTableHeader}>
        <Text style={styles.priceTableTitle}>Tabela de Preços</Text>
        <Text style={styles.priceTableSubtitle}>Lista completa de produtos por grupo</Text>
      </View>

      {/* Content */}
      <View style={styles.priceTableContent}>
        {/* Table Header */}
        <View style={styles.priceTableHeaderRow}>
          <Text style={[styles.priceTableHeaderCell, { width: '15%' }]}>Código</Text>
          <Text style={[styles.priceTableHeaderCell, { width: '60%' }]}>Produto</Text>
          <Text style={[styles.priceTableHeaderCell, { width: '25%', textAlign: 'right' }]}>Preço</Text>
        </View>

        {/* Groups and Products */}
        {priceTableData.map((group) => (
          <View key={group.groupName}>
            {/* Group Header */}
            <View style={styles.priceTableGroupRow}>
              <Text style={styles.priceTableGroupName}>{group.groupName}</Text>
            </View>
            
            {/* Products */}
            {group.products.map((product, idx) => (
              <View 
                key={product.id} 
                style={[
                  styles.priceTableRow,
                  idx % 2 === 1 ? styles.priceTableRowAlt : {}
                ]}
              >
                <Text style={[styles.priceTableCell, styles.priceTableCellCode]}>
                  {product.codigo || '-'}
                </Text>
                <Text style={[styles.priceTableCell, styles.priceTableCellName]}>
                  {product.nome}
                </Text>
                <Text style={[styles.priceTableCell, styles.priceTableCellPrice]}>
                  {product.preco_tabela ? formatPrice(product.preco_tabela) : '-'}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.priceTableFooter}>
        <Text style={styles.priceTableFooterText}>
          {config.name || 'Catálogo'} - {currentYear}
        </Text>
        <Text style={styles.priceTableFooterText}>Tabela de Preços</Text>
      </View>
    </View>
  </Page>
);

// Backcover Page Component
const BackcoverPage: React.FC<{
  coverPage: CatalogPage;
  backcoverPage: CatalogPage;
  config: CatalogConfig;
  currentYear: number;
}> = ({ coverPage, backcoverPage, config, currentYear }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.backcoverContainer}>
      {/* Background */}
      {backcoverPage.backgroundImage ? (
        <>
          <Image src={backcoverPage.backgroundImage} style={styles.backcoverBg} />
          <View style={styles.backcoverOverlay} />
        </>
      ) : (
        <View style={[styles.backcoverBg, { backgroundColor: backcoverPage.backgroundColor || '#1a1a1a' }]} />
      )}

      {/* Left Side */}
      <View style={styles.backcoverLeft}>
        <Text style={styles.backcoverYear}>{currentYear}</Text>
      </View>

      {/* Right Side */}
      <View style={styles.backcoverRight}>
        <View>
          <Text style={styles.backcoverTitle}>
            <Text style={styles.backcoverTitleItalic}>Product </Text>
            <Text style={styles.backcoverTitleBold}>CATALOG</Text>
          </Text>
          <View style={styles.backcoverLine} />
        </View>

        <View>
          <Text style={styles.backcoverContactLabel}>
            {backcoverPage.title || 'Entre em contato'}
          </Text>
          
          {backcoverPage.contactInfo?.phone && (
            <View style={styles.backcoverContactItem}>
              <Text style={styles.backcoverContactText}>{backcoverPage.contactInfo.phone}</Text>
            </View>
          )}
          {backcoverPage.contactInfo?.email && (
            <View style={styles.backcoverContactItem}>
              <Text style={styles.backcoverContactText}>{backcoverPage.contactInfo.email}</Text>
            </View>
          )}
          {backcoverPage.contactInfo?.website && (
            <View style={styles.backcoverContactItem}>
              <Text style={styles.backcoverContactText}>{backcoverPage.contactInfo.website}</Text>
            </View>
          )}
          {backcoverPage.contactInfo?.address && (
            <View style={styles.backcoverContactItem}>
              <Text style={styles.backcoverContactText}>{backcoverPage.contactInfo.address}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  </Page>
);

// Main PDF Document
export const CatalogPDFDocument: React.FC<PDFDocumentProps> = ({
  config,
  coverPage,
  productsPage,
  backcoverPage,
  groupImages = {},
  groupedProducts,
  pages,
}) => {
  const currentYear = new Date().getFullYear();
  const layout = productsPage.layout || 'grid-3';

  return (
    <Document>
      {pages.map((pageInfo, idx) => {
        switch (pageInfo.type) {
          case 'cover':
            return (
              <CoverPage
                key={`page-${idx}`}
                coverPage={coverPage}
                backcoverPage={backcoverPage}
                config={config}
                currentYear={currentYear}
              />
            );
          
          case 'group-header':
            const group = groupedProducts.find(g => g.nome === pageInfo.groupName);
            return (
              <GroupHeaderPage
                key={`page-${idx}`}
                groupName={pageInfo.groupName!}
                groupImage={group ? groupImages[group.id] : undefined}
                productCount={group?.products.length || 0}
                primaryColor={config.primaryColor}
                groupDescription={group?.descritivo_catalogo}
              />
            );
          
          case 'products':
            return (
              <ProductPage
                key={`page-${idx}`}
                products={pageInfo.products!}
                groupName={pageInfo.groupName}
                pageNumber={pageInfo.pageNumber}
                layout={layout}
                config={config}
                groupFieldConfigs={config.groupFieldConfigs}
                groupedProducts={groupedProducts}
              />
            );
          
          case 'price-table':
            return (
              <PriceTablePage
                key={`page-${idx}`}
                priceTableData={pageInfo.priceTableData!}
                config={config}
                currentYear={currentYear}
              />
            );
          
          case 'backcover':
            return (
              <BackcoverPage
                key={`page-${idx}`}
                coverPage={coverPage}
                backcoverPage={backcoverPage}
                config={config}
                currentYear={currentYear}
              />
            );
          
          default:
            return null;
        }
      })}
    </Document>
  );
};
