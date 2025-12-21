'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { buildTree } from '@/lib/games/daily-issue/decisionTree';
import { generateResult } from '@/lib/games/daily-issue/resultGenerator';
import type { DecisionTree, PathStep, ResultTemplate, IssueNode } from '@/types/daily-issue';
import IssueGame from '@/components/games/daily-issue/IssueGame';
import ResultPage from '@/components/games/daily-issue/ResultPage';
import ChatPageLoader from '@/components/ui/ChatPageLoader';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueGamePage');

/**
 * 游戏页面
 * 决策树交互界面，阶段进度显示，选择确认机制，结果页展示
 */
export default function DailyIssueGamePage() {
	const router = useRouter();
	const params = useParams();
	const date = params?.date as string;

	const [loading, setLoading] = useState(true);
	const [tree, setTree] = useState<DecisionTree | null>(null);
	const [path, setPath] = useState<PathStep[]>([]);
	const [result, setResult] = useState<ResultTemplate | null>(null);
	const [isCompleted, setIsCompleted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (date) {
			loadIssue(date);
		}
	}, [date]);

	const loadIssue = async (targetDate: string) => {
		try {
			setLoading(true);
			setError(null);

			// 获取议题数据
			const res = await fetch(`/api/games/daily-issue/${targetDate}`);
			if (!res.ok) {
				throw new Error('获取议题失败');
			}

			const data = await res.json();
			if (!data.success) {
				throw new Error(data.error || '获取议题失败');
			}

			// 从API数据构建决策树
			const nodesMap = new Map<string, IssueNode>();
			let rootNode: IssueNode | null = null;

			for (const nodeData of data.data.tree.nodes) {
				const node: IssueNode = {
					id: nodeData.id,
					issueId: data.data.issue.id,
					stage: nodeData.stage,
					nodeKey: nodeData.nodeKey,
					title: nodeData.title,
					content: nodeData.content,
					parentNodeKey: nodeData.parentNodeKey,
					nextNodeKeys: Array.isArray(nodeData.nextNodeKeys)
						? nodeData.nextNodeKeys
						: typeof nodeData.nextNodeKeys === 'string'
							? JSON.parse(nodeData.nextNodeKeys)
							: [],
					isRoot: nodeData.isRoot,
					order: nodeData.order
				};

				nodesMap.set(node.nodeKey, node);

				if (node.isRoot) {
					rootNode = node;
				}
			}

			if (!rootNode) {
				throw new Error('未找到根节点');
			}

			const issueTree: DecisionTree = {
				issue: {
					id: data.data.issue.id,
					date: data.data.issue.date,
					title: data.data.issue.title,
					caseDescription: data.data.issue.caseDescription,
					status: data.data.issue.status,
					difficulty: data.data.issue.difficulty,
					category: data.data.issue.category,
					createdAt: new Date(),
					updatedAt: new Date()
				},
				nodes: nodesMap,
				rootNode
			};

			setTree(issueTree);

			// 尝试加载已有路径
			// TODO: 从API加载用户已有路径
		} catch (error: any) {
			log.error('加载议题失败', error as Error);
			setError(error.message || '加载失败');
		} finally {
			setLoading(false);
		}
	};

	const handlePathUpdate = useCallback((newPath: PathStep[]) => {
		setPath(newPath);
	}, []);

	const handleComplete = useCallback(async (finalPath: PathStep[]) => {
		if (!tree) return;

		try {
			// 生成结果页
			const resultData = await generateResult(tree.issue.id, finalPath);
			setResult(resultData);
			setIsCompleted(true);
		} catch (error: any) {
			log.error('生成结果失败', error as Error);
			alert('生成结果失败，请重试');
		}
	}, [tree]);

	const handleRestart = () => {
		setPath([]);
		setResult(null);
		setIsCompleted(false);
		// 重新加载议题以重置状态
		if (date) {
			loadIssue(date);
		}
	};

	if (loading) {
		return (
			<ChatPageLoader
				message="加载中..."
				subMessage="正在准备思考游戏"
			/>
		);
	}

	if (error || !tree) {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					minHeight: '60vh',
					padding: '24px'
				}}
			>
				<div
					style={{
						padding: '24px',
						background: 'var(--color-background-secondary)',
						borderRadius: '8px',
						maxWidth: '500px',
						textAlign: 'center'
					}}
				>
					<p style={{ color: 'var(--color-text)', marginBottom: '16px' }}>
						{error || '加载失败'}
					</p>
					<button
						onClick={() => router.push('/games/daily-issue')}
						style={{
							padding: '12px 24px',
							background: 'var(--color-primary)',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							color: 'white',
							fontSize: '14px'
						}}
					>
						返回首页
					</button>
				</div>
			</div>
		);
	}

	if (isCompleted && result) {
		return (
			<ResultPage
				result={result}
				path={path}
				onRestart={handleRestart}
			/>
		);
	}

	return (
		<div
			style={{
				maxWidth: '800px',
				margin: '0 auto',
				padding: '24px'
			}}
		>
			<IssueGame
				issueId={tree.issue.id}
				tree={tree}
				initialPath={path}
				onPathUpdate={handlePathUpdate}
				onComplete={handleComplete}
			/>
		</div>
	);
}

