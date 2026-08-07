import { useRef, useState, useEffect, useCallback } from 'react';
import { getImageUrl, aiTagImage, imageToBase64 } from '../utils/api';
import { saveTagData, makeFileKey } from '../utils/db';
import { extractColors, getTextColor } from '../utils/color';

export default function PreviewModal({
  image,
  module,
  tagData,
  apiKey,
  onClose,
  onTagUpdate,
  onPrev,
  onNext,
}) {
  const imgRef = useRef(null);
  const overlayRef = useRef(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [editingTag, setEditingTag] = useState('');
  const [localTags, setLocalTags] = useState(tagData?.tags || []);
  const [localDescription, setLocalDescription] = useState(tagData?.description || tagData?.aiDescription || '');
  const [colors, setColors] = useState(tagData?.colors || null);

  const imageUrl = getImageUrl(module, image.filename);
  const fileKey = makeFileKey(module, image.filename);

  // 同步外部标签变化
  useEffect(() => {
    setLocalTags(tagData?.tags || []);
    setLocalDescription(tagData?.description || tagData?.aiDescription || '');
    setColors(tagData?.colors || null);
  }, [tagData]);

  // 键盘快捷键
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'Backspace' && e.target === document.body) {
        // 删除最后一个标签
        if (localTags.length > 0) {
          const newTags = localTags.slice(0, -1);
          setLocalTags(newTags);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext, localTags]);

  // 点击遮罩关闭
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // 提取颜色
  const handleImageLoad = () => {
    if (colors || !imgRef.current) return;
    try {
      const colorData = extractColors(imgRef.current);
      setColors(colorData);
    } catch { /* silent */ }
  };

  // 保存标签
  const saveTags = useCallback(async (tags, desc) => {
    const data = {
      module,
      tags,
      description: desc,
      colors,
      filename: image.filename,
    };
    onTagUpdate(data);
    await saveTagData(fileKey, data);
  }, [module, image.filename, colors, fileKey, onTagUpdate]);

  // 添加标签
  const addTag = async () => {
    const tag = editingTag.trim();
    if (!tag || localTags.includes(tag)) {
      setEditingTag('');
      return;
    }
    const newTags = [...localTags, tag];
    setLocalTags(newTags);
    setEditingTag('');
    await saveTags(newTags, localDescription);
  };

  // 删除标签
  const removeTag = async (index) => {
    const newTags = localTags.filter((_, i) => i !== index);
    setLocalTags(newTags);
    await saveTags(newTags, localDescription);
  };

  // AI 智能标签
  const handleAiTag = async () => {
    if (!apiKey) {
      setAiError('请先在设置中配置通义千问 API Key');
      return;
    }
    if (!imgRef.current) return;

    setAiLoading(true);
    setAiError('');

    try {
      const base64 = await imageToBase64(imgRef.current, 1024, 0.75);
      const result = await aiTagImage(base64, apiKey);

      const tags = result.tags || [];
      const description = result.description || '';

      setLocalTags(tags);
      setLocalDescription(description);

      const data = {
        module,
        tags,
        aiDescription: description,
        elements: result.elements || '',
        style: result.style || '',
        colorTone: result.colorTone || '',
        description,
        colors,
        filename: image.filename,
      };
      onTagUpdate(data);
      await saveTagData(fileKey, data);
    } catch (err) {
      setAiError(`AI 分析失败: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // 批量复制标签
  const copyTags = () => {
    const text = localTags.join('、');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="preview-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="preview-modal">
        {/* 关闭按钮 */}
        <button className="preview-close" onClick={onClose}>✕</button>

        {/* 上一个/下一个 */}
        <button className="preview-nav preview-prev" onClick={onPrev}>◀</button>
        <button className="preview-nav preview-next" onClick={onNext}>▶</button>

        <div className="preview-body">
          {/* 图片区域 */}
          <div className="preview-image-area">
            <img
              ref={imgRef}
              src={imageUrl}
              alt={image.filename}
              className="preview-image"
              onLoad={handleImageLoad}
            />
          </div>

          {/* 信息面板 */}
          <div className="preview-info">
            <div className="preview-filename">{image.filename.split('/').pop()}</div>
            <div className="preview-path">{image.filename}</div>
            <div className="preview-meta">
              {(image.size / 1024 / 1024).toFixed(1)} MB
            </div>

            {/* 色系 */}
            {colors?.palette && (
              <div className="preview-section">
                <div className="preview-section-title">🎨 色系</div>
                <div className="preview-colors">
                  {colors.palette.map((color, i) => (
                    <div
                      key={i}
                      className="preview-color-swatch"
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      <span style={{ color: getTextColor(color), fontSize: 10 }}>
                        {color}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI 元素分析 */}
            {(tagData?.description || tagData?.people || tagData?.objects || tagData?.plants || tagData?.scenery) && (
              <div className="preview-section">
                <div className="preview-section-title">AI 元素分析</div>
                {tagData?.description && (
                  <p className="preview-description">{tagData.description}</p>
                )}
                <div className="preview-elements">
                  {tagData?.people && <div className="element-row"><span className="element-label">人物</span>{tagData.people}</div>}
                  {tagData?.objects && <div className="element-row"><span className="element-label">物件</span>{tagData.objects}</div>}
                  {tagData?.animals && <div className="element-row"><span className="element-label">动物</span>{tagData.animals}</div>}
                  {tagData?.plants && <div className="element-row"><span className="element-label">植物</span>{tagData.plants}</div>}
                  {tagData?.scenery && <div className="element-row"><span className="element-label">场景</span>{tagData.scenery}</div>}
                  {tagData?.composition && <div className="element-row"><span className="element-label">构图</span>{tagData.composition}</div>}
                </div>
                <div className="preview-ai-details">
                  {tagData?.style && <span>风格：{tagData.style}</span>}
                  {tagData?.colorTone && <span>色调：{tagData.colorTone}</span>}
                </div>
              </div>
            )}
            {/* 旧格式兼容 */}
            {!tagData?.people && !tagData?.objects && !tagData?.plants && (tagData?.aiDescription || tagData?.elements) && (
              <div className="preview-section">
                <div className="preview-section-title">AI 描述</div>
                <p className="preview-description">{tagData?.aiDescription || tagData?.description}</p>
                <div className="preview-ai-details">
                  {tagData?.elements && <span>{tagData.elements}</span>}
                  {tagData?.style && <span>{tagData.style}</span>}
                  {tagData?.colorTone && <span>{tagData.colorTone}</span>}
                </div>
              </div>
            )}

            {/* 标签 */}
            <div className="preview-section">
              <div className="preview-section-title">
                🏷️ 标签
                <button className="btn btn-xs" onClick={copyTags} disabled={localTags.length === 0}>
                  📋 复制
                </button>
              </div>
              <div className="preview-tags">
                {localTags.map((tag, i) => (
                  <span
                    key={i}
                    className="preview-tag"
                    onClick={() => removeTag(i)}
                    title="点击删除"
                  >
                    {tag} <span className="tag-remove">×</span>
                  </span>
                ))}
                {localTags.length === 0 && (
                  <span className="preview-no-tags">暂无标签，使用 AI 分析或手动添加</span>
                )}
              </div>

              {/* 添加标签 */}
              <div className="add-tag-form">
                <input
                  type="text"
                  className="add-tag-input"
                  placeholder="输入标签后回车..."
                  value={editingTag}
                  onChange={e => setEditingTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addTag();
                  }}
                />
                <button className="btn btn-sm" onClick={addTag} disabled={!editingTag.trim()}>
                  添加
                </button>
              </div>
            </div>

            {/* AI 分析按钮 */}
            <div className="preview-section">
              <button
                className={`btn btn-primary btn-full ${aiLoading ? 'loading' : ''}`}
                onClick={handleAiTag}
                disabled={aiLoading}
              >
                {aiLoading ? '🤖 AI 分析中...' : '🤖 AI 智能打标签'}
              </button>
              {aiError && <p className="ai-error">{aiError}</p>}
              {!apiKey && (
                <p className="ai-hint">
                  💡 需要配置 <strong>通义千问 API Key</strong>（设置 → API Key）
                  <br />
                  获取地址：<a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noreferrer">dashscope.console.aliyun.com</a>
                  <br />
                  新用户有免费额度，之后约 ¥0.001/张
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
