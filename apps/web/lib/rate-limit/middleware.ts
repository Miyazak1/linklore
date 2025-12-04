/**
 * Rate limiting utility for middleware (Edge Runtime compatible)
 * Uses only in-memory store, no Redis dependency
 */

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	reset: number;
}

// In-memory store for rate limiting (per process)
const memoryStore = new Map<string, { count: number; window: number; reset: number }>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpired() {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;
	lastCleanup = now;

	const currentTime = Math.floor(now / 1000);
	for (const [key, value] of memoryStore.entries()) {
		if (value.reset < currentTime) {
			memoryStore.delete(key);
		}
	}
}

export async function checkRateLimit(
	identifier: string,
	maxRequests: number,
	windowSeconds: number
): Promise<RateLimitResult> {
	// Clean up expired entries
	cleanupExpired();

	const key = `rate_limit:${identifier}`;
	const now = Math.floor(Date.now() / 1000);
	const window = Math.floor(now / windowSeconds);

	// Get from memory store
	const cached = memoryStore.get(key);

	if (cached && cached.window === window) {
		const newCount = cached.count + 1;
		const remaining = Math.max(0, maxRequests - newCount);
		const allowed = newCount <= maxRequests;

		if (allowed) {
			memoryStore.set(key, {
				count: newCount,
				window,
				reset: (window + 1) * windowSeconds
			});
		}

		return {
			allowed,
			remaining,
			reset: (window + 1) * windowSeconds
		};
	}

	// New window
	const newCount = 1;
	memoryStore.set(key, {
		count: newCount,
		window,
		reset: (window + 1) * windowSeconds
	});

	return {
		allowed: true,
		remaining: maxRequests - newCount,
		reset: (window + 1) * windowSeconds
	};
}










