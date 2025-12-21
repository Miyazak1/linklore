'use client';

interface ModerationWarningProps {
	status: 'WARNING' | 'BLOCKED';
	note: string;
	details?: {
		// 主题相关
		topicDrift?: string;
		topicUnclear?: string;
		
		// 事实与前提相关
		premiseError?: string;
		premiseUnclear?: string;
		factSpeculationConfusion?: string;
		
		// 推理相关
		logicalFallacies?: string[];
		reasoningChainBreak?: string;
		
		// 表达方式相关
		emotionalExpression?: string;
		emotionalEscalation?: string;
		disrespectfulContent?: string;
		
		// 分歧处理相关
		disagreementType?: string;
		consensusConflict?: string;
		
		// AI回答相关
		aiFactualError?: string;
		aiEmotionalTone?: string;
		aiValueJudgment?: string;
		aiConsensusBlocking?: string;
		
		// 改进建议
		suggestions?: string[];
	};
	showDetails?: boolean; // 是否显示详细内容（己方显示详情，对方只显示标签）
	onDismiss?: () => void;
}

/**
 * 监督警告组件
 * 显示监督AI的分析结果和提醒
 */
export default function ModerationWarning({
	status,
	note,
	details,
	onDismiss,
	showDetails = true // 默认显示详情
}: ModerationWarningProps) {
	const isBlocked = status === 'BLOCKED';
	const isWarning = status === 'WARNING';

	if (!isBlocked && !isWarning) {
		return null;
	}

	// 如果不显示详情（对方的消息），只显示简单的标签
	if (!showDetails) {
		return (
			<div
				style={{
					padding: '5px 12px',
					borderRadius: '14px',
					background: isBlocked
						? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
						: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
					border: `2px solid ${
						isBlocked ? '#b91c1c' : '#b45309'
					}`,
					color: 'white',
					display: 'inline-flex',
					alignItems: 'center',
					gap: '5px',
					fontSize: '12px',
					fontWeight: 700,
					boxShadow: '0 3px 10px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.1)',
					whiteSpace: 'nowrap',
					textShadow: '0 1px 2px rgba(0,0,0,0.2)',
					letterSpacing: '0.3px'
				}}
			>
				<span style={{ fontSize: '14px', lineHeight: 1 }}>
					{isBlocked ? '🚫' : '⚠️'}
				</span>
				<span>{isBlocked ? '违规发言' : '警告'}</span>
			</div>
		);
	}

	return (
		<div
			style={{
				padding: '12px 16px',
				borderRadius: '8px',
				marginBottom: '12px',
				background: isBlocked
					? 'var(--color-error-lighter)'
					: 'var(--color-warning-lighter)',
				border: `1px solid ${
					isBlocked ? 'var(--color-error)' : 'var(--color-warning)'
				}`,
				color: isBlocked ? 'var(--color-error)' : 'var(--color-warning)'
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					marginBottom: '8px'
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span style={{ fontSize: '18px' }}>
						{isBlocked ? '🚫' : '⚠️'}
					</span>
					<span
						style={{
							fontWeight: 600,
							fontSize: '14px'
						}}
					>
						{isBlocked ? '消息被阻止' : '监督提醒'}
					</span>
				</div>
				{onDismiss && (
					<button
						onClick={onDismiss}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							fontSize: '18px',
							color: 'inherit',
							opacity: 0.7,
							padding: '0',
							width: '24px',
							height: '24px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center'
						}}
					>
						×
					</button>
				)}
			</div>

			{note && (
				<div
					style={{
						fontSize: '13px',
						lineHeight: '1.5',
						marginBottom: details ? '12px' : '0'
					}}
				>
					{note}
				</div>
			)}

			{details && (
				<div style={{ fontSize: '12px', marginTop: '12px' }}>
					{/* 主题相关 */}
					{details.topicUnclear && (
						<div style={{ marginBottom: '8px' }}>
							<strong>主题不明确（宪章第4条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.topicUnclear}
							</div>
						</div>
					)}
					{details.topicDrift && (
						<div style={{ marginBottom: '8px' }}>
							<strong>话题偏离（宪章第5条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.topicDrift}
							</div>
						</div>
					)}

					{/* 前提与事实相关 */}
					{details.premiseUnclear && (
						<div style={{ marginBottom: '8px' }}>
							<strong>前提不明确（宪章第7条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.premiseUnclear}
							</div>
						</div>
					)}
					{details.premiseError && (
						<div style={{ marginBottom: '8px' }}>
							<strong>⚠️ 前提错误（宪章第7条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.premiseError}
							</div>
						</div>
					)}
					{details.factSpeculationConfusion && (
						<div style={{ marginBottom: '8px' }}>
							<strong>事实与推测混淆（宪章第6条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.factSpeculationConfusion}
							</div>
						</div>
					)}

					{/* 推理相关 */}
					{details.reasoningChainBreak && (
						<div style={{ marginBottom: '8px' }}>
							<strong>推理链条断裂（宪章第8条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.reasoningChainBreak}
							</div>
						</div>
					)}
					{details.logicalFallacies && details.logicalFallacies.length > 0 && (
						<div style={{ marginBottom: '8px' }}>
							<strong>逻辑谬误（宪章第8条）：</strong>
							<ul
								style={{
									margin: '4px 0 0 20px',
									padding: 0,
									opacity: 0.9
								}}
							>
								{details.logicalFallacies.map((fallacy, idx) => (
									<li key={idx}>{fallacy}</li>
								))}
							</ul>
						</div>
					)}

					{/* 表达方式相关 */}
					{details.emotionalExpression && (
						<div style={{ marginBottom: '8px' }}>
							<strong>情绪化表达（宪章第9条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.emotionalExpression}
							</div>
						</div>
					)}
					{details.emotionalEscalation && (
						<div style={{ marginBottom: '8px' }}>
							<strong>⚠️ 情绪升级预警（宪章第10条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.emotionalEscalation}
							</div>
						</div>
					)}
					{details.disrespectfulContent && (
						<div style={{ marginBottom: '8px' }}>
							<strong>不尊重内容（宪章第9条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.disrespectfulContent}
							</div>
						</div>
					)}

					{/* 分歧处理相关 */}
					{details.disagreementType && (
						<div style={{ marginBottom: '8px' }}>
							<strong>分歧类型（宪章第11条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.disagreementType}
							</div>
						</div>
					)}
					{details.consensusConflict && (
						<div style={{ marginBottom: '8px' }}>
							<strong>⚠️ 与已锁定共识冲突（宪章第12条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.consensusConflict}
							</div>
						</div>
					)}

					{/* AI回答相关 */}
					{details.aiFactualError && (
						<div style={{ marginBottom: '8px' }}>
							<strong>AI事实错误（宪章第14条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.aiFactualError}
							</div>
						</div>
					)}
					{details.aiEmotionalTone && (
						<div style={{ marginBottom: '8px' }}>
							<strong>AI情绪化语气（宪章第15条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.aiEmotionalTone}
							</div>
						</div>
					)}
					{details.aiValueJudgment && (
						<div style={{ marginBottom: '8px' }}>
							<strong>AI价值裁决（宪章第16条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.aiValueJudgment}
							</div>
						</div>
					)}
					{details.aiConsensusBlocking && (
						<div style={{ marginBottom: '8px' }}>
							<strong>AI阻碍共识（宪章第17条）：</strong>
							<div style={{ marginTop: '4px', opacity: 0.9 }}>
								{details.aiConsensusBlocking}
							</div>
						</div>
					)}

					{/* 改进建议 */}
					{details.suggestions && details.suggestions.length > 0 && (
						<div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
							<strong>改进建议：</strong>
							<ul
								style={{
									margin: '4px 0 0 20px',
									padding: 0,
									opacity: 0.9
								}}
							>
								{details.suggestions.map((suggestion, idx) => (
									<li key={idx}>{suggestion}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

