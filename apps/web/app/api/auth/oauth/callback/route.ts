import { NextResponse } from 'next/server';
import { handleOAuthCallback } from '@/lib/auth/oauth';
import { createSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('OAuth Callback');

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const provider = searchParams.get('provider') as 'wechat' | 'qq';
		const code = searchParams.get('code');
		const state = searchParams.get('state');
		const error = searchParams.get('error');

		// 检查错误
		if (error) {
			log.warn('OAuth 授权被拒绝', { provider, error });
			return NextResponse.redirect(new URL('/signin?error=oauth_denied', req.url));
		}

		if (!provider || (provider !== 'wechat' && provider !== 'qq')) {
			return NextResponse.redirect(new URL('/signin?error=invalid_provider', req.url));
		}

		if (!code) {
			return NextResponse.redirect(new URL('/signin?error=missing_code', req.url));
		}

		if (!state) {
			return NextResponse.redirect(new URL('/signin?error=missing_state', req.url));
		}

		// 验证 state（防止 CSRF 攻击）
		const cookieStore = await cookies();
		const savedState = cookieStore.get(`oauth_state_${provider}`)?.value;

		if (!savedState || savedState !== state) {
			log.warn('OAuth state 验证失败', { provider, state, savedState });
			return NextResponse.redirect(new URL('/signin?error=invalid_state', req.url));
		}

		// 删除 state cookie
		cookieStore.delete(`oauth_state_${provider}`);

		// 处理 OAuth 回调
		const { userId, email, role } = await handleOAuthCallback(provider, code, state);

		// 创建 session
		await createSession({ sub: userId, email, role });

		// 重定向到首页
		return NextResponse.redirect(new URL('/?oauth_success=true', req.url));
	} catch (error: any) {
		log.error('OAuth 回调处理失败', error as Error);
		return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(error.message || 'oauth_failed')}`, req.url));
	}
}






