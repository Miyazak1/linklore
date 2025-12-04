/**
 * 管理员权限检查工具
 */

import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

/**
 * 要求用户必须是管理员
 * @throws {Error} 如果用户未登录或不是管理员
 * @returns {Promise<User>} 用户对象
 */
export async function requireAdmin() {
	const session = await readSession();
	if (!session?.sub) {
		throw new Error('未登录');
	}

	const user = await prisma.user.findUnique({
		where: { id: String(session.sub) },
		select: { id: true, email: true, role: true }
	});

	if (!user || user.role !== 'admin') {
		throw new Error('需要管理员权限');
	}

	return user;
}

/**
 * 判断用户是否是管理员
 * @param userId 可选的用户ID，如果不提供则从session获取
 * @returns {Promise<boolean>} 是否是管理员
 */
export async function isAdmin(userId?: string): Promise<boolean> {
	if (!userId) {
		const session = await readSession();
		if (!session?.sub) return false;
		userId = String(session.sub);
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true }
	});

	return user?.role === 'admin';
}

