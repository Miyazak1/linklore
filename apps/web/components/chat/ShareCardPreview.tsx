'use client';

import { useState, useRef } from 'react';
import ShareCardTemplate from './ShareCardTemplate';
import Button from '@/components/ui/Button';
import { generateShareCard } from './ShareCardGenerator';
import { THEME_CONFIGS } from '@/hooks/useShareCard';
import type { ShareCardMessage, ShareCardConfig, ShareError } from '@/types/share';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('ShareCardPreview');

interface ShareCardPreviewProps {
	messages: ShareCardMessage[];
	config: ShareCardConfig;
	onClose: () => void;
	onConfigChange: (config: ShareCardConfig) => void;
}

export default function ShareCardPreview({
	messages,
	config,
	onClose,
	onConfigChange,
}: ShareCardPreviewProps) {
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const cardRef = useRef<HTMLDivElement>(null);

	const handleDownload = async () => {
		if (!cardRef.current) {
			setError('卡片元素未找到');
			return;
		}

		setIsGenerating(true);
		setError(null);

		try {
			const blob = await generateShareCard(cardRef.current, config);

			// 创建下载链接
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `linklore-share-${Date.now()}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (err: any) {
			log.error('下载失败', err as Error);
			setError(err.message || '下载失败，请重试');
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.5)',
				backdropFilter: 'blur(4px)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000,
				padding: '20px',
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				style={{
					background: 'var(--color-background-paper)',
					borderRadius: '24px',
					width: '100%',
					maxWidth: '1200px',
					maxHeight: '90vh',
					display: 'flex',
					flexDirection: 'column',
					boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
					overflow: 'hidden',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* 头部 */}
				<div
					style={{
						padding: '24px',
						borderBottom: '1px solid var(--color-border)',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<h2
						style={{
							fontSize: 'var(--font-size-xl)',
							fontWeight: 600,
							margin: 0,
							color: 'var(--color-text-primary)',
						}}
					>
						预览分享卡片
					</h2>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							fontSize: '24px',
							cursor: 'pointer',
							color: 'var(--color-text-secondary)',
							padding: '4px 8px',
						}}
					>
						×
					</button>
				</div>

				{/* 内容区域 */}
				<div
					style={{
						flex: 1,
						display: 'flex',
						overflow: 'hidden',
					}}
				>
					{/* 左侧：编辑选项 */}
					<div
						style={{
							width: '300px',
							padding: '24px',
							borderRight: '1px solid var(--color-border)',
							overflowY: 'auto',
						}}
					>
						<div
							style={{
								marginBottom: '24px',
							}}
						>
							<label
								style={{
									display: 'block',
									fontSize: 'var(--font-size-sm)',
									fontWeight: 500,
									marginBottom: '8px',
									color: 'var(--color-text-primary)',
								}}
							>
								标题
							</label>
							<input
								type="text"
								value={config.title || ''}
								onChange={(e) =>
									onConfigChange({ ...config, title: e.target.value })
								}
								placeholder="精彩对话"
								style={{
									width: '100%',
									padding: '8px 12px',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-base)',
									background: 'var(--color-background)',
									color: 'var(--color-text-primary)',
								}}
							/>
						</div>

						<div
							style={{
								marginBottom: '24px',
							}}
						>
							<label
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									cursor: 'pointer',
								}}
							>
								<input
									type="checkbox"
									checked={config.showLogo}
									onChange={(e) =>
										onConfigChange({ ...config, showLogo: e.target.checked })
									}
								/>
								<span
									style={{
										fontSize: 'var(--font-size-sm)',
										color: 'var(--color-text-primary)',
									}}
								>
									显示 Logo
								</span>
							</label>
						</div>

						<div
							style={{
								marginBottom: '24px',
							}}
						>
							<label
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									cursor: 'pointer',
								}}
							>
								<input
									type="checkbox"
									checked={config.showWatermark}
									onChange={(e) =>
										onConfigChange({
											...config,
											showWatermark: e.target.checked,
										})
									}
								/>
								<span
									style={{
										fontSize: 'var(--font-size-sm)',
										color: 'var(--color-text-primary)',
									}}
								>
									显示水印
								</span>
							</label>
						</div>

						{/* 主题选择 */}
						<div
							style={{
								marginBottom: '24px',
							}}
						>
							<label
								style={{
									display: 'block',
									fontSize: 'var(--font-size-sm)',
									fontWeight: 500,
									marginBottom: '8px',
									color: 'var(--color-text-primary)',
								}}
							>
								主题风格
							</label>
							<select
								value={config.theme || 'default'}
								onChange={(e) => {
									const theme = e.target.value as ShareCardConfig['theme'];
									const themeConfig = THEME_CONFIGS[theme] || {};
									onConfigChange({
										...config,
										theme,
										...themeConfig,
									});
								}}
								style={{
									width: '100%',
									padding: '8px 12px',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-base)',
									background: 'var(--color-background)',
									color: 'var(--color-text-primary)',
									cursor: 'pointer',
								}}
							>
								<option value="default">默认</option>
								<option value="marxism">马克思主义主题</option>
								<option value="warm">温暖风格</option>
								<option value="minimal">极简风格</option>
							</select>
							{config.theme === 'marxism' && (
								<div
									style={{
										marginTop: '8px',
										padding: '8px',
										background: 'var(--color-background-subtle)',
										borderRadius: 'var(--radius-sm)',
										fontSize: '11px',
										color: 'var(--color-text-secondary)',
										lineHeight: '1.4',
									}}
								>
									适合理论讨论和深度思考，使用温暖的红棕色系配色
								</div>
							)}
						</div>
					</div>

					{/* 右侧：预览 */}
					<div
						style={{
							flex: 1,
							padding: '24px',
							overflow: 'auto',
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'flex-start',
							background: 'var(--color-background-subtle)',
							position: 'relative',
						}}
					>
						{/* 预览时缩小显示，生成时使用同一个元素但临时调整样式 */}
						<div
							ref={cardRef}
							style={{
								transform: 'scale(0.5)',
								transformOrigin: 'top center',
								transition: 'transform 0s', // 禁用过渡，避免生成时闪烁
							}}
						>
							<ShareCardTemplate messages={messages} config={config} />
						</div>
					</div>
				</div>

				{/* 底部：操作按钮 */}
				<div
					style={{
						padding: '24px',
						borderTop: '1px solid var(--color-border)',
						display: 'flex',
						justifyContent: 'flex-end',
						gap: '12px',
					}}
				>
					{error && (
						<div
							style={{
								flex: 1,
								padding: '8px 12px',
								background: 'var(--color-error)',
								color: 'white',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-sm)',
							}}
						>
							{error}
						</div>
					)}
					<Button variant="secondary" onClick={onClose} disabled={isGenerating}>
						取消
					</Button>
					<Button variant="primary" onClick={handleDownload} disabled={isGenerating}>
						{isGenerating ? '生成中...' : '下载图片'}
					</Button>
				</div>
			</div>
		</div>
	);
}

