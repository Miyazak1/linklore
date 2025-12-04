/**
 * 草稿存储工具
 * 支持IndexedDB、localStorage备份和服务器同步
 */

interface DraftData {
	title: string;
	traceType: string;
	target: string;
	body: string;
	citations: any[];
	timestamp: number;
}

const DB_NAME = 'linklore-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

// IndexedDB实例
let db: IDBDatabase | null = null;

/**
 * 初始化IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
	if (db) return db;

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			console.warn('[DraftStorage] IndexedDB unavailable');
			reject(new Error('IndexedDB unavailable'));
		};

		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
				store.createIndex('timestamp', 'timestamp', { unique: false });
			}
		};
	});
}

/**
 * 保存草稿到IndexedDB
 */
export async function saveDraftToIndexedDB(key: string, data: DraftData): Promise<void> {
	try {
		const database = await initDB();
		const transaction = database.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		await new Promise<void>((resolve, reject) => {
			const request = store.put({
				key,
				...data,
				timestamp: Date.now()
			});

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (err) {
		console.warn('[DraftStorage] Failed to save to IndexedDB:', err);
		// 降级到localStorage
		await saveDraftToLocalStorage(key, data);
	}
}

/**
 * 从IndexedDB读取草稿
 */
export async function loadDraftFromIndexedDB(key: string): Promise<DraftData | null> {
	try {
		const database = await initDB();
		const transaction = database.transaction([STORE_NAME], 'readonly');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise<DraftData | null>((resolve, reject) => {
			const request = store.get(key);

			request.onsuccess = () => {
				const result = request.result;
				if (result) {
					// 移除key字段，只返回数据
					const { key: _, ...data } = result;
					resolve(data as DraftData);
				} else {
					resolve(null);
				}
			};

			request.onerror = () => reject(request.error);
		});
	} catch (err) {
		console.warn('[DraftStorage] Failed to load from IndexedDB:', err);
		// 降级到localStorage
		return await loadDraftFromLocalStorage(key);
	}
}

/**
 * 保存草稿到localStorage（备份）
 */
export async function saveDraftToLocalStorage(key: string, data: DraftData): Promise<void> {
	try {
		localStorage.setItem(key, JSON.stringify({
			...data,
			timestamp: Date.now()
		}));
	} catch (err) {
		console.warn('[DraftStorage] Failed to save to localStorage:', err);
	}
}

/**
 * 从localStorage读取草稿（备份）
 */
export async function loadDraftFromLocalStorage(key: string): Promise<DraftData | null> {
	try {
		const stored = localStorage.getItem(key);
		if (!stored) return null;

		const parsed = JSON.parse(stored);
		// 移除timestamp字段
		const { timestamp: _, ...data } = parsed;
		return data as DraftData;
	} catch (err) {
		console.warn('[DraftStorage] Failed to load from localStorage:', err);
		return null;
	}
}

/**
 * 保存草稿（优先IndexedDB，降级到localStorage）
 */
export async function saveDraft(key: string, data: DraftData): Promise<void> {
	// 同时保存到IndexedDB和localStorage（双重备份）
	await Promise.allSettled([
		saveDraftToIndexedDB(key, data),
		saveDraftToLocalStorage(key, data)
	]);
}

/**
 * 加载草稿（优先IndexedDB，降级到localStorage）
 */
export async function loadDraft(key: string): Promise<DraftData | null> {
	// 先尝试从IndexedDB加载
	const indexedDBDraft = await loadDraftFromIndexedDB(key);
	if (indexedDBDraft) {
		// 如果IndexedDB有数据，同步到localStorage作为备份
		await saveDraftToLocalStorage(key, indexedDBDraft);
		return indexedDBDraft;
	}

	// 如果IndexedDB没有，尝试从localStorage加载
	const localStorageDraft = await loadDraftFromLocalStorage(key);
	if (localStorageDraft) {
		// 如果localStorage有数据，同步到IndexedDB
		await saveDraftToIndexedDB(key, localStorageDraft);
		return localStorageDraft;
	}

	return null;
}

/**
 * 删除草稿
 */
export async function deleteDraft(key: string): Promise<void> {
	try {
		// 从IndexedDB删除
		if (db) {
			const transaction = db.transaction([STORE_NAME], 'readwrite');
			const store = transaction.objectStore(STORE_NAME);
			await new Promise<void>((resolve, reject) => {
				const request = store.delete(key);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		}
	} catch (err) {
		console.warn('[DraftStorage] Failed to delete from IndexedDB:', err);
	}

	// 从localStorage删除
	try {
		localStorage.removeItem(key);
	} catch (err) {
		console.warn('[DraftStorage] Failed to delete from localStorage:', err);
	}
}

/**
 * 同步草稿到服务器
 */
export async function syncDraftToServer(traceId: string | null, data: DraftData): Promise<void> {
	try {
		const endpoint = traceId
			? `/api/traces/${traceId}/draft`
			: '/api/traces/draft';

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (!response.ok) {
			throw new Error('Failed to sync draft to server');
		}
	} catch (err) {
		console.warn('[DraftStorage] Failed to sync to server:', err);
		// 服务器同步失败不影响本地存储
	}
}

/**
 * 从服务器加载草稿
 */
export async function loadDraftFromServer(traceId: string | null): Promise<DraftData | null> {
	try {
		const endpoint = traceId
			? `/api/traces/${traceId}/draft`
			: '/api/traces/draft';

		const response = await fetch(endpoint);
		if (!response.ok) {
			if (response.status === 404) {
				return null; // 没有服务器草稿
			}
			throw new Error('Failed to load draft from server');
		}

		const data = await response.json();
		if (data.success && data.data) {
			return data.data as DraftData;
		}

		return null;
	} catch (err) {
		console.warn('[DraftStorage] Failed to load from server:', err);
		return null;
	}
}

