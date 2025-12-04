/**
 * 测试环境设置
 */

import { vi } from 'vitest';

// Mock Next.js
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn()
	}),
	usePathname: () => '/',
	useParams: () => ({})
}));

// Mock 环境变量
process.env.SESSION_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

