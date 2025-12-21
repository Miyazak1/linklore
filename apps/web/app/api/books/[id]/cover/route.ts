import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { getOssClient, makeObjectKey, isLocalStorage } from '@/lib/storage/oss';
import { saveFile, fileExists } from '@/lib/storage/local';
import { createModuleLogger } from '@/lib/utils/logger';
import mime from 'mime-types';

const log = createModuleLogger('Book Cover API');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/books/[id]/cover
 * 上传图书封面
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id: bookId } = await params;

		// 检查图书是否存在
		const book = await prisma.book.findUnique({ 
			where: { id: bookId },
			include: {
				assets: {
					select: {
						fileKey: true
					}
				}
			}
		});
		if (!book) {
			return NextResponse.json({ error: '图书不存在' }, { status: 404 });
		}

		// 检查权限：只有上传该书籍的用户才能上传封面
		// 通过检查 BookAsset 的 fileKey 路径中是否包含当前用户的 userId
		const userId = session.sub;
		const hasPermission = book.assets.some(asset => {
			// fileKey 格式：books/{userId}/{timestamp}-{filename}
			return asset.fileKey.includes(`books/${userId}/`);
		});

		if (!hasPermission) {
			return NextResponse.json({ error: '只有上传该书籍的用户才能上传封面' }, { status: 403 });
		}

		// 获取上传的文件
		const formData = await req.formData();
		const file = formData.get('cover') as File | null;

		if (!file) {
			return NextResponse.json({ error: '请选择封面图片' }, { status: 400 });
		}

		// 验证文件类型
		const mimeType = file.type || mime.lookup(file.name) || '';
		if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
			return NextResponse.json(
				{ error: `不支持的文件类型：${mimeType}，支持：${ALLOWED_IMAGE_TYPES.join(', ')}` },
				{ status: 400 }
			);
		}

		// 验证文件大小
		if (file.size > MAX_COVER_SIZE) {
			return NextResponse.json(
				{ error: `文件过大，限制 ${MAX_COVER_SIZE / 1024 / 1024}MB` },
				{ status: 400 }
			);
		}

		// 生成文件 key
		const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
		const key = `book-covers/${bookId}/${Date.now()}-cover.${ext}`;

		// 上传文件
		const buffer = Buffer.from(await file.arrayBuffer());
		let coverUrl: string;

		if (isLocalStorage()) {
			// 本地存储
			await saveFile(key, buffer);
			coverUrl = `/api/files/${encodeURIComponent(key)}`;
		} else {
			// OSS 存储
			const client = getOssClient();
			await client.put(key, buffer, {
				contentType: mimeType,
				headers: {
					'Cache-Control': 'public, max-age=31536000'
				}
			});
			// 获取公开访问 URL
			coverUrl = client.signatureUrl(key, { expires: 31536000 }); // 1年有效期
		}

		// 更新图书封面
		await prisma.book.update({
			where: { id: bookId },
			data: { coverUrl }
		});

		log.debug('封面上传成功', { bookId, coverUrl });

		return NextResponse.json({ ok: true, coverUrl });
	} catch (error: any) {
		log.error('封面上传失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '封面上传失败' },
			{ status: 500 }
		);
	}
}

