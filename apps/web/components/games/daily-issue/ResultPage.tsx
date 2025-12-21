'use client';

import type { ResultTemplate, PathStep } from '@/types/daily-issue';

interface ResultPageProps {
	result: ResultTemplate;
	path: PathStep[];
	onRestart?: () => void;
	onViewAlternatives?: () => void;
}

/**
 * 结果页组件
 * 显示路径回放、权衡点描述、其他思路提示、开放式追问
 */
export default function ResultPage({
	result,
	path,
	onRestart,
	onViewAlternatives
}: ResultPageProps) {
	return (
		<div
			style={{
				padding: '24px',
				maxWidth: '800px',
				margin: '0 auto'
			}}
		>
			{/* 标题 */}
			<h2
				style={{
					fontSize: '24px',
					fontWeight: '600',
					color: 'var(--color-text)',
					marginBottom: '32px',
					textAlign: 'center'
				}}
			>
				你的思考路径
			</h2>

			{/* 路径回放 */}
			{result.pathSummary && (
				<div
					style={{
						padding: '20px',
						background: 'var(--color-background-secondary)',
						borderRadius: '8px',
						marginBottom: '24px'
					}}
				>
					<h3
						style={{
							fontSize: '16px',
							fontWeight: '600',
							color: 'var(--color-text)',
							marginBottom: '12px'
						}}
					>
						思考路径回放
					</h3>
					<p
						style={{
							fontSize: '14px',
							lineHeight: '1.6',
							color: 'var(--color-text-secondary)'
						}}
					>
						{result.pathSummary}
					</p>
				</div>
			)}

			{/* 核心权衡点 */}
			<div
				style={{
					padding: '20px',
					background: 'var(--color-background-secondary)',
					borderRadius: '8px',
					marginBottom: '24px',
					borderLeft: '4px solid var(--color-primary)'
				}}
			>
				<h3
					style={{
						fontSize: '16px',
						fontWeight: '600',
						color: 'var(--color-text)',
						marginBottom: '12px'
					}}
				>
					你的核心权衡点
				</h3>
				<p
					style={{
						fontSize: '14px',
						lineHeight: '1.6',
						color: 'var(--color-text)'
					}}
				>
					{result.tradeoff}
				</p>
			</div>

			{/* 其他思路 */}
			<div
				style={{
					padding: '20px',
					background: 'var(--color-background-secondary)',
					borderRadius: '8px',
					marginBottom: '24px'
				}}
			>
				<h3
					style={{
						fontSize: '16px',
						fontWeight: '600',
						color: 'var(--color-text)',
						marginBottom: '12px'
					}}
				>
					可能的另一种思路
				</h3>
				<p
					style={{
						fontSize: '14px',
						lineHeight: '1.6',
						color: 'var(--color-text-secondary)'
					}}
				>
					{result.alternative}
				</p>
			</div>

			{/* 开放式追问 */}
			<div
				style={{
					padding: '20px',
					background: 'var(--color-background-secondary)',
					borderRadius: '8px',
					marginBottom: '24px'
				}}
			>
				<h3
					style={{
						fontSize: '16px',
						fontWeight: '600',
						color: 'var(--color-text)',
						marginBottom: '12px'
					}}
				>
					继续思考
				</h3>
				<p
					style={{
						fontSize: '14px',
						lineHeight: '1.6',
						color: 'var(--color-text)'
					}}
				>
					{result.question}
				</p>
			</div>

			{/* 操作按钮 */}
			<div
				style={{
					display: 'flex',
					gap: '12px',
					justifyContent: 'center',
					marginTop: '32px'
				}}
			>
				{onRestart && (
					<button
						onClick={onRestart}
						style={{
							padding: '12px 24px',
							background: 'var(--color-primary)',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '14px',
							color: 'white',
							fontWeight: '500'
						}}
					>
						重新思考
					</button>
				)}
				{onViewAlternatives && (
					<button
						onClick={onViewAlternatives}
						style={{
							padding: '12px 24px',
							background: 'var(--color-background-secondary)',
							border: '1px solid var(--color-border)',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '14px',
							color: 'var(--color-text)'
						}}
					>
						查看其他路径
					</button>
				)}
			</div>
		</div>
	);
}

