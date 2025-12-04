'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function InviteAcceptPage() {
	const router = useRouter();
	const params = useParams();
	const token = params?.token as string;
	
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [invitation, setInvitation] = useState<any>(null);

	useEffect(() => {
		if (!token) return;

		// 验证邀请
		fetch(`/api/chat/invitations/${token}`)
			.then((res) => res.json())
			.then((data) => {
				if (data.error) {
					setError(data.error);
					setLoading(false);
				} else {
					setInvitation(data.invitation);
					setLoading(false);
				}
			})
			.catch((err) => {
				setError('验证邀请失败');
				setLoading(false);
			});
	}, [token]);

	const handleAccept = async () => {
		if (!token) return;

		setLoading(true);
		try {
			const res = await fetch(`/api/chat/invitations/${token}/accept`, {
				method: 'POST'
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || '接受邀请失败');
			}

			// 跳转到聊天室
			router.push(`/chat?room=${data.room.id}`);
		} catch (err: any) {
			setError(err.message || '接受邀请失败');
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					background: 'var(--color-background)'
				}}
			>
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
					<p style={{ color: 'var(--color-text-secondary)' }}>加载中...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					background: 'var(--color-background)'
				}}
			>
				<div
					style={{
						background: 'white',
						padding: '32px',
						borderRadius: '8px',
						boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
						maxWidth: '400px',
						textAlign: 'center'
					}}
				>
					<div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
					<h2 style={{ marginBottom: '16px', color: 'var(--color-text)' }}>
						邀请无效
					</h2>
					<p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
						{error}
					</p>
					<button
						onClick={() => router.push('/chat')}
						style={{
							padding: '10px 20px',
							background: 'var(--color-primary)',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer'
						}}
					>
						返回聊天室
					</button>
				</div>
			</div>
		);
	}

	if (!invitation) {
		return null;
	}

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				height: '100vh',
				background: 'var(--color-background)'
			}}
		>
			<div
				style={{
					background: 'white',
					padding: '32px',
					borderRadius: '8px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
					maxWidth: '400px',
					textAlign: 'center'
				}}
			>
				<div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
				<h2 style={{ marginBottom: '16px', color: 'var(--color-text)' }}>
					聊天室邀请
				</h2>
				<p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
					<strong>{invitation.inviter.name || invitation.inviter.email}</strong>{' '}
					邀请您加入聊天室
				</p>
				<div style={{ marginBottom: '24px' }}>
					<p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
						房间类型：{invitation.room.type === 'SOLO' ? '单人' : '双人'}
					</p>
				</div>
				<div style={{ display: 'flex', gap: '12px' }}>
					<button
						onClick={() => router.push('/chat')}
						style={{
							flex: 1,
							padding: '10px 20px',
							background: 'var(--color-background-secondary)',
							color: 'var(--color-text)',
							border: '1px solid var(--color-border)',
							borderRadius: '6px',
							cursor: 'pointer'
						}}
					>
						取消
					</button>
					<button
						onClick={handleAccept}
						disabled={loading}
						style={{
							flex: 1,
							padding: '10px 20px',
							background: 'var(--color-primary)',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: loading ? 'not-allowed' : 'pointer',
							opacity: loading ? 0.6 : 1
						}}
					>
						{loading ? '接受中...' : '接受邀请'}
					</button>
				</div>
			</div>
		</div>
	);
}

