'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueCreatePage');

interface IssueNode {
	stage: number;
	nodeKey: string;
	title: string;
	content: string;
	parentNodeKey?: string;
	nextNodeKeys: string[];
	isRoot?: boolean;
	order: number;
}

/**
 * 管理员创建题目页面（手动创建版本）
 * 提供结构化的表单，让管理员手动输入所有节点内容
 */
export default function DailyIssueCreatePage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	// 基本信息
	const [basicInfo, setBasicInfo] = useState({
		date: getTodayDate(),
		title: '',
		caseDescription: '',
		category: '社会',
		difficulty: 3
	});

	// 节点数据（按阶段组织）
	const [nodes, setNodes] = useState<IssueNode[]>([]);
	const [editingNode, setEditingNode] = useState<IssueNode | null>(null);
	const [editingNodeIndex, setEditingNodeIndex] = useState<number>(-1);
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [importJson, setImportJson] = useState('');
	const [showPromptDialog, setShowPromptDialog] = useState(false);

	// 获取今天的日期（YYYYMMDD格式）
	function getTodayDate(): string {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}${month}${day}`;
	}

	// 初始化根节点（阶段0）
	const initRootNode = () => {
		if (nodes.length === 0) {
			const rootNode: IssueNode = {
				stage: 0,
				nodeKey: 'stage0',
				title: '案例呈现',
				content: basicInfo.caseDescription || '',
				parentNodeKey: undefined,
				nextNodeKeys: [],
				isRoot: true,
				order: 0
			};
			setNodes([rootNode]);
		}
	};

	// 添加节点
	const handleAddNode = (stage: number) => {
		const stageNodes = nodes.filter(n => n.stage === stage);
		const order = stageNodes.length;
		const nodeKey = `stage${stage}_option${String.fromCharCode(65 + order)}`; // A, B, C...
		
		const newNode: IssueNode = {
			stage,
			nodeKey,
			title: '',
			content: '',
			parentNodeKey: stage === 1 ? 'stage0' : undefined,
			nextNodeKeys: [],
			isRoot: false,
			order
		};

		setNodes([...nodes, newNode]);
		setEditingNode(newNode);
		setEditingNodeIndex(nodes.length);
	};

	// 编辑节点
	const handleEditNode = (index: number) => {
		setEditingNode({ ...nodes[index] });
		setEditingNodeIndex(index);
	};

	// 保存节点编辑
	const handleSaveNode = () => {
		if (!editingNode || editingNodeIndex < 0) return;

		// 验证：如果当前节点是选项节点，检查同一阶段的其他选项节点的 title 是否相同
		if (editingNode.stage > 0 && editingNode.nodeKey.includes('option')) {
			const sameStageNodes = nodes.filter(n => 
				n.stage === editingNode.stage && 
				n.nodeKey.includes('option') && 
				n.nodeKey !== editingNode.nodeKey
			);
			
			if (sameStageNodes.length > 0) {
				const firstNodeTitle = sameStageNodes[0].title;
				if (firstNodeTitle && editingNode.title && firstNodeTitle !== editingNode.title) {
					const confirmMsg = `警告：同一阶段的其他选项节点的标题是"${firstNodeTitle}"，\n当前节点的标题是"${editingNode.title}"。\n\n同一阶段的所有选项节点的标题必须相同。\n\n是否要统一为"${firstNodeTitle}"？`;
					if (confirm(confirmMsg)) {
						editingNode.title = firstNodeTitle;
					} else {
						// 用户选择不统一，提示用户手动修改
						alert('请确保同一阶段的所有选项节点的标题相同');
						return;
					}
				}
			}
		}

		const updatedNodes = [...nodes];
		updatedNodes[editingNodeIndex] = editingNode;
		setNodes(updatedNodes);
		setEditingNode(null);
		setEditingNodeIndex(-1);
	};

	// 删除节点
	const handleDeleteNode = (index: number) => {
		if (nodes[index].isRoot) {
			alert('不能删除根节点');
			return;
		}
		if (confirm('确定要删除这个节点吗？')) {
			const updatedNodes = nodes.filter((_, i) => i !== index);
			setNodes(updatedNodes);
		}
	};

	// 更新根节点内容（当案例描述改变时）
	const updateRootNodeContent = () => {
		if (nodes.length > 0 && nodes[0].isRoot) {
			const updatedNodes = [...nodes];
			updatedNodes[0].content = basicInfo.caseDescription;
			setNodes(updatedNodes);
		}
	};

	// 导入 JSON 数据
	const handleImportJson = () => {
		try {
			const data = JSON.parse(importJson);
			
			// 验证数据结构
			if (!data.title || !data.caseDescription || !Array.isArray(data.nodes)) {
				throw new Error('JSON 格式不正确：缺少 title、caseDescription 或 nodes');
			}

			// 填充基本信息
			setBasicInfo({
				date: basicInfo.date, // 保留原有日期
				title: data.title,
				caseDescription: data.caseDescription,
				category: data.category || '社会',
				difficulty: data.difficulty || 3
			});

			// 填充节点数据
			// 修复和规范化节点数据
			const fixedNodes = data.nodes.map((node: IssueNode) => {
				// 确保 nextNodeKeys 是数组
				if (!Array.isArray(node.nextNodeKeys)) {
					node.nextNodeKeys = node.nextNodeKeys ? [node.nextNodeKeys] : [];
				}
				
				// 如果 parentNodeKey 为 null 或 undefined，尝试从其他节点的 nextNodeKeys 中找到
				if ((!node.parentNodeKey || node.parentNodeKey === null) && node.stage > 0) {
					const parentNode = data.nodes.find((n: IssueNode) => {
						if (!n.nextNodeKeys || !Array.isArray(n.nextNodeKeys)) {
							return false;
						}
						return n.nextNodeKeys.includes(node.nodeKey);
					});
					if (parentNode) {
						node.parentNodeKey = parentNode.nodeKey;
					}
				}
				
				// 确保所有必需字段都有值
				return {
					...node,
					nextNodeKeys: Array.isArray(node.nextNodeKeys) ? node.nextNodeKeys : [],
					parentNodeKey: node.parentNodeKey || undefined,
					order: node.order ?? 0,
					isRoot: node.isRoot ?? (node.stage === 0)
				};
			});

			setNodes(fixedNodes);
			setShowImportDialog(false);
			setImportJson('');
			setError(null);
			
			log.info('JSON 导入成功', { nodeCount: fixedNodes.length });
		} catch (error: any) {
			log.error('JSON 导入失败', error as Error);
			setError(`导入失败: ${error.message || 'JSON 格式错误'}`);
		}
	};

	// 删除指定日期的议题
	const handleDeleteIssue = async (date: string) => {
		if (!confirm(`确定要删除日期 ${date} 的议题吗？此操作不可恢复！`)) {
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await fetch('/api/admin/daily-issue/delete', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ date })
			});

			const data = await res.json();

			if (!res.ok || !data.success) {
				const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || '删除失败');
				throw new Error(errorMsg);
			}

			log.info('议题删除成功', { date });
			alert(`议题已删除：${date}`);
			// 刷新页面或重置表单
			window.location.reload();
		} catch (error: any) {
			log.error('删除议题失败', error as Error);
			setError(error.message || '删除失败');
		} finally {
			setLoading(false);
		}
	};

	// 保存议题
	const handleSubmit = async () => {
		if (!basicInfo.title || !basicInfo.caseDescription) {
			setError('请填写标题和案例描述');
			return;
		}

		if (nodes.length === 0) {
			setError('请至少添加一个节点（根节点）');
			return;
		}

		// 验证所有节点都有内容
		for (const node of nodes) {
			if (!node.title || !node.content) {
				setError(`节点 ${node.nodeKey} 的标题或内容为空`);
				return;
			}
			// 确保 nextNodeKeys 是数组
			if (!Array.isArray(node.nextNodeKeys)) {
				setError(`节点 ${node.nodeKey} 的 nextNodeKeys 格式不正确`);
				return;
			}
		}

		// 验证：同一阶段的所有选项节点的 title 必须相同
		for (let stage = 1; stage <= 5; stage++) {
			const stageNodes = nodes.filter(n => n.stage === stage && n.nodeKey.includes('option'));
			if (stageNodes.length > 1) {
				const firstTitle = stageNodes[0].title;
				const differentTitles = stageNodes.filter(n => n.title !== firstTitle);
				if (differentTitles.length > 0) {
					setError(`阶段 ${stage} 的选项节点标题不一致：\n${differentTitles.map(n => `  - ${n.nodeKey}: "${n.title}"`).join('\n')}\n\n请确保同一阶段的所有选项节点的标题相同（都是同一个问题）`);
					return;
				}
			}
		}

		setLoading(true);
		setError(null);

		try {
			// 检查是否已存在该日期的议题
			const checkRes = await fetch(`/api/games/daily-issue/${basicInfo.date}`);
			const checkData = await checkRes.json();
			
			if (checkRes.ok && checkData.success) {
				// 议题已存在，询问是否删除
				const shouldDelete = confirm(`日期 ${basicInfo.date} 的议题已存在。是否删除旧议题并创建新议题？`);
				if (shouldDelete) {
					// 先删除旧议题
					const deleteRes = await fetch('/api/admin/daily-issue/delete', {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ date: basicInfo.date })
					});

					const deleteData = await deleteRes.json();

					if (!deleteRes.ok || !deleteData.success) {
						const errorMsg = typeof deleteData.error === 'string' ? deleteData.error : (deleteData.error?.message || '删除失败');
						throw new Error(`删除旧议题失败：${errorMsg}`);
					}

					log.info('旧议题已删除', { date: basicInfo.date });
					// 等待一下，确保删除完成
					await new Promise(resolve => setTimeout(resolve, 300));
				} else {
					setLoading(false);
					return;
				}
			}

			// 确保所有节点的 nextNodeKeys 都是数组
			const sanitizedNodes = nodes.map(node => ({
				...node,
				nextNodeKeys: Array.isArray(node.nextNodeKeys) ? node.nextNodeKeys : (node.nextNodeKeys ? [node.nextNodeKeys] : []),
				parentNodeKey: node.parentNodeKey || null
			}));

			const res = await fetch('/api/admin/daily-issue/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: basicInfo.date,
					title: basicInfo.title,
					caseDescription: basicInfo.caseDescription,
					category: basicInfo.category,
					difficulty: basicInfo.difficulty,
					status: 'draft',
					nodes: sanitizedNodes
				})
			});

			const data = await res.json();

			if (!res.ok || !data.success) {
				const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || '创建失败');
				throw new Error(errorMsg);
			}

			log.info('议题创建成功', { issueId: data.data.issueId });
			// 跳转到分析页面，并传递 issueId
			router.push(`/admin/daily-issue/analytics?issueId=${data.data.issueId}`);
		} catch (error: any) {
			log.error('创建议题失败', error as Error);
			setError(error.message || '创建失败');
		} finally {
			setLoading(false);
		}
	};

	// 按阶段分组节点
	const nodesByStage = nodes.reduce((acc, node) => {
		if (!acc[node.stage]) {
			acc[node.stage] = [];
		}
		acc[node.stage].push(node);
		return acc;
	}, {} as Record<number, IssueNode[]>);

	return (
		<div
			style={{
				maxWidth: '1400px',
				margin: '0 auto',
				padding: '24px',
				minHeight: '100vh',
				background: 'var(--color-background)'
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
				<h1
					style={{
						fontSize: '28px',
						fontWeight: '600',
						color: 'var(--color-text)',
						margin: 0
					}}
				>
					创建每日议题（手动创建）
				</h1>
				<div style={{ display: 'flex', gap: '12px' }}>
					<button
						type="button"
						onClick={() => setShowImportDialog(true)}
						style={{
							padding: '8px 16px',
							background: 'var(--color-primary)',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							fontSize: '14px',
							fontWeight: '500',
							cursor: 'pointer'
						}}
					>
						📥 导入 JSON
					</button>
					<button
						type="button"
						onClick={() => setShowPromptDialog(true)}
						style={{
							padding: '8px 16px',
							background: 'var(--color-background-secondary)',
							color: 'var(--color-text)',
							border: '1px solid var(--color-border)',
							borderRadius: '6px',
							fontSize: '14px',
							fontWeight: '500',
							cursor: 'pointer'
						}}
					>
						📋 查看 Prompt
					</button>
				</div>
			</div>

			{error && (
				<div
					style={{
						padding: '16px',
						background: 'var(--color-background-secondary)',
						borderRadius: '8px',
						border: '1px solid var(--color-error)',
						marginBottom: '24px',
						color: 'var(--color-error)'
					}}
				>
					{error}
				</div>
			)}

			{/* 基本信息 */}
			<div
				style={{
					padding: '24px',
					background: 'var(--color-background-paper)',
					borderRadius: '12px',
					marginBottom: '24px',
					border: '1px solid var(--color-border)'
				}}
			>
				<h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
					基本信息
				</h2>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
					<div>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
							<label style={{ display: 'block', fontSize: '14px', fontWeight: '500' }}>
								日期 (YYYYMMDD)
							</label>
							<button
								type="button"
								onClick={() => handleDeleteIssue(basicInfo.date)}
								disabled={loading}
								style={{
									padding: '4px 12px',
									background: 'var(--color-error)',
									color: 'white',
									border: 'none',
									borderRadius: '4px',
									fontSize: '12px',
									cursor: loading ? 'not-allowed' : 'pointer',
									opacity: loading ? 0.6 : 1
								}}
							>
								清除该日期的议题
							</button>
						</div>
						<input
							type="text"
							value={basicInfo.date}
							onChange={(e) => setBasicInfo({ ...basicInfo, date: e.target.value })}
							placeholder="20250120"
							style={{
								width: '100%',
								padding: '10px',
								border: '1px solid var(--color-border)',
								borderRadius: '6px',
								background: 'var(--color-background)',
								color: 'var(--color-text)',
								fontSize: '14px'
							}}
						/>
						<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
							💡 如果该日期的议题已存在，保存时会提示是否删除旧议题
						</div>
					</div>

						<div>
							<label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
								分类
							</label>
							<select
								value={basicInfo.category}
								onChange={(e) => setBasicInfo({ ...basicInfo, category: e.target.value })}
								style={{
									width: '100%',
									padding: '10px',
									border: '1px solid var(--color-border)',
									borderRadius: '6px',
									background: 'var(--color-background)',
									color: 'var(--color-text)',
									fontSize: '14px'
								}}
							>
								<option value="社会">社会</option>
								<option value="经济">经济</option>
								<option value="教育">教育</option>
								<option value="环境">环境</option>
								<option value="科技">科技</option>
								<option value="文化">文化</option>
							</select>
						</div>
					</div>

					<div>
						<label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
							议题标题
						</label>
						<input
							type="text"
							value={basicInfo.title}
							onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
							placeholder="输入议题标题..."
							style={{
								width: '100%',
								padding: '10px',
								border: '1px solid var(--color-border)',
								borderRadius: '6px',
								background: 'var(--color-background)',
								color: 'var(--color-text)',
								fontSize: '14px'
							}}
						/>
					</div>

					<div>
						<label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
							案例描述（阶段0的内容）
						</label>
						<textarea
							value={basicInfo.caseDescription}
							onChange={(e) => {
								setBasicInfo({ ...basicInfo, caseDescription: e.target.value });
								// 自动更新根节点内容
								setTimeout(() => updateRootNodeContent(), 100);
							}}
							rows={6}
							placeholder="描述一个具体的公共问题场景，包含数据、不同群体的反应等..."
							style={{
								width: '100%',
								padding: '10px',
								border: '1px solid var(--color-border)',
								borderRadius: '6px',
								background: 'var(--color-background)',
								color: 'var(--color-text)',
								fontSize: '14px',
								fontFamily: 'inherit',
								resize: 'vertical'
							}}
						/>
						<button
							type="button"
							onClick={initRootNode}
							style={{
								marginTop: '8px',
								padding: '6px 12px',
								background: 'var(--color-primary)',
								border: 'none',
								borderRadius: '4px',
								color: 'white',
								fontSize: '12px',
								cursor: 'pointer'
							}}
						>
							初始化根节点
						</button>
					</div>

					<div>
						<label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
							难度 (1-5)
						</label>
						<input
							type="number"
							min="1"
							max="5"
							value={basicInfo.difficulty}
							onChange={(e) => setBasicInfo({ ...basicInfo, difficulty: parseInt(e.target.value) || 3 })}
							style={{
								width: '100%',
								padding: '10px',
								border: '1px solid var(--color-border)',
								borderRadius: '6px',
								background: 'var(--color-background)',
								color: 'var(--color-text)',
								fontSize: '14px'
							}}
						/>
					</div>
				</div>
			</div>

			{/* 决策树节点管理 */}
			<div
				style={{
					padding: '24px',
					background: 'var(--color-background-paper)',
					borderRadius: '12px',
					marginBottom: '24px',
					border: '1px solid var(--color-border)'
				}}
			>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
					<h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
						决策树节点 ({nodes.length} 个)
					</h2>
				</div>

				{/* 按阶段显示节点 */}
				{[0, 1, 2, 3, 4, 5].map((stage) => {
					const stageNodes = nodesByStage[stage] || [];
					return (
						<div key={stage} style={{ marginBottom: '24px' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
								<h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
									阶段 {stage} {stage === 0 && '(根节点)'}
								</h3>
								{stage > 0 && (
									<button
										type="button"
										onClick={() => handleAddNode(stage)}
										style={{
											padding: '6px 12px',
											background: 'var(--color-primary)',
											border: 'none',
											borderRadius: '4px',
											color: 'white',
											fontSize: '12px',
											cursor: 'pointer'
										}}
									>
										+ 添加节点
									</button>
								)}
							</div>

							{stageNodes.length === 0 ? (
								<div style={{ padding: '16px', background: 'var(--color-background-secondary)', borderRadius: '6px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
									{stage === 0 ? '请先填写案例描述，然后点击"初始化根节点"' : '暂无节点，点击"添加节点"创建'}
								</div>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
									{stageNodes.map((node, index) => {
										const globalIndex = nodes.findIndex(n => n.nodeKey === node.nodeKey);
										return (
											<div
												key={node.nodeKey}
												style={{
													padding: '16px',
													background: 'var(--color-background-secondary)',
													borderRadius: '6px',
													border: '1px solid var(--color-border)'
												}}
											>
												<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
													<div>
														<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
															{node.nodeKey} · 顺序: {node.order}
														</div>
														<div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
															{node.title || '(未设置标题)'}
														</div>
														<div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
															{node.content || '(未设置内容)'}
														</div>
													</div>
													<div style={{ display: 'flex', gap: '8px' }}>
														<button
															type="button"
															onClick={() => handleEditNode(globalIndex)}
															style={{
																padding: '4px 8px',
																background: 'var(--color-primary)',
																border: 'none',
																borderRadius: '4px',
																color: 'white',
																fontSize: '12px',
																cursor: 'pointer'
															}}
														>
															编辑
														</button>
														{!node.isRoot && (
															<button
																type="button"
																onClick={() => handleDeleteNode(globalIndex)}
																style={{
																	padding: '4px 8px',
																	background: 'var(--color-error)',
																	border: 'none',
																	borderRadius: '4px',
																	color: 'white',
																	fontSize: '12px',
																	cursor: 'pointer'
																}}
															>
																删除
															</button>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* 操作按钮 */}
			<div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
				<button
					type="button"
					onClick={() => router.back()}
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
					取消
				</button>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={loading}
					style={{
						padding: '12px 24px',
						background: 'var(--color-primary)',
						border: 'none',
						borderRadius: '6px',
						cursor: loading ? 'not-allowed' : 'pointer',
						fontSize: '14px',
						color: 'white',
						fontWeight: '500',
						opacity: loading ? 0.6 : 1
					}}
				>
					{loading ? '创建中...' : '保存议题（草稿）'}
				</button>
			</div>

			{/* 导入 JSON 对话框 */}
			{showImportDialog && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000
					}}
					onClick={() => {
						setShowImportDialog(false);
						setImportJson('');
					}}
				>
					<div
						style={{
							background: 'var(--color-background)',
							borderRadius: '12px',
							padding: '24px',
							maxWidth: '800px',
							width: '90%',
							maxHeight: '80vh',
							overflowY: 'auto'
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
							导入 ChatGPT 生成的 JSON
						</h3>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							<div>
								<label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
									粘贴 JSON 数据
								</label>
								<textarea
									value={importJson}
									onChange={(e) => setImportJson(e.target.value)}
									rows={15}
									placeholder="将 ChatGPT 生成的 JSON 粘贴到这里..."
									style={{
										width: '100%',
										padding: '12px',
										border: '1px solid var(--color-border)',
										borderRadius: '6px',
										background: 'var(--color-background-secondary)',
										color: 'var(--color-text)',
										fontSize: '13px',
										fontFamily: 'monospace',
										resize: 'vertical'
									}}
								/>
							</div>
							<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
								💡 提示：导入后会覆盖当前所有数据，请确认后再导入
							</div>
							<div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
								<button
									type="button"
									onClick={() => {
										setShowImportDialog(false);
										setImportJson('');
									}}
									style={{
										padding: '10px 20px',
										background: 'var(--color-background-secondary)',
										border: '1px solid var(--color-border)',
										borderRadius: '6px',
										cursor: 'pointer',
										fontSize: '14px',
										color: 'var(--color-text)'
									}}
								>
									取消
								</button>
								<button
									type="button"
									onClick={handleImportJson}
									disabled={!importJson.trim()}
									style={{
										padding: '10px 20px',
										background: 'var(--color-primary)',
										border: 'none',
										borderRadius: '6px',
										cursor: importJson.trim() ? 'pointer' : 'not-allowed',
										fontSize: '14px',
										color: 'white',
										fontWeight: '500',
										opacity: importJson.trim() ? 1 : 0.6
									}}
								>
									导入
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Prompt 对话框 */}
			{showPromptDialog && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000
					}}
					onClick={() => setShowPromptDialog(false)}
				>
					<div
						style={{
							background: 'var(--color-background)',
							borderRadius: '12px',
							padding: '24px',
							maxWidth: '900px',
							width: '90%',
							maxHeight: '80vh',
							overflowY: 'auto'
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
							<h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>ChatGPT 生成 Prompt</h3>
							<button
								type="button"
								onClick={() => setShowPromptDialog(false)}
								style={{
									padding: '4px 8px',
									background: 'transparent',
									border: 'none',
									fontSize: '20px',
									cursor: 'pointer',
									color: 'var(--color-text)'
								}}
							>
								×
							</button>
						</div>
						<div style={{ 
							background: 'var(--color-background-secondary)', 
							padding: '16px', 
							borderRadius: '8px',
							fontFamily: 'monospace',
							fontSize: '13px',
							lineHeight: '1.6',
							whiteSpace: 'pre-wrap',
							overflowX: 'auto'
						}}>
							{`你是一个专业的公共议题思考游戏设计师。请为一个名为"[议题主题]"的议题设计一个完整的思考游戏。

**重要**：请根据议题主题自动生成一个合适的标题，不要使用占位符。标题应该简洁明了（20字以内），能够准确概括议题的核心问题。

## 要求

1. **中立性**：议题必须中立，不偏向任何立场，不包含情绪化词汇
2. **引导思考**：每个阶段的问题要引导用户深入思考，而不是简单的是非判断
3. **选项平衡**：每个选项都要有合理的理由和代价，不能有明显的"正确"或"错误"选项
4. **真实性**：案例描述要包含具体的数据、不同群体的反应，让用户感受到真实场景
5. **完整性**：必须包含阶段0-5，每个阶段2-3个选项，形成完整的决策树

## 数据结构

请生成一个完整的 JSON 对象，包含以下结构：

{
  "title": "根据议题主题生成的标题（不要使用占位符，直接生成具体标题，20字以内）",
  "caseDescription": "阶段0的案例描述（200-300字，描述一个具体的公共问题场景，包含数据、不同群体的反应等）",
  "category": "分类（社会/经济/教育/环境/科技/文化）",
  "difficulty": 3,
  "nodes": [
    {
      "stage": 0,
      "nodeKey": "stage0",
      "title": "案例呈现",
      "content": "（与caseDescription相同）",
      "parentNodeKey": null,
      "nextNodeKeys": ["stage1_optionA", "stage1_optionB", "stage1_optionC"],
      "isRoot": true,
      "order": 0
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionA",
      "title": "阶段1的问题标题（如：你认为最值得优先关注的是？）",
      "content": "选项A的内容（如：直接后果 - 谁受影响）",
      "parentNodeKey": "stage0",
      "nextNodeKeys": ["stage2_optionA", "stage2_optionB"],
      "isRoot": false,
      "order": 0
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionB",
      "title": "阶段1的问题标题（与选项A相同）",
      "content": "选项B的内容",
      "parentNodeKey": "stage0",
      "nextNodeKeys": ["stage2_optionC", "stage2_optionD"],
      "isRoot": false,
      "order": 1
    }
    // ... 继续生成阶段2-5的节点
  ]
}

## 重要规则

1. **标题生成**：
   - 必须根据议题主题生成具体标题，不能使用 "[议题主题]" 这样的占位符
   - 标题要简洁（20字以内），准确概括议题核心
   - 例如：议题主题是"城市交通拥堵"，标题可以是"城市交通拥堵治理"或"缓解城市交通压力"

2. **阶段结构**：
   - 阶段0：根节点，展示案例描述
   - 阶段1-5：每个阶段2-3个选项
   - **重要**：每个阶段的所有选项节点的 title 必须完全相同（同一个问题，不同选项）
   - **重要**：选项节点的 title 存储的是问题（如"你认为最值得优先关注的是？"）
   - **重要**：选项节点的 content 存储的是选项内容（如"直接后果 - 谁受影响"）

3. **节点Key命名规则**：
   - 格式：stage{阶段号}_option{选项字母}
   - 选项字母：A, B, C, D, E, F...
   - 例如：stage1_optionA, stage2_optionB, stage3_optionC

4. **决策树路径**：
   - 每个节点通过 nextNodeKeys 数组指定可以到达的下一个节点
   - 确保所有路径最终都能到达阶段5
   - 不同选择可以汇聚到同一个节点（支持路径合并）

5. **内容要求**：
   - 案例描述：200-300字，包含具体数据、时间、地点、不同群体的反应
   - 节点标题：简洁明了，10-20字
   - 节点内容：选项描述，30-100字，说明选择这个选项的理由和可能的影响

6. **中立性检查**：
   - 不使用"左派"、"右派"、"激进"、"保守"等标签词
   - 不使用"应该"、"必须"等强制性词汇
   - 每个选项都有合理的理由和代价

## 输出要求

请直接返回 JSON 格式，不要包含任何其他说明文字。确保 JSON 格式完全正确，可以直接被 JSON.parse() 解析。

**再次强调**：title 字段必须是具体生成的标题，不能是占位符。

现在请为议题"[议题主题]"生成完整的数据结构。`}
						</div>
						<div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
							💡 使用说明：将上面的 prompt 复制到 ChatGPT，将 [议题主题] 替换为你要创建的议题，然后复制返回的 JSON 并导入到创建页面。
						</div>
						<div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
							<button
								type="button"
								onClick={() => {
									const promptText = `你是一个专业的公共议题思考游戏设计师。请为一个名为"[议题主题]"的议题设计一个完整的思考游戏。

**重要**：请根据议题主题自动生成一个合适的标题，不要使用占位符。标题应该简洁明了（20字以内），能够准确概括议题的核心问题。

## 要求

1. **中立性**：议题必须中立，不偏向任何立场，不包含情绪化词汇
2. **引导思考**：每个阶段的问题要引导用户深入思考，而不是简单的是非判断
3. **选项平衡**：每个选项都要有合理的理由和代价，不能有明显的"正确"或"错误"选项
4. **真实性**：案例描述要包含具体的数据、不同群体的反应，让用户感受到真实场景
5. **完整性**：必须包含阶段0-5，每个阶段2-3个选项，形成完整的决策树

## 数据结构

请生成一个完整的 JSON 对象，包含以下结构：

{
  "title": "根据议题主题生成的标题（不要使用占位符，直接生成具体标题，20字以内）",
  "caseDescription": "阶段0的案例描述（200-300字，描述一个具体的公共问题场景，包含数据、不同群体的反应等）",
  "category": "分类（社会/经济/教育/环境/科技/文化）",
  "difficulty": 3,
  "nodes": [
    {
      "stage": 0,
      "nodeKey": "stage0",
      "title": "案例呈现",
      "content": "（与caseDescription相同）",
      "parentNodeKey": null,
      "nextNodeKeys": ["stage1_optionA", "stage1_optionB", "stage1_optionC"],
      "isRoot": true,
      "order": 0
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionA",
      "title": "阶段1的问题标题（如：你认为最值得优先关注的是？）",
      "content": "选项A的内容（如：直接后果 - 谁受影响）",
      "parentNodeKey": "stage0",
      "nextNodeKeys": ["stage2_optionA", "stage2_optionB"],
      "isRoot": false,
      "order": 0
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionB",
      "title": "阶段1的问题标题（与选项A相同）",
      "content": "选项B的内容",
      "parentNodeKey": "stage0",
      "nextNodeKeys": ["stage2_optionC", "stage2_optionD"],
      "isRoot": false,
      "order": 1
    }
    // ... 继续生成阶段2-5的节点
  ]
}

## 重要规则

1. **标题生成**：
   - 必须根据议题主题生成具体标题，不能使用 "[议题主题]" 这样的占位符
   - 标题要简洁（20字以内），准确概括议题核心

2. **阶段结构**：
   - 阶段0：根节点，展示案例描述
   - 阶段1-5：每个阶段2-3个选项
   - **重要**：每个阶段的所有选项节点的 title 必须完全相同（同一个问题，不同选项）
   - **重要**：选项节点的 title 存储的是问题（如"你认为最值得优先关注的是？"）
   - **重要**：选项节点的 content 存储的是选项内容（如"直接后果 - 谁受影响"）

3. **节点Key命名规则**：
   - 格式：stage{阶段号}_option{选项字母}
   - 选项字母：A, B, C, D, E, F...

4. **决策树路径**：
   - 每个节点通过 nextNodeKeys 数组指定可以到达的下一个节点
   - 确保所有路径最终都能到达阶段5

5. **内容要求**：
   - 案例描述：200-300字，包含具体数据、时间、地点、不同群体的反应
   - 节点标题：简洁明了，10-20字
   - 节点内容：选项描述，30-100字

6. **中立性检查**：
   - 不使用"左派"、"右派"、"激进"、"保守"等标签词
   - 不使用"应该"、"必须"等强制性词汇
   - 每个选项都有合理的理由和代价

## 输出要求

请直接返回 JSON 格式，不要包含任何其他说明文字。确保 JSON 格式完全正确，可以直接被 JSON.parse() 解析。

**再次强调**：title 字段必须是具体生成的标题，不能是占位符。

现在请为议题"[议题主题]"生成完整的数据结构。`;
									navigator.clipboard.writeText(promptText).then(() => {
										alert('Prompt 已复制到剪贴板！');
									}).catch(() => {
										alert('复制失败，请手动复制');
									});
								}}
								style={{
									padding: '10px 20px',
									background: 'var(--color-primary)',
									border: 'none',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '14px',
									color: 'white',
									fontWeight: '500'
								}}
							>
								📋 复制 Prompt
							</button>
							<button
								type="button"
								onClick={() => setShowPromptDialog(false)}
								style={{
									padding: '10px 20px',
									background: 'var(--color-background-secondary)',
									border: '1px solid var(--color-border)',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '14px',
									color: 'var(--color-text)'
								}}
							>
								关闭
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 节点编辑对话框 */}
			{editingNode && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000
					}}
					onClick={() => {
						setEditingNode(null);
						setEditingNodeIndex(-1);
					}}
				>
					<div
						style={{
							background: 'var(--color-background)',
							borderRadius: '12px',
							padding: '24px',
							maxWidth: '600px',
							width: '90%',
							maxHeight: '80vh',
							overflowY: 'auto'
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
							编辑节点: {editingNode.nodeKey}
						</h3>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							<div>
								<label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
									节点标题
									{editingNode.stage > 0 && (
										<span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '8px', fontWeight: 'normal' }}>
											（选项节点：这里填写问题，如"你认为最值得优先关注的是？"）
										</span>
									)}
								</label>
								<input
									type="text"
									value={editingNode.title}
									onChange={(e) => setEditingNode({ ...editingNode, title: e.target.value })}
									placeholder={editingNode.stage > 0 ? "输入问题（如：你认为最值得优先关注的是？）" : "输入节点标题..."}
									style={{
										width: '100%',
										padding: '10px',
										border: '1px solid var(--color-border)',
										borderRadius: '6px',
										background: 'var(--color-background-secondary)',
										color: 'var(--color-text)',
										fontSize: '14px'
									}}
								/>
								{editingNode.stage > 0 && (
									<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
										💡 提示：同一阶段的所有选项节点的标题必须相同
									</div>
								)}
							</div>
							<div>
								<label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
									节点内容
									{editingNode.stage > 0 && (
										<span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '8px', fontWeight: 'normal' }}>
											（选项节点：这里填写选项内容，如"直接后果 - 谁受影响"）
										</span>
									)}
								</label>
								<textarea
									value={editingNode.content}
									onChange={(e) => setEditingNode({ ...editingNode, content: e.target.value })}
									rows={6}
									placeholder={editingNode.stage > 0 ? "输入选项内容（如：直接后果 - 谁受影响）" : "输入节点内容..."}
									style={{
										width: '100%',
										padding: '10px',
										border: '1px solid var(--color-border)',
										borderRadius: '6px',
										background: 'var(--color-background-secondary)',
										color: 'var(--color-text)',
										fontSize: '14px',
										fontFamily: 'inherit',
										resize: 'vertical'
									}}
								/>
							</div>
							<div>
								<label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
									下一节点（用逗号分隔，如：stage2_optionA, stage2_optionB）
								</label>
								<input
									type="text"
									value={editingNode.nextNodeKeys.join(', ')}
									onChange={(e) => {
										const nextKeys = e.target.value.split(',').map(k => k.trim()).filter(k => k);
										setEditingNode({ ...editingNode, nextNodeKeys: nextKeys });
									}}
									placeholder="stage2_optionA, stage2_optionB"
									style={{
										width: '100%',
										padding: '10px',
										border: '1px solid var(--color-border)',
										borderRadius: '6px',
										background: 'var(--color-background-secondary)',
										color: 'var(--color-text)',
										fontSize: '14px'
									}}
								/>
							</div>
							<div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
								<button
									type="button"
									onClick={() => {
										setEditingNode(null);
										setEditingNodeIndex(-1);
									}}
									style={{
										padding: '10px 20px',
										background: 'var(--color-background-secondary)',
										border: '1px solid var(--color-border)',
										borderRadius: '6px',
										cursor: 'pointer',
										fontSize: '14px',
										color: 'var(--color-text)'
									}}
								>
									取消
								</button>
								<button
									type="button"
									onClick={handleSaveNode}
									style={{
										padding: '10px 20px',
										background: 'var(--color-primary)',
										border: 'none',
										borderRadius: '6px',
										cursor: 'pointer',
										fontSize: '14px',
										color: 'white',
										fontWeight: '500'
									}}
								>
									保存
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
