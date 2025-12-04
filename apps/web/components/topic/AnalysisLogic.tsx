'use client';
import { useState } from 'react';

export default function AnalysisLogic() {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="card-academic" style={{ 
			borderLeftColor: 'var(--color-text-tertiary)',
			padding: 'var(--spacing-lg)'
		}}>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				style={{
					width: '100%',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					padding: 0,
					marginBottom: expanded ? 'var(--spacing-md)' : 0
				}}
			>
				<h3 style={{ 
					margin: 0,
					fontSize: 'var(--font-size-base)',
					fontWeight: 600,
					color: 'var(--color-text-primary)',
					textAlign: 'left'
				}}>
					分析逻辑说明
				</h3>
				<span style={{ 
					fontSize: 'var(--font-size-lg)',
					color: 'var(--color-text-secondary)',
					transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
					transition: 'transform var(--transition-fast)'
				}}>
					▼
				</span>
			</button>
			
			{expanded && (
				<div style={{ 
					fontSize: 'var(--font-size-xs)',
					color: 'var(--color-text-secondary)',
					lineHeight: 'var(--line-height-relaxed)'
				}}>
					{/* AI 评价逻辑 */}
					<div style={{ marginBottom: 'var(--spacing-md)' }}>
						<h4 style={{ 
							margin: '0 0 var(--spacing-xs) 0',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-primary)'
						}}>
							AI 评价
						</h4>
						<p style={{ margin: 0, marginBottom: 'var(--spacing-xs)' }}>
							AI 根据学科类型（默认/哲学/文学/历史/科学）使用不同的评价维度：
						</p>
						<ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xs)' }}>
							<li><strong>默认：</strong>结构(20%)、逻辑(25%)、观点(25%)、证据(20%)、引用(10%)</li>
							<li><strong>哲学：</strong>结构(15%)、逻辑(30%)、观点(30%)、论证(15%)、引用(10%)</li>
							<li><strong>文学：</strong>结构(20%)、表达(30%)、观点(25%)、材料(15%)、引用(10%)</li>
							<li><strong>历史：</strong>结构(15%)、逻辑(20%)、观点(25%)、史料(30%)、引用(10%)</li>
							<li><strong>科学：</strong>结构(15%)、逻辑(25%)、观点(20%)、数据(30%)、引用(10%)</li>
						</ul>
						<p style={{ margin: 0, fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>
							评分标准：9-10分（优秀）、7-8分（良好）、5-6分（中等）、0-4分（较差）
						</p>
					</div>

					{/* 质量信号逻辑 */}
					<div style={{ marginBottom: 'var(--spacing-md)' }}>
						<h4 style={{ 
							margin: '0 0 var(--spacing-xs) 0',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-accent-warm)'
						}}>
							质量信号
						</h4>
						<ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
							<li><strong>严谨度：</strong>逻辑与证据的平均分</li>
							<li><strong>清晰度：</strong>结构维度得分</li>
							<li><strong>引用完整度：</strong>引用维度得分</li>
							<li><strong>原创性：</strong>观点维度得分</li>
						</ul>
						<p style={{ margin: 'var(--spacing-xs) 0 0 0', fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>
							质量信号基于所有文档的评价结果计算平均值
						</p>
					</div>

					{/* 共识分析逻辑 */}
					<div>
						<h4 style={{ 
							margin: '0 0 var(--spacing-xs) 0',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-secondary)'
						}}>
							共识分析
						</h4>
						<p style={{ margin: 0, marginBottom: 'var(--spacing-xs)' }}>
							AI 分析主题文档与回复文档的观点，识别：
						</p>
						<ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
							<li><strong>共识点：</strong>主题文档和回复文档都支持或表达相似的相同观点（至少2个文档支持）</li>
							<li><strong>分歧点：</strong>主题文档的观点与回复文档的观点之间的冲突和对立（重点关注回复文档如何反驳、质疑或补充主题文档的观点）</li>
							<li><strong>待验证点：</strong>某个文档单独提出的观点，尚未得到其他文档支持或反驳</li>
						</ul>
						<p style={{ margin: 'var(--spacing-xs) 0 0 0', fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>
							需要至少2个文档才能进行共识分析（文档 #1 是主题文档，其他是回复文档）
						</p>
					</div>
				</div>
			)}
		</div>
	);
}



