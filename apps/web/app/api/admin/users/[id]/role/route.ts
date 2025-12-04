import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/admin';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { handleEditorRoleChange } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/audit/logger';

const UpdateRoleSchema = z.object({
	role: z.enum(['member', 'editor', 'admin'])
});

/**
 * 更新用户角色（管理员）
 */
export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const admin = await requireAdmin();
		const { id } = await params;
		const { role } = UpdateRoleSchema.parse(await req.json());

		// 获取目标用户
		const targetUser = await prisma.user.findUnique({
			where: { id },
			select: { id: true, email: true, role: true }
		});

		if (!targetUser) {
			return NextResponse.json(
				createErrorResponse('NOT_FOUND', '用户不存在', 404).response,
				{ status: 404 }
			);
		}

		// 不能修改自己的角色
		if (targetUser.id === admin.id) {
			return NextResponse.json(
				createErrorResponse('INVALID_OPERATION', '不能修改自己的角色', 400).response,
				{ status: 400 }
			);
		}

		// 如果从editor降级，需要处理相关溯源
		if (targetUser.role === 'editor' && role !== 'editor' && role !== 'admin') {
			await handleEditorRoleChange(targetUser.id, role);
		}

		// 更新角色
		const updated = await prisma.user.update({
			where: { id },
			data: { role },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true
			}
		});

		// 记录审计日志
		await logAudit({
			userId: admin.id,
			action: 'user.role.update',
			resourceType: 'user',
			resourceId: id,
			metadata: {
				targetEmail: targetUser.email,
				oldRole: targetUser.role,
				newRole: role
			}
		});

		return NextResponse.json(createSuccessResponse(updated));
	} catch (err: any) {
		const { response, status } = handleError(err, 'PUT /api/admin/users/[id]/role');
		return NextResponse.json(response, { status });
	}
}

