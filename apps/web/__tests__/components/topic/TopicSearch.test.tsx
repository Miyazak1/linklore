import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopicSearch from '@/components/topic/TopicSearch';

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

// Mock fetch
global.fetch = vi.fn();

describe('TopicSearch Component', () => {
	it('should render search input and button', () => {
		render(<TopicSearch />);
		
		expect(screen.getByPlaceholderText(/搜索话题标题/i)).toBeInTheDocument();
		expect(screen.getByText(/搜索/i)).toBeInTheDocument();
	});
});

