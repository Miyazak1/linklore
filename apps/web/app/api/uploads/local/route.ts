import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { saveFile } from '@/lib/storage/local';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Upload Local API');

export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });
		
		const { searchParams } = new URL(req.url);
		const key = searchParams.get('key');
		if (!key) return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
		
		const buffer = Buffer.from(await req.arrayBuffer());
		await saveFile(key, buffer);
		
		return NextResponse.json({ ok: true, key }, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		log.error('上传失败', err as Error);
		return NextResponse.json({ 
			error: err.message || '上传失败',
			details: process.env.NODE_ENV === 'development' ? String(err.stack) : undefined
		}, { 
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}



