'use client';

import { useState, useEffect } from 'react';

interface ConsensusItem {
	text: string;
	supportCount: number;
	docIds: string[];
	similarity?: number;
}

interface DisagreementItem {
	claim1: string;
	claim2: string;
	doc1Id: string;
	doc2Id: string;
	description?: string;
	similarity?: number;
}

interface UserPairConsensusData {
	user1: {
		userId: string;
		email: string;
		name?: string;
	};
	user2: {
		userId: string;
		email: string;
		name?: string;
	};
	consensus: ConsensusItem[];
	disagreements: DisagreementItem[];
	consensusScore: number | null;
	divergenceScore: number | null;
	discussionPaths: Array<{
		path: string[];
		depth: number;
		direction: string;
	}>;
	lastAnalyzedAt: string | null;
}

interface UserPairConsensusProps {
	topicId: string;
	targetUserId: string;
	currentUserId: string;
	onClose?: () => void;
}

export default function UserPairConsensus({
	topicId,
	targetUserId,
	currentUserId,
	onClose
}: UserPairConsensusProps) {
	const [data, setData] = useState<UserPairConsensusData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [analyzing, setAnalyzing] = useState(false);
	const [pollingCount, setPollingCount] = useState(0);

	useEffect(() => {
		let pollInterval: NodeJS.Timeout | null = null;
		let isMounted = true;

		async function fetchData() {
			try {
				setLoading(true);
				setError(null);
				setData(null);
				
				console.log('[UserPairConsensus] Fetching data:', { topicId, targetUserId, currentUserId });
				
				const response = await fetch(
					`/api/topics/${topicId}/consensus/users/${targetUserId}?currentUserId=${currentUserId}`
				);
				
				console.log('[UserPairConsensus] Response status:', response.status);
				
				let result: any = {};
				try {
					const text = await response.text();
					if (text) {
						result = JSON.parse(text);
					}
				} catch (e) {
					// 如果响应体不是JSON或为空，使用默认错误信息
					console.warn('[UserPairConsensus] Failed to parse response:', e);
				}
				
				// 处理202 Accepted状态（分析已触发，正在处理）
				if (response.status === 202 && result.analyzing) {
					console.log('[UserPairConsensus] Analysis triggered, starting polling...');
					setAnalyzing(true);
					setPollingCount(0);
					
					// 开始轮询，每3秒检查一次，最多轮询20次（1分钟）
					let pollCount = 0;
					pollInterval = setInterval(async () => {
						if (!isMounted) {
							if (pollInterval) clearInterval(pollInterval);
							return;
						}
						
						pollCount++;
						setPollingCount(pollCount);
						
						if (pollCount >= 20) {
							// 超过1分钟，停止轮询
							if (pollInterval) clearInterval(pollInterval);
							setAnalyzing(false);
							setError('分析超时，请稍后刷新页面查看结果');
							setLoading(false);
							return;
						}
						
						try {
							const pollResponse = await fetch(
								`/api/topics/${topicId}/consensus/users/${targetUserId}?currentUserId=${currentUserId}`
							);
							
							let pollResult: any = {};
							try {
								const text = await pollResponse.text();
								if (text) {
									pollResult = JSON.parse(text);
								}
							} catch (e) {
								console.warn('[UserPairConsensus] Failed to parse poll response:', e);
							}
							
							if (pollResponse.ok) {
								// 分析完成，获取结果
								console.log('[UserPairConsensus] Analysis completed, data received:', pollResult);
								if (pollInterval) clearInterval(pollInterval);
								setAnalyzing(false);
								setData(pollResult);
								setLoading(false);
							} else if (pollResponse.status === 202) {
								// 仍在分析中，继续轮询
								console.log(`[UserPairConsensus] Still analyzing... (poll ${pollCount}/20)`);
							} else {
								// 其他错误，停止轮询
								if (pollInterval) clearInterval(pollInterval);
								setAnalyzing(false);
								setError(pollResult.error || pollResult.message || '获取分析结果失败');
								setLoading(false);
							}
						} catch (pollErr: any) {
							console.error('[UserPairConsensus] Polling error:', pollErr);
							// 继续轮询，不中断
						}
					}, 3000); // 每3秒轮询一次
					
					setLoading(false);
					return;
				}
				
				if (!response.ok) {
					console.error('[UserPairConsensus] API error:', result, 'Status:', response.status);
					throw new Error(result.error || result.message || `获取用户对共识失败 (${response.status})`);
				}
				
				console.log('[UserPairConsensus] Data received:', result);
				setData(result);
				setAnalyzing(false);
			} catch (err: any) {
				const errorText = err.message || '加载失败';
				console.error('[UserPairConsensus] Error:', err);
				setError(errorText);
				setAnalyzing(false);
			} finally {
				setLoading(false);
			}
		}

		if (topicId && targetUserId && currentUserId) {
			fetchData();
		} else {
			console.warn('[UserPairConsensus] Missing required params:', { topicId, targetUserId, currentUserId });
			setLoading(false);
		}

		// 清理函数：组件卸载时清除轮询
		return () => {
			isMounted = false;
			if (pollInterval) {
				clearInterval(pollInterval);
			}
		};
	}, [topicId, targetUserId, currentUserId]);

	if (loading || analyzing) {
		return (
			<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
				{analyzing ? (
					<>
						<div style={{ marginBottom: 'var(--spacing-md)' }}>
							<div style={{
								display: 'inline-block',
								width: '40px',
								height: '40px',
								border: '4px solid var(--color-border-light)',
								borderTop: '4px solid var(--color-primary)',
								borderRadius: '50%',
								animation: 'spin 1s linear infinite',
								marginBottom: 'var(--spacing-md)'
							}} />
						</div>
						<div style={{ fontSize: 'var(--font-size-base)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
							正在分析用户对共识...
						</div>
						<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
							{pollingCount > 0 && `已等待 ${pollingCount * 3} 秒...`}
						</div>
						<style>{`
							@keyframes spin {
								0% { transform: rotate(0deg); }
								100% { transform: rotate(360deg); }
							}
						`}</style>
					</>
				) : (
					'加载中...'
				)}
			</div>
		);
	}

	if (error) {
		const isAnalysisPending = error.includes('分析尚未完成') || error.includes('未找到用户对共识记录');
		
		return (
			<div style={{ padding: 'var(--spacing-xl)' }}>
				<div style={{ 
					padding: 'var(--spacing-md)', 
					background: isAnalysisPending ? 'var(--color-warning)' : 'var(--color-error)', 
					color: 'white',
					borderRadius: 'var(--radius-md)',
					marginBottom: 'var(--spacing-md)'
				}}>
					{error}
				</div>
				{isAnalysisPending && (
					<button
						onClick={async () => {
							try {
								const res = await fetch(`/api/topics/${topicId}/consensus/trigger`, {
									method: 'POST'
								});
								const result = await res.json();
								if (res.ok) {
									alert('分析已触发，请稍候刷新页面查看结果');
								} else {
									alert(`触发失败：${result.error}`);
								}
							} catch (err: any) {
								alert(`触发失败：${err.message}`);
							}
						}}
						style={{
							padding: 'var(--spacing-sm) var(--spacing-md)',
							background: 'var(--color-primary)',
							color: 'white',
							border: 'none',
							borderRadius: 'var(--radius-md)',
							cursor: 'pointer',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500
						}}
					>
						触发分析
					</button>
				)}
				{onClose && (
					<button
						onClick={onClose}
						style={{
							padding: 'var(--spacing-sm) var(--spacing-md)',
							background: 'var(--color-bg-secondary)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							cursor: 'pointer'
						}}
					>
						关闭
					</button>
				)}
			</div>
		);
	}

	if (!data) {
		return (
			<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
				<p>暂无数据</p>
				<p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-sm)' }}>
					如果这是新用户对，可能需要等待分析完成
				</p>
			</div>
		);
	}

	return (
		<div style={{ padding: 'var(--spacing-lg)' }}>
			{/* 头部：用户信息对比 */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginBottom: 'var(--spacing-lg)',
				paddingBottom: 'var(--spacing-md)',
				borderBottom: '2px solid var(--color-border)'
			}}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
					<div style={{
						padding: 'var(--spacing-sm) var(--spacing-md)',
						background: 'var(--color-bg-secondary)',
						borderRadius: 'var(--radius-md)',
						fontWeight: 600
					}}>
						{data.user1.name || data.user1.email}
					</div>
					<div style={{ color: 'var(--color-text-secondary)' }}>vs</div>
					<div style={{
						padding: 'var(--spacing-sm) var(--spacing-md)',
						background: 'var(--color-bg-secondary)',
						borderRadius: 'var(--radius-md)',
						fontWeight: 600
					}}>
						{data.user2.name || data.user2.email}
					</div>
				</div>
				{onClose && (
					<button
						onClick={onClose}
						style={{
							padding: 'var(--spacing-xs) var(--spacing-sm)',
							background: 'transparent',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-sm)',
							cursor: 'pointer',
							fontSize: 'var(--font-size-sm)'
						}}
					>
						关闭
					</button>
				)}
			</div>

			{/* 指标卡片 */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: '1fr 1fr',
				gap: 'var(--spacing-md)',
				marginBottom: 'var(--spacing-lg)'
			}}>
				{data.consensusScore !== null && (
					<div style={{
						padding: 'var(--spacing-md)',
						background: 'var(--color-bg)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)'
					}}>
						<div style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-secondary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							共识度
						</div>
						<div style={{
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 700,
							color: 'var(--color-success)'
						}}>
							{(data.consensusScore * 100).toFixed(1)}%
						</div>
						<div style={{
							marginTop: 'var(--spacing-xs)',
							height: '6px',
							background: 'var(--color-border-light)',
							borderRadius: 'var(--radius-sm)',
							overflow: 'hidden'
						}}>
							<div style={{
								height: '100%',
								width: `${data.consensusScore * 100}%`,
								background: 'var(--color-success)',
								transition: 'width 0.3s ease'
							}} />
						</div>
					</div>
				)}
				
				{data.divergenceScore !== null && (
					<div style={{
						padding: 'var(--spacing-md)',
						background: 'var(--color-bg)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)'
					}}>
						<div style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-secondary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							分歧度
						</div>
						<div style={{
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 700,
							color: 'var(--color-error)'
						}}>
							{(data.divergenceScore * 100).toFixed(1)}%
						</div>
						<div style={{
							marginTop: 'var(--spacing-xs)',
							height: '6px',
							background: 'var(--color-border-light)',
							borderRadius: 'var(--radius-sm)',
							overflow: 'hidden'
						}}>
							<div style={{
								height: '100%',
								width: `${data.divergenceScore * 100}%`,
								background: 'var(--color-error)',
								transition: 'width 0.3s ease'
							}} />
						</div>
					</div>
				)}
			</div>

			{/* 共识点列表 */}
			{data.consensus.length > 0 && (
				<div style={{ marginBottom: 'var(--spacing-lg)' }}>
					<h3 style={{
						fontSize: 'var(--font-size-lg)',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-success)'
					}}>
						共识点 ({data.consensus.length})
					</h3>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						{data.consensus.map((item, idx) => (
							<div
								key={idx}
								style={{
									padding: 'var(--spacing-md)',
									background: 'var(--color-bg)',
									border: '1px solid var(--color-success)',
									borderLeft: '4px solid var(--color-success)',
									borderRadius: 'var(--radius-md)'
								}}
							>
								<div style={{ marginBottom: 'var(--spacing-xs)' }}>
									{item.text}
								</div>
								<div style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									fontSize: 'var(--font-size-xs)',
									color: 'var(--color-text-secondary)'
								}}>
									<span>{item.supportCount} 个文档支持</span>
									{item.similarity !== undefined && (
										<span>相似度: {(item.similarity * 100).toFixed(1)}%</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* 分歧点列表 */}
			{data.disagreements.length > 0 && (
				<div>
					<h3 style={{
						fontSize: 'var(--font-size-lg)',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-error)'
					}}>
						分歧点 ({data.disagreements.length})
					</h3>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
						{data.disagreements.map((item, idx) => (
							<div
								key={idx}
								style={{
									padding: 'var(--spacing-md)',
									background: 'var(--color-bg)',
									border: '1px solid var(--color-error)',
									borderLeft: '4px solid var(--color-error)',
									borderRadius: 'var(--radius-md)'
								}}
							>
								<div style={{
									display: 'grid',
									gridTemplateColumns: '1fr auto 1fr',
									gap: 'var(--spacing-md)',
									alignItems: 'start',
									marginBottom: item.description ? 'var(--spacing-sm)' : 0
								}}>
									<div>
										<div style={{
											fontSize: 'var(--font-size-xs)',
											color: 'var(--color-text-secondary)',
											marginBottom: 'var(--spacing-xs)'
										}}>
											{data.user1.name || data.user1.email} 的观点：
										</div>
										<div style={{
											padding: 'var(--spacing-sm)',
											background: 'var(--color-bg-secondary)',
											borderRadius: 'var(--radius-sm)'
										}}>
											{item.claim1}
										</div>
									</div>
									<div style={{
										padding: 'var(--spacing-xs)',
										color: 'var(--color-error)',
										fontWeight: 600
									}}>
										vs
									</div>
									<div>
										<div style={{
											fontSize: 'var(--font-size-xs)',
											color: 'var(--color-text-secondary)',
											marginBottom: 'var(--spacing-xs)'
										}}>
											{data.user2.name || data.user2.email} 的观点：
										</div>
										<div style={{
											padding: 'var(--spacing-sm)',
											background: 'var(--color-bg-secondary)',
											borderRadius: 'var(--radius-sm)'
										}}>
											{item.claim2}
										</div>
									</div>
								</div>
								{item.description && (
									<div style={{
										marginTop: 'var(--spacing-sm)',
										padding: 'var(--spacing-sm)',
										background: 'var(--color-bg-secondary)',
										borderRadius: 'var(--radius-sm)',
										fontSize: 'var(--font-size-sm)',
										color: 'var(--color-text-secondary)',
										fontStyle: 'italic'
									}}>
										{item.description}
									</div>
								)}
								{item.similarity !== undefined && (
									<div style={{
										marginTop: 'var(--spacing-xs)',
										fontSize: 'var(--font-size-xs)',
										color: 'var(--color-text-secondary)',
										textAlign: 'right'
									}}>
										相似度: {(item.similarity * 100).toFixed(1)}%
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* 如果没有共识和分歧 */}
			{data.consensus.length === 0 && data.disagreements.length === 0 && (
				<div style={{
					padding: 'var(--spacing-xl)',
					textAlign: 'center',
					color: 'var(--color-text-secondary)'
				}}>
					暂无共识和分歧数据
				</div>
			)}

			{/* 最后分析时间 */}
			{data.lastAnalyzedAt && (
				<div style={{
					marginTop: 'var(--spacing-lg)',
					paddingTop: 'var(--spacing-md)',
					borderTop: '1px solid var(--color-border)',
					fontSize: 'var(--font-size-xs)',
					color: 'var(--color-text-secondary)',
					textAlign: 'center'
				}}>
					最后分析时间: {new Date(data.lastAnalyzedAt).toLocaleString('zh-CN')}
				</div>
			)}
		</div>
	);
}



