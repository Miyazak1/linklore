/**
 * 溯源验证单元测试
 */

import { describe, it, expect } from 'vitest';
import { validateTraceForPublish, validateCitationUrl } from '@/lib/validation/traceValidation';

describe('traceValidation', () => {
	describe('validateTraceForPublish', () => {
		it('应该验证通过有效的溯源', () => {
			const result = validateTraceForPublish({
				body: '这是一个有效的正文内容，长度超过10个字符',
				citations: [
					{
						title: '测试引用',
						type: 'web'
					}
				]
			});

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该拒绝正文过短的溯源', () => {
			const result = validateTraceForPublish({
				body: '短',
				citations: [
					{
						title: '测试引用',
						type: 'web'
					}
				]
			});

			expect(result.valid).toBe(false);
			expect(result.errors.some((e: string) => e.includes('正文'))).toBe(true);
		});

		it('应该拒绝没有引用的溯源', () => {
			const result = validateTraceForPublish({
				body: '这是一个有效的正文内容，长度超过10个字符',
				citations: []
			});

			expect(result.valid).toBe(false);
			expect(result.errors.some((e: string) => e.includes('引用'))).toBe(true);
		});

		it('应该拒绝引用过多的溯源', () => {
			const citations = Array.from({ length: 51 }, (_, i) => ({
				title: `引用${i + 1}`,
				type: 'web' as const
			}));

			const result = validateTraceForPublish({
				body: '这是一个有效的正文内容，长度超过10个字符',
				citations
			});

			expect(result.valid).toBe(false);
			expect(result.errors.some((e: string) => e.includes('引用'))).toBe(true);
		});
	});

	describe('validateCitationUrl', () => {
		it('应该验证通过有效的URL', () => {
			expect(validateCitationUrl('https://example.com')).toBe(true);
			expect(validateCitationUrl('http://example.com')).toBe(true);
			expect(validateCitationUrl('https://example.com/path?query=1')).toBe(true);
		});

		it('应该拒绝无效的URL', () => {
			expect(validateCitationUrl('not-a-url')).toBe(false);
			expect(validateCitationUrl('ftp://example.com')).toBe(false);
			expect(validateCitationUrl('javascript:alert(1)')).toBe(false);
		});

		it('应该允许空URL（可选字段）', () => {
			expect(validateCitationUrl('')).toBe(true);
			expect(validateCitationUrl(null as any)).toBe(true);
			expect(validateCitationUrl(undefined as any)).toBe(true);
		});
	});
});

