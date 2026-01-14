import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendRegistrationCode } from '@/lib/auth/verificationCode';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('SendRegistrationCode API');

const RequestSchema = z.object({
	email: z.string().email()
});

export async function POST(req: Request) {
	try {
		const json = await req.json();
		const { email } = RequestSchema.parse(json);

		const result = await sendRegistrationCode(email);
		
		if (!result.success) {
			return NextResponse.json(
				{ error: result.error || '发送失败' },
				{ status: 400 }
			);
		}

		return NextResponse.json({ 
			ok: true, 
			message: '验证码已发送到您的邮箱，请查收' 
		});
	} catch (err: any) {
		log.error('发送注册验证码失败', err as Error);
		return NextResponse.json(
			{ error: err.message || '发送失败' },
			{ status: 500 }
		);
	}
}




