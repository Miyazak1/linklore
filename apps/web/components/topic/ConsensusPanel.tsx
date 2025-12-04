'use client';
import { useEffect, useState } from 'react';
import ConsensusTrendChart from './ConsensusTrendChart';

type ConsensusData = {
	consensus: Array<{ text: string; supportCount: number; docIndices: number[] }>;
	unverified: Array<{ text: string; docIndex: number }>;
	totalDocs: number;
	snapshot?: {
		consensusScore: number | null;
		divergenceScore: number | null;
		trend: 'converging' | 'diverging' | 'stable';
		snapshotAt: string;
	};
};

export default function ConsensusPanel({ topicId }: { topicId: string }) {
	const [data, setData] = useState<ConsensusData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadData = async () => {
		setError(null);
		try {
			const res = await fetch(`/api/topics/${topicId}/consensus`);
			const result = await res.json();
			if (result.error) {
				setError(result.error);
			} else {
				setData(result);
			}
		} catch (err: any) {
			setError(err.message || '加载失败');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
		// 自动轮询刷新：每10秒检查一次是否有新数据
		const interval = setInterval(() => {
			loadData();
		}, 10000); // 10秒轮询一次

		return () => clearInterval(interval);
	}, [topicId]);


	if (loading) {
		return (
			<div className="card-academic" style={{ borderLeftColor: 'var(--color-secondary)' }}>
				<h3 style={{ marginTop: 0, color: 'var(--color-secondary)' }}>共识分析</h3>
				<p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }}>分析中...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="card-academic" style={{ borderLeftColor: 'var(--color-error)' }}>
				<h3 style={{ marginTop: 0, color: 'var(--color-error)' }}>共识分析</h3>
				<p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>错误：{error}</p>
			</div>
		);
	}

	if (!data || data.totalDocs < 2) {
		return (
			<div className="card-academic" style={{ borderLeftColor: 'var(--color-text-tertiary)' }}>
				<h3 style={{ marginTop: 0 }}>共识分析</h3>
				<p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-sm)' }}>
					{data?.totalDocs === 1 ? '需要至少 2 个文档才能进行共识分析' : '暂无数据'}
				</p>
				<p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', margin: 0, lineHeight: 'var(--line-height-relaxed)' }}>
					<strong>提示：</strong>可以上传多个文档（可以是同一用户）来测试共识分析功能。
					AI 会自动分析文档中的观点，识别共识点和分歧点。
				</p>
			</div>
		);
	}

	// 趋势图标和文字
	const trendIcon = data.snapshot?.trend === 'converging' ? '📈' : 
	                  data.snapshot?.trend === 'diverging' ? '📉' : '➡️';
	const trendText = data.snapshot?.trend === 'converging' ? '趋于一致' : 
	                  data.snapshot?.trend === 'diverging' ? '趋于分歧' : '保持稳定';
	const trendColor = data.snapshot?.trend === 'converging' ? 'var(--color-success)' :
	                   data.snapshot?.trend === 'diverging' ? 'var(--color-error)' : 'var(--color-text-secondary)';

	return (
		<div className="card-academic" style={{ borderLeftColor: 'var(--color-secondary)' }}>
			<h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', color: 'var(--color-secondary)' }}>
				话题整体共识分析
			</h3>
			
			{/* 共识度指标 */}
			{data.snapshot && (
				<div style={{ 
					marginBottom: 'var(--spacing-lg)',
					padding: 'var(--spacing-md)',
					background: 'var(--color-background-subtle)',
					borderRadius: 'var(--radius-sm)',
					border: '1px solid var(--color-border-light)'
				}}>
					<div style={{ 
						display: 'flex', 
						alignItems: 'center', 
						gap: 'var(--spacing-sm)',
						marginBottom: 'var(--spacing-sm)'
					}}>
						<span style={{ fontSize: 'var(--font-size-lg)' }}>{trendIcon}</span>
						<span style={{ 
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							color: trendColor
						}}>
							{trendText}
						</span>
					</div>
					
					<div style={{ 
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 'var(--spacing-md)',
						marginTop: 'var(--spacing-sm)'
					}}>
						{/* 共识度 - 始终显示，即使为0 */}
						<div>
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
								{data.snapshot.consensusScore !== null && typeof data.snapshot.consensusScore === 'number'
									? (data.snapshot.consensusScore * 100).toFixed(1)
									: '0.0'}%
							</div>
							{/* 进度条 */}
							<div style={{
								marginTop: 'var(--spacing-xs)',
								height: '6px',
								background: 'var(--color-border-light)',
								borderRadius: 'var(--radius-sm)',
								overflow: 'hidden'
							}}>
								<div style={{
									height: '100%',
									width: `${(data.snapshot.consensusScore !== null && typeof data.snapshot.consensusScore === 'number' ? data.snapshot.consensusScore : 0) * 100}%`,
									background: 'var(--color-success)',
									transition: 'width 0.3s ease'
								}} />
							</div>
						</div>
						
						{/* 分歧度 - 始终显示，即使为0 */}
						<div>
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
								{data.snapshot.divergenceScore !== null && typeof data.snapshot.divergenceScore === 'number'
									? (data.snapshot.divergenceScore * 100).toFixed(1)
									: '0.0'}%
							</div>
							{/* 进度条 */}
							<div style={{
								marginTop: 'var(--spacing-xs)',
								height: '6px',
								background: 'var(--color-border-light)',
								borderRadius: 'var(--radius-sm)',
								overflow: 'hidden'
							}}>
								<div style={{
									height: '100%',
									width: `${(data.snapshot.divergenceScore !== null && typeof data.snapshot.divergenceScore === 'number' ? data.snapshot.divergenceScore : 0) * 100}%`,
									background: 'var(--color-error)',
									transition: 'width 0.3s ease'
								}} />
							</div>
						</div>
					</div>
					
					{data.snapshot.snapshotAt && (
						<div style={{ 
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-tertiary)',
							marginTop: 'var(--spacing-sm)',
							textAlign: 'right'
						}}>
							更新于：{new Date(data.snapshot.snapshotAt).toLocaleString('zh-CN')}
						</div>
					)}
				</div>
			)}
			
			{/* 共识趋势图 */}
			<div style={{ marginBottom: 'var(--spacing-lg)' }}>
				<ConsensusTrendChart topicId={topicId} />
			</div>
			
			<div style={{ fontSize: 'var(--font-size-sm)' }}>
				{data.consensus.length > 0 && (
					<div style={{ marginBottom: 'var(--spacing-lg)' }}>
						<h4 style={{ 
							margin: '0 0 var(--spacing-sm) 0', 
							fontSize: 'var(--font-size-base)', 
							color: 'var(--color-success)',
							fontWeight: 600,
							paddingBottom: 'var(--spacing-xs)',
							borderBottom: '1px solid var(--color-border-light)'
						}}>
							已共识 <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>({data.consensus.length})</span>
						</h4>
						<ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', color: 'var(--color-text-primary)', listStyle: 'disc' }}>
							{data.consensus.map((item, idx) => (
								<li key={idx} style={{ marginBottom: 'var(--spacing-sm)', lineHeight: 'var(--line-height-relaxed)' }}>
									<div style={{ marginBottom: 'var(--spacing-xs)' }}>{item.text}</div>
									<small style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
										文档 #{item.docIndices.join(', #')} 支持 ({item.supportCount} 个文档)
									</small>
								</li>
							))}
						</ul>
					</div>
				)}
				{data.unverified.length > 0 && (
					<div>
						<h4 style={{ 
							margin: '0 0 var(--spacing-sm) 0', 
							fontSize: 'var(--font-size-base)', 
							color: 'var(--color-warning)',
							fontWeight: 600,
							paddingBottom: 'var(--spacing-xs)',
							borderBottom: '1px solid var(--color-border-light)'
						}}>
							待验证 <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>({data.unverified.length})</span>
						</h4>
						<ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', color: 'var(--color-text-primary)', listStyle: 'disc' }}>
							{data.unverified.slice(0, 5).map((item, idx) => (
								<li key={idx} style={{ marginBottom: 'var(--spacing-sm)', lineHeight: 'var(--line-height-relaxed)' }}>
									<div style={{ marginBottom: 'var(--spacing-xs)' }}>{item.text}</div>
									<small style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
										文档 #{item.docIndex}
									</small>
								</li>
							))}
							{data.unverified.length > 5 && (
								<li style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontSize: 'var(--font-size-xs)' }}>
									还有 {data.unverified.length - 5} 个待验证观点...
								</li>
							)}
						</ul>
					</div>
				)}
				{data.consensus.length === 0 && data.unverified.length === 0 && (
					<p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }}>
						暂无共识分析结果
					</p>
				)}
			</div>
		</div>
	);
}



