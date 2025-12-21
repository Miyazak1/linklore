'use client';

import { useState, useEffect, useCallback } from 'react';
import { getNextNode, isPathComplete } from '@/lib/games/daily-issue/decisionTree';
import type { DecisionTree, IssueNode, PathStep } from '@/types/daily-issue';
import ProgressIndicator from './ProgressIndicator';
import StageNode from './StageNode';

interface IssueGameProps {
	issueId: string;
	tree: DecisionTree;
	initialPath?: PathStep[];
	onPathUpdate?: (path: PathStep[]) => void;
	onComplete?: (path: PathStep[]) => void;
}

/**
 * 主游戏组件
 * 管理游戏状态，处理用户选择，渲染当前阶段
 */
export default function IssueGame({
	issueId,
	tree,
	initialPath = [],
	onPathUpdate,
	onComplete
}: IssueGameProps) {
	const [currentNode, setCurrentNode] = useState<IssueNode | null>(
		tree.rootNode
	);
	const [path, setPath] = useState<PathStep[]>(initialPath);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 初始化：如果有初始路径，恢复状态
	useEffect(() => {
		if (initialPath.length > 0) {
			const lastStep = initialPath[initialPath.length - 1];
			const lastNode = tree.nodes.get(lastStep.nodeKey);
			if (lastNode) {
				setCurrentNode(lastNode);
			}
		}
	}, [initialPath, tree]);

	// 处理用户选择
	const handleSelect = useCallback(
		async (selectedNodeKey: string) => {
			if (!currentNode || isSubmitting) return;

			try {
				setIsSubmitting(true);

				// 获取下一节点
				const nextNode = getNextNode(tree, currentNode.nodeKey, selectedNodeKey);
				if (!nextNode) {
					throw new Error('Invalid next node');
				}

				// 添加当前选择到路径
				const newStep: PathStep = {
					stage: currentNode.stage,
					nodeKey: currentNode.nodeKey,
					selectedAt: new Date().toISOString()
				};

				const newPath = [...path, newStep];
				setPath(newPath);

				// 通知父组件路径更新
				onPathUpdate?.(newPath);

				// 保存路径到服务器
				try {
					await fetch('/api/games/daily-issue/path', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							issueId,
							path: newPath
						})
					});
				} catch (error) {
					console.error('Failed to save path:', error);
				}

				// 检查是否完成
				if (isPathComplete(tree, newPath) || nextNode.stage === 5) {
					// 添加最后一个节点到路径
					const finalPath = [
						...newPath,
						{
							stage: nextNode.stage,
							nodeKey: nextNode.nodeKey,
							selectedAt: new Date().toISOString()
						}
					];
					setPath(finalPath);
					onPathUpdate?.(finalPath);
					onComplete?.(finalPath);
				} else {
					// 移动到下一节点
					setCurrentNode(nextNode);
				}
			} catch (error) {
				console.error('Error handling selection:', error);
				alert('选择失败，请重试');
			} finally {
				setIsSubmitting(false);
			}
		},
		[currentNode, tree, path, issueId, isSubmitting, onPathUpdate, onComplete]
	);

	if (!currentNode) {
		return (
			<div style={{ padding: '24px', textAlign: 'center' }}>
				加载中...
			</div>
		);
	}

	return (
		<div>
			<ProgressIndicator
				currentStage={currentNode.stage}
				totalStages={5}
			/>
			<StageNode
				node={currentNode}
				tree={tree}
				onSelect={handleSelect}
				isConfirming={isSubmitting}
			/>
		</div>
	);
}

