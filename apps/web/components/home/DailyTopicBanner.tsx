'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getNextNode, isPathComplete, getNodesByStage } from '@/lib/games/daily-issue/decisionTree';
import type { DecisionTree, IssueNode, PathStep } from '@/types/daily-issue';
import { TargetIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons';

/**
 * 每日议题 Banner 组件
 * 在首页直接展示并可以进行游戏
 */
export default function DailyTopicBanner() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [issue, setIssue] = useState<any>(null);
	const [tree, setTree] = useState<DecisionTree | null>(null);
	const [currentNode, setCurrentNode] = useState<IssueNode | null>(null);
	const [path, setPath] = useState<PathStep[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [result, setResult] = useState<any>(null);

	useEffect(() => {
		loadTodayIssue();
	}, []);

	const loadTodayIssue = async () => {
		try {
			const res = await fetch('/api/games/daily-issue/current');
			const data = await res.json();
			
			console.log('API 响应:', {
				status: res.status,
				ok: res.ok,
				success: data.success,
				hasData: !!data.data,
				hasTree: !!data.data?.tree,
				hasRootNode: !!data.data?.tree?.rootNode
			});
			
			if (res.ok && data.success) {
				setIssue(data.data.issue);
				// 将 nodes 数组转换为 Map
				const treeData = data.data.tree;
				if (treeData) {
					const nodesMap = new Map<string, IssueNode>();
					if (Array.isArray(treeData.nodes)) {
						treeData.nodes.forEach((node: IssueNode) => {
							// 确保 nextNodeKeys 是数组
							if (node.nextNodeKeys && !Array.isArray(node.nextNodeKeys)) {
								try {
									node.nextNodeKeys = JSON.parse(node.nextNodeKeys as any);
								} catch {
									node.nextNodeKeys = [];
								}
							}
							nodesMap.set(node.nodeKey, node);
						});
					}
					// 确保 rootNode 从 nodesMap 中获取，以保持引用一致
					const rootNodeFromMap = treeData.rootNode 
						? nodesMap.get(treeData.rootNode.nodeKey) || treeData.rootNode
						: null;
					
					// 确保 rootNode 的 nextNodeKeys 是数组
					if (rootNodeFromMap) {
						if (rootNodeFromMap.nextNodeKeys && !Array.isArray(rootNodeFromMap.nextNodeKeys)) {
							try {
								rootNodeFromMap.nextNodeKeys = JSON.parse(rootNodeFromMap.nextNodeKeys as any);
							} catch {
								rootNodeFromMap.nextNodeKeys = [];
							}
						}
					}
					
					const processedTree: DecisionTree = {
						...treeData,
						nodes: nodesMap,
						rootNode: rootNodeFromMap
					};
					
					console.log('加载的决策树:', {
						rootNodeKey: rootNodeFromMap?.nodeKey,
						rootNodeNextNodeKeys: rootNodeFromMap?.nextNodeKeys,
						rootNodeNextNodeKeysType: typeof rootNodeFromMap?.nextNodeKeys,
						rootNodeNextNodeKeysIsArray: Array.isArray(rootNodeFromMap?.nextNodeKeys),
						totalNodes: nodesMap.size,
						allNodeKeys: Array.from(nodesMap.keys())
					});
					
					setTree(processedTree);
					// 设置根节点为当前节点
					if (rootNodeFromMap) {
						setCurrentNode(rootNodeFromMap);
					}
				}
			} else {
				// 如果今日没有已发布的议题，尝试获取最新的议题（包括draft）
				const today = getTodayDate();
				console.log('尝试通过日期获取议题:', today);
				const todayRes = await fetch(`/api/games/daily-issue/${today}`);
				const todayData = await todayRes.json();
				
				console.log('通过日期获取的 API 响应:', {
					status: todayRes.status,
					ok: todayRes.ok,
					success: todayData.success,
					hasData: !!todayData.data,
					hasTree: !!todayData.data?.tree
				});
				
				if (todayRes.ok && todayData.success) {
					setIssue(todayData.data.issue);
					// 将 nodes 数组转换为 Map
					const treeData = todayData.data.tree;
					if (treeData) {
						const nodesMap = new Map<string, IssueNode>();
						if (Array.isArray(treeData.nodes)) {
							treeData.nodes.forEach((node: IssueNode) => {
								// 确保 nextNodeKeys 是数组
								if (node.nextNodeKeys && !Array.isArray(node.nextNodeKeys)) {
									try {
										node.nextNodeKeys = JSON.parse(node.nextNodeKeys as any);
									} catch {
										node.nextNodeKeys = [];
									}
								}
								nodesMap.set(node.nodeKey, node);
							});
						}
						// 确保 rootNode 从 nodesMap 中获取，以保持引用一致
						const rootNodeFromMap = treeData.rootNode 
							? nodesMap.get(treeData.rootNode.nodeKey) || treeData.rootNode
							: null;
						
						// 确保 rootNode 的 nextNodeKeys 是数组
						if (rootNodeFromMap) {
							if (rootNodeFromMap.nextNodeKeys && !Array.isArray(rootNodeFromMap.nextNodeKeys)) {
								try {
									rootNodeFromMap.nextNodeKeys = JSON.parse(rootNodeFromMap.nextNodeKeys as any);
								} catch {
									rootNodeFromMap.nextNodeKeys = [];
								}
							}
						}
						
						const processedTree: DecisionTree = {
							...treeData,
							nodes: nodesMap,
							rootNode: rootNodeFromMap
						};
						
						console.log('加载的决策树（通过日期）:', {
							rootNodeKey: rootNodeFromMap?.nodeKey,
							rootNodeNextNodeKeys: rootNodeFromMap?.nextNodeKeys,
							rootNodeNextNodeKeysType: typeof rootNodeFromMap?.nextNodeKeys,
							rootNodeNextNodeKeysIsArray: Array.isArray(rootNodeFromMap?.nextNodeKeys),
							totalNodes: nodesMap.size,
							allNodeKeys: Array.from(nodesMap.keys())
						});
						
						setTree(processedTree);
						if (rootNodeFromMap) {
							setCurrentNode(rootNodeFromMap);
						}
					}
				} else {
					// 没有议题时，保持 issue 为 null，UI 会显示"今日暂无议题"
					// 这是正常情况，不需要报错
					console.log('今日暂无议题');
				}
			}
		} catch (error) {
			// 加载失败时，保持 issue 为 null，UI 会显示"今日暂无议题"
			// 这是正常情况，不需要报错
			console.log('加载议题时出现异常，将显示"今日暂无议题"');
		} finally {
			setLoading(false);
		}
	};

	// 获取今天的日期（YYYYMMDD格式）
	function getTodayDate(): string {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}${month}${day}`;
	}

	// 处理选项选择
	const handleSelect = async (selectedNodeKey: string) => {
		if (!currentNode || !tree || isSubmitting) return;

		try {
			setIsSubmitting(true);
			
			console.log('开始处理选择:', {
				currentNodeKey: currentNode.nodeKey,
				currentNodeStage: currentNode.stage,
				currentNodeIsOption: currentNode.nodeKey.includes('option'),
				selectedNodeKey,
				currentNodeNextNodeKeys: currentNode.nextNodeKeys
			});

			// 获取选项节点
			let optionNode: IssueNode | null = null;
			
			// 如果当前节点是选项节点，直接使用选择的选项节点
			if (currentNode.nodeKey.includes('option')) {
				// 当前节点是选项节点，用户选择的是另一个选项节点
				// 直接获取选择的选项节点
				optionNode = tree.nodes.get(selectedNodeKey) || null;
				if (!optionNode) {
					throw new Error(`选项节点不存在: ${selectedNodeKey}`);
				}
				console.log('当前节点是选项节点，直接获取选择的选项节点:', {
					optionNodeKey: optionNode.nodeKey,
					optionNodeStage: optionNode.stage,
					optionNodeNextNodeKeys: optionNode.nextNodeKeys
				});
			} else {
				// 当前节点是问题节点，通过 getNextNode 获取选项节点
				try {
					optionNode = getNextNode(tree, currentNode.nodeKey, selectedNodeKey);
					console.log('通过 getNextNode 获取选项节点:', {
						optionNodeKey: optionNode?.nodeKey,
						optionNodeStage: optionNode?.stage,
						optionNodeNextNodeKeys: optionNode?.nextNodeKeys
					});
				} catch (error) {
					console.error('getNextNode error:', error);
					console.error('Current node:', {
						nodeKey: currentNode.nodeKey,
						stage: currentNode.stage,
						nextNodeKeys: currentNode.nextNodeKeys,
						isOption: currentNode.nodeKey.includes('option')
					});
					console.error('Selected option key:', selectedNodeKey);
					console.error('Available nodes:', Array.from(tree.nodes.keys()));
					throw new Error(`无法获取选项节点: ${error instanceof Error ? error.message : String(error)}`);
				}
			}
			
			if (!optionNode) {
				console.error('Option node is null', {
					currentNode: currentNode.nodeKey,
					selectedNodeKey,
					nextNodeKeys: currentNode.nextNodeKeys
				});
				throw new Error('选项节点不存在');
			}

			// 添加当前选择到路径
			// 注意：路径必须从根节点（stage0）开始
			// 如果路径为空，先添加根节点
			let newPath = [...path];
			
			// 如果路径为空，添加根节点
			if (newPath.length === 0 && tree.rootNode) {
				newPath.push({
					stage: tree.rootNode.stage,
					nodeKey: tree.rootNode.nodeKey,
					selectedAt: new Date().toISOString()
				});
			}
			
			// 添加当前选择的选项节点到路径
			const newStep: PathStep = {
				stage: optionNode.stage,
				nodeKey: optionNode.nodeKey,
				selectedAt: new Date().toISOString()
			};

			newPath = [...newPath, newStep];
			setPath(newPath);
			
			console.log('添加到路径:', {
				nodeKey: optionNode.nodeKey,
				nodeStage: optionNode.stage,
				isOption: optionNode.nodeKey.includes('option'),
				pathLength: newPath.length,
				pathNodeKeys: newPath.map(s => s.nodeKey),
				hasRootNode: newPath.length > 0 && newPath[0].nodeKey === tree.rootNode?.nodeKey
			});

			// 保存路径到服务器
			try {
				await fetch('/api/games/daily-issue/path', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						issueId: issue.id,
						path: newPath
					})
				});
			} catch (error) {
				console.error('Failed to save path:', error);
			}

			// 选项节点应该指向下一个问题节点
			// 如果选项节点有 nextNodeKeys，获取下一个问题节点
			let nextQuestionNode: IssueNode | null = null;
			if (optionNode.nextNodeKeys && optionNode.nextNodeKeys.length > 0) {
				// 选项节点指向下一个问题节点（通常只有一个）
				const nextQuestionKey = optionNode.nextNodeKeys[0];
				nextQuestionNode = tree.nodes.get(nextQuestionKey) || null;
				
				console.log('查找下一个问题节点:', {
					optionNodeKey: optionNode.nodeKey,
					nextQuestionKey,
					nextQuestionNodeFound: !!nextQuestionNode,
					nextQuestionNodeKey: nextQuestionNode?.nodeKey,
					nextQuestionNodeStage: nextQuestionNode?.stage,
					nextQuestionNodeIsOption: nextQuestionNode?.nodeKey.includes('option')
				});
				
				if (!nextQuestionNode) {
					console.error('Next question node not found', {
						optionNode: optionNode.nodeKey,
						nextQuestionKey,
						availableNodes: Array.from(tree.nodes.keys())
					});
				} else if (nextQuestionNode.nodeKey.includes('option')) {
					// 如果下一个节点也是选项节点，继续查找它指向的问题节点
					console.warn('下一个节点也是选项节点，继续查找问题节点');
					if (nextQuestionNode.nextNodeKeys && nextQuestionNode.nextNodeKeys.length > 0) {
						const actualNextKey = nextQuestionNode.nextNodeKeys[0];
						const actualNextNode = tree.nodes.get(actualNextKey);
						if (actualNextNode && !actualNextNode.nodeKey.includes('option')) {
							nextQuestionNode = actualNextNode;
							console.log('找到实际的问题节点:', {
								nodeKey: nextQuestionNode.nodeKey,
								stage: nextQuestionNode.stage
							});
						}
					}
				}
			} else {
				console.warn('Option node has no nextNodeKeys', {
					optionNode: optionNode.nodeKey,
					stage: optionNode.stage
				});
			}

			// 如果没有下一个问题节点，检查是否完成
			if (!nextQuestionNode) {
				// 检查选项节点是否是最后一个节点（阶段5）
				if (optionNode.stage === 5 || !optionNode.nextNodeKeys || optionNode.nextNodeKeys.length === 0) {
					// 游戏完成，获取结果
					// newPath 已经包含了当前选项节点，不需要重复添加
					const finalPath = newPath;
					
					console.log('游戏完成，获取结果:', {
						finalPathLength: finalPath.length,
						finalPathNodeKeys: finalPath.map(s => s.nodeKey),
						lastNodeStage: finalPath[finalPath.length - 1]?.stage
					});
					
					try {
						const resultRes = await fetch('/api/games/daily-issue/result', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								issueId: issue.id,
								path: finalPath
							})
						});
						
						if (resultRes.ok) {
							const resultData = await resultRes.json();
							if (resultData.success) {
								setResult(resultData.data);
							} else {
								console.error('获取结果失败:', resultData.error);
								alert('获取结果失败：' + (resultData.error || '未知错误'));
							}
						} else {
							const errorData = await resultRes.json().catch(() => ({}));
							console.error('获取结果 API 错误:', {
								status: resultRes.status,
								error: errorData.error || errorData.message || '服务器错误'
							});
							alert('获取结果失败：' + (errorData.error || errorData.message || '服务器错误'));
						}
					} catch (error) {
						console.error('Failed to load result:', error);
						alert('获取结果失败：' + (error instanceof Error ? error.message : String(error)));
					}
				} else {
					// 选项节点有 nextNodeKeys 但找不到节点，可能是数据问题
					console.error('Next question node not found for option:', {
						optionNode: optionNode.nodeKey,
						nextNodeKeys: optionNode.nextNodeKeys,
						availableNodes: Array.from(tree.nodes.keys())
					});
				}
			} else {
				// 检查是否完成
				// 如果下一个问题节点是阶段5，或者路径已经完成，获取结果
				if (nextQuestionNode.stage === 5) {
					// 阶段5是最后一个阶段，游戏完成
					// newPath 已经包含了当前选项节点
					const finalPath = newPath;
					
					console.log('到达阶段5，游戏完成，获取结果:', {
						finalPathLength: finalPath.length,
						finalPathNodeKeys: finalPath.map(s => s.nodeKey),
						nextQuestionNodeKey: nextQuestionNode.nodeKey
					});
					
					try {
						const resultRes = await fetch('/api/games/daily-issue/result', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								issueId: issue.id,
								path: finalPath
							})
						});
						
						if (resultRes.ok) {
							const resultData = await resultRes.json();
							if (resultData.success) {
								setResult(resultData.data);
							} else {
								console.error('获取结果失败:', resultData.error);
								alert('获取结果失败：' + (resultData.error || '未知错误'));
							}
						} else {
							const errorData = await resultRes.json().catch(() => ({}));
							console.error('获取结果 API 错误:', {
								status: resultRes.status,
								error: errorData.error || errorData.message || '服务器错误'
							});
							alert('获取结果失败：' + (errorData.error || errorData.message || '服务器错误'));
						}
					} catch (error) {
						console.error('Failed to load result:', error);
						alert('获取结果失败：' + (error instanceof Error ? error.message : String(error)));
					}
				} else if (isPathComplete(tree, newPath)) {
					// 路径已经完成，获取结果
					console.log('路径完成，获取结果:', {
						finalPathLength: newPath.length,
						finalPathNodeKeys: newPath.map(s => s.nodeKey)
					});
					
					try {
						const resultRes = await fetch('/api/games/daily-issue/result', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								issueId: issue.id,
								path: newPath
							})
						});
						
						if (resultRes.ok) {
							const resultData = await resultRes.json();
							if (resultData.success) {
								setResult(resultData.data);
							} else {
								console.error('获取结果失败:', resultData.error);
								alert('获取结果失败：' + (resultData.error || '未知错误'));
							}
						} else {
							const errorData = await resultRes.json().catch(() => ({}));
							console.error('获取结果 API 错误:', {
								status: resultRes.status,
								error: errorData.error || errorData.message || '服务器错误'
							});
							alert('获取结果失败：' + (errorData.error || errorData.message || '服务器错误'));
						}
					} catch (error) {
						console.error('Failed to load result:', error);
						alert('获取结果失败：' + (error instanceof Error ? error.message : String(error)));
					}
				} else {
					// 进入下一个问题节点
					setCurrentNode(nextQuestionNode);
				}
			}
		} catch (error) {
			console.error('Failed to handle selection:', error);
			// 显示错误提示
			alert('选择失败，请重试。错误：' + (error instanceof Error ? error.message : String(error)));
		} finally {
			setIsSubmitting(false);
		}
	};

	// 返回上一个问题
	const handleGoBack = () => {
		if (path.length === 0 || !tree) return;
		
		// path 中存储的是问题节点，移除最后一步
		const newPath = path.slice(0, -1);
		setPath(newPath);

		// 找到上一个问题节点
		if (newPath.length === 0) {
			// 返回到根节点（阶段0）
			if (tree.rootNode) {
				setCurrentNode(tree.rootNode);
			}
		} else {
			// 获取上一个问题节点（path 中存储的都是问题节点）
			const lastStep = newPath[newPath.length - 1];
			const prevQuestionNode = tree.nodes.get(lastStep.nodeKey);
			if (prevQuestionNode) {
				setCurrentNode(prevQuestionNode);
			}
		}
		setResult(null);
	};

	// 获取当前节点的选项
	const getOptions = () => {
		if (!currentNode || !tree) return [];
		
		// 如果当前节点是选项节点（包含 "option"），需要找到同阶段的其他选项节点
		if (currentNode.nodeKey.includes('option')) {
			// 选项节点：找到同阶段的其他选项节点
			// 方法1：通过 parentNodeKey 找到问题节点，然后获取所有选项
			if (currentNode.parentNodeKey) {
				const parentQuestionNode = tree.nodes.get(currentNode.parentNodeKey);
				if (parentQuestionNode && parentQuestionNode.nextNodeKeys) {
					// 问题节点的 nextNodeKeys 指向所有选项节点
					return parentQuestionNode.nextNodeKeys.map((optionKey) => {
						const optionNode = tree.nodes.get(optionKey);
						return {
							key: optionKey,
							title: optionNode?.title || optionKey,
							content: optionNode?.content || optionNode?.title || optionKey
						};
					}).filter(opt => opt.key);
				}
			}
			
			// 方法2：如果 parentNodeKey 指向 stage0，从 rootNode 的 nextNodeKeys 获取所有选项
			if (currentNode.parentNodeKey && tree.rootNode) {
				const parentNode = tree.nodes.get(currentNode.parentNodeKey);
				if (parentNode && parentNode.stage === 0 && parentNode.nextNodeKeys) {
					// rootNode 的 nextNodeKeys 指向所有选项节点
					return parentNode.nextNodeKeys.map((optionKey) => {
						const optionNode = tree.nodes.get(optionKey);
						return {
							key: optionKey,
							title: optionNode?.title || optionKey,
							content: optionNode?.content || optionNode?.title || optionKey
						};
					}).filter(opt => opt.key);
				}
			}
			
			// 方法3：如果还是找不到，获取同阶段的所有选项节点
			const sameStageNodes = Array.from(tree.nodes.values())
				.filter(n => n.stage === currentNode.stage && n.nodeKey.includes('option'))
				.sort((a, b) => a.order - b.order);
			
			if (sameStageNodes.length > 0) {
				return sameStageNodes.map((optionNode) => ({
					key: optionNode.nodeKey,
					title: optionNode.title || optionNode.nodeKey,
					content: optionNode.content || optionNode.title || optionNode.nodeKey
				}));
			}
			
			// 如果找不到，返回空数组
			return [];
		}
		
		// 问题节点：从 nextNodeKeys 获取选项
		const nextNodeKeys = currentNode.nextNodeKeys || [];
		if (nextNodeKeys.length === 0) {
			console.warn('Current node has no nextNodeKeys', {
				nodeKey: currentNode.nodeKey,
				stage: currentNode.stage
			});
			return [];
		}
		
		return nextNodeKeys.map((optionKey) => {
			const optionNode = tree.nodes.get(optionKey);
			if (!optionNode) {
				console.error('Option node not found', {
					optionKey,
					currentNode: currentNode.nodeKey,
					availableNodes: Array.from(tree.nodes.keys())
				});
			}
			return {
				key: optionKey,
				title: optionNode?.title || optionKey,
				content: optionNode?.content || optionNode?.title || optionKey
			};
		}).filter(opt => opt.key); // 过滤掉无效的选项
	};

	const options = getOptions();
	// 阶段0不显示选项，只显示"开始思考"按钮
	// 其他阶段才显示选项（包括选项节点的情况）
	const showOptions = currentNode && currentNode.stage > 0 && options.length > 0 && !result;
	const canGoBack = path.length > 0 && !result;
	
	// 调试信息
	useEffect(() => {
		if (currentNode && tree) {
			console.log('当前节点状态:', {
				nodeKey: currentNode.nodeKey,
				stage: currentNode.stage,
				title: currentNode.title,
				isOption: currentNode.nodeKey.includes('option'),
				hasNextNodeKeys: currentNode.nextNodeKeys?.length > 0,
				parentNodeKey: currentNode.parentNodeKey,
				optionsCount: options.length
			});
		}
	}, [currentNode, tree, options.length]);

	return (
		<div 
			style={{
				padding: '20px',
				background: 'transparent',
				borderRadius: 'var(--radius-lg)',
				border: 'none',
				marginBottom: 'var(--spacing-lg)',
				position: 'relative',
				boxShadow: 'none',
				transition: 'all var(--transition-normal)',
				overflow: 'hidden'
			}}
			onMouseEnter={(e) => {
				// 移除 hover 效果，因为背景已透明
			}}
			onMouseLeave={(e) => {
				// 移除 hover 效果，因为背景已透明
			}}
		>
			{loading ? (
				<div style={{
					textAlign: 'center',
					color: 'var(--color-text-tertiary)',
					padding: '20px'
				}}>
				<div style={{
					marginBottom: '8px',
					opacity: 0.5,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center'
				}}>
					<TargetIcon 
						size={32} 
						color="var(--color-text-secondary)"
						style={{ flexShrink: 0 }}
					/>
				</div>
				<p style={{
					fontSize: '14px',
					margin: 0,
					fontWeight: 500,
					color: 'var(--color-text-secondary)'
				}}>
					加载中...
				</p>
				</div>
			) : issue && currentNode && !result ? (
				<div style={{
					width: '100%',
					maxWidth: '800px',
					margin: '0 auto'
				}}>
					{/* 标题区域 - 优化 */}
					<div style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: '16px',
						flexWrap: 'wrap',
						gap: '12px',
						paddingBottom: '12px',
						borderBottom: '1px solid var(--color-border-light)'
					}}>
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: '12px',
							flex: 1
						}}>
						<div style={{
							width: '40px',
							height: '40px',
							borderRadius: 'var(--radius-md)',
							background: 'linear-gradient(135deg, var(--color-primary-lighter), var(--color-primary-light))',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0
						}}>
							<TargetIcon 
								size={20} 
								color="var(--color-primary)"
								style={{ flexShrink: 0 }}
							/>
						</div>
							<div style={{ flex: 1, minWidth: 0 }}>
								<h2 style={{
									fontSize: '18px',
									margin: 0,
									fontWeight: 600,
									color: 'var(--color-text-primary)',
									lineHeight: '1.3',
									marginBottom: '4px'
								}}>
									{issue.title}
								</h2>
								{issue.category && (
									<span style={{
										padding: '4px 10px',
										background: 'var(--color-primary-lighter)',
										borderRadius: 'var(--radius-sm)',
										fontSize: '12px',
										color: 'var(--color-primary)',
										fontWeight: 500,
										display: 'inline-block'
									}}>
										{issue.category}
									</span>
								)}
							</div>
						</div>
						{canGoBack && (
							<button
								onClick={handleGoBack}
								style={{
									padding: '8px 16px',
									background: 'var(--color-background-secondary)',
									color: 'var(--color-text-secondary)',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									fontSize: '13px',
									fontWeight: 500,
									cursor: 'pointer',
									transition: 'all var(--transition-fast)',
									display: 'flex',
									alignItems: 'center',
									gap: '6px'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-primary)';
									e.currentTarget.style.color = 'var(--color-primary)';
									e.currentTarget.style.background = 'var(--color-primary-lighter)';
									e.currentTarget.style.transform = 'translateX(-2px)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-border)';
									e.currentTarget.style.color = 'var(--color-text-secondary)';
									e.currentTarget.style.background = 'var(--color-background-secondary)';
									e.currentTarget.style.transform = 'translateX(0)';
								}}
							>
								<ChevronLeftIcon 
									size={16} 
									color="currentColor"
									style={{ flexShrink: 0 }}
								/>
								<span>返回</span>
							</button>
						)}
					</div>

					{/* 进度指示器 - 优化 */}
					{currentNode.stage > 0 && (
						<div style={{
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							gap: '8px',
							marginBottom: '20px',
							padding: '12px',
							background: 'var(--color-background-subtle)',
							borderRadius: 'var(--radius-md)'
						}}>
							{[0, 1, 2, 3, 4, 5].map((stage, index) => {
								// 阶段0是案例呈现，阶段1-5是问题
								// 已完成：stage < currentNode.stage
								// 当前：stage === currentNode.stage
								// 未完成：stage > currentNode.stage
								const isCompleted = stage < currentNode.stage;
								const isCurrent = stage === currentNode.stage;
								const isPending = stage > currentNode.stage;
								
								return (
									<div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
										<div
											style={{
												width: '32px',
												height: '32px',
												borderRadius: '50%',
												background: isCompleted
													? 'var(--color-primary)'
													: isCurrent
														? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))'
														: 'var(--color-background-secondary)',
												color: isCompleted || isCurrent ? 'white' : 'var(--color-text-tertiary)',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												fontSize: '13px',
												fontWeight: 600,
												border: isCurrent
													? '3px solid var(--color-primary-dark)'
													: '2px solid transparent',
												boxShadow: isCurrent
													? '0 0 0 3px var(--color-primary-lighter)'
													: 'none',
												transition: 'all var(--transition-fast)',
												position: 'relative'
											}}
										>
											{stage}
											{isCurrent && (
												<div style={{
													position: 'absolute',
													top: '-4px',
													right: '-4px',
													width: '10px',
													height: '10px',
													borderRadius: '50%',
													background: 'var(--color-success)',
													border: '2px solid white',
													boxShadow: '0 0 0 1px var(--color-primary-lighter)'
												}} />
											)}
										</div>
										{index < 5 && (
											<div style={{
												width: '20px',
												height: '2px',
												background: isCompleted
													? 'var(--color-primary)'
													: 'var(--color-border-light)',
												borderRadius: '1px',
												transition: 'background var(--transition-fast)'
											}} />
										)}
									</div>
								);
							})}
						</div>
					)}

					{/* 当前阶段内容 - 优化 */}
					<div style={{
						padding: '20px',
						background: 'linear-gradient(135deg, var(--color-background-paper), var(--color-background-subtle))',
						borderRadius: 'var(--radius-md)',
						marginBottom: '16px',
						border: '1px solid var(--color-border-light)',
						boxShadow: 'var(--shadow-subtle)',
						transition: 'all var(--transition-normal)'
					}}>
						{currentNode.stage === 0 ? (
							<>
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									marginBottom: '16px',
									paddingBottom: '12px',
									borderBottom: '2px solid var(--color-primary-lighter)'
								}}>
									<div style={{
										width: '6px',
										height: '6px',
										borderRadius: '50%',
										background: 'var(--color-primary)',
										flexShrink: 0
									}} />
									<div style={{
										fontSize: '13px',
										color: 'var(--color-primary)',
										fontWeight: 600,
										letterSpacing: '0.5px',
										textTransform: 'uppercase'
									}}>
										案例呈现
									</div>
								</div>
								<p style={{
									fontSize: '15px',
									lineHeight: '1.8',
									color: 'var(--color-text-primary)',
									margin: 0,
									whiteSpace: 'pre-wrap',
									fontWeight: 400
								}}>
									{issue.caseDescription || currentNode.content || '暂无案例描述'}
								</p>
							</>
						) : (
							<>
								{/* 问题节点或选项节点：显示 title 和 content */}
								{/* 如果当前节点是选项节点，需要通过 parentNodeKey 找到问题节点来显示问题 */}
								{(() => {
									// 判断当前节点是问题节点还是选项节点
									const isOptionNode = currentNode.nodeKey.includes('option');
									let questionTitle = '';
									let questionContent = '';
									
									// 如果是选项节点，找到父问题节点来显示问题
									if (isOptionNode && currentNode.parentNodeKey && tree) {
										const parentNode = tree.nodes.get(currentNode.parentNodeKey);
										
										if (parentNode) {
											// 如果 parentNodeKey 指向 stage0，说明阶段1没有独立的问题节点
											if (parentNode.stage === 0) {
												// 使用选项节点的 title 作为问题（选项节点的 title 存储的是问题）
												questionTitle = currentNode.title || '请选择：';
											} 
											// 如果 parentNodeKey 指向的是选项节点（如 stage1_optionA -> stage2_optionA）
											else if (parentNode.nodeKey.includes('option')) {
												// 同一阶段的所有选项节点的 title 都是相同的问题
												// 使用当前选项节点的 title 作为问题
												questionTitle = currentNode.title || '请选择：';
											}
											// 如果 parentNodeKey 指向问题节点（理论上不应该有这种情况，但保留兼容）
											else if (!parentNode.nodeKey.includes('option')) {
												questionTitle = parentNode.title || '';
												questionContent = parentNode.content || '';
											}
										}
									} else if (!isOptionNode) {
										// 当前节点是问题节点
										questionTitle = currentNode.title || '';
										questionContent = currentNode.content || '';
									}
									
									// 如果还是没有问题标题，使用当前节点的 title（作为后备）
									if (!questionTitle && currentNode.title) {
										questionTitle = currentNode.title;
									}
									
									return (
										<>
											{/* 显示问题标题 */}
											{questionTitle && (
												<div style={{
													display: 'flex',
													alignItems: 'center',
													gap: '10px',
													marginBottom: '16px',
													paddingBottom: '12px',
													borderBottom: '2px solid var(--color-primary-lighter)'
												}}>
													<div style={{
														width: '4px',
														height: '20px',
														borderRadius: '2px',
														background: 'linear-gradient(180deg, var(--color-primary), var(--color-primary-light))',
														flexShrink: 0
													}} />
													<div style={{
														fontSize: '16px',
														fontWeight: 600,
														color: 'var(--color-text-primary)',
														lineHeight: '1.4',
														flex: 1
													}}>
														{questionTitle}
													</div>
												</div>
											)}
											{/* 显示问题内容（如果有，且不是选项节点的 content） */}
											{questionContent && (
												<p style={{
													fontSize: questionTitle ? '13px' : '14px',
													lineHeight: '1.5',
													color: questionTitle ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
													margin: 0,
													whiteSpace: 'pre-wrap'
												}}>
													{questionContent}
												</p>
											)}
										</>
									);
								})()}
							</>
						)}
					</div>

					{/* 选项列表 - 优化 */}
					{showOptions && (
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '12px',
							marginBottom: '16px'
						}}>
							{options.map((option, index) => (
								<button
									key={option.key}
									onClick={() => handleSelect(option.key)}
									disabled={isSubmitting}
									style={{
										padding: '16px 18px',
										background: 'var(--color-background-paper)',
										border: '2px solid var(--color-border-light)',
										borderRadius: 'var(--radius-md)',
										cursor: isSubmitting ? 'not-allowed' : 'pointer',
										textAlign: 'left',
										fontSize: '14px',
										lineHeight: '1.6',
										color: 'var(--color-text-primary)',
										transition: 'all var(--transition-fast)',
										opacity: isSubmitting ? 0.6 : 1,
										position: 'relative',
										overflow: 'hidden'
									}}
									onMouseEnter={(e) => {
										if (!isSubmitting) {
											e.currentTarget.style.background = 'var(--color-primary-lighter)';
											e.currentTarget.style.borderColor = 'var(--color-primary)';
											e.currentTarget.style.transform = 'translateX(4px)';
											e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
										}
									}}
									onMouseLeave={(e) => {
										if (!isSubmitting) {
											e.currentTarget.style.background = 'var(--color-background-paper)';
											e.currentTarget.style.borderColor = 'var(--color-border-light)';
											e.currentTarget.style.transform = 'translateX(0)';
											e.currentTarget.style.boxShadow = 'none';
										}
									}}
								>
									<div style={{
										display: 'flex',
										alignItems: 'flex-start',
										gap: '12px'
									}}>
										<div style={{
											width: '24px',
											height: '24px',
											borderRadius: 'var(--radius-sm)',
											background: 'var(--color-primary)',
											color: 'white',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: '13px',
											fontWeight: 600,
											flexShrink: 0,
											marginTop: '2px'
										}}>
											{String.fromCharCode(65 + index)}
										</div>
										<div style={{ flex: 1, minWidth: 0 }}>
											{option.content}
										</div>
									</div>
								</button>
							))}
						</div>
					)}

					{/* 开始按钮 - 优化 */}
					{currentNode.stage === 0 && (
						<div style={{
							textAlign: 'center',
							marginTop: '20px'
						}}>
							<button
								onClick={() => {
									// 阶段0：进入阶段1
									// 如果 rootNode 的 nextNodeKeys 指向选项节点，直接显示选项
									// 如果指向问题节点，显示问题
									if (tree && currentNode.nextNodeKeys && currentNode.nextNodeKeys.length > 0) {
										const firstNextKey = currentNode.nextNodeKeys[0];
										const firstNextNode = tree.nodes.get(firstNextKey);
										
										if (firstNextNode) {
											console.log('rootNode 指向的节点:', {
												nodeKey: firstNextNode.nodeKey,
												stage: firstNextNode.stage,
												title: firstNextNode.title,
												isOption: firstNextNode.nodeKey.includes('option')
											});
											
											// 如果指向的是选项节点，直接进入（会通过显示逻辑处理）
											// 如果指向的是问题节点，直接进入
											setCurrentNode(firstNextNode);
										} else {
											console.error('找不到 rootNode 指向的节点:', firstNextKey);
										}
									} else {
										console.error('rootNode 没有 nextNodeKeys 或 tree 不存在');
									}
								}}
								disabled={isSubmitting}
								style={{
									padding: '14px 32px',
									background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
									color: 'white',
									border: 'none',
									borderRadius: 'var(--radius-md)',
									fontSize: '15px',
									fontWeight: 600,
									cursor: isSubmitting ? 'not-allowed' : 'pointer',
									transition: 'all var(--transition-fast)',
									opacity: isSubmitting ? 0.6 : 1,
									boxShadow: 'var(--shadow-md)',
									display: 'inline-flex',
									alignItems: 'center',
									gap: '8px',
									position: 'relative',
									overflow: 'hidden'
								}}
								onMouseEnter={(e) => {
									if (!isSubmitting) {
										e.currentTarget.style.transform = 'translateY(-2px)';
										e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
										e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))';
										// 图标向右移动
										const icon = e.currentTarget.querySelector('svg');
										if (icon) {
											icon.style.transform = 'translateX(2px)';
										}
									}
								}}
								onMouseLeave={(e) => {
									if (!isSubmitting) {
										e.currentTarget.style.transform = 'translateY(0)';
										e.currentTarget.style.boxShadow = 'var(--shadow-md)';
										e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))';
										// 图标恢复原位
										const icon = e.currentTarget.querySelector('svg');
										if (icon) {
											icon.style.transform = 'translateX(0)';
										}
									}
								}}
							>
								<span>开始思考</span>
								<ChevronRightIcon 
									size={16} 
									color="currentColor"
									style={{ 
										flexShrink: 0,
										transition: 'transform var(--transition-fast)',
										display: 'inline-block'
									}}
								/>
							</button>
						</div>
					)}
				</div>
			) : result ? (
				// 结果显示
				<div style={{
					width: '100%',
					maxWidth: '800px',
					margin: '0 auto'
				}}>
					<div style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: '12px'
					}}>
						<h2 style={{
							fontSize: '16px',
							margin: 0,
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							{issue.title} - 思考结果
						</h2>
						<button
							onClick={handleGoBack}
							style={{
								padding: '6px 12px',
								background: 'transparent',
								color: 'var(--color-text-secondary)',
								border: '1px solid var(--color-border)',
								borderRadius: '4px',
								fontSize: '12px',
								cursor: 'pointer'
							}}
						>
							<ChevronLeftIcon 
								size={14} 
								color="currentColor"
								style={{ flexShrink: 0, marginRight: '4px' }}
							/>
							返回
						</button>
					</div>
					<div style={{
						padding: '12px',
						background: 'var(--color-background-secondary)',
						borderRadius: '6px',
						fontSize: '13px',
						lineHeight: '1.6',
						color: 'var(--color-text-primary)',
						whiteSpace: 'pre-wrap'
					}}>
						{result.tradeoff && (
							<div style={{ marginBottom: '12px' }}>
								<strong>核心权衡点：</strong>
								{result.tradeoff}
							</div>
						)}
						{result.alternative && (
							<div style={{ marginBottom: '12px' }}>
								<strong>其他思路：</strong>
								{result.alternative}
							</div>
						)}
						{result.question && (
							<div>
								<strong>开放式追问：</strong>
								{result.question}
							</div>
						)}
					</div>
				</div>
			) : (
				<div style={{
					textAlign: 'center',
					color: 'var(--color-text-tertiary)',
					padding: '20px'
				}}>
				<div style={{
					marginBottom: '8px',
					opacity: 0.5,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center'
				}}>
					<TargetIcon 
						size={32} 
						color="var(--color-text-secondary)"
						style={{ flexShrink: 0 }}
					/>
				</div>
				<p style={{
					fontSize: '14px',
					margin: 0,
					fontWeight: 500,
					color: 'var(--color-text-secondary)'
				}}>
					每日议题思考游戏
				</p>
					<p style={{
						fontSize: '12px',
						margin: '4px 0 0 0',
						opacity: 0.7
					}}>
						今日暂无议题
					</p>
				</div>
			)}
		</div>
	);
}
