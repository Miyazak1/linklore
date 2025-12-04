/**
 * Session utilities for middleware (Edge Runtime compatible)
 */

import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';

const COOKIE_NAME = 'll_session';

function getSecret(): Uint8Array {
	const secret = process.env.SESSION_SECRET || 'dev-insecure-secret';
	return new TextEncoder().encode(secret);
}

export async function readSessionFromRequest<T extends JWTPayload>(
	request: NextRequest
): Promise<T | null> {
	const token = request.cookies.get(COOKIE_NAME)?.value;
	if (!token) return null;
	try {
		const { payload } = await jwtVerify<T>(token, getSecret());
		return payload;
	} catch {
		return null;
	}
}










