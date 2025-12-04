'use client';

import { getQualityMessage } from '@/lib/messages/qualityMessages';

interface QualityCheckResult {
	isSufficient: boolean;
	overallScore: number;
	criticalScore: number;
	reasons: string[];
	suggestions: string[];
}

interface Props {
	qualityCheck: QualityCheckResult | null;
}

export default function DocumentQualityHint({ qualityCheck }: Props) {
	if (!qualityCheck || qualityCheck.isSufficient) {
		return null;
	}
	
	const message = getQualityMessage(qualityCheck);
	
	return (
		<div style={{
			padding: 'var(--spacing-md)',
			background: 'rgba(33, 150, 243, 0.08)',
			borderLeft: '4px solid var(--color-primary)',
			borderRadius: 'var(--radius-sm)',
			marginBottom: 'var(--spacing-md)'
		}}>
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				gap: 'var(--spacing-xs)',
				marginBottom: 'var(--spacing-xs)',
				color: 'var(--color-primary)'
			}}>
				<span style={{ fontSize: 'var(--font-size-lg)' }}>{message.icon}</span>
				<strong style={{ fontSize: 'var(--font-size-sm)' }}>
					{message.title}
				</strong>
			</div>
			
			<p style={{ 
				fontSize: 'var(--font-size-sm)', 
				color: 'var(--color-text-secondary)',
				margin: '0 0 var(--spacing-sm) 0',
				lineHeight: 'var(--line-height-relaxed)'
			}}>
				{message.main}
			</p>
			
			{message.suggestions.length > 0 && (
				<ul style={{ 
					margin: 0, 
					paddingLeft: 'var(--spacing-lg)',
					fontSize: 'var(--font-size-sm)',
					color: 'var(--color-text-secondary)',
					lineHeight: 'var(--line-height-relaxed)'
				}}>
					{message.suggestions.map((suggestion, idx) => (
						<li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>
							{suggestion}
						</li>
					))}
				</ul>
			)}
			
			{message.footer && (
				<p style={{ 
					fontSize: 'var(--font-size-xs)', 
					color: 'var(--color-text-tertiary)',
					margin: 'var(--spacing-sm) 0 0 0',
					fontStyle: 'italic',
					lineHeight: 'var(--line-height-relaxed)'
				}}>
					{message.footer}
				</p>
			)}
		</div>
	);
}








