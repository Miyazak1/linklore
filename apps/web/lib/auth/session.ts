import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'll_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
	const secret = process.env.SESSION_SECRET || 'dev-insecure-secret';
	return new TextEncoder().encode(secret);
}

/**
 * 获取 Cookie Domain
 * 如果设置了 COOKIE_DOMAIN，使用该值；否则返回 undefined（使用默认行为）
 */
function getCookieDomain(): string | undefined {
	if (process.env.COOKIE_DOMAIN) {
		return process.env.COOKIE_DOMAIN.trim();
	}
	// 如果没有设置，返回 undefined，让 Next.js 使用默认行为（当前请求的域名）
	return undefined;
}

/**
 * 判断是否应该使用 secure cookie
 * 优先级：COOKIE_SECURE 环境变量 > NEXT_PUBLIC_APP_URL > 默认值
 */
function shouldUseSecureCookie(): boolean {
	// 优先级1：如果环境变量明确指定，直接使用（最高优先级，覆盖其他所有判断）
	// 这样可以强制控制，即使 URL 是 https:// 也可以设置为 false（用于测试或特殊场景）
	if (process.env.COOKIE_SECURE !== undefined) {
		const value = process.env.COOKIE_SECURE.toLowerCase().trim();
		return value === 'true' || value === '1';
	}
	
	// 优先级2：如果配置了 HTTPS URL，使用 secure
	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	if (appUrl && appUrl.startsWith('https://')) {
		return true;
	}
	
	// 优先级3：开发环境不使用 secure（允许 HTTP）
	if (process.env.NODE_ENV === 'development') {
		return false;
	}
	
	// 优先级4：生产环境默认不使用 secure（允许通过环境变量控制）
	// 如果用户使用 HTTP，需要设置 COOKIE_SECURE=false
	return false;
}

export async function createSession(payload: JWTPayload) {
	const token = await new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${MAX_AGE_SECONDS}s`)
		.sign(getSecret());
	
	const cookieDomain = getCookieDomain();
	const cookieOptions: any = {
		httpOnly: true,
		secure: shouldUseSecureCookie(),
		path: '/',
		maxAge: MAX_AGE_SECONDS,
		sameSite: 'lax' as const
	};
	
	// 如果设置了 COOKIE_DOMAIN，添加到选项中
	// 注意：Next.js 的 cookies().set() 可能不支持 domain，但我们可以尝试
	if (cookieDomain) {
		cookieOptions.domain = cookieDomain;
	}
	
	(await cookies()).set(COOKIE_NAME, token, cookieOptions);
	
	// 记录 Cookie 设置信息（用于调试）
	console.error('[Session] Cookie set:', {
		name: COOKIE_NAME,
		domain: cookieDomain || 'default',
		secure: cookieOptions.secure,
		path: cookieOptions.path,
		sameSite: cookieOptions.sameSite,
		maxAge: cookieOptions.maxAge,
		hasToken: !!token,
		tokenLength: token?.length
	});
}

export async function readSession<T extends JWTPayload>(): Promise<T | null> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(COOKIE_NAME);
	const token = cookie?.value;
	
	if (!token) {
		// 使用 console.error 确保在生产环境也能看到日志
		console.error('[Session] No token found in cookies', {
			cookieName: COOKIE_NAME,
			hasCookie: !!cookie,
			allCookies: Array.from(cookieStore.getAll()).map(c => c.name)
		});
		return null;
	}
	try {
		const { payload } = await jwtVerify<T>(token, getSecret());
		console.error('[Session] Token verified successfully:', { sub: payload.sub, email: payload.email });
		return payload;
	} catch (error: any) {
		// 记录详细的错误信息，帮助调试
		console.error('[Session] Token verification failed:', {
			error: error?.code || error?.message || 'Unknown error',
			errorName: error?.name,
			hasToken: !!token,
			tokenLength: token?.length,
			tokenPrefix: token?.substring(0, 20) + '...',
			secretLength: getSecret().length
		});
		return null;
	}
}

export async function clearSession() {
	const cookieDomain = getCookieDomain();
	const cookieOptions: any = {
		httpOnly: true,
		secure: shouldUseSecureCookie(),
		path: '/',
		maxAge: 0,
		sameSite: 'lax' as const
	};
	
	if (cookieDomain) {
		cookieOptions.domain = cookieDomain;
	}
	
	(await cookies()).set(COOKIE_NAME, '', cookieOptions);
}


