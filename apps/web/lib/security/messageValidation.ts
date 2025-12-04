/**
 * 消息内容验证和安全处理
 */

import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

// 消息内容验证 Schema（允许空内容用于 AI_SUGGESTION）
export const MessageContentSchema = z
	.string()
	.max(10000, '消息长度不能超过 10000 字符')
	.refine(
		(text) => {
			// 检查 Markdown 代码块是否平衡
			const codeBlockMatches = text.match(/```/g);
			return !codeBlockMatches || codeBlockMatches.length % 2 === 0;
		},
		'代码块未正确闭合'
	)
	.refine(
		(text) => {
			// 检查是否包含危险脚本
			const dangerousPatterns = [
				/<script/i,
				/javascript:/i,
				/on\w+\s*=/i, // 事件处理器
				/data:text\/html/i
			];
			return !dangerousPatterns.some((pattern) => pattern.test(text));
		},
		'消息包含不安全内容'
	);

/**
 * 清理和验证消息内容
 */
export function sanitizeMessageContent(content: string): string {
	// 先清理 HTML
	const cleaned = sanitizeHtml(content, {
		allowedTags: [
			'p',
			'br',
			'strong',
			'em',
			'code',
			'pre',
			'a',
			'ul',
			'ol',
			'li',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'blockquote'
		],
		allowedAttributes: {
			a: ['href', 'title', 'target']
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		allowedSchemesByTag: {
			a: ['http', 'https', 'mailto']
		}
	});

	// 限制链接数量（防止垃圾链接）
	const linkCount = (cleaned.match(/<a /g) || []).length;
	if (linkCount > 5) {
		throw new Error('消息包含过多链接（最多 5 个）');
	}

	return cleaned;
}

/**
 * 验证消息内容
 */
export function validateMessageContent(content: string): void {
	MessageContentSchema.parse(content);
}

/**
 * 处理消息内容（验证 + 清理）
 * @param allowEmpty 是否允许空内容（用于 AI_SUGGESTION）
 */
export function processMessageContent(
	content: string,
	allowEmpty: boolean = false
): string {
	if (!allowEmpty) {
		validateMessageContent(content);
	}
	if (!content.trim()) {
		return ''; // 允许空内容
	}
	return sanitizeMessageContent(content);
}

