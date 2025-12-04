import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { saveFile, makeObjectKey, getLocalFilePath } from '@/lib/storage/local';
import { getOssClient, isLocalStorage } from '@/lib/storage/oss';
import { join } from 'path';
import { existsSync } from 'fs';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * POST /api/user/avatar/upload
 * 上传用户头像
 */
export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const formData = await req.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return NextResponse.json({ error: '请选择文件' }, { status: 400 });
		}

		// 验证文件类型
		if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
			return NextResponse.json(
				{ error: `不支持的文件类型，仅支持：${ALLOWED_IMAGE_TYPES.map(t => t.split('/')[1]).join(', ')}` },
				{ status: 400 }
			);
		}

		// 验证文件大小
		if (file.size > MAX_SIZE_BYTES) {
			return NextResponse.json(
				{ error: `文件过大，限制 ${MAX_SIZE_MB}MB` },
				{ status: 400 }
			);
		}

		// 生成文件key（需要包含 uploads/ 前缀以匹配存储路径）
		const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
		const key = `uploads/avatars/${String(session.sub)}/${Date.now()}.${ext}`;

		// 读取文件内容
		const buffer = Buffer.from(await file.arrayBuffer());

		// 保存文件
		if (isLocalStorage()) {
			// 本地存储
			await saveFile(key, buffer);
			// 生成访问URL（需要对key进行URL编码）
			const avatarUrl = `/api/files/${encodeURIComponent(key)}`;
			
			// 更新用户头像URL
			try {
				await prisma.user.update({
					where: { id: String(session.sub) },
					data: { avatarUrl }
				});
			} catch (updateError: any) {
				// 如果avatarUrl字段不存在，忽略错误
				console.warn('[Avatar Upload] Failed to update avatarUrl:', updateError.message);
			}

			return NextResponse.json({
				success: true,
				avatarUrl,
				message: '头像上传成功'
			});
		} else {
			// OSS存储
			const client = getOssClient();
			await client.put(key, buffer, {
				headers: {
					'Content-Type': file.type
				}
			});

			// 生成访问URL（使用OSS的公共URL或签名URL）
			const avatarUrl = client.signatureUrl(key, { expires: 31536000 }); // 1年有效期

			// 更新用户头像URL
			try {
				await prisma.user.update({
					where: { id: String(session.sub) },
					data: { avatarUrl }
				});
			} catch (updateError: any) {
				console.warn('[Avatar Upload] Failed to update avatarUrl:', updateError.message);
			}

			return NextResponse.json({
				success: true,
				avatarUrl,
				message: '头像上传成功'
			});
		}
	} catch (err: any) {
		console.error('[Avatar Upload] Error:', err);
		return NextResponse.json(
			{ error: err.message || '上传失败' },
			{ status: 500 }
		);
	}
}

