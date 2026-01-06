import { NextResponse } from 'next/server';
import { getOAuthAuthUrl, generateOAuthState } from '@/lib/auth/oauth';
import { cookies } from 'next/headers';

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ provider: string }> }
) {
	try {
		const { provider: providerParam } = await params;
		const provider = providerParam as 'wechat' | 'qq';

		if (provider !== 'wechat' && provider !== 'qq') {
			return NextResponse.json({ error: '不支持的 OAuth 提供商' }, { status: 400 });
		}

		// 检查配置是否完整
		if (provider === 'wechat' && !process.env.WECHAT_APP_ID) {
			const errorMsg = process.env.NODE_ENV === 'development'
				? '微信登录功能未配置。请在 .env.local 中添加 WECHAT_APP_ID 和 WECHAT_APP_SECRET。如需帮助，请查看 docs/EMAIL_OAUTH_ENV_CONFIG.md'
				: '微信登录功能未配置';
			return NextResponse.json({ error: errorMsg }, { status: 400 });
		}

		if (provider === 'qq' && !process.env.QQ_APP_ID) {
			const errorMsg = process.env.NODE_ENV === 'development'
				? 'QQ登录功能未配置。请在 .env.local 中添加 QQ_APP_ID 和 QQ_APP_KEY。如需帮助，请查看 docs/EMAIL_OAUTH_ENV_CONFIG.md'
				: 'QQ登录功能未配置';
			return NextResponse.json({ error: errorMsg }, { status: 400 });
		}

		// 生成 state 并保存到 cookie（用于防止 CSRF 攻击）
		const state = generateOAuthState();
		const cookieStore = await cookies();
		cookieStore.set(`oauth_state_${provider}`, state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 600, // 10分钟
			path: '/'
		});

		// 获取授权 URL 并重定向
		const authUrl = getOAuthAuthUrl(provider, state);
		return NextResponse.redirect(authUrl);
	} catch (error: any) {
		return NextResponse.json({ error: error.message || 'OAuth 初始化失败' }, { status: 500 });
	}
}

