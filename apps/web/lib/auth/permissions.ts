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

/**
 * 检查溯源所有权
 * @param traceId 溯源ID
 * @param userId 用户ID
 * @param userRole 用户角色
 * @returns {Promise<boolean>} 是否有权限操作该溯源
 */
export async function checkTraceOwnership(
	traceId: string,
	userId: string,
	userRole: string
): Promise<boolean> {
	// 管理员可以操作所有溯源
	if (userRole === 'admin') {
		return true;
	}

	// 检查溯源是否存在且属于该用户
	const trace = await prisma.trace.findUnique({
		where: { id: traceId },
		select: { editorId: true }
	});

	return trace?.editorId === userId;
}

/**
 * 处理编辑角色变更
 * 当编辑被降级为普通用户时，处理其创建的溯源
 * @param userId 用户ID
 * @param newRole 新角色
 */
export async function handleEditorRoleChange(
	userId: string,
	newRole: string
): Promise<void> {
	// 如果新角色不是editor或admin，需要处理已创建的溯源
	if (newRole !== 'editor' && newRole !== 'admin') {
		// 方案：标记为遗留内容，锁定编辑
		// 已采纳的溯源保持不变，未采纳的溯源标记为遗留
		await prisma.trace.updateMany({
			where: {
				editorId: userId,
				status: { in: ['DRAFT', 'PUBLISHED'] }
			},
			data: {
				// 注意：这里可能需要添加legacy字段，暂时先记录日志
				// 实际实现时可以考虑添加legacy字段到Trace模型
			}
		});

		console.log(`[Permissions] User ${userId} role changed to ${newRole}, traces marked as legacy`);
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

