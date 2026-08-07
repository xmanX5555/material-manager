import { useState } from 'react';

export default function SettingsModal({ apiKey, onSave, onClose }) {
  const [key, setKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="preview-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ 设置</h2>
          <button className="preview-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <label className="settings-label">
              通义千问 API Key (DashScope)
              <span className="settings-hint">
                新用户送免费额度，超量后约 ¥0.001/张
              </span>
            </label>
            <div className="api-key-input">
              <input
                type={showKey ? 'text' : 'password'}
                className="search-input"
                placeholder="sk-..."
                value={key}
                onChange={e => setKey(e.target.value)}
              />
              <button
                className="btn btn-sm"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h4>💡 如何获取 API Key？（免费）</h4>
            <ol className="settings-steps">
              <li>访问 <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noreferrer">dashscope.console.aliyun.com</a> 用阿里云账号登录</li>
              <li>左侧菜单 →「API-KEY 管理」→ 创建新的 API Key</li>
              <li>复制 Key（sk-开头）粘贴到上方输入框</li>
              <li>新用户有<strong>免费额度</strong>，用完才需充值</li>
            </ol>
          </div>

          <div className="settings-section">
            <h4>🔒 隐私说明</h4>
            <ul className="settings-privacy">
              <li>你的素材文件<strong>不会上传</strong>到任何服务器</li>
              <li>AI 分析时仅发送压缩后的图片到通义千问 API</li>
              <li>API Key 和标签数据<strong>仅存储在本地浏览器</strong>中</li>
              <li>标签数据保存在浏览器 IndexedDB，不会被上传</li>
            </ul>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(key)}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
