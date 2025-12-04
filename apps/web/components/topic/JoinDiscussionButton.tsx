'use client';

import { useState, useEffect } from 'react';

interface JoinDiscussionButtonProps {
	topicId: string;
	onJoin?: () => void;
}

export default function JoinDiscussionButton({ 
	topicId, 
	onJoin 
}: JoinDiscussionButtonProps) {
	const [isParticipant, setIsParticipant] = useState(false);
	const [loading, setLoading] = useState(true);
	const [joining, setJoining] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// 检查是否已参与
	useEffect(() => {
		async function checkParticipant() {
			try {
				const res = await fetch(`/api/topics/${topicId}/participate`);
				if (res.ok) {
					const data = await res.json();
					setIsParticipant(data.isParticipant || false);
				}
			} catch (err) {
				console.error('检查参与状态失败:', err);
			} finally {
				setLoading(false);
			}
		}
		checkParticipant();
	}, [topicId]);

	const handleJoin = async () => {
		if (joining || isParticipant) return;
		
		setJoining(true);
		setError(null);
		
		try {
			const res = await fetch(`/api/topics/${topicId}/participate`, {
				method: 'POST'
			});
			
			if (res.ok) {
				const data = await res.json();
				setIsParticipant(true);
				if (onJoin) {
					onJoin();
				}
			} else {
				const data = await res.json();
				setError(data.error || '参与失败');
			}
		} catch (err: any) {
			setError(err.message || '参与失败');
		} finally {
			setJoining(false);
		}
	};

	if (loading) {
		return (
			<div style={{ 
				padding: 'var(--spacing-md)', 
				textAlign: 'center',
				color: 'var(--color-text-secondary)'
			}}>
				加载中...
			</div>
		);
	}

	// 如果已参与，不显示任何内容
	if (isParticipant) {
		return null;
	}

	return (
		<div style={{
			padding: 'var(--spacing-md)',
			background: 'var(--color-bg-secondary)',
			borderRadius: 'var(--radius-md)',
			border: '1px solid var(--color-border)'
		}}>
			{error && (
				<div style={{
					marginBottom: 'var(--spacing-sm)',
					padding: 'var(--spacing-sm)',
					background: 'var(--color-error-bg)',
					color: 'var(--color-error)',
					borderRadius: 'var(--radius-sm)',
					fontSize: 'var(--font-size-sm)'
				}}>
					{error}
				</div>
			)}
			<button
				onClick={handleJoin}
				disabled={joining}
				style={{
					width: '100%',
					padding: 'var(--spacing-md)',
					background: joining ? 'var(--color-bg-disabled)' : 'var(--color-primary)',
					color: 'white',
					border: 'none',
					borderRadius: 'var(--radius-md)',
					fontSize: 'var(--font-size-base)',
					fontWeight: 600,
					cursor: joining ? 'not-allowed' : 'pointer',
					transition: 'background 0.2s'
				}}
			>
				{joining ? '参与中...' : '参与讨论'}
			</button>
			<p style={{
				marginTop: 'var(--spacing-sm)',
				fontSize: 'var(--font-size-sm)',
				color: 'var(--color-text-secondary)',
				textAlign: 'center'
			}}>
				参与讨论后，您可以上传文档进行正式讨论
			</p>
		</div>
	);
}

