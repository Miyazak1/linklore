import { describe, it, expect } from 'vitest';
import { isBlindReviewWindow } from '@/lib/topics/visibility';

describe('Blind Review Window', () => {
	it('should return true for topics created within 48 hours', () => {
		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
		expect(isBlindReviewWindow(oneHourAgo)).toBe(true);
	});

	it('should return false for topics created more than 48 hours ago', () => {
		const now = new Date();
		const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
		expect(isBlindReviewWindow(threeDaysAgo)).toBe(false);
	});

	it('should return true for topics created exactly 47 hours ago', () => {
		const now = new Date();
		const fortySevenHoursAgo = new Date(now.getTime() - 47 * 60 * 60 * 1000);
		expect(isBlindReviewWindow(fortySevenHoursAgo)).toBe(true);
	});

	it('should return false for topics created exactly 49 hours ago', () => {
		const now = new Date();
		const fortyNineHoursAgo = new Date(now.getTime() - 49 * 60 * 60 * 1000);
		expect(isBlindReviewWindow(fortyNineHoursAgo)).toBe(false);
	});
});










