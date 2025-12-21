import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { requireAdmin } from '@/lib/auth/admin';
import { saveFile } from '@/lib/storage/local';
import { getOssClient, isLocalStorage } from '@/lib/storage/oss';
import { createModuleLogger } from '@/lib/utils/logger';
import { prisma } from '@/lib/db/client';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

const log = createModuleLogger('Banner API');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Banner配置文件的路径（本地存储）
const BANNER_CONFIG_PATH = join(process.cwd(), 'data', 'banner-config.json');

/**
 * GET /api/admin/banner
 * 获取当前banner图片URL（所有用户可访问）
 */
export async function GET() {
	try {
		// 读取配置文件
		try {
			const configContent = await readFile(BANNER_CONFIG_PATH, 'utf-8');
			const config = JSON.parse(configContent);
			if (config.bannerUrl) {
				return NextResponse.json({ bannerUrl: config.bannerUrl });
			}
		} catch (err: any) {
			// 文件不存在或读取失败，返回null
			if (err.code !== 'ENOENT') {
				log.warn('读取banner配置失败', err as Error);
			}
		}
		
		return NextResponse.json({ bannerUrl: null });
	} catch (err: any) {
		log.error('获取banner失败', err as Error);
		return NextResponse.json(
			{ error: err.message || '获取banner失败' },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/admin/banner
 * 上传banner图片（仅管理员）
 */
export async function POST(req: NextRequest) {
	try {
		// 检查管理员权限
		await requireAdmin();

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
		const key = `banners/${Date.now()}-banner.${ext}`;

		// 读取文件内容
		const buffer = Buffer.from(await file.arrayBuffer());

		// 保存文件
		let bannerUrl: string;
		if (isLocalStorage()) {
			// 本地存储
			await saveFile(key, buffer);
			bannerUrl = `/api/files/${encodeURIComponent(key)}`;
		} else {
			// OSS存储
			const client = getOssClient();
			await client.put(key, buffer, {
				headers: {
					'Content-Type': file.type,
					'Cache-Control': 'public, max-age=31536000'
				}
			});
			// 获取公开访问URL（OSS公共读或签名URL）
			bannerUrl = client.signatureUrl(key, { expires: 31536000 }); // 1年有效期
		}

		// 保存配置到文件
		const config = { bannerUrl };
		const configDir = join(process.cwd(), 'data');
		try {
			await writeFile(BANNER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
		} catch (err: any) {
			// 如果目录不存在，创建它
			if (err.code === 'ENOENT') {
				const { mkdir } = await import('fs/promises');
				await mkdir(configDir, { recursive: true });
				await writeFile(BANNER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
			} else {
				throw err;
			}
		}

		log.debug('Banner上传成功', { bannerUrl });

		return NextResponse.json({ ok: true, bannerUrl });
	} catch (err: any) {
		if (err.message === '未登录' || err.message === '需要管理员权限') {
			return NextResponse.json({ error: err.message }, { status: 401 });
		}
		log.error('Banner上传失败', err as Error);
		return NextResponse.json(
			{ error: err.message || '上传失败' },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/admin/banner
 * 删除banner图片（仅管理员）
 */
export async function DELETE() {
	try {
		// 检查管理员权限
		await requireAdmin();

		// 删除配置文件
		try {
			await import('fs/promises').then(fs => fs.unlink(BANNER_CONFIG_PATH));
		} catch (err: any) {
			if (err.code !== 'ENOENT') {
				log.warn('删除banner配置失败', err as Error);
			}
		}

		log.debug('Banner删除成功');

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		if (err.message === '未登录' || err.message === '需要管理员权限') {
			return NextResponse.json({ error: err.message }, { status: 401 });
		}
		log.error('Banner删除失败', err as Error);
		return NextResponse.json(
			{ error: err.message || '删除失败' },
			{ status: 500 }
		);
	}
}

