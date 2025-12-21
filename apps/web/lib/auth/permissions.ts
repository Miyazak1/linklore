/**
 * 权限检查工具函数
 * 用于检查编辑权限和溯源所有权
 */

import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

/**
 * 要求用户必须是编辑或管理员
 * @throws {Error} 如果用户未登录或不是编辑/管理员
 * @returns {Promise<User>} 用户对象
 */
export async function requireEditor() {
	const session = await readSession();
	if (!session?.sub) {
		throw new Error('未登录');
	}

	const user = await prisma.user.findUnique({
		where: { id: String(session.sub) },
		select: { id: true, email: true, role: true }
	});

	if (!user || (user.role !== 'editor' && user.role !== 'admin')) {
		throw new Error('需要编辑权限');
	}

	return user;
}

/**
 * 判断用户是否有编辑权限
 * @param userId 可选的用户ID，如果不提供则从session获取
 * @returns {Promise<boolean>} 是否有编辑权限
 */
export async function isEditor(userId?: string): Promise<boolean> {
	if (!userId) {
		const session = await readSession();
		if (!session?.sub) return false;
		userId = String(session.sub);
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true }
	});

	return user?.role === 'editor' || user?.role === 'admin';
}

// 语义溯源功能已移除

/**
 * 处理编辑角色变更
 * 当编辑被降级为普通用户时，处理其创建的内容
 * @param userId 用户ID
 * @param newRole 新角色
 */
export async function handleEditorRoleChange(
	userId: string,
	newRole: string
): Promise<void> {
	// 语义溯源功能已移除，此函数保留用于未来扩展
	// 如果新角色不是editor或admin，可以在这里处理相关内容
	if (newRole !== 'editor' && newRole !== 'admin') {
		console.log(`[Permissions] User ${userId} role changed to ${newRole}`);
	}
}

/**
 * 判断用户是否是讨论者（已点击参与讨论）
 * @param topicId 话题ID
 * @param userId 用户ID
 * @returns {Promise<boolean>} 是否是讨论者
 */
export async function isDiscussionParticipant(topicId: string, userId: string): Promise<boolean> {
	// 检查是否有参与记录
	const participant = await prisma.topicParticipant.findUnique({
		where: {
			topicId_userId: {
				topicId,
				userId
			}
		}
	});
	
	return !!participant;
}

/**
 * 判断用户是否可以查看与目标用户的分歧分析
 * @param topicId 话题ID
 * @param currentUserId 当前用户ID
 * @param targetUserId 目标用户ID
 * @returns {Promise<boolean>} 是否可以查看分歧分析
 */
export async function canViewDisagreement(
	topicId: string,
	currentUserId: string,
	targetUserId: string
): Promise<boolean> {
	// 必须是讨论者
	const isParticipant = await isDiscussionParticipant(topicId, currentUserId);
	if (!isParticipant) return false;

	// 必须与目标用户有直接讨论关系
	const userPair = await prisma.userConsensus.findFirst({
		where: {
			topicId,
			OR: [
				{ userId1: currentUserId, userId2: targetUserId },
				{ userId1: targetUserId, userId2: currentUserId }
			]
		}
	});

	return !!userPair;
}

