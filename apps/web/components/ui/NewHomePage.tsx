'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface NewHomePageProps {
	stats: {
		totalTopics: number;
		totalDocuments: number;
		totalUsers: number;
		totalBooks: number;
		totalTraces?: number;
		totalEntries?: number;
	};
}

/**
 * 新首页组件 - 体现"去伪存真"理念
 * 
 * 核心理念：
 * - 去伪存真：通过严谨的讨论和溯源，去除虚假信息，保留真实知识
 * - 接近事实：通过多角度讨论、语义溯源、共识分析，不断接近事实真相
 * - 科学认识：基于证据、逻辑和共识，构建科学的知识体系
 */
export default function NewHomePage({ stats }: NewHomePageProps) {
	const [isVisible, setIsVisible] = useState(false);
	const heroRef = useRef<HTMLDivElement>(null);
	const cardsRef = useRef<HTMLDivElement>(null);
	const workflowRef = useRef<HTMLDivElement>(null);
	const statsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setIsVisible(true);
	}, []);

	return (
		<div style={{ 
			maxWidth: 1400, 
			margin: '0 auto',
			padding: 'clamp(var(--spacing-lg), 4vw, var(--spacing-xxl)) clamp(var(--spacing-md), 3vw, var(--spacing-xl))',
			position: 'relative'
		}}>
			{/* 核心理念展示区 */}
			<div 
				ref={heroRef}
				style={{
					textAlign: 'center',
					marginBottom: 'var(--spacing-xxl)',
					padding: 'var(--spacing-xxl) var(--spacing-xl)',
					background: 'var(--color-background-paper)',
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-border-light)',
					boxShadow: 'var(--shadow-subtle)'
				}}
			>
				<h1 style={{
					fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
					fontWeight: 600,
					marginBottom: 'var(--spacing-md)',
					color: 'var(--color-text-primary)',
					lineHeight: 1.3,
					letterSpacing: '-0.01em'
				}}>
					去伪存真，接近事实
				</h1>
				<p style={{
					fontSize: 'var(--font-size-base)',
					color: 'var(--color-text-secondary)',
					marginBottom: 'var(--spacing-xl)',
					lineHeight: 'var(--line-height-relaxed)',
					maxWidth: 700,
					margin: '0 auto var(--spacing-xl)'
				}}>
					通过严谨的讨论、语义溯源和共识分析，去除虚假信息，保留真实知识，不断接近事实的本来面目，更科学地认识世界。
				</p>
				<div style={{
					display: 'flex',
					justifyContent: 'center',
					gap: 'var(--spacing-md)',
					flexWrap: 'wrap'
				}}>
					<Link 
						href="/upload"
						style={{
							padding: 'var(--spacing-sm) var(--spacing-lg)',
							background: 'var(--color-primary)',
							color: 'white',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500,
							textDecoration: 'none',
							transition: 'background-color var(--transition-fast)',
							border: 'none'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--color-primary-dark)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'var(--color-primary)';
						}}
					>
						进入讨论版
					</Link>
					<Link 
						href="/traces"
						style={{
							padding: 'var(--spacing-sm) var(--spacing-lg)',
							background: 'transparent',
							color: 'var(--color-text-primary)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500,
							textDecoration: 'none',
							transition: 'border-color var(--transition-fast), color var(--transition-fast)'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
							e.currentTarget.style.color = 'var(--color-primary)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
							e.currentTarget.style.color = 'var(--color-text-primary)';
						}}
					>
						语义溯源
					</Link>
					<Link 
						href="/entries"
						style={{
							padding: 'var(--spacing-sm) var(--spacing-lg)',
							background: 'transparent',
							color: 'var(--color-text-primary)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500,
							textDecoration: 'none',
							transition: 'border-color var(--transition-fast), color var(--transition-fast)'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
							e.currentTarget.style.color = 'var(--color-primary)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
							e.currentTarget.style.color = 'var(--color-text-primary)';
						}}
					>
						知识词条
					</Link>
				</div>
			</div>

			{/* 三大核心功能 */}
			<div 
				ref={cardsRef}
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
					gap: 'var(--spacing-lg)',
					marginBottom: 'var(--spacing-xxl)'
				}}
			>
				{/* 讨论版 */}
				<div className="card-academic" style={{
					padding: 'var(--spacing-lg)',
					borderLeft: '3px solid var(--color-primary)',
					transition: 'border-color var(--transition-fast)',
					cursor: 'pointer',
					background: 'var(--color-background-paper)'
				}}
				onClick={() => window.location.href = '/upload'}
				onMouseEnter={(e) => {
					e.currentTarget.style.borderLeftColor = 'var(--color-primary-dark)';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderLeftColor = 'var(--color-primary)';
				}}
				>
					<div style={{
						fontSize: 'var(--font-size-2xl)',
						marginBottom: 'var(--spacing-sm)',
						opacity: 0.8
					}}>💬</div>
					<h3 style={{
						fontSize: 'var(--font-size-lg)',
						fontWeight: 600,
						marginBottom: 'var(--spacing-xs)',
						color: 'var(--color-text-primary)'
					}}>讨论版</h3>
					<p style={{
						color: 'var(--color-text-secondary)',
						lineHeight: 'var(--line-height-relaxed)',
						marginBottom: 'var(--spacing-sm)',
						fontSize: 'var(--font-size-sm)'
					}}>
						通过多角度、多层次的严肃讨论，分析不同观点，识别共识与分歧，逐步接近事实真相。
					</p>
					<div style={{
						fontSize: 'var(--font-size-xs)',
						color: 'var(--color-text-tertiary)',
						marginTop: 'var(--spacing-xs)'
					}}>
						{stats.totalTopics} 个话题 · {stats.totalDocuments} 个文档
					</div>
				</div>

				{/* 语义溯源 */}
				<div className="card-academic" style={{
					padding: 'var(--spacing-lg)',
					borderLeft: '3px solid var(--color-secondary)',
					transition: 'border-color var(--transition-fast)',
					cursor: 'pointer',
					background: 'var(--color-background-paper)'
				}}
				onClick={() => window.location.href = '/traces'}
				onMouseEnter={(e) => {
					e.currentTarget.style.borderLeftColor = '#7a5fa0';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderLeftColor = 'var(--color-secondary)';
				}}
				>
					<div style={{
						fontSize: 'var(--font-size-2xl)',
						marginBottom: 'var(--spacing-sm)',
						opacity: 0.8
					}}>🔍</div>
					<h3 style={{
						fontSize: 'var(--font-size-lg)',
						fontWeight: 600,
						marginBottom: 'var(--spacing-xs)',
						color: 'var(--color-text-primary)'
					}}>语义溯源</h3>
					<p style={{
						color: 'var(--color-text-secondary)',
						lineHeight: 'var(--line-height-relaxed)',
						marginBottom: 'var(--spacing-sm)',
						fontSize: 'var(--font-size-sm)'
					}}>
						通过查找和引用可靠来源，追溯概念、事实、事件的原始含义，还原语义真相。
					</p>
					<div style={{
						fontSize: 'var(--font-size-xs)',
						color: 'var(--color-text-tertiary)',
						marginTop: 'var(--spacing-xs)'
					}}>
						{stats.totalTraces || 0} 个溯源 · {stats.totalEntries || 0} 个词条
					</div>
				</div>

				{/* 知识词条 */}
				<div className="card-academic" style={{
					padding: 'var(--spacing-lg)',
					borderLeft: '3px solid var(--color-success)',
					transition: 'border-color var(--transition-fast)',
					cursor: 'pointer',
					background: 'var(--color-background-paper)'
				}}
				onClick={() => window.location.href = '/entries'}
				onMouseEnter={(e) => {
					e.currentTarget.style.borderLeftColor = '#3d8f42';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderLeftColor = 'var(--color-success)';
				}}
				>
					<div style={{
						fontSize: 'var(--font-size-2xl)',
						marginBottom: 'var(--spacing-sm)',
						opacity: 0.8
					}}>📖</div>
					<h3 style={{
						fontSize: 'var(--font-size-lg)',
						fontWeight: 600,
						marginBottom: 'var(--spacing-xs)',
						color: 'var(--color-text-primary)'
					}}>知识词条</h3>
					<p style={{
						color: 'var(--color-text-secondary)',
						lineHeight: 'var(--line-height-relaxed)',
						marginBottom: 'var(--spacing-sm)',
						fontSize: 'var(--font-size-sm)'
					}}>
						收录经过验证、高可信度的语义溯源，形成可靠的知识库，为科学认识世界提供基础。
					</p>
					<div style={{
						fontSize: 'var(--font-size-xs)',
						color: 'var(--color-text-tertiary)',
						marginTop: 'var(--spacing-xs)'
					}}>
						{stats.totalEntries || 0} 个词条
					</div>
				</div>
			</div>

			{/* 工作流程说明 */}
			<div 
				ref={workflowRef}
				style={{
					padding: 'var(--spacing-xl)',
					background: 'var(--color-background-paper)',
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-border-light)',
					marginBottom: 'var(--spacing-xxl)'
				}}
			>
				<h2 style={{
					fontSize: 'var(--font-size-xl)',
					fontWeight: 600,
					marginBottom: 'var(--spacing-lg)',
					color: 'var(--color-text-primary)',
					textAlign: 'center'
				}}>如何接近真相？</h2>
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
					gap: 'var(--spacing-lg)'
				}}>
					<div style={{ textAlign: 'center' }}>
						<div style={{
							width: '40px',
							height: '40px',
							borderRadius: '50%',
							background: 'var(--color-primary)',
							color: 'white',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							margin: '0 auto var(--spacing-sm)'
						}}>1</div>
						<h4 style={{
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							marginBottom: 'var(--spacing-xs)'
						}}>多角度讨论</h4>
						<p style={{
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)',
							lineHeight: 'var(--line-height-relaxed)'
						}}>
							不同观点碰撞，AI分析共识与分歧
						</p>
					</div>
					<div style={{ textAlign: 'center' }}>
						<div style={{
							width: '40px',
							height: '40px',
							borderRadius: '50%',
							background: 'var(--color-secondary)',
							color: 'white',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							margin: '0 auto var(--spacing-sm)'
						}}>2</div>
						<h4 style={{
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							marginBottom: 'var(--spacing-xs)'
						}}>语义溯源</h4>
						<p style={{
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)',
							lineHeight: 'var(--line-height-relaxed)'
						}}>
							追溯来源，引用证据，还原真相
						</p>
					</div>
					<div style={{ textAlign: 'center' }}>
						<div style={{
							width: '40px',
							height: '40px',
							borderRadius: '50%',
							background: 'var(--color-success)',
							color: 'white',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							margin: '0 auto var(--spacing-sm)'
						}}>3</div>
						<h4 style={{
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							marginBottom: 'var(--spacing-xs)'
						}}>形成共识</h4>
						<p style={{
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)',
							lineHeight: 'var(--line-height-relaxed)'
						}}>
							AI评估可信度，高可信内容进入词条
						</p>
					</div>
					<div style={{ textAlign: 'center' }}>
						<div style={{
							width: '40px',
							height: '40px',
							borderRadius: '50%',
							background: 'var(--color-warning)',
							color: 'white',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							margin: '0 auto var(--spacing-sm)'
						}}>4</div>
						<h4 style={{
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							marginBottom: 'var(--spacing-xs)'
						}}>知识沉淀</h4>
						<p style={{
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)',
							lineHeight: 'var(--line-height-relaxed)'
						}}>
							构建可靠知识库，持续更新完善
						</p>
					</div>
				</div>
			</div>

			{/* 统计数据 */}
			<div 
				ref={statsRef}
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
					gap: 'var(--spacing-md)',
					marginBottom: 'var(--spacing-xxl)'
				}}
			>
				<div className="card-academic" style={{
					padding: 'var(--spacing-lg)',
					textAlign: 'center',
					borderLeftColor: 'var(--color-primary)'
				}}>
					<div style={{
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						marginBottom: 'var(--spacing-xs)',
						lineHeight: 1.2
					}}>
						{stats.totalTopics}
					</div>
					<div style={{
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-secondary)'
					}}>讨论话题</div>
				</div>
				<div className="card-academic" style={{
					padding: 'var(--spacing-lg)',
					textAlign: 'center',
					borderLeftColor: 'var(--color-secondary)'
				}}>
					<div style={{
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						marginBottom: 'var(--spacing-xs)',
						lineHeight: 1.2
					}}>
						{stats.totalTraces || 0}
					</div>
					<div style={{
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-secondary)'
					}}>语义溯源</div>
				</div>
				<div className="card-academic" style={{
					padding: 'var(--spacing-lg)',
					textAlign: 'center',
					borderLeftColor: 'var(--color-success)'
				}}>
					<div style={{
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						marginBottom: 'var(--spacing-xs)',
						lineHeight: 1.2
					}}>
						{stats.totalEntries || 0}
					</div>
					<div style={{
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-secondary)'
					}}>知识词条</div>
				</div>
				<div className="card-academic" style={{
					padding: 'var(--spacing-lg)',
					textAlign: 'center',
					borderLeftColor: 'var(--color-warning)'
				}}>
					<div style={{
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						marginBottom: 'var(--spacing-xs)',
						lineHeight: 1.2
					}}>
						{stats.totalUsers}
					</div>
					<div style={{
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-secondary)'
					}}>参与用户</div>
				</div>
			</div>
		</div>
	);
}

