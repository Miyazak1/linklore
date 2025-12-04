'use client';

import { useDiscussionParticipant } from '@/hooks/useDiscussionParticipant';

interface DiscussionParticipantWrapperProps {
	topicId: string;
	children: React.ReactNode;
}

/**
 * 包装组件：只有讨论者可见
 * 用于条件显示分歧分析等功能
 */
export default function DiscussionParticipantWrapper({
	topicId,
	children
}: DiscussionParticipantWrapperProps) {
	const { isParticipant, loading } = useDiscussionParticipant(topicId);

	if (loading) {
		return null; // 加载中不显示
	}

	if (!isParticipant) {
		return null; // 非讨论者不显示
	}

	return <>{children}</>;
}

