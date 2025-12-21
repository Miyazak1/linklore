/**
 * 分享卡片工具函数
 */

import type { ShareCardMessage } from '@/types/share';

/**
 * 截断消息内容
 */
export function truncateMessage(content: string, maxLength: number): string {
	if (content.length <= maxLength) {
		return content;
	}
	return content.slice(0, maxLength) + '...';
}

/**
 * 过滤敏感信息（简单实现）
 */
export function filterSensitiveInfo(content: string): string {
	// 简单的邮箱和手机号过滤
	let filtered = content;
	
	// 过滤邮箱
	filtered = filtered.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***');
	
	// 过滤手机号（11位数字）
	filtered = filtered.replace(/\b1[3-9]\d{9}\b/g, '***-****-****');
	
	return filtered;
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);
	
	if (minutes < 1) return '刚刚';
	if (minutes < 60) return `${minutes}分钟前`;
	if (hours < 24) return `${hours}小时前`;
	if (days < 7) return `${days}天前`;
	
	return date.toLocaleDateString('zh-CN', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/**
 * 压缩图片（使用 Canvas API）
 */
export function compressImage(
	canvas: HTMLCanvasElement,
	quality: number = 0.9,
	maxSizeMB: number = 2
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('图片生成失败'));
					return;
				}
				
				const sizeMB = blob.size / (1024 * 1024);
				if (sizeMB <= maxSizeMB) {
					resolve(blob);
					return;
				}
				
				// 如果图片太大，降低质量重试
				if (quality > 0.5) {
					compressImage(canvas, quality - 0.1, maxSizeMB).then(resolve).catch(reject);
				} else {
					// 如果质量已经很低，直接返回
					resolve(blob);
				}
			},
			'image/png',
			quality
		);
	});
}










