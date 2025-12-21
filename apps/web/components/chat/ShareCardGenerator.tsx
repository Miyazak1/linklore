'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import ShareCardTemplate from './ShareCardTemplate';
import type { ShareCardMessage, ShareCardConfig, ShareError } from '@/types/share';
import { compressImage } from '@/lib/utils/shareCard';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('ShareCardGenerator');

interface ShareCardGeneratorProps {
	messages: ShareCardMessage[];
	config: ShareCardConfig;
	onError: (error: ShareError) => void;
	onSuccess: (blob: Blob) => void;
}

export default function ShareCardGenerator({
	messages,
	config,
	onError,
	onSuccess,
}: ShareCardGeneratorProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const [isGenerating, setIsGenerating] = useState(false);

	const generateImage = async () => {
		if (!cardRef.current) {
			onError(ShareError.GENERATION_FAILED);
			return;
		}

		if (messages.length === 0) {
			onError(ShareError.NO_MESSAGES_SELECTED);
			return;
		}

		if (messages.length > config.messageLimit) {
			onError(ShareError.TOO_MANY_MESSAGES);
			return;
		}

		setIsGenerating(true);

		try {
			// 使用 html2canvas 生成图片
			const canvas = await html2canvas(cardRef.current, {
				width: 1080,
				height: 1440,
				scale: 2, // 2x 分辨率，更清晰
				backgroundColor: config.backgroundColor,
				useCORS: true,
				logging: false,
				allowTaint: false,
				fontEmbedCSS: true, // 嵌入字体 CSS
				foreignObjectRendering: false, // 禁用 foreignObject 渲染，提高兼容性
				letterRendering: true, // 启用字母渲染，改善文字质量
			});

			// 压缩图片
			const blob = await compressImage(canvas, 0.9, 2);
			onSuccess(blob);
		} catch (error: any) {
			log.error('生成图片失败', error as Error);
			onError(ShareError.GENERATION_FAILED);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
			<ShareCardTemplate ref={cardRef} messages={messages} config={config} />
			{isGenerating && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0,0,0,0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 10000,
					}}
				>
					<div
						style={{
							background: 'var(--color-background-paper)',
							padding: '24px',
							borderRadius: '8px',
							textAlign: 'center',
						}}
					>
						<div
							style={{
								width: 40,
								height: 40,
								border: '3px solid var(--color-border)',
								borderTopColor: 'var(--color-primary)',
								borderRadius: '50%',
								animation: 'spin 1s linear infinite',
								margin: '0 auto 16px',
							}}
						/>
						<p>正在生成图片...</p>
					</div>
				</div>
			)}
		</div>
	);
}

// 导出生成函数供外部调用
export async function generateShareCard(
	element: HTMLElement,
	config: ShareCardConfig
): Promise<Blob> {
	// 保存原始样式（包括计算后的样式）
	const computedStyle = window.getComputedStyle(element);
	const originalStyle = {
		position: element.style.position || computedStyle.position,
		left: element.style.left || computedStyle.left,
		top: element.style.top || computedStyle.top,
		transform: element.style.transform || computedStyle.transform,
		width: element.style.width || computedStyle.width,
		height: element.style.height || computedStyle.height,
		zIndex: element.style.zIndex || computedStyle.zIndex,
		opacity: element.style.opacity || computedStyle.opacity,
		visibility: element.style.visibility || computedStyle.visibility,
	};
	
	// 确保元素有正确的尺寸（1080x1440）
	const targetWidth = 1080;
	const targetHeight = 1440;
	
	// 关键：html2canvas 需要元素在文档中且完全可见
	// 方法：使用 position: fixed，将元素移到屏幕外但保持可见
	// 注意：不能使用 visibility: hidden 或 display: none
	
	// 1. 先移除缩放，恢复原始尺寸
	element.style.transform = 'none';
	element.style.width = `${targetWidth}px`;
	element.style.height = `${targetHeight}px`;
	
	// 2. 使用 fixed 定位，移到屏幕外（但保持可见）
	element.style.position = 'fixed';
	element.style.left = '0';
	element.style.top = '0';
	element.style.zIndex = '9999';
	element.style.opacity = '1';
	element.style.visibility = 'visible';
	
	// 3. 使用 transform 将元素移到屏幕外（这样 html2canvas 仍能捕获）
	element.style.transform = 'translateX(-200%)';
	
	// 等待字体加载
	if (document.fonts && document.fonts.ready) {
		await document.fonts.ready;
	}
	
	// 等待渲染完成（使用 requestAnimationFrame 确保 DOM 更新）
	await new Promise(resolve => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				setTimeout(resolve, 200);
			});
		});
	});
	
	try {
		// 调试：检查元素内容和编码
		const textContent = element.textContent || '';
		log.debug('生成图片，元素内容', { preview: textContent.substring(0, 100) });
		log.debug('文本编码检查', {
			length: textContent.length,
			hasChinese: /[\u4e00-\u9fa5]/.test(textContent),
			firstChars: Array.from(textContent.substring(0, 10)).map(c => c.charCodeAt(0))
		});
		
		// 等待样式应用
		await new Promise(resolve => requestAnimationFrame(resolve));
		
		// 检查元素状态
		const rect = element.getBoundingClientRect();
		log.debug('元素状态', {
			width: rect.width,
			height: rect.height,
			left: rect.left,
			top: rect.top,
			visible: rect.width > 0 && rect.height > 0,
			computedStyle: {
				position: window.getComputedStyle(element).position,
				visibility: window.getComputedStyle(element).visibility,
				opacity: window.getComputedStyle(element).opacity,
			}
		});
		
		// 如果元素尺寸为0，说明元素不可见，需要调整
		if (rect.width === 0 || rect.height === 0) {
			log.warn('元素不可见，尝试修复');
			// 尝试将元素移到视口内（但用户看不到的位置）
			element.style.left = '0';
			element.style.top = '0';
			element.style.transform = 'translateX(-200%)'; // 移到屏幕外
			// 再次等待
			await new Promise(resolve => {
				requestAnimationFrame(() => {
					setTimeout(resolve, 100);
				});
			});
			
			// 再次检查
			const newRect = element.getBoundingClientRect();
			log.debug('修复后元素状态', {
				width: newRect.width,
				height: newRect.height,
			});
		}
		
		const canvas = await html2canvas(element, {
			width: targetWidth,
			height: targetHeight,
			scale: 2,
			backgroundColor: config.backgroundColor,
			useCORS: true,
			logging: true, // 临时启用日志以便调试
			allowTaint: false,
			removeContainer: false,
			imageTimeout: 15000,
			onclone: (clonedDoc: Document) => {
				// 在克隆的文档中确保字体和文本方向正确
				const clonedElement = clonedDoc.querySelector('[data-share-card]') || clonedDoc.body.firstElementChild;
				if (clonedElement) {
					// 设置根元素
					if (clonedElement instanceof HTMLElement) {
						clonedElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Microsoft YaHei", "SimHei", "SimSun", sans-serif';
						clonedElement.style.direction = 'ltr';
						clonedElement.style.unicodeBidi = 'normal';
						clonedElement.setAttribute('lang', 'zh-CN');
						clonedElement.setAttribute('dir', 'ltr');
					}
					
					// 设置所有子元素
					const allElements = clonedElement.querySelectorAll('*');
					allElements.forEach((el: Element) => {
						const htmlEl = el as HTMLElement;
						if (htmlEl.style) {
							// 强制设置字体，确保中文字体可用
							htmlEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Microsoft YaHei", "SimHei", "SimSun", sans-serif';
							htmlEl.style.direction = 'ltr';
							htmlEl.style.unicodeBidi = 'normal';
						}
					});
					
					// 确保文档的字符编码和元数据
					if (clonedDoc.documentElement) {
						clonedDoc.documentElement.setAttribute('lang', 'zh-CN');
						clonedDoc.documentElement.setAttribute('dir', 'ltr');
						// 设置字符编码
						const metaCharset = clonedDoc.querySelector('meta[charset]');
						if (!metaCharset) {
							const meta = clonedDoc.createElement('meta');
							meta.setAttribute('charset', 'UTF-8');
							clonedDoc.head.insertBefore(meta, clonedDoc.head.firstChild);
						}
					}
					
					// 确保 body 也有正确的设置
					if (clonedDoc.body) {
						clonedDoc.body.setAttribute('lang', 'zh-CN');
						clonedDoc.body.setAttribute('dir', 'ltr');
					}
				}
			},
		});

		const blob = await compressImage(canvas, 0.9, 2);
		
		// 检查生成的图片是否为空
		if (canvas.width === 0 || canvas.height === 0) {
			throw new Error('生成的图片尺寸为0，可能是元素不可见');
		}
		
		// 检查 canvas 是否有内容（简单的像素检查）
		const ctx = canvas.getContext('2d');
		if (ctx) {
			const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
			const hasContent = imageData.data.some((pixel, index) => index % 4 !== 3 && pixel !== 0);
			if (!hasContent) {
				log.warn('警告：生成的图片可能为空');
			}
		}
		
		return blob;
	} finally {
		// 恢复原始样式
		element.style.position = originalStyle.position || '';
		element.style.left = originalStyle.left || '';
		element.style.top = originalStyle.top || '';
		element.style.transform = originalStyle.transform || '';
		element.style.width = originalStyle.width || '';
		element.style.height = originalStyle.height || '';
		element.style.zIndex = originalStyle.zIndex || '';
		element.style.opacity = originalStyle.opacity || '';
		element.style.visibility = '';
	}
}

