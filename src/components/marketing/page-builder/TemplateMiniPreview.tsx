import React, { useMemo } from 'react';

interface MiniPreviewProps {
  config: {
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    heroStyle?: string;
    cardStyle?: string;
    borderRadius?: string;
    fontDisplay?: string;
  };
  sectionTypes: string[];
  className?: string;
}

/**
 * Renders a tiny realistic HTML preview of a template showing its actual layout,
 * colors, and section structure — like ThemeForest thumbnails.
 */
export const TemplateMiniPreview: React.FC<MiniPreviewProps> = ({ config, sectionTypes, className = '' }) => {
  const {
    primaryColor = '#1e40af',
    accentColor = '#f59e0b',
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    heroStyle = 'centered',
    cardStyle = 'bordered',
    borderRadius = '8px',
  } = config;

  const isDark = useMemo(() => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }, [backgroundColor]);

  const mutedColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
  const mutedText = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';

  const renderSection = (type: string, i: number) => {
    switch (type) {
      case 'hero':
        if (heroStyle === 'split-left' || heroStyle === 'split') {
          return (
            <div key={i} style={{ background: primaryColor, padding: '16px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: 8, width: '70%', background: '#fff', borderRadius: 3, marginBottom: 5 }} />
                <div style={{ height: 5, width: '50%', background: 'rgba(255,255,255,0.5)', borderRadius: 2, marginBottom: 8 }} />
                <div style={{ height: 8, width: '30%', background: accentColor, borderRadius: 4 }} />
              </div>
              <div style={{ width: '40%', aspectRatio: '4/3', background: 'rgba(255,255,255,0.15)', borderRadius: borderRadius ? parseInt(borderRadius) / 2 : 4 }} />
            </div>
          );
        }
        if (heroStyle === 'image-overlay') {
          return (
            <div key={i} style={{ background: `linear-gradient(135deg, ${primaryColor}, rgba(0,0,0,0.7))`, padding: '20px 14px', textAlign: 'center' as const }}>
              <div style={{ height: 8, width: '60%', background: '#fff', borderRadius: 3, margin: '0 auto 5px' }} />
              <div style={{ height: 5, width: '40%', background: 'rgba(255,255,255,0.5)', borderRadius: 2, margin: '0 auto 8px' }} />
              <div style={{ height: 8, width: '25%', background: accentColor, borderRadius: 4, margin: '0 auto' }} />
            </div>
          );
        }
        return (
          <div key={i} style={{ background: primaryColor, padding: '20px 14px', textAlign: 'center' as const }}>
            <div style={{ height: 8, width: '55%', background: '#fff', borderRadius: 3, margin: '0 auto 5px' }} />
            <div style={{ height: 5, width: '35%', background: 'rgba(255,255,255,0.5)', borderRadius: 2, margin: '0 auto 8px' }} />
            <div style={{ height: 8, width: '22%', background: accentColor, borderRadius: 4, margin: '0 auto' }} />
          </div>
        );
      case 'features':
        return (
          <div key={i} style={{ padding: '10px 14px', background: backgroundColor }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ padding: 8, border: `1px solid ${cardBorder}`, borderRadius: borderRadius ? parseInt(borderRadius) / 2 : 4, background: cardBg, textAlign: 'center' as const }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: accentColor, margin: '0 auto 5px' }} />
                  <div style={{ height: 4, width: '70%', background: textColor, opacity: 0.5, borderRadius: 2, margin: '0 auto 3px' }} />
                  <div style={{ height: 3, width: '80%', background: mutedText, borderRadius: 2, margin: '0 auto' }} />
                </div>
              ))}
            </div>
          </div>
        );
      case 'testimonials':
        return (
          <div key={i} style={{ padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[0, 1].map(j => (
                <div key={j} style={{ padding: 8, border: `1px solid ${cardBorder}`, borderRadius: borderRadius ? parseInt(borderRadius) / 2 : 4, background: cardBg }}>
                  <div style={{ height: 3, width: '80%', background: mutedText, borderRadius: 2, marginBottom: 5 }} />
                  <div style={{ height: 3, width: '40%', background: textColor, opacity: 0.4, borderRadius: 2 }} />
                </div>
              ))}
            </div>
          </div>
        );
      case 'social_proof':
        return (
          <div key={i} style={{ padding: '10px 14px', background: primaryColor, display: 'flex', justifyContent: 'space-around' }}>
            {[0, 1, 2, 3].map(j => (
              <div key={j} style={{ textAlign: 'center' as const }}>
                <div style={{ height: 7, width: 28, background: '#fff', borderRadius: 2, margin: '0 auto 3px' }} />
                <div style={{ height: 3, width: 32, background: 'rgba(255,255,255,0.5)', borderRadius: 2, margin: '0 auto' }} />
              </div>
            ))}
          </div>
        );
      case 'pricing':
        return (
          <div key={i} style={{ padding: '10px 14px', background: backgroundColor }}>
            <div style={{ height: 5, width: '30%', background: textColor, opacity: 0.5, borderRadius: 2, margin: '0 auto 8px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ padding: 6, border: j === 1 ? `2px solid ${primaryColor}` : `1px solid ${cardBorder}`, borderRadius: borderRadius ? parseInt(borderRadius) / 2 : 4, background: cardBg, transform: j === 1 ? 'scale(1.05)' : undefined }}>
                  <div style={{ height: 4, width: '60%', background: primaryColor, borderRadius: 2, margin: '0 auto 3px' }} />
                  <div style={{ height: 3, width: '80%', background: mutedText, borderRadius: 2, margin: '0 auto' }} />
                </div>
              ))}
            </div>
          </div>
        );
      case 'cta':
        return (
          <div key={i} style={{ padding: '12px 14px', background: primaryColor, textAlign: 'center' as const }}>
            <div style={{ height: 6, width: '40%', background: '#fff', borderRadius: 2, margin: '0 auto 5px' }} />
            <div style={{ height: 7, width: '20%', background: accentColor, borderRadius: 4, margin: '0 auto' }} />
          </div>
        );
      case 'faq':
        return (
          <div key={i} style={{ padding: '8px 14px', background: backgroundColor }}>
            {[0, 1, 2].map(j => (
              <div key={j} style={{ borderBottom: `1px solid ${cardBorder}`, padding: '5px 0' }}>
                <div style={{ height: 4, width: `${50 + j * 10}%`, background: textColor, opacity: 0.4, borderRadius: 2 }} />
              </div>
            ))}
          </div>
        );
      case 'guarantee':
        return (
          <div key={i} style={{ padding: '10px 18px', background: backgroundColor, textAlign: 'center' as const }}>
            <div style={{ border: `2px dashed ${accentColor}`, borderRadius: borderRadius ? parseInt(borderRadius) / 2 : 6, padding: '8px' }}>
              <div style={{ fontSize: 14, marginBottom: 3 }}>🛡️</div>
              <div style={{ height: 4, width: '50%', background: textColor, opacity: 0.5, borderRadius: 2, margin: '0 auto' }} />
            </div>
          </div>
        );
      case 'process_steps':
        return (
          <div key={i} style={{ padding: '8px 14px', background: backgroundColor }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              {[1, 2, 3].map(j => (
                <div key={j} style={{ textAlign: 'center' as const }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: accentColor, color: '#fff', fontSize: 10, lineHeight: '18px', textAlign: 'center' as const, margin: '0 auto 3px' }}>{j}</div>
                  <div style={{ height: 3, width: 30, background: textColor, opacity: 0.4, borderRadius: 2, margin: '0 auto' }} />
                </div>
              ))}
            </div>
          </div>
        );
      case 'objections':
        return (
          <div key={i} style={{ padding: '8px 14px', background: backgroundColor }}>
            {[0, 1].map(j => (
              <div key={j} style={{ border: `1px solid ${cardBorder}`, borderRadius: 4, padding: 6, marginBottom: 5, background: cardBg }}>
                <div style={{ height: 3, width: '50%', background: '#dc2626', opacity: 0.5, borderRadius: 2, marginBottom: 3 }} />
                <div style={{ height: 3, width: '70%', background: mutedText, borderRadius: 2 }} />
              </div>
            ))}
          </div>
        );
      case 'video':
        return (
          <div key={i} style={{ padding: '8px 14px', background: backgroundColor }}>
            <div style={{ aspectRatio: '16/7', background: mutedColor, borderRadius: borderRadius ? parseInt(borderRadius) / 2 : 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderLeft: '8px solid white', borderTop: '5px solid transparent', borderBottom: '5px solid transparent' }} />
              </div>
            </div>
          </div>
        );
      case 'text':
        return (
          <div key={i} style={{ padding: '8px 18px', background: backgroundColor }}>
            <div style={{ height: 3, width: '90%', background: mutedText, borderRadius: 2, margin: '0 auto 3px' }} />
            <div style={{ height: 3, width: '70%', background: mutedText, borderRadius: 2, margin: '0 auto' }} />
          </div>
        );
      case 'image':
        return (
          <div key={i} style={{ padding: '6px 14px', background: backgroundColor }}>
            <div style={{ aspectRatio: '16/7', background: mutedColor, borderRadius: borderRadius ? parseInt(borderRadius) / 2 : 4 }} />
          </div>
        );
      case 'gallery':
        return (
          <div key={i} style={{ padding: '6px 14px', background: backgroundColor }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ aspectRatio: '1', background: mutedColor, borderRadius: 3 }} />
              ))}
            </div>
          </div>
        );
      case 'footer':
        return (
          <div key={i} style={{ padding: '8px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderTop: `1px solid ${cardBorder}`, textAlign: 'center' as const }}>
            <div style={{ height: 3, width: '25%', background: mutedText, borderRadius: 2, margin: '0 auto' }} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={className}
      style={{
        background: backgroundColor,
        borderRadius: 6,
        overflow: 'hidden',
        fontSize: 0,
        lineHeight: 0,
      }}
    >
      {sectionTypes.map((type, i) => renderSection(type, i))}
    </div>
  );
};
