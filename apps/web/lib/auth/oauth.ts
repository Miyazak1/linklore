/**
 * OAuth 登录服务（微信、QQ）
 */

import { prisma } from '@/lib/db/client';
import { createSession } from '@/lib/auth/session';
import { randomBytes } from 'crypto';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('OAuth');

export type OAuthProvider = 'wechat' | 'qq';

/**
 * 生成 OAuth state 参数（用于防止 CSRF 攻击）
 */
export function generateOAuthState(): string {
	return randomBytes(32).toString('hex');
}

/**
 * 获取 OAuth 授权 URL
 */
export function getOAuthAuthUrl(provider: OAuthProvider, state: string): string {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const redirectUri = `${appUrl}/api/auth/oauth/callback?provider=${provider}`;

	if (provider === 'wechat') {
		const appId = process.env.WECHAT_APP_ID;
		if (!appId) {
			// 开发环境友好提示
			const errorMsg = process.env.NODE_ENV === 'development' 
				? 'WECHAT_APP_ID 未配置。请在 .env.local 中配置微信 OAuth 参数，或使用邮箱登录。'
				: 'WECHAT_APP_ID 未配置';
			throw new Error(errorMsg);
		}
		// 微信 OAuth 2.0 授权 URL
		// 注意：这里使用的是网页授权，需要用户已关注公众号或使用微信开放平台
		// 实际使用时可能需要根据微信开放平台的文档调整
		return `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
	} else if (provider === 'qq') {
		const appId = process.env.QQ_APP_ID;
		if (!appId) {
			// 开发环境友好提示
			const errorMsg = process.env.NODE_ENV === 'development' 
				? 'QQ_APP_ID 未配置。请在 .env.local 中配置 QQ OAuth 参数，或使用邮箱登录。'
				: 'QQ_APP_ID 未配置';
			throw new Error(errorMsg);
		}
		// QQ OAuth 2.0 授权 URL
		return `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=get_user_info`;
	}

	throw new Error(`不支持的 OAuth 提供商: ${provider}`);
}

/**
 * 通过授权码获取访问令牌（微信）
 */
async function getWechatAccessToken(code: string): Promise<{ access_token: string; openid: string }> {
	const appId = process.env.WECHAT_APP_ID;
	const appSecret = process.env.WECHAT_APP_SECRET;
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const redirectUri = `${appUrl}/api/auth/oauth/callback?provider=wechat`;

	if (!appId || !appSecret) {
		throw new Error('微信 OAuth 配置不完整');
	}

	const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;

	const response = await fetch(tokenUrl);
	const data = await response.json();

	if (data.errcode) {
		throw new Error(`获取微信访问令牌失败: ${data.errmsg || data.errcode}`);
	}

	return {
		access_token: data.access_token,
		openid: data.openid
	};
}

/**
 * 通过授权码获取访问令牌（QQ）
 */
async function getQQAccessToken(code: string): Promise<{ access_token: string }> {
	const appId = process.env.QQ_APP_ID;
	const appKey = process.env.QQ_APP_KEY;
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const redirectUri = `${appUrl}/api/auth/oauth/callback?provider=qq`;

	if (!appId || !appKey) {
		throw new Error('QQ OAuth 配置不完整');
	}

	const tokenUrl = `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${appId}&client_secret=${appKey}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`;

	const response = await fetch(tokenUrl);
	const text = await response.text();

	// QQ API 返回的是 URL 编码格式，需要解析
	const params = new URLSearchParams(text);
	const accessToken = params.get('access_token');

	if (!accessToken) {
		const error = params.get('error_description') || params.get('error') || '未知错误';
		throw new Error(`获取QQ访问令牌失败: ${error}`);
	}

	return { access_token: accessToken };
}

/**
 * 获取微信用户信息
 */
async function getWechatUserInfo(accessToken: string, openid: string): Promise<{
	openid: string;
	nickname?: string;
	headimgurl?: string;
}> {
	const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`;

	const response = await fetch(userInfoUrl);
	const data = await response.json();

	if (data.errcode) {
		throw new Error(`获取微信用户信息失败: ${data.errmsg || data.errcode}`);
	}

	return {
		openid: data.openid,
		nickname: data.nickname,
		headimgurl: data.headimgurl
	};
}

/**
 * 获取 QQ 用户信息
 */
async function getQQUserInfo(accessToken: string): Promise<{
	openid: string;
	nickname?: string;
	figureurl?: string;
}> {
	// 先获取 openid
	const openIdUrl = `https://graph.qq.com/oauth2.0/me?access_token=${accessToken}`;
	const openIdResponse = await fetch(openIdUrl);
	const openIdText = await openIdResponse.text();

	// 解析 JSONP 格式的响应
	const match = openIdText.match(/callback\((.+)\)/);
	if (!match) {
		throw new Error('获取QQ OpenID失败');
	}

	const openIdData = JSON.parse(match[1]);
	if (openIdData.error) {
		throw new Error(`获取QQ OpenID失败: ${openIdData.error_description || openIdData.error}`);
	}

	const openid = openIdData.openid;
	const appId = process.env.QQ_APP_ID;

	if (!appId) {
		throw new Error('QQ_APP_ID 未配置');
	}

	// 获取用户信息
	const userInfoUrl = `https://graph.qq.com/user/get_user_info?access_token=${accessToken}&oauth_consumer_key=${appId}&openid=${openid}`;
	const userInfoResponse = await fetch(userInfoUrl);
	const userInfo = await userInfoResponse.json();

	if (userInfo.ret !== 0) {
		throw new Error(`获取QQ用户信息失败: ${userInfo.msg || userInfo.ret}`);
	}

	return {
		openid,
		nickname: userInfo.nickname,
		figureurl: userInfo.figureurl_qq_2 || userInfo.figureurl_qq_1
	};
}

/**
 * 处理 OAuth 回调，创建或关联用户账户
 */
export async function handleOAuthCallback(
	provider: OAuthProvider,
	code: string,
	state: string
): Promise<{ userId: string; email: string; role: string }> {
	try {
		// 获取访问令牌和用户信息
		let providerId: string;
		let nickname: string | undefined;
		let avatarUrl: string | undefined;
		let accessToken: string;
		let refreshToken: string | undefined;
		let expiresAt: Date | undefined;

		if (provider === 'wechat') {
			const tokenData = await getWechatAccessToken(code);
			accessToken = tokenData.access_token;
			providerId = tokenData.openid;

			const userInfo = await getWechatUserInfo(accessToken, providerId);
			nickname = userInfo.nickname;
			avatarUrl = userInfo.headimgurl;
		} else if (provider === 'qq') {
			const tokenData = await getQQAccessToken(code);
			accessToken = tokenData.access_token;

			const userInfo = await getQQUserInfo(accessToken);
			providerId = userInfo.openid;
			nickname = userInfo.nickname;
			avatarUrl = userInfo.figureurl;
		} else {
			throw new Error(`不支持的 OAuth 提供商: ${provider}`);
		}

		// 查找或创建 OAuth 账户
		let oauthAccount = await prisma.oAuthAccount.findUnique({
			where: {
				provider_providerId: {
					provider,
					providerId
				}
			},
			include: { user: true }
		});

		let user;

		if (oauthAccount) {
			// 更新访问令牌
			await prisma.oAuthAccount.update({
				where: { id: oauthAccount.id },
				data: {
					accessToken,
					refreshToken,
					expiresAt
				}
			});

			user = oauthAccount.user;
		} else {
			// 创建新用户和 OAuth 账户
			// OAuth 用户使用临时邮箱格式
			const tempEmail = `${provider}_${providerId}@oauth.local`;

			user = await prisma.user.create({
				data: {
					email: tempEmail,
					name: nickname || undefined,
					avatarUrl: avatarUrl || undefined,
					passwordHash: null, // OAuth 用户不需要密码
					emailVerified: true, // OAuth 用户视为已验证
					role: 'member'
				}
			});

			await prisma.oAuthAccount.create({
				data: {
					userId: user.id,
					provider,
					providerId,
					accessToken,
					refreshToken,
					expiresAt
				}
			});
		}

		log.debug('OAuth 登录成功', { provider, userId: user.id });

		return {
			userId: user.id,
			email: user.email,
			role: user.role
		};
	} catch (error: any) {
		log.error('OAuth 回调处理失败', error as Error, { provider, code });
		throw error;
	}
}

