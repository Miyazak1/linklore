'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('InviteAcceptPage');

export default function InviteAcceptPage() {
	const params = useParams();
	const router = useRouter();
	const token = params?.token as string;
	
	const [loading, setLoading] = useState(true);
	const [roomId, setRoomId] = useState<string | null>(null);

	// 验证邀请token并跳转到聊天页面
	useEffect(() => {
		const verifyAndRedirect = async () => {
			try {
				// 验证邀请token
				const res = await fetch(`/api/chat/invites/${token}`);
				const data = await res.json();
				
				if (res.ok && data.invitation) {
					const targetRoomId = data.invitation.room.id;
					setRoomId(targetRoomId);
					
					// 直接跳转到聊天页面（带room参数）
					// 聊天页面会处理未登录用户的注册流程
					router.replace(`/chat?room=${targetRoomId}&invite=${token}`);
				} else {
					alert(data.error || '邀请无效');
					router.push('/');
				}
			} catch (error) {
				log.error('验证邀请失败', error as Error);
				alert('验证邀请失败');
				router.push('/');
			} finally {
				setLoading(false);
			}
		};

		if (token) {
			verifyAndRedirect();
		}
	}, [token, router]);

	if (loading) {
		return (
			<div style={{ 
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				minHeight: '100vh',
				background: 'var(--color-background)'
			}}>
				<div style={{ textAlign: 'center' }}>
					<div
						style={{
							width: 40,
							height: 40,
							border: '3px solid var(--color-border)',
							borderTopColor: 'var(--color-primary)',
							borderRadius: '50%',
							animation: 'spin 1s linear infinite',
							margin: '0 auto 16px'
						}}
					/>
					<p style={{ color: 'var(--color-text-secondary)' }}>正在验证邀请...</p>
				</div>
			</div>
		);
	}

	return null;
}
