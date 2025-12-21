'use client';

interface GameStatsProps {
	guessCount: number;
	totalGuessed?: number; // 已猜出人数
	isCompleted?: boolean;
}

/**
 * 游戏统计组件
 * 显示猜测次数、已猜出人数等信息
 */
export default function GameStats({ guessCount, totalGuessed, isCompleted }: GameStatsProps) {
	return (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			gap: 'var(--spacing-md)',
			alignItems: 'center',
			padding: 'var(--spacing-lg)',
			background: 'var(--color-background-paper)',
			borderRadius: 'var(--radius-md)',
			border: '1px solid var(--color-border-light)'
		}}>
			<div style={{
				display: 'flex',
				gap: 'var(--spacing-xl)',
				flexWrap: 'wrap',
				justifyContent: 'center'
			}}>
				{/* 猜测次数 */}
				<div style={{ textAlign: 'center' }}>
					<div style={{
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						marginBottom: 'var(--spacing-xs)'
					}}>
						{guessCount}
					</div>
					<div style={{
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-secondary)'
					}}>
						猜测次数
					</div>
				</div>

				{/* 已猜出人数 */}
				{totalGuessed !== undefined && (
					<div style={{ textAlign: 'center' }}>
						<div style={{
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							{totalGuessed}
						</div>
						<div style={{
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)'
						}}>
							已猜出
						</div>
					</div>
				)}
			</div>

			{/* 完成提示 */}
			{isCompleted && (
				<div style={{
					padding: 'var(--spacing-sm) var(--spacing-md)',
					background: 'var(--color-success)',
					color: 'white',
					borderRadius: 'var(--radius-sm)',
					fontSize: 'var(--font-size-sm)',
					fontWeight: 500
				}}>
					恭喜！你已成功猜出答案！
				</div>
			)}
		</div>
	);
}

