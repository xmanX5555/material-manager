import { useRef, useEffect, useState } from 'react';
import { getImageUrl } from '../utils/api';
import { extractColors } from '../utils/color';

export default function ImageCard({
  image,
  module,
  fileKey,
  tagRecord,
  colors,
  onClick,
  onColorExtracted,
}) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const hasExtracted = useRef(false);

  const imageUrl = getImageUrl(module, image.filename);

  // 图片加载完成后提取颜色
  useEffect(() => {
    if (colors || hasExtracted.current) return;
    const img = imgRef.current;
    if (!img || !img.complete) return;

    hasExtracted.current = true;
    try {
      const colorData = extractColors(img);
      onColorExtracted(colorData);
    } catch {
      // 颜色提取失败静默处理
    }
  }, [colors, loaded, onColorExtracted]);

  const handleLoad = () => {
    setLoaded(true);
    // 延迟提取确保 naturalWidth/Height 可用
    setTimeout(() => {
      if (imgRef.current && !hasExtracted.current && !colors) {
        hasExtracted.current = true;
        try {
          const colorData = extractColors(imgRef.current);
          onColorExtracted(colorData);
        } catch { /* silent */ }
      }
    }, 100);
  };

  const palette = colors?.palette || [];
  const tags = tagRecord?.tags || [];
  const hasAiTags = tags.length > 0;

  return (
    <div className="image-card" onClick={onClick} title={image.filename}>
      <div className="card-image-wrapper">
        {!loaded && !error && <div className="card-skeleton" />}
        {error ? (
          <div className="card-error">
            <span>🖼️</span>
            <span className="card-error-text">无法加载</span>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={image.filename}
            className={`card-image ${loaded ? 'loaded' : ''}`}
            loading="lazy"
            decoding="async"
            onLoad={handleLoad}
            onError={() => setError(true)}
          />
        )}

        {/* AI 标签标记 */}
        {hasAiTags && (
          <div className="card-ai-badge" title="已AI标注">
            🤖
          </div>
        )}
      </div>

      {/* 色系条 */}
      {palette.length > 0 && (
        <div className="card-colors">
          {palette.slice(0, 5).map((color, i) => (
            <span
              key={i}
              className="card-color-dot"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* 标签预览 */}
      <div className="card-info">
        <div className="card-filename" title={image.filename}>
          {image.filename.split('/').pop()}
        </div>
        {tags.length > 0 && (
          <div className="card-tags">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="card-tag">{tag}</span>
            ))}
            {tags.length > 3 && (
              <span className="card-tag card-tag-more">+{tags.length - 3}</span>
            )}
          </div>
        )}
        {tagRecord?.description && (
          <div className="card-desc">{tagRecord.description}</div>
        )}
      </div>
    </div>
  );
}
