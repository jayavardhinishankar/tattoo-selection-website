import { useEffect } from 'react';

export function fontFamilyCss(family, category) {
  const fallback = category === 'Installed system fonts' ? 'system-ui' : 'cursive';
  return `'${family.replace(/['\\]/g, '')}', ${fallback}`;
}

export function fontStylesheetUrl(family) {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`;
}

export default function DesignPreview({ design, className = '' }) {
  useEffect(() => {
    if (design.fontCategory === 'Installed system fonts') return undefined;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontStylesheetUrl(design.fontFamily);
    link.dataset.fontStylesheet = 'loading';
    link.addEventListener('load', () => { link.dataset.fontStylesheet = 'loaded'; }, { once: true });
    link.addEventListener('error', () => { link.dataset.fontStylesheet = 'error'; }, { once: true });
    document.head.appendChild(link);
    return () => link.remove();
  }, [design.fontCategory, design.fontFamily]);

  return (
    <div className={`design-preview ${className}`} aria-label="Lettering design preview">
      <div
        className="design-preview-text"
        style={{
          fontFamily: fontFamilyCss(design.fontFamily, design.fontCategory),
          fontSize: `min(${design.fontSize}px, 18vw)`,
          fontWeight: design.fontWeight,
          fontStyle: design.italic ? 'italic' : 'normal',
          letterSpacing: `${design.letterSpacing}px`,
          lineHeight: design.lineSpacing,
          textAlign: design.alignment,
          color: design.color,
        }}
      >
        {design.letterCase === 'uppercase' ? (design.text || 'Your lettering preview').toUpperCase() : design.letterCase === 'lowercase' ? (design.text || 'Your lettering preview').toLowerCase() : design.text || 'Your lettering preview'}
      </div>
    </div>
  );
}
