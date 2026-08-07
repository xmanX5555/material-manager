// IndexedDB 标签数据存储
import { openDB } from 'idb';

const DB_NAME = 'material-manager';
const DB_VERSION = 1;
const STORE_NAME = 'tags';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'fileKey' });
          store.createIndex('module', 'module');
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

/** 生成唯一 key（基于模块+相对路径） */
export function makeFileKey(module, filename) {
  return `${module}::${filename}`;
}

/** 保存标签数据 */
export async function saveTagData(fileKey, data) {
  const db = await getDB();
  const existing = await db.get(STORE_NAME, fileKey);
  const record = {
    fileKey,
    ...(existing || {}),
    ...data,
    updatedAt: Date.now(),
  };
  await db.put(STORE_NAME, record);
  return record;
}

/** 获取标签数据 */
export async function getTagData(fileKey) {
  const db = await getDB();
  return db.get(STORE_NAME, fileKey);
}

/** 批量获取标签数据 */
export async function getAllTagData() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/** 按模块获取所有标签 */
export async function getTagDataByModule(module) {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.filter(r => r.module === module);
}

/** 删除标签数据 */
export async function deleteTagData(fileKey) {
  const db = await getDB();
  await db.delete(STORE_NAME, fileKey);
}

/** 搜索标签 */
export async function searchByTag(keyword) {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  const kw = keyword.toLowerCase();
  return all.filter(r => {
    const tags = (r.tags || []).join(' ').toLowerCase();
    const desc = (r.aiDescription || '').toLowerCase();
    const elements = (r.elements || '').toLowerCase();
    const style = (r.style || '').toLowerCase();
    return tags.includes(kw) || desc.includes(kw) || elements.includes(kw) || style.includes(kw);
  });
}

/** 导出所有标签数据为 JSON */
export async function exportData() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/** 导入标签数据 */
export async function importData(records) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}
