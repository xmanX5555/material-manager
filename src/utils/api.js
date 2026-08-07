// API 工具 —— 纯静态模式：数据从 public/data/ 加载，客户端处理
const BASE = '/api';
const STATIC_DATA = '/data';

let _manifest = null;
let _tags = null;

async function loadManifest() {
  if (_manifest) return _manifest;
  const res = await fetch(STATIC_DATA + '/manifest.json');
  _manifest = await res.json();
  return _manifest;
}

async function loadTags() {
  if (_tags) return _tags;
  const res = await fetch(STATIC_DATA + '/all-tags.json');
  _tags = await res.json();
  return _tags;
}

/** 获取素材列表（客户端过滤+分页） */
export async function fetchImages(module = 'meigong', page = 1, search = '', tag = '') {
  const manifest = await loadManifest();
  let files = manifest[module] || [];

  // 标签搜索
  if (tag) {
    const allTags = await loadTags();
    const tagLower = tag.toLowerCase();
    const tagged = new Set();
    for (const [key, data] of Object.entries(allTags)) {
      const text = [data.tags || [], data.description || '', data.people || '', data.objects || '', data.plants || '', data.scenery || ''].flat().join(' ').toLowerCase();
      if (text.includes(tagLower)) {
        const parts = key.split('::');
        if (parts[0] === module) tagged.add(parts.slice(1).join('::'));
      }
    }
    files = files.filter(f => tagged.has(f.filename));
  }

  // 文件名搜索
  if (search) {
    const kw = search.toLowerCase();
    files = files.filter(f => f.filename.toLowerCase().includes(kw));
  }

  const total = files.length;
  const totalPages = Math.ceil(total / 60);
  const pageNum = Math.max(1, Math.min(page, totalPages || 1));
  const start = (pageNum - 1) * 60;
  const items = files.slice(start, start + 60);

  return {
    module: 'meigong',
    items,
    pagination: { page: pageNum, limit: 60, total, totalPages },
  };
}

/** 获取图片 URL */
export function getImageUrl(module, filename) {
  if (typeof window !== 'undefined' && !window.location.host.includes('localhost')) {
    return '/thumbs/' + filename.replace(/\.psd$/i, '.jpg');
  }
  return BASE + '/file/' + module + '/' + filename;
}

/** 获取全部标签数据 */
export async function fetchAllTags() {
  return loadTags();
}

/** 获取模块状态 */
export async function fetchStatus() {
  const manifest = await loadManifest();
  return {
    meigong: { name: '美工素材', path: '', exists: true, fileCount: manifest.meigong?.length || 0 },
  };
}

/** 将图片转为 base64（PreviewModal AI 打标签用） */
export function imageToBase64(img, maxWidth = 1024, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxWidth || h > maxWidth) {
      const scale = maxWidth / Math.max(w, h);
      w = Math.floor(w * scale);
      h = Math.floor(h * scale);
    }
    canvas.width = w; canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    resolve(canvas.toDataURL('image/jpeg', quality));
  });
}

/** AI 打标签（PreviewModal 用） */
export async function aiTagImage(imageBase64, apiKey) {
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'qwen-vl-plus',
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: imageBase64 } },
        { type: 'text', text: '你是一个设计素材分析专家。请仔细分解这张图片里的每一个具体元素，返回纯JSON：{"description":"一句话描述","style":"设计风格","colorTone":"色调","people":"人物描述","objects":"具体物件","animals":"动物","plants":"植物花卉","scenery":"背景","composition":"构图","tags":["标签1","标签2",...]}。标签10-20个，必须是画面中可见的具体元素（如"红衣女子"而非"精致华丽"）。只返回JSON。' },
      ] }],
      max_tokens: 800, temperature: 0.3,
    }),
  });
  if (!response.ok) throw new Error('AI API 错误 (' + response.status + '): ' + (await response.text()));
  const data = await response.json();
  const content = (data.choices?.[0]?.message?.content || '').trim();
  let jsonStr = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  try {
    const r = JSON.parse(jsonStr);
    return { tags: r.tags || [], description: r.description || '', style: r.style || '', colorTone: r.colorTone || '', people: r.people || '', objects: r.objects || '', animals: r.animals || '', plants: r.plants || '', scenery: r.scenery || '', composition: r.composition || '' };
  } catch {
    return { tags: [], description: content.slice(0, 200), style: '', colorTone: '', people: '', objects: '', animals: '', plants: '', scenery: '', composition: '' };
  }
}
