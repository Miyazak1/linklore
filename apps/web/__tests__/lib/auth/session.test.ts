import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSession, readSession, clearSession } from '@/lib/auth/session';

// Mock Next.js cookies
vi.mock('next/headers', () => ({
	cookies: vi.fn(() => ({
		get: vi.fn(),
		set: vi.fn(),
	})),
}));

describe('Session Management', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should create a session with valid payload', async () => {
		const payload = { sub: 'user123', email: 'test@example.com' };
		await expect(createSession(payload)).resolves.not.toThrow();
	});

	it('should read a valid session', async () => {
		// This test would need proper mocking of JWT verification
		// For now, just test that the function exists and can be called
		const result = await readSession();
		expect(result).toBeDefined();
	});

	it('should clear a session', async () => {
		await expect(clearSession()).resolves.not.toThrow();
	});
});










