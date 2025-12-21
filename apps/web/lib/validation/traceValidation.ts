/**
 * 溯源验证逻辑
 * 使用Zod进行严格的输入验证
 */

import { z } from 'zod';
import { TRACE_PROCESSING_CONFIG } from '@/lib/config/trace-processing';

// 引用Schema
export const CitationSchema = z.object({
	id: z.string().optional(),
	url: z.string().url().optional().or(z.literal('')),
	title: z.string().min(1, '标题不能为空').max(TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.CITATION_TITLE_MAX, `标题不能超过${TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.CITATION_TITLE_MAX}字`),
	author: z.string().max(200, '作者名称不能超过200字').optional(),
	publisher: z.string().max(200, '出版机构不能超过200字').optional(),
	year: z.number().int().min(1000).max(2200).optional(),
	type: z.enum(['web', 'book', 'paper', 'journal', 'other']),
	quote: z.string().max(TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.CITATION_QUOTE_MAX, `引用片段不能超过${TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.CITATION_QUOTE_MAX}字`).optional(),
	page: z.string().max(50, '页码不能超过50字').optional(),
	order: z.number().int().min(1).optional()
});

// 溯源Schema
export const TraceSchema = z.object({
	title: z.string()
		.min(1, '标题不能为空')
		.max(200, '标题不能超过200字')
		.trim(),
	traceType: z.enum(['CONCEPT', 'EVENT', 'FACT', 'PERSON', 'THEORY', 'DEFINITION']),
	target: z.string()
		.min(10, '溯源目标至少10字')
		.max(1000, '溯源目标不能超过1000字')
		.trim(),
	body: z.string()
		.min(TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.BODY_MIN_LENGTH, `正文至少需要${TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.BODY_MIN_LENGTH}字`)
		.max(TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.BODY_MAX_LENGTH, `正文不能超过${TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.BODY_MAX_LENGTH}字`),
	citations: z.array(CitationSchema)
		.min(1, '至少需要一个引用')
		.max(TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.CITATIONS_MAX_COUNT, `最多${TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.CITATIONS_MAX_COUNT}个引用`)
});

/**
 * 验证引用URL
 * @param url URL字符串
 * @returns {object} 验证结果
 */
export function validateCitationUrl(url: string): { valid: boolean; error?: string } {
	if (!url || url.trim() === '') {
		return { valid: true }; // URL是可选的
	}

	try {
		const parsed = new URL(url);

		// 1. 只允许http/https
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return { valid: false, error: '只支持HTTP/HTTPS协议' };
		}

		// 2. 检查内网IP
		const hostname = parsed.hostname;
		const isPrivate = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname);
		if (isPrivate) {
			return { valid: false, error: '不允许内网地址' };
		}

		// 3. 检查localhost
		if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '127.0.0.1') {
			return { valid: false, error: '不允许localhost' };
		}

		return { valid: true };
	} catch {
		return { valid: false, error: '无效的URL格式' };
	}
}

/**
 * 验证溯源是否可以发布
 * @param trace 溯源对象
 * @returns {object} 验证结果
 */
export function validateTraceForPublish(trace: {
	body: string;
	citations: any[];
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// 验证正文长度
	if (!trace.body || trace.body.trim().length < TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.BODY_MIN_LENGTH) {
		errors.push(`正文至少需要${TRACE_PROCESSING_CONFIG.CONTENT_LIMITS.BODY_MIN_LENGTH}字`);
	}

	// 验证引用数量
	if (!trace.citations || trace.citations.length === 0) {
		errors.push('至少需要一个引用');
	}

	// 验证引用格式
	if (trace.citations) {
		trace.citations.forEach((citation, idx) => {
			if (!citation.title || citation.title.trim() === '') {
				errors.push(`引用${idx + 1}缺少标题`);
			}
			if (!citation.url && !citation.publisher) {
				errors.push(`引用${idx + 1}缺少来源（URL或出版机构）`);
			}
			if (citation.url) {
				const urlValidation = validateCitationUrl(citation.url);
				if (!urlValidation.valid) {
					errors.push(`引用${idx + 1}的URL无效：${urlValidation.error}`);
				}
			}
		});
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

