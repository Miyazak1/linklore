import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { saveFile, makeObjectKey, getLocalFilePath } from '@/lib/storage/local';
import { getOssClient, isLocalStorage } from '@/lib/storage/oss';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * POST /api/workshop/cover/upload
 * 上传游戏封面
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

		// 生成文件key
		const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
		const key = `uploads/workshop/covers/${String(session.sub)}/${Date.now()}.${ext}`;

		// 读取文件内容
		const buffer = Buffer.from(await file.arrayBuffer());

		// 保存文件
		if (isLocalStorage()) {
			// 本地存储
			await saveFile(key, buffer);
			// 生成访问URL
			const coverUrl = `/api/files/${encodeURIComponent(key)}`;
			
			return NextResponse.json({ url: coverUrl, key });
		} else {
			// OSS存储
			const client = getOssClient();
			await client.put(key, buffer, {
				headers: {
					'Content-Type': file.type
				}
			});
			
			// 生成访问URL
			const coverUrl = client.signatureUrl(key, { expires: 31536000 }); // 1年有效期
			
			return NextResponse.json({ url: coverUrl, key });
		}
	} catch (err: any) {
		console.error('[Workshop Cover Upload] Error:', err);
		return NextResponse.json(
			{ error: err.message || '上传失败' },
			{ status: 500 }
		);
	}
}



