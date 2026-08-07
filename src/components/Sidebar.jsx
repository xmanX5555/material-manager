import { useState } from 'react';

const COLOR_PRESETS = [
  { hex: '#FF4444', name: '红色系' },
  { hex: '#FF8800', name: '橙色系' },
  { hex: '#FFCC00', name: '黄色系' },
  { hex: '#44CC44', name: '绿色系' },
  { hex: '#44CCCC', name: '青色系' },
  { hex: '#4488FF', name: '蓝色系' },
  { hex: '#AA44FF', name: '紫色系' },
  { hex: '#FF66AA', name: '粉色系' },
  { hex: '#8B7355', name: '棕色系' },
  { hex: '#AAAAAA', name: '灰色系' },
  { hex: '#222222', name: '黑色系' },
  { hex: '#F5F5DC', name: '米白色系' },
];

export default function Sidebar({
  modules,
  activeModule,
  onModuleChange,
  search,
  onSearchChange,
  tagFilter,
  onTagFilterChange,
  colorFilter,
  onColorFilterChange,
  moduleStatus,
  apiKey,
  onOpenSettings,
}) {
  const [searchMode, setSearchMode] = useState('name'); // 'name' | 'tag'

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon"/>

          <span className="logo-text">素材管家</span>
        </div>
      </div>

      {/* 模块切换 */}
      <div className="sidebar-section">
        <div className="section-title">素材分类</div>
        <div className="module-list">
          {modules.map(mod => (
            <button
              key={mod.key}
              className={`module-btn ${activeModule === mod.key ? 'active' : ''}`}
              onClick={() => onModuleChange(mod.key)}
            >
              <span className="module-name">{mod.name}</span>
              {moduleStatus[mod.key] && (
                <span className="module-count">
                  {moduleStatus[mod.key].exists ? moduleStatus[mod.key].fileCount : '❌'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 搜索 */}
      <div className="sidebar-section">
        <div className="section-title">搜索</div>
        <div className="search-tabs">
          <button
            className={`search-tab ${searchMode === 'name' ? 'active' : ''}`}
            onClick={() => { setSearchMode('name'); onTagFilterChange(''); }}
          >
            文件名
          </button>
          <button
            className={`search-tab ${searchMode === 'tag' ? 'active' : ''}`}
            onClick={() => { setSearchMode('tag'); onSearchChange(''); }}
          >
            标签
          </button>
        </div>
        {searchMode === 'name' ? (
          <input
            type="text"
            className="search-input"
            placeholder="搜索文件名..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        ) : (
          <input
            type="text"
            className="search-input"
            placeholder="搜索标签...（如：古风、暖色调）"
            value={tagFilter}
            onChange={e => onTagFilterChange(e.target.value)}
          />
        )}
      </div>

      {/* 色系筛选 */}
      <div className="sidebar-section">
        <div className="section-title">
          色系筛选
          {colorFilter && (
            <button
              className="clear-filter-btn"
              onClick={() => onColorFilterChange(null)}
            >
              清除
            </button>
          )}
        </div>
        <div className="color-presets">
          {COLOR_PRESETS.map(color => (
            <button
              key={color.hex}
              className={`color-preset-btn ${colorFilter === color.hex ? 'active' : ''}`}
              title={color.name}
              onClick={() => onColorFilterChange(colorFilter === color.hex ? null : color.hex)}
            >
              <span className="color-dot-lg" style={{ background: color.hex }} />
              <span className="color-preset-name">{color.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 底部设置 */}
      <div className="sidebar-footer">
        <button className="settings-btn" onClick={onOpenSettings}>
          ⚙️ 设置
          {!apiKey && <span className="badge-warn">未配置API</span>}
        </button>
        <div className="sidebar-tip">
          💡 AI 打标签需要配置通义千问 API Key
        </div>
      </div>
    </aside>
  );
}
