'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
	const { user: authUser } = useAuth(); // 使用AuthContext获取用户信息
	const [isParticipant, setIsParticipant] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function checkParticipant() {
			try {
				setLoading(true);
				setError(null);

				// 优先使用传入的userId，其次使用AuthContext，避免重复请求
				const currentUserId = userId || (authUser?.id ? String(authUser.id) : null);

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
	}, [topicId, userId, authUser?.id]);

	return { isParticipant, loading, error };
}

