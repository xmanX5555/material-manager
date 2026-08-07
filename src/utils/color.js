/**
 * 从图片中提取主色调和调色板
 * 使用 Canvas API 进行像素采样和 K-means 风格的色彩量化
 */

/**
 * 将 RGB 转换为 HEX
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * 将 HEX 转换为 RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * 计算两个颜色之间的欧几里得距离
 */
function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * 判断颜色是否接近白色或黑色（太极端的不适合作为主色调）
 */
function isExtremeColor(r, g, b) {
  const brightness = (r + g + b) / 3;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  return brightness > 240 || brightness < 20 || saturation < 15;
}

/**
 * 从图片元素提取主色调
 * @param {HTMLImageElement} img - 图片元素
 * @param {number} numColors - 要提取的颜色数量
 * @returns {{ dominant: string, palette: string[] }}
 */
export function extractColors(img, numColors = 6) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 缩小图片以提高性能（最大 150px）
    const maxSize = 150;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxSize / Math.max(w, h));
    w = Math.floor(w * scale);
    h = Math.floor(h * scale);

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;
    const pixelCount = w * h;

    // 将颜色量化到 24 级（减少颜色空间）
    const levels = 24;
    const step = 256 / levels;
    const colorMap = new Map();

    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const r = Math.floor(pixels[idx] / step) * step;
      const g = Math.floor(pixels[idx + 1] / step) * step;
      const b = Math.floor(pixels[idx + 2] / step) * step;
      const a = pixels[idx + 3];

      // 跳过透明像素
      if (a < 128) continue;
      // 跳过极端颜色
      if (isExtremeColor(r, g, b)) continue;

      const key = `${r},${g},${b}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // 按频率排序
    const sorted = [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50); // 取前50个候选

    // 合并相似颜色（距离 < 50 的合并）
    const merged = [];
    for (const [key, count] of sorted) {
      const [r, g, b] = key.split(',').map(Number);
      const color = { r, g, b, hex: rgbToHex(r, g, b), count };

      // 检查是否与已有颜色太相似
      const similar = merged.find(m => colorDistance(m, color) < 50);
      if (similar) {
        // 保留频率更高的
        if (count > similar.count) {
          similar.r = r;
          similar.g = g;
          similar.b = b;
          similar.hex = color.hex;
          similar.count = count;
        }
      } else {
        merged.push(color);
      }

      if (merged.length >= numColors) break;
    }

    // 如果提取的颜色不够，补充一些
    while (merged.length < Math.max(2, numColors)) {
      const lastColor = merged[merged.length - 1] || { r: 128, g: 128, b: 128 };
      merged.push({
        r: Math.min(255, lastColor.r + 30),
        g: Math.min(255, lastColor.g + 20),
        b: Math.min(255, lastColor.b + 10),
        hex: rgbToHex(
          Math.min(255, lastColor.r + 30),
          Math.min(255, lastColor.g + 20),
          Math.min(255, lastColor.b + 10)
        ),
        count: 0,
      });
    }

    const palette = merged.map(m => m.hex);
    const dominant = palette[0] || '#888888';

    return { dominant, palette };
  } catch (err) {
    console.error('颜色提取失败:', err);
    return { dominant: '#888888', palette: ['#888888', '#aaaaaa', '#cccccc'] };
  }
}

/**
 * 判断文字在背景色上应该用黑色还是白色
 */
export function getTextColor(bgHex) {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return '#ffffff';
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#1a1a1a' : '#ffffff';
}

/**
 * 将色系映射到中文名称
 */
export function getColorToneName(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '中性色';
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  const hue = getHue(r, g, b, max, min);

  if (sat < 25) return max > 200 ? '白色系' : max < 80 ? '黑色系' : '灰色系';
  if (hue < 20) return '红色系';
  if (hue < 40) return '橙色系';
  if (hue < 65) return '黄色系';
  if (hue < 160) return '绿色系';
  if (hue < 200) return '青色系';
  if (hue < 260) return '蓝色系';
  if (hue < 290) return '紫色系';
  if (hue < 330) return '粉色系';
  return '红色系';
}

function getHue(r, g, b, max, min) {
  if (max === min) return 0;
  let hue = 0;
  const d = max - min;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) hue = ((b - r) / d + 2) * 60;
  else hue = ((r - g) / d + 4) * 60;
  return hue;
}
