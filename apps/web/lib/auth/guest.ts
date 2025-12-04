/**
 * 匿名用户（访客）管理工具
 * 
 * 功能：
 * - 生成随机用户名
 * - 创建和管理匿名用户
 * - 处理匿名用户到注册用户的关联
 */

import { prisma } from '@/lib/db/client';
import { randomBytes } from 'crypto';

/**
 * 生成随机用户名
 * 格式：访客_ABC123（中文 + 6位随机字符）
 */
export function generateGuestName(): string {
	// 生成6位随机字符（大写字母和数字）
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
	const randomStr = Array.from({ length: 6 }, () => 
		chars[Math.floor(Math.random() * chars.length)]
	).join('');
	
	return `访客_${randomStr}`;
}

/**
 * 生成临时邮箱
 * 格式：guest_{randomId}@temp.local
 */
export function generateGuestEmail(): string {
	const randomId = randomBytes(8).toString('hex');
	return `guest_${randomId}@temp.local`;
}

/**
 * 创建或获取匿名用户
 * @param guestUserId 如果提供，尝试获取现有用户；否则创建新用户
 * @returns 匿名用户对象
 */
export async function getOrCreateGuestUser(guestUserId?: string) {
	// 如果提供了 guestUserId，尝试获取现有用户
	if (guestUserId) {
		const existingUser = await prisma.user.findUnique({
			where: { id: guestUserId },
			select: {
				id: true,
				email: true,
				name: true,
				role: true
			}
		});

		// 验证是否是匿名用户（通过邮箱格式判断）
		if (existingUser && existingUser.email.endsWith('@temp.local')) {
			return existingUser;
		}

		// 如果不是匿名用户，返回 null（可能是真实用户）
		if (existingUser) {
			return null;
		}
	}

	// 创建新的匿名用户
	const name = generateGuestName();
	const email = generateGuestEmail();

	const guestUser = await prisma.user.create({
		data: {
			email,
			name,
			passwordHash: '', // 匿名用户不需要密码
			role: 'member' // 默认角色
		},
		select: {
			id: true,
			email: true,
			name: true,
			role: true
		}
	});

	return guestUser;
}

/**
 * 检查用户是否是匿名用户
 */
export function isGuestUser(user: { email: string }): boolean {
	return user.email.endsWith('@temp.local');
}

/**
 * 关联匿名用户的数据到注册用户
 * 将匿名用户创建的所有数据（聊天室、消息等）转移到注册用户
 * 
 * @param guestUserId 匿名用户ID
 * @param registeredUserId 注册用户ID
 */
export async function associateGuestData(
	guestUserId: string,
	registeredUserId: string
): Promise<void> {
	// 使用事务确保数据一致性
	await prisma.$transaction(async (tx) => {
		// 1. 转移聊天室（作为创建者的）
		await tx.chatRoom.updateMany({
			where: { creatorId: guestUserId },
			data: { creatorId: registeredUserId }
		});

		// 2. 转移聊天室（作为参与者的）
		await tx.chatRoom.updateMany({
			where: { participantId: guestUserId },
			data: { participantId: registeredUserId }
		});

		// 3. 转移消息
		await tx.chatMessage.updateMany({
			where: { senderId: guestUserId },
			data: { senderId: registeredUserId }
		});

		// 4. 转移消息点赞
		await tx.chatMessageLike.updateMany({
			where: { userId: guestUserId },
			data: { userId: registeredUserId }
		});

		// 5. 转移聊天邀请（发送的）
		await tx.chatInvitation.updateMany({
			where: { inviterId: guestUserId },
			data: { inviterId: registeredUserId }
		});

		// 6. 转移聊天邀请（接收的）
		await tx.chatInvitation.updateMany({
			where: { inviteeId: guestUserId },
			data: { inviteeId: registeredUserId }
		});

		// 7. 删除匿名用户记录（数据已转移）
		await tx.user.delete({
			where: { id: guestUserId }
		});
	});
}

/**
 * 清理长期未使用的匿名用户及其数据
 * 删除30天未使用的匿名用户
 */
export async function cleanupInactiveGuestUsers(): Promise<number> {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// 查找30天未使用的匿名用户
	// 判断标准：该用户创建的所有聊天室的最后更新时间都超过30天
	const inactiveGuests = await prisma.user.findMany({
		where: {
			email: { endsWith: '@temp.local' },
			createdRooms: {
				none: {
					updatedAt: { gte: thirtyDaysAgo }
				}
			},
			participatedRooms: {
				none: {
					updatedAt: { gte: thirtyDaysAgo }
				}
			}
		},
		select: { id: true }
	});

	// 删除这些匿名用户（级联删除会处理关联数据）
	const deleteResult = await prisma.user.deleteMany({
		where: {
			id: { in: inactiveGuests.map(g => g.id) }
		}
	});

	return deleteResult.count;
}

