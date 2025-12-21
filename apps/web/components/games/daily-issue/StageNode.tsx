'use client';

import { useState } from 'react';
import type { IssueNode, DecisionTree } from '@/types/daily-issue';

interface StageNodeProps {
	node: IssueNode;
	tree?: DecisionTree; // 用于获取选项节点内容
	onSelect: (nodeKey: string) => void;
	isConfirming?: boolean;
}

/**
 * 单个阶段节点组件
 * 显示问题和选项，处理选择逻辑
 */
export default function StageNode({
	node,
	tree,
	onSelect,
	isConfirming = false
}: StageNodeProps) {
	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [showConfirm, setShowConfirm] = useState(false);

	// 如果是阶段0（案例呈现），没有选项，直接显示内容
	if (node.stage === 0) {
		return (
			<div
				style={{
					padding: '24px',
					background: 'var(--color-background-secondary)',
					borderRadius: '8px',
					marginBottom: '24px'
				}}
			>
				<div
					style={{
						fontSize: '16px',
						lineHeight: '1.6',
						color: 'var(--color-text)',
						whiteSpace: 'pre-wrap'
					}}
				>
					{node.content}
				</div>
			</div>
		);
	}

	// 解析选项（从nextNodeKeys获取，并获取选项节点内容）
	const options = (node.nextNodeKeys || []).map((optionKey) => {
		const optionNode = tree?.nodes.get(optionKey);
		return {
			key: optionKey,
			title: optionNode?.title || optionKey,
			content: optionNode?.content || optionKey
		};
	});

	const handleOptionClick = (optionKey: string) => {
		setSelectedOption(optionKey);
		setShowConfirm(true);
	};

	const handleConfirm = () => {
		if (selectedOption) {
			onSelect(selectedOption);
			setShowConfirm(false);
			setSelectedOption(null);
		}
	};

	const handleCancel = () => {
		setShowConfirm(false);
		setSelectedOption(null);
	};

	return (
		<div
			style={{
				padding: '24px',
				background: 'var(--color-background-secondary)',
				borderRadius: '8px',
				marginBottom: '24px'
			}}
		>
			{/* 问题标题 */}
			<div
				style={{
					fontSize: '18px',
					fontWeight: '600',
					color: 'var(--color-text)',
					marginBottom: '20px'
				}}
			>
				{node.title}
			</div>

			{/* 选项列表 */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '12px'
				}}
			>
				{options.map((option, index) => {
					const isSelected = selectedOption === option.key;

					return (
						<button
							key={option.key}
							onClick={() => handleOptionClick(option.key)}
							disabled={isConfirming || showConfirm}
							style={{
								padding: '16px',
								background: isSelected
									? 'var(--color-primary-light)'
									: 'var(--color-background)',
								border:
									isSelected
										? '2px solid var(--color-primary)'
										: '1px solid var(--color-border)',
								borderRadius: '6px',
								cursor: isConfirming || showConfirm ? 'not-allowed' : 'pointer',
								textAlign: 'left',
								fontSize: '14px',
								color: 'var(--color-text)',
								transition: 'all 0.2s',
								opacity: isConfirming || showConfirm ? 0.6 : 1
							}}
							onMouseEnter={(e) => {
								if (!isConfirming && !showConfirm && !isSelected) {
									e.currentTarget.style.background =
										'var(--color-background-hover)';
								}
							}}
							onMouseLeave={(e) => {
								if (!isConfirming && !showConfirm && !isSelected) {
									e.currentTarget.style.background = 'var(--color-background)';
								}
							}}
						>
							{String.fromCharCode(65 + index)}. {option.content}
						</button>
					);
				})}
			</div>

			{/* 确认对话框 */}
			{showConfirm && selectedOption && (
				<div
					style={{
						marginTop: '20px',
						padding: '16px',
						background: 'var(--color-background)',
						border: '1px solid var(--color-border)',
						borderRadius: '6px'
					}}
				>
					<div
						style={{
							fontSize: '14px',
							color: 'var(--color-text-secondary)',
							marginBottom: '12px'
						}}
					>
						确定选择这个选项吗？
					</div>
					<div
						style={{
							display: 'flex',
							gap: '12px',
							justifyContent: 'flex-end'
						}}
					>
						<button
							onClick={handleCancel}
							style={{
								padding: '8px 16px',
								background: 'var(--color-background-secondary)',
								border: '1px solid var(--color-border)',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '14px',
								color: 'var(--color-text)'
							}}
						>
							取消
						</button>
						<button
							onClick={handleConfirm}
							style={{
								padding: '8px 16px',
								background: 'var(--color-primary)',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '14px',
								color: 'white'
							}}
						>
							确定
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

