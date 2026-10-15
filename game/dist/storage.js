const DB = 'reta-polygon-v1';
export async function connect() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法打开本地存档，请检查浏览器的网站存储权限'));
    request.onblocked = () => reject(new Error('存档被另一个标签页占用，请关闭它后重试'));
  });
}
export async function read(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('saves', 'readonly');
    const request = tx.objectStore('saves').get('active');
    tx.oncomplete = () => resolve(request.result ?? null);
    tx.onerror = () => reject(new Error('本地存档读取失败'));
    tx.onabort = () => reject(new Error('本地存档读取中断'));
  });
}
export async function write(db, state) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('saves', 'readwrite');
    tx.objectStore('saves').put(state, 'active');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(new Error('保存失败。已暂停交易，请检查存储空间后重试'));
    tx.onabort = () => reject(new Error('保存中断。已暂停交易，请重试'));
  });
}
