'use client';

import { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';

interface Participant {
	userId: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
	joinedAt: string;
}

interface ParticipantAvatarsProps {
	topicId: string;
	maxVisible?: number; // 最多显示的头像数量，超出部分用"+"号表示
}

export default function ParticipantAvatars({ topicId, maxVisible = 8 }: ParticipantAvatarsProps) {
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [loading, setLoading] = useState(true);
	const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

	useEffect(() => {
		async function fetchParticipants() {
			try {
				setLoading(true);
				const response = await fetch(`/api/topics/${topicId}/participants`);
				if (!response.ok) {
					throw new Error('获取参与者列表失败');
				}
				const data = await response.json();
				setParticipants(data.participants || []);
			} catch (err: any) {
				console.error('[ParticipantAvatars] Error:', err);
			} finally {
				setLoading(false);
			}
		}

		fetchParticipants();
	}, [topicId]);

	if (loading) {
		return null; // 加载时不显示
	}

	if (participants.length === 0) {
		return null; // 没有参与者时不显示
	}

	const visibleParticipants = participants.slice(0, maxVisible);
	const remainingCount = participants.length - maxVisible;

	return (
		<div className="card-academic" style={{
			marginBottom: 'var(--spacing-lg)',
			padding: 'var(--spacing-md) var(--spacing-lg)',
			borderLeftColor: 'var(--color-primary)'
		}}>
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: 'var(--spacing-sm)',
				flexWrap: 'wrap'
			}}>
				<span style={{
					fontSize: 'var(--font-size-sm)',
					color: 'var(--color-text-secondary)',
					marginRight: 'var(--spacing-xs)',
					fontWeight: 500,
					flexShrink: 0
				}}>
					讨论者 ({participants.length})：
				</span>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-xs)',
					flexWrap: 'wrap'
				}}>
					{visibleParticipants.map((participant, index) => (
						<div
							key={participant.userId}
							style={{
								position: 'relative',
								display: 'inline-block',
								marginLeft: index > 0 ? '-8px' : '0' // 头像重叠效果
							}}
							onMouseEnter={() => setHoveredUserId(participant.userId)}
							onMouseLeave={() => setHoveredUserId(null)}
						>
							<div style={{
								position: 'relative',
								zIndex: visibleParticipants.length - index, // 后面的头像在上层
								border: hoveredUserId === participant.userId 
									? '2px solid var(--color-primary)' 
									: '2px solid var(--color-background)',
								borderRadius: '50%',
								padding: '2px',
								background: 'var(--color-background)',
								transition: 'all var(--transition-fast)',
								transform: hoveredUserId === participant.userId ? 'scale(1.1)' : 'scale(1)'
							}}>
								<Avatar
									avatarUrl={participant.avatarUrl}
									name={participant.name}
									email={participant.email}
									size={32}
									style={{
										cursor: 'pointer',
										display: 'block'
									}}
								/>
							</div>
							{/* 悬停提示 */}
							{hoveredUserId === participant.userId && (
								<div style={{
									position: 'absolute',
									bottom: '100%',
									left: '50%',
									transform: 'translateX(-50%)',
									marginBottom: 'var(--spacing-xs)',
									padding: 'var(--spacing-xs) var(--spacing-sm)',
									background: 'var(--color-background-paper)',
									color: 'var(--color-text-primary)',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-sm)',
									fontSize: 'var(--font-size-xs)',
									whiteSpace: 'nowrap',
									boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
									zIndex: 2000,
									pointerEvents: 'none'
								}}>
									{participant.name || participant.email}
								</div>
							)}
						</div>
					))}
					{remainingCount > 0 && (
						<div
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: 32,
								height: 32,
								borderRadius: '50%',
								background: 'var(--color-background-subtle)',
								border: '2px solid var(--color-background)',
								color: 'var(--color-text-secondary)',
								fontSize: 'var(--font-size-xs)',
								fontWeight: 600,
								cursor: 'help',
								marginLeft: '-8px',
								zIndex: 1
							}}
							title={`还有 ${remainingCount} 位讨论者`}
						>
							+{remainingCount}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

