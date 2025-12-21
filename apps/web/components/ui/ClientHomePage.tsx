'use client';

interface ClientHomePageProps {
	stats: {
		totalTopics: number;
		totalDocuments: number;
		totalUsers: number;
		totalBooks: number;
	};
}

export default function ClientHomePage({ stats }: ClientHomePageProps) {

	return (
		<>
			<div style={{ 
				display: 'flex', 
				justifyContent: 'space-between', 
				alignItems: 'flex-start', 
				marginBottom: 'var(--spacing-xxl)', 
				flexWrap: 'wrap', 
				gap: 'var(--spacing-lg)',
				paddingBottom: 'var(--spacing-xl)',
				borderBottom: '2px solid var(--color-border-light)'
			}}>
				<div>
					<h1 style={{ 
						marginBottom: 'var(--spacing-sm)',
						fontSize: 'var(--font-size-4xl)',
						fontWeight: 700,
						letterSpacing: '-0.02em',
						color: 'var(--color-primary)'
					}}>LinkLore</h1>
					<p style={{ 
						color: 'var(--color-text-secondary)', 
						marginBottom: 0,
						fontSize: 'var(--font-size-lg)',
						lineHeight: 'var(--line-height-relaxed)',
						maxWidth: '600px'
					}}>小规模学术讨论平台（文档即话题）</p>
				</div>
			</div>
			
			{/* Statistics */}
			<div 
				className="animate-fade-in"
				style={{ 
					display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
					gap: 'var(--spacing-lg)', 
					marginBottom: 'var(--spacing-xxl)'
				}}
			>
				<div 
					className="card-academic animate-scale-in"
					style={{ 
						padding: 'var(--spacing-xl)', 
						textAlign: 'left',
						animationDelay: '0.1s',
						animationFillMode: 'both'
					}}
				>
					<div style={{ 
						fontSize: 'var(--font-size-3xl)', 
						fontWeight: 700, 
						color: 'var(--color-primary)', 
						marginBottom: 'var(--spacing-xs)',
						lineHeight: 1.2
					}}>
						{stats.totalTopics}
					</div>
					<div style={{ 
						fontSize: 'var(--font-size-sm)', 
						color: 'var(--color-text-secondary)',
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						fontWeight: 500
					}}>话题</div>
				</div>
				<div 
					className="card-academic animate-scale-in"
					style={{ 
						padding: 'var(--spacing-xl)', 
						textAlign: 'left',
						animationDelay: '0.2s',
						animationFillMode: 'both'
					}}
				>
					<div style={{ 
						fontSize: 'var(--font-size-3xl)', 
						fontWeight: 700, 
						color: 'var(--color-success)', 
						marginBottom: 'var(--spacing-xs)',
						lineHeight: 1.2
					}}>
						{stats.totalDocuments}
					</div>
					<div style={{ 
						fontSize: 'var(--font-size-sm)', 
						color: 'var(--color-text-secondary)',
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						fontWeight: 500
					}}>文档</div>
				</div>
				<div 
					className="card-academic animate-scale-in"
					style={{ 
						padding: 'var(--spacing-xl)', 
						textAlign: 'left',
						animationDelay: '0.3s',
						animationFillMode: 'both'
					}}
				>
					<div style={{ 
						fontSize: 'var(--font-size-3xl)', 
						fontWeight: 700, 
						color: 'var(--color-warning)', 
						marginBottom: 'var(--spacing-xs)',
						lineHeight: 1.2
					}}>
						{stats.totalUsers}
					</div>
					<div style={{ 
						fontSize: 'var(--font-size-sm)', 
						color: 'var(--color-text-secondary)',
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						fontWeight: 500
					}}>用户</div>
				</div>
				<div 
					className="card-academic animate-scale-in"
					style={{ 
						padding: 'var(--spacing-xl)', 
						textAlign: 'left',
						animationDelay: '0.4s',
						animationFillMode: 'both'
					}}
				>
					<div style={{ 
						fontSize: 'var(--font-size-3xl)', 
						fontWeight: 700, 
						color: 'var(--color-secondary)', 
						marginBottom: 'var(--spacing-xs)',
						lineHeight: 1.2
					}}>
						{stats.totalBooks}
					</div>
					<div style={{ 
						fontSize: 'var(--font-size-sm)', 
						color: 'var(--color-text-secondary)',
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						fontWeight: 500
					}}>书籍</div>
				</div>
			</div>

			<div style={{ 
				marginBottom: 'var(--spacing-xxl)',
				padding: 'var(--spacing-xl)',
				background: 'var(--color-background-subtle)',
				borderRadius: 'var(--radius-lg)',
				border: '1px solid var(--color-border-light)'
			}}>
				<h3 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-md)',
					fontSize: 'var(--font-size-xl)',
					color: 'var(--color-text-primary)'
				}}>快速导航</h3>
				<div style={{ 
					display: 'flex', 
					flexWrap: 'wrap',
					gap: 'var(--spacing-md)'
				}}>
					<a href="/upload" style={{ 
						padding: 'var(--spacing-sm) var(--spacing-md)',
						background: 'var(--color-primary)',
						color: 'white',
						borderRadius: 'var(--radius-md)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						transition: 'all var(--transition-fast)',
						border: 'none'
					}}>发起话题</a>
					<a href="/library" style={{ 
						padding: 'var(--spacing-sm) var(--spacing-md)',
						background: 'var(--color-background-paper)',
						color: 'var(--color-text-primary)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						transition: 'all var(--transition-fast)'
					}}>公共图书馆</a>
					<a href="/practices" style={{ 
						padding: 'var(--spacing-sm) var(--spacing-md)',
						background: 'var(--color-background-paper)',
						color: 'var(--color-text-primary)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						transition: 'all var(--transition-fast)'
					}}>实践记录</a>
					<a href="/settings/ai" style={{ 
						padding: 'var(--spacing-sm) var(--spacing-md)',
						background: 'var(--color-background-paper)',
						color: 'var(--color-text-primary)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						transition: 'all var(--transition-fast)'
					}}>我的 AI</a>
				</div>
			</div>
			<h2 style={{ 
				marginBottom: 'var(--spacing-lg)',
				fontSize: 'var(--font-size-3xl)',
				fontWeight: 600,
				paddingBottom: 'var(--spacing-md)',
				borderBottom: '1px solid var(--color-border-light)'
			}}>最新话题</h2>
		</>
	);
}

