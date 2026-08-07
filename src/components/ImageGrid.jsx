import { useState, useEffect, useRef, useCallback } from 'react';
import ImageCard from './ImageCard';
import { makeFileKey } from '../utils/db';

export default function ImageGrid({
  images,
  module,
  tagData,
  loading,
  pagination,
  onPageChange,
  onImageClick,
  onTagUpdate,
}) {
  const [colors, setColors] = useState({});
  const [jumpPage, setJumpPage] = useState('');
  const observerRef = useRef(null);

  const handleJump = () => {
    const page = parseInt(jumpPage);
    if (page >= 1 && page <= pagination.totalPages) {
      onPageChange(page);
      setJumpPage('');
    }
  };

  // 颜色提取回调
  const handleColorExtracted = useCallback((fileKey, colorData) => {
    setColors(prev => ({ ...prev, [fileKey]: colorData }));
    onTagUpdate(fileKey, { module, colors: colorData });
  }, [module, onTagUpdate]);

  if (loading && images.length === 0) {
    return (
      <div className="grid-loading">
        <div className="spinner" />
        <p>加载素材中...</p>
      </div>
    );
  }

  if (!loading && images.length === 0) {
    return (
      <div className="grid-empty">
        <div className="empty-icon">📭</div>
        <p>没有找到素材</p>
        <p className="empty-hint">
          {pagination.total === 0
            ? '该目录下没有图片文件，请检查素材目录'
            : '尝试调整搜索条件'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid-container">
      <div className="image-grid">
        {images.map(img => {
          const fileKey = makeFileKey(module, img.filename);
          const data = tagData[fileKey];
          const colorData = colors[fileKey] || data?.colors;

          return (
            <ImageCard
              key={fileKey}
              image={img}
              module={module}
              fileKey={fileKey}
              tagRecord={data}
              colors={colorData}
              onClick={() => onImageClick(img)}
              onColorExtracted={(cd) => handleColorExtracted(fileKey, cd)}
            />
          );
        })}
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            ← 上一页
          </button>
          <span className="page-info">
            <span className="page-current">{pagination.page}</span>
            <span className="page-sep">/</span>
            <span className="page-total-pages">{pagination.totalPages}</span>
            <span className="page-total">（共 {pagination.total} 张）</span>
          </span>
          <button
            className="btn btn-sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            下一页 →
          </button>
          <span className="page-jump">
            跳至
            <input
              type="number"
              className="page-jump-input"
              placeholder={String(pagination.page)}
              value={jumpPage}
              min={1}
              max={pagination.totalPages}
              onChange={e => setJumpPage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleJump(); }}
            />
            页
            <button className="btn btn-xs" onClick={handleJump} disabled={!jumpPage.trim()}>
              GO
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
