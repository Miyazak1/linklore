/**
 * Rate limiting utility
 * Uses Redis if available, falls back to in-memory store
 */

import { getCache, setCache } from '@/lib/cache/redis';

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	reset: number;
}

const memoryStore = new Map<string, { count: number; reset: number }>();

export async function rateLimit(
	identifier: string,
	maxRequests: number,
	windowSeconds: number
): Promise<RateLimitResult> {
	const key = `rate_limit:${identifier}`;
	const now = Math.floor(Date.now() / 1000);
	const window = Math.floor(now / windowSeconds);

	// Try Redis first
	const cached = await getCache<{ count: number; window: number }>(key);
	
	if (cached && cached.window === window) {
		const remaining = Math.max(0, maxRequests - cached.count);
		return {
			allowed: cached.count < maxRequests,
			remaining,
			reset: (window + 1) * windowSeconds
		};
	}

	// New window or cache miss
	const newCount = 1;
	await setCache(key, { count: newCount, window }, windowSeconds);

	// Also update memory store as fallback
	const memoryKey = `${identifier}:${window}`;
	memoryStore.set(memoryKey, {
		count: newCount,
		reset: (window + 1) * windowSeconds
	});

	return {
		allowed: true,
		remaining: maxRequests - newCount,
		reset: (window + 1) * windowSeconds
	};
}

export async function checkRateLimit(
	identifier: string,
	maxRequests: number,
	windowSeconds: number
): Promise<RateLimitResult> {
	const key = `rate_limit:${identifier}`;
	const now = Math.floor(Date.now() / 1000);
	const window = Math.floor(now / windowSeconds);

	// Try Redis first
	const cached = await getCache<{ count: number; window: number }>(key);
	
	if (cached && cached.window === window) {
		const newCount = cached.count + 1;
		const remaining = Math.max(0, maxRequests - newCount);
		const allowed = newCount <= maxRequests;

		if (allowed) {
			await setCache(key, { count: newCount, window }, windowSeconds);
		}

		return {
			allowed,
			remaining,
			reset: (window + 1) * windowSeconds
		};
	}

	// New window
	const newCount = 1;
	await setCache(key, { count: newCount, window }, windowSeconds);

	return {
		allowed: true,
		remaining: maxRequests - newCount,
		reset: (window + 1) * windowSeconds
	};
}










