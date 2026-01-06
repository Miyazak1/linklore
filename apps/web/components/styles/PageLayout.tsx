/**
 * PageLayout - 页面布局组件
 * 提供统一的页面布局结构
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon } from '@/components/ui/Icons';

export interface PageLayoutProps {
	/** 页面标题 */
	title: string;
	/** 副标题 */
	subtitle?: string;
	/** 返回按钮的 URL */
	backUrl?: string;
	/** 返回按钮的点击回调（优先级高于 backUrl） */
	onBack?: () => void;
	/** 页面内容 */
	children: React.ReactNode;
	/** 右侧面板内容 */
	rightPanel?: React.ReactNode;
	/** 额外的类名 */
	className?: string;
	/** 是否显示返回按钮 */
	showBackButton?: boolean;
}

/**
 * 页面布局组件
 * 
 * @example
 * <PageLayout
 *   title="创建游戏"
 *   subtitle="填写游戏信息"
 *   backUrl="/workshop"
 *   rightPanel={<ModulePanel />}
 * >
 *   <form>...</form>
 * </PageLayout>
 */
export function PageLayout({
	title,
	subtitle,
	backUrl,
	onBack,
	children,
	rightPanel,
	className,
	showBackButton = true
}: PageLayoutProps) {
	const router = useRouter();

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else if (backUrl) {
			router.push(backUrl);
		}
	};

	return (
		<main
			className={`page-container ${className || ''}`}
			style={rightPanel ? { paddingRight: '360px' } : undefined}
		>
			{/* 右侧面板 */}
			{rightPanel && (
				<div style={{
					position: 'absolute',
					right: 0,
					top: 0,
					width: '340px',
					height: '100%'
				}}>
					{rightPanel}
				</div>
			)}

			{/* 页面标题区域 */}
			<div className="page-header">
				{showBackButton && (backUrl || onBack) && (
					<button
						type="button"
						onClick={handleBack}
						className="back-button"
					>
						<ChevronLeftIcon size={20} color="var(--color-text-primary)" />
					</button>
				)}
				<h1 className="page-title">{title}</h1>
				{subtitle && <p className="page-subtitle">{subtitle}</p>}
			</div>

			{/* 页面内容 */}
			{children}
		</main>
	);
}


