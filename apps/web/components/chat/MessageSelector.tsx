'use client';

import Button from '@/components/ui/Button';

interface MessageSelectorProps {
	selectedCount: number;
	totalCount: number;
	maxLimit: number;
	onSelectAll: () => void;
	onClearSelection: () => void;
	onGenerate: () => void;
	onCancel: () => void;
}

export default function MessageSelector({
	selectedCount,
	totalCount,
	maxLimit,
	onSelectAll,
	onClearSelection,
	onGenerate,
	onCancel,
}: MessageSelectorProps) {
	return (
		<div
			style={{
				position: 'fixed',
				bottom: 0,
				left: 0,
				right: 0,
				background: 'var(--color-background-paper)',
				borderTop: '1px solid var(--color-border)',
				padding: 'var(--spacing-md)',
				boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
				zIndex: 1000,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 'var(--spacing-md)',
				flexWrap: 'wrap',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-sm)',
					flex: 1,
					minWidth: '200px',
				}}
			>
				<span
					style={{
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-secondary)',
					}}
				>
					已选择 {selectedCount} 条消息
				</span>
				{selectedCount >= maxLimit && (
					<span
						style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-warning)',
						}}
					>
						（最多 {maxLimit} 条）
					</span>
				)}
			</div>
			
			<div
				style={{
					display: 'flex',
					gap: 'var(--spacing-sm)',
					flexWrap: 'wrap',
				}}
			>
				<Button
					size="sm"
					variant="secondary"
					onClick={onSelectAll}
					disabled={selectedCount >= maxLimit}
				>
					全选
				</Button>
				<Button
					size="sm"
					variant="secondary"
					onClick={onClearSelection}
					disabled={selectedCount === 0}
				>
					清除
				</Button>
				<Button
					size="sm"
					variant="secondary"
					onClick={onCancel}
				>
					取消
				</Button>
				<Button
					size="sm"
					variant="primary"
					onClick={onGenerate}
					disabled={selectedCount === 0}
				>
					生成卡片 ({selectedCount})
				</Button>
			</div>
		</div>
	);
}










