import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'll_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
	const secret = process.env.SESSION_SECRET || 'dev-insecure-secret';
	return new TextEncoder().encode(secret);
}

export async function createSession(payload: JWTPayload) {
	const token = await new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${MAX_AGE_SECONDS}s`)
		.sign(getSecret());
	(await cookies()).set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
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
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: 0,
		sameSite: 'lax'
	});
}


