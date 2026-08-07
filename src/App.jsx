import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ImageGrid from './components/ImageGrid';
import PreviewModal from './components/PreviewModal';
import SettingsModal from './components/SettingsModal';
import { fetchImages, fetchStatus } from './utils/api';
import { getAllTagData, saveTagData, makeFileKey } from './utils/db';

const MODULES = [
  { key: 'lithui', name: '立绘素材' },
  { key: 'meigong', name: '美工素材' },
];

export default function App() {
  const [activeModule, setActiveModule] = useState('lithui');
  const [images, setImages] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [colorFilter, setColorFilter] = useState(null);
  const [tagData, setTagData] = useState({}); // { fileKey: tagRecord }
  const [previewImage, setPreviewImage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('dashscope_api_key') || '');
  const [moduleStatus, setModuleStatus] = useState({});
  const [error, setError] = useState('');

  // 加载模块状态
  useEffect(() => {
    fetchStatus()
      .then(setModuleStatus)
      .catch(() => setModuleStatus({}));
  }, []);

  // 加载本地标签 + 合并服务端批量标签
  useEffect(() => {
    async function loadAllTags() {
      // 先加载本地 IndexedDB 数据
      const localRecords = await getAllTagData();
      const map = {};
      localRecords.forEach(r => { map[r.fileKey] = r; });

      // 从服务端 / 静态文件拉取批量 AI 标签
      try {
        const isLocal = window.location.host.includes('localhost');
        const url = isLocal ? '/api/all-tags' : '/data/all-tags.json';
        const res = await fetch(url);
        const serverData = await res.json();
        let imported = 0;
        for (const [key, data] of Object.entries(serverData)) {
          if (!map[key] || (data.tags && data.tags.length > 0 && !map[key].tags?.length)) {
            const [module, ...rest] = key.split('::');
            const filename = rest.join('::');
            const record = {
              fileKey: key,
              module,
              filename,
              tags: data.tags || [],
              style: data.style || '',
              colorTone: data.colorTone || '',
              aiDescription: data.description || data.aiDescription || '',
              description: data.description || '',
              people: data.people || '',
              objects: data.objects || '',
              animals: data.animals || '',
              plants: data.plants || '',
              scenery: data.scenery || '',
              composition: data.composition || '',
              updatedAt: Date.now(),
            };
            await saveTagData(key, record);
            map[key] = record;
            imported++;
          }
        }
        if (imported > 0) console.log(`📥 从服务端导入了 ${imported} 条标签`);
      } catch (e) {
        // 服务端标签文件不存在或加载失败，只用本地数据
      }

      setTagData(map);
    }
    loadAllTags();
  }, []);

  // 加载素材列表（标签搜索走服务端，全局匹配）
  const loadImages = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchImages(activeModule, page, search, tagFilter);
      setImages(data.items || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [activeModule, search, tagFilter]);

  useEffect(() => {
    loadImages(1);
  }, [loadImages]);

  // 切换模块
  const handleModuleChange = (key) => {
    setActiveModule(key);
    setSearch('');
    setTagFilter('');
    setColorFilter(null);
    setPreviewImage(null);
  };

  // 标签数据更新回调（同步更新 IndexedDB）
  const handleTagUpdate = (fileKey, data) => {
    setTagData(prev => {
      const updated = { ...prev[fileKey], ...data };
      // 颜色数据也持久化到 IndexedDB，避免刷新丢失
      saveTagData(fileKey, updated).catch(() => {});
      return { ...prev, [fileKey]: updated };
    });
  };

  // 颜色过滤（客户端处理，标签搜索走服务端）
  const filteredImages = images.filter(img => {
    const fileKey = `${activeModule}::${img.filename}`;
    const data = tagData[fileKey];

    // 颜色过滤：已提取颜色的按匹配筛选，未提取的先放行让其加载
    if (colorFilter) {
      const palette = data?.colors?.palette || [];
      if (palette.length === 0) return true; // 还没提取颜色，先显示
      const match = palette.some(c => isColorMatch(c, colorFilter));
      if (!match) return false; // 已提取但不匹配，隐藏
    }

    return true;
  });

  return (
    <div className="app">
      <Sidebar
        modules={MODULES}
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        search={search}
        onSearchChange={setSearch}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        colorFilter={colorFilter}
        onColorFilterChange={setColorFilter}
        moduleStatus={moduleStatus}
        apiKey={apiKey}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="main">
        <header className="main-header">
          <div className="header-info">
            <h1>{MODULES.find(m => m.key === activeModule)?.name || '素材'}</h1>
            <span className="header-count">
              {pagination.total} 张素材
              {tagFilter && ` · 标签: "${tagFilter}"`}
              {colorFilter && (
                <span className="color-filter-badge">
                  · 色系: <span className="color-dot" style={{ background: colorFilter }} />
                  {colorFilter}
                </span>
              )}
            </span>
          </div>
          <div className="header-actions">
            {tagFilter || colorFilter ? (
              <button
                className="btn btn-sm"
                onClick={() => { setTagFilter(''); setColorFilter(null); }}
              >
                清除过滤
              </button>
            ) : null}
            <button className="btn btn-sm" onClick={() => loadImages(pagination.page)}>
              🔄 刷新
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
            <button className="btn btn-sm" onClick={() => loadImages(1)}>重试</button>
          </div>
        )}

        <ImageGrid
          images={filteredImages}
          module={activeModule}
          tagData={tagData}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => loadImages(page)}
          onImageClick={(img) => setPreviewImage(img)}
          onTagUpdate={handleTagUpdate}
        />
      </main>

      {previewImage && (
        <PreviewModal
          image={previewImage}
          module={activeModule}
          tagData={tagData[`${activeModule}::${previewImage.filename}`]}
          apiKey={apiKey}
          onClose={() => setPreviewImage(null)}
          onTagUpdate={(data) => handleTagUpdate(`${activeModule}::${previewImage.filename}`, data)}
          onPrev={() => {
            const idx = filteredImages.indexOf(previewImage);
            if (idx > 0) setPreviewImage(filteredImages[idx - 1]);
          }}
          onNext={() => {
            const idx = filteredImages.indexOf(previewImage);
            if (idx < filteredImages.length - 1) setPreviewImage(filteredImages[idx + 1]);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          apiKey={apiKey}
          onSave={(key) => {
            setApiKey(key);
            localStorage.setItem('dashscope_api_key', key);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

/** 简单的颜色匹配：计算两个颜色的相似度 */
function isColorMatch(hex1, hex2) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return false;
  const dist = Math.sqrt(
    (c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2
  );
  return dist < 80;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}
