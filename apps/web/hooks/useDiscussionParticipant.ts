'use client';

import { useState, useEffect } from 'react';

interface UseDiscussionParticipantResult {
	isParticipant: boolean;
	loading: boolean;
	error: string | null;
}

/**
 * Hook 用于检查当前用户是否是讨论者
 * @param topicId 话题ID
 * @param userId 用户ID（可选，如果不提供则从 /api/auth/me 获取）
 */
export function useDiscussionParticipant(
	topicId: string,
	userId?: string
): UseDiscussionParticipantResult {
	const [isParticipant, setIsParticipant] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function checkParticipant() {
			try {
				setLoading(true);
				setError(null);

				// 如果没有提供 userId，先获取当前用户
				let currentUserId = userId;
				if (!currentUserId) {
					const res = await fetch('/api/auth/me');
					if (res.ok) {
						const data = await res.json();
						currentUserId = data?.user?.id;
					}
				}

				if (!currentUserId) {
					setIsParticipant(false);
					setLoading(false);
					return;
				}

				// 检查是否已参与讨论（基于 TopicParticipant）
				const res = await fetch(`/api/topics/${topicId}/participate`);
				if (res.ok) {
					const data = await res.json();
					setIsParticipant(data.isParticipant || false);
				} else {
					setIsParticipant(false);
				}
			} catch (err: any) {
				setError(err.message || '检查失败');
				setIsParticipant(false);
			} finally {
				setLoading(false);
			}
		}

		if (topicId) {
			checkParticipant();
		}
	}, [topicId, userId]);

	return { isParticipant, loading, error };
}

