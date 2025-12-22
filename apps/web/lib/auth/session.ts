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
	(await cookies()).set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: shouldUseSecureCookie(),
		path: '/',
		maxAge: MAX_AGE_SECONDS,
		sameSite: 'lax'
	});
}

export async function readSession<T extends JWTPayload>(): Promise<T | null> {
	const token = (await cookies()).get(COOKIE_NAME)?.value;
	if (!token) return null;
	try {
		const { payload } = await jwtVerify<T>(token, getSecret());
		return payload;
	} catch (error: any) {
		// 记录详细的错误信息，但不抛出异常，避免影响用户体验
		// 只在开发环境或明确需要调试时记录
		if (process.env.NODE_ENV === 'development') {
			console.warn('[Session] Token verification failed:', {
				error: error?.code || error?.message || 'Unknown error',
				hasToken: !!token,
				tokenLength: token?.length
			});
		}
		return null;
	}
}

export async function clearSession() {
	(await cookies()).set(COOKIE_NAME, '', {
		httpOnly: true,
		secure: shouldUseSecureCookie(),
		path: '/',
		maxAge: 0,
		sameSite: 'lax'
	});
}


