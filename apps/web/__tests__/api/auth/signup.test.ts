import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/signup/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth/session', () => ({
	createSession: vi.fn(),
}));

vi.mock('@/lib/auth/invite', () => ({
	validateAndConsumeInvite: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
	prisma: {
		user: {
			create: vi.fn(),
			findUnique: vi.fn(),
		},
	},
}));

vi.mock('bcryptjs', () => ({
	default: {
		hash: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
	},
}));

describe('POST /api/auth/signup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return 400 for missing fields', async () => {
		const req = new NextRequest('http://localhost/api/auth/signup', {
			method: 'POST',
			body: JSON.stringify({}),
		});

		const response = await POST(req);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBeDefined();
	});

	it('should return 400 for invalid email', async () => {
		const req = new NextRequest('http://localhost/api/auth/signup', {
			method: 'POST',
			body: JSON.stringify({
				email: 'invalid-email',
				password: 'password123',
				inviteCode: 'TEST123',
			}),
		});

		const response = await POST(req);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBeDefined();
	});

	it('should return 400 for short password', async () => {
		const req = new NextRequest('http://localhost/api/auth/signup', {
			method: 'POST',
			body: JSON.stringify({
				email: 'test@example.com',
				password: '123',
				inviteCode: 'TEST123',
			}),
		});

		const response = await POST(req);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBeDefined();
	});
});










