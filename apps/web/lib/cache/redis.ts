/**
 * Redis cache utility
 * Falls back to in-memory cache if Redis is unavailable
 */

import IORedis from 'ioredis';

let redisClient: IORedis | null = null;
let redisAvailable = false;

// In-memory fallback cache
const memoryCache = new Map<string, { value: any; expires: number }>();

function initRedis(): IORedis | null {
	if (redisClient) return redisClient;
	if (!redisAvailable) return null;

	try {
		const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
		redisClient = new IORedis(url, {
			maxRetriesPerRequest: 1,
			retryStrategy: () => null,
			lazyConnect: true,
			enableReadyCheck: false
		});

		redisClient.on('error', () => {
			redisAvailable = false;
			redisClient = null;
		});

		redisClient.on('connect', () => {
			redisAvailable = true;
		});

		return redisClient;
	} catch {
		redisAvailable = false;
		return null;
	}
}

export async function getCache<T>(key: string): Promise<T | null> {
	// Try Redis first
	const client = initRedis();
	if (client) {
		try {
			const value = await client.get(key);
			if (value) {
				return JSON.parse(value) as T;
			}
		} catch {
			// Fall back to memory cache
		}
	}

	// Fall back to memory cache
	const cached = memoryCache.get(key);
	if (cached && cached.expires > Date.now()) {
		return cached.value as T;
	}
	if (cached) {
		memoryCache.delete(key);
	}
	return null;
}

export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
	// Try Redis first
	const client = initRedis();
	if (client) {
		try {
			await client.setex(key, ttlSeconds, JSON.stringify(value));
			return;
		} catch {
			// Fall back to memory cache
		}
	}

	// Fall back to memory cache
	memoryCache.set(key, {
		value,
		expires: Date.now() + ttlSeconds * 1000
	});

	// Clean up expired entries periodically
	if (memoryCache.size > 1000) {
		const now = Date.now();
		for (const [k, v] of memoryCache.entries()) {
			if (v.expires <= now) {
				memoryCache.delete(k);
			}
		}
	}
}

export async function deleteCache(key: string): Promise<void> {
	const client = initRedis();
	if (client) {
		try {
			await client.del(key);
		} catch {
			// Ignore
		}
	}
	memoryCache.delete(key);
}

export async function clearCache(pattern: string): Promise<void> {
	const client = initRedis();
	if (client) {
		try {
			const keys = await client.keys(pattern);
			if (keys.length > 0) {
				await client.del(...keys);
			}
		} catch {
			// Ignore
		}
	}

	// Clear memory cache
	for (const key of memoryCache.keys()) {
		if (key.includes(pattern.replace('*', ''))) {
			memoryCache.delete(key);
		}
	}
}










