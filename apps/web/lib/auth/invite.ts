import { prisma } from '../db/client';

export async function verifyAndConsumeInvite(code: string, userId: string) {
	const invite = await prisma.invitation.findUnique({ where: { code } });
	if (!invite) throw new Error('邀请码无效');
	if (invite.usedBy) throw new Error('邀请码已被使用');
	if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error('邀请码已过期');
	await prisma.invitation.update({
		where: { code },
		data: { usedBy: userId, usedAt: new Date() }
	});
}











