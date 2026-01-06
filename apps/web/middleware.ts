import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readSessionFromRequest } from './lib/auth/middleware';
import { checkRateLimit } from './lib/rate-limit/middleware';

// Protected routes that require authentication
const protectedRoutes = ['/discussion', '/settings', '/shelf'];

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Set security headers
	const response = NextResponse.next();
	
	// 对于文件 API，允许在 iframe 中嵌入（用于 PDF 在线阅读）
	if (pathname.startsWith('/api/files/')) {
		response.headers.set('X-Frame-Options', 'SAMEORIGIN');
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('Referrer-Policy', 'no-referrer');
		response.headers.set(
			'Content-Security-Policy',
			"default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'self'"
		);
	} else {
		response.headers.set('X-Frame-Options', 'DENY');
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('Referrer-Policy', 'no-referrer');
		response.headers.set(
			'Content-Security-Policy',
			"default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'"
		);
	}

	// Rate limiting for API routes
	if (pathname.startsWith('/api/')) {
			const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
		const identifier = `api:${ip}:${pathname}`;
		
		// Different limits for different endpoints
		let maxRequests = 100;
		let windowSeconds = 60;

		if (pathname.startsWith('/api/auth/')) {
			maxRequests = 10; // Stricter limit for auth endpoints
			windowSeconds = 60;
		} else if (pathname.startsWith('/api/uploads/')) {
			maxRequests = 20; // Moderate limit for uploads
			windowSeconds = 60;
		} else if (pathname.startsWith('/api/ai/')) {
			maxRequests = 30; // Moderate limit for AI endpoints
			windowSeconds = 60;
		} else if (pathname.startsWith('/api/topics/') && pathname.includes('/comments')) {
			// 评论API限流：每分钟最多5条
			maxRequests = 5;
			windowSeconds = 60;
		}

		const rateLimitResult = await checkRateLimit(identifier, maxRequests, windowSeconds);
		
		if (!rateLimitResult.allowed) {
			return NextResponse.json(
				{ error: '请求过于频繁，请稍后再试' },
				{
					status: 429,
					headers: {
						'X-RateLimit-Limit': maxRequests.toString(),
						'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
						'X-RateLimit-Reset': rateLimitResult.reset.toString(),
						'Retry-After': (rateLimitResult.reset - Math.floor(Date.now() / 1000)).toString(),
					},
				}
			);
		}

		// Add rate limit headers to response
		response.headers.set('X-RateLimit-Limit', maxRequests.toString());
		response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
		response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
	}

	// Check authentication for protected routes
	if (protectedRoutes.some((route) => pathname.startsWith(route))) {
		const session = await readSessionFromRequest(request);
		if (!session?.sub) {
			// 重定向到首页，并在 URL 中添加参数表示需要登录
			const homeUrl = new URL('/', request.url);
			homeUrl.searchParams.set('redirect', pathname);
			homeUrl.searchParams.set('login', 'true');
			return NextResponse.redirect(homeUrl);
		}
	}

	// 旧的 auth 路由已经删除，不再需要重定向

	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
