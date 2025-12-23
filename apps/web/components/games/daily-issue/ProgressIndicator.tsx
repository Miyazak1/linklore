'use client';

interface ProgressIndicatorProps {
	currentStage: number;
	totalStages: number;
}

/**
 * 进度指示器组件
 * 显示当前阶段和完成进度
 */
export default function ProgressIndicator({
	currentStage,
	totalStages
}: ProgressIndicatorProps) {
	const stages = Array.from({ length: totalStages + 1 }, (_, i) => i);

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '8px',
				padding: '16px',
				marginBottom: '24px'
			}}
		>
			{stages.map((stage) => {
				const isCompleted = stage < currentStage;
				const isCurrent = stage === currentStage;
				const isPending = stage > currentStage;

				return (
					<div
						key={stage}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px'
						}}
					>
						<div
							style={{
								width: isCurrent ? '32px' : '24px',
								height: isCurrent ? '32px' : '24px',
								borderRadius: '50%',
								background: isCompleted
									? 'var(--color-primary)'
									: isCurrent
										? 'var(--color-primary)'
										: 'var(--color-background-secondary)',
								border:
									isCurrent || isCompleted
										? '2px solid var(--color-primary)'
										: '2px solid var(--color-border)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color:
									isCompleted || isCurrent
										? 'white'
										: 'var(--color-text-secondary)',
								fontSize: isCurrent ? '14px' : '12px',
								fontWeight: isCurrent ? '600' : '400',
								transition: 'all 0.3s ease'
							}}
						>
							{isCompleted ? '✓' : stage}
						</div>
						{stage < totalStages && (
							<div
								style={{
									width: '40px',
									height: '2px',
									background:
										isCompleted
											? 'var(--color-primary)'
											: 'var(--color-border)',
									transition: 'all 0.3s ease'
								}}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}





