/**
 * 溯源和词条缓存系统
 * 使用Redis（如果可用）或内存缓存
 */

import IORedis from 'ioredis';
import { TRACE_PROCESSING_CONFIG } from '@/lib/config/trace-processing';

// 内存缓存（Redis不可用时的降级方案）
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

let redisClient: IORedis | null = null;
let redisAvailable = false;

// 初始化Redis连接
async function initRedis() {
	if (redisClient) return redisClient;

	try {
		const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
		redisClient = new IORedis(redisUrl, {
			maxRetriesPerRequest: 3,
			retryStrategy: () => null,
			lazyConnect: true,
			enableReadyCheck: true,
			connectTimeout: 5000
		});

		await redisClient.connect();
		redisAvailable = true;
		console.log('[TraceCache] Redis connected');
		return redisClient;
	} catch (err) {
		console.warn('[TraceCache] Redis unavailable, using memory cache');
		redisAvailable = false;
		return null;
	}
}

// 清理过期内存缓存
function cleanMemoryCache() {
	const now = Date.now();
	for (const [key, value] of memoryCache.entries()) {
		if (value.expiresAt < now) {
			memoryCache.delete(key);
		}
	}
}

/**
 * 获取词条缓存
 */
export async function getEntry(slug: string): Promise<any | null> {
	try {
		const redis = await initRedis();
		if (redis && redisAvailable) {
			const cached = await redis.get(`entry:${slug}`);
			if (cached) {
				cacheStats.hits++;
				return JSON.parse(cached);
			}
			cacheStats.misses++;
			return null;
		}

		// 内存缓存
		cleanMemoryCache();
		const cached = memoryCache.get(`entry:${slug}`);
		if (cached && cached.expiresAt > Date.now()) {
			cacheStats.hits++;
			return cached.data;
		}
		cacheStats.misses++;
		return null;
	} catch (err) {
		console.error('[TraceCache] Failed to get entry cache:', err);
		return null;
	}
}

/**
 * 设置词条缓存
 */
export async function setEntry(slug: string, entry: any): Promise<void> {
	try {
		const redis = await initRedis();
		const ttl = TRACE_PROCESSING_CONFIG.CACHE.ENTRY_TTL;

		if (redis && redisAvailable) {
			await redis.setex(`entry:${slug}`, ttl, JSON.stringify(entry));
			cacheStats.sets++;
			return;
		}

		// 内存缓存
		memoryCache.set(`entry:${slug}`, {
			data: entry,
			expiresAt: Date.now() + ttl * 1000
		});
		cacheStats.sets++;
	} catch (err) {
		console.error('[TraceCache] Failed to set entry cache:', err);
	}
}

/**
 * 获取溯源缓存
 */
export async function getTrace(traceId: string): Promise<any | null> {
	try {
		const redis = await initRedis();
		if (redis && redisAvailable) {
			const cached = await redis.get(`trace:${traceId}`);
			if (cached) {
				cacheStats.hits++;
				return JSON.parse(cached);
			}
			cacheStats.misses++;
			return null;
		}

		// 内存缓存
		cleanMemoryCache();
		const cached = memoryCache.get(`trace:${traceId}`);
		if (cached && cached.expiresAt > Date.now()) {
			cacheStats.hits++;
			return cached.data;
		}
		cacheStats.misses++;
		return null;
	} catch (err) {
		console.error('[TraceCache] Failed to get trace cache:', err);
		return null;
	}
}

/**
 * 设置溯源缓存
 */
export async function setTrace(traceId: string, trace: any): Promise<void> {
	try {
		const redis = await initRedis();
		const ttl = TRACE_PROCESSING_CONFIG.CACHE.TRACE_TTL;

		if (redis && redisAvailable) {
			await redis.setex(`trace:${traceId}`, ttl, JSON.stringify(trace));
			cacheStats.sets++;
			return;
		}

		// 内存缓存
		memoryCache.set(`trace:${traceId}`, {
			data: trace,
			expiresAt: Date.now() + ttl * 1000
		});
		cacheStats.sets++;
	} catch (err) {
		console.error('[TraceCache] Failed to set trace cache:', err);
	}
}

/**
 * 失效词条缓存
 */
export async function invalidateEntryCache(slug: string): Promise<void> {
	try {
		const redis = await initRedis();
		if (redis && redisAvailable) {
			await redis.del(`entry:${slug}`);
			return;
		}

		// 内存缓存
		memoryCache.delete(`entry:${slug}`);
	} catch (err) {
		console.error('[TraceCache] Failed to invalidate entry cache:', err);
	}
}

/**
 * 失效溯源缓存
 */
export async function invalidateTraceCache(traceId: string): Promise<void> {
	try {
		const redis = await initRedis();
		if (redis && redisAvailable) {
			await redis.del(`trace:${traceId}`);
			return;
		}

		// 内存缓存
		memoryCache.delete(`trace:${traceId}`);
	} catch (err) {
		console.error('[TraceCache] Failed to invalidate trace cache:', err);
	}
}

