'use client';

import { useState, useEffect } from 'react';

interface InviteDialogProps {
	roomId: string;
	open: boolean;
	onClose: () => void;
}

export default function InviteDialog({
	roomId,
	open,
	onClose
}: InviteDialogProps) {
	const [copied, setCopied] = useState(false);
	const [inviteUrl, setInviteUrl] = useState('');

	useEffect(() => {
		if (typeof window !== 'undefined') {
			setInviteUrl(`${window.location.origin}/chat/${roomId}`);
		}
	}, [roomId]);

	if (!open) return null;

	const handleClose = () => {
		setCopied(false);
		onClose();
	};

	const copyInviteUrl = async () => {
		try {
			await navigator.clipboard.writeText(inviteUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('复制失败:', err);
			alert('复制失败，请手动复制链接');
		}
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 10000,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'rgba(0, 0, 0, 0.5)'
			}}
		>
			<div
				style={{
					background: 'white',
					borderRadius: '8px',
					boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
					width: '100%',
					maxWidth: '500px',
					padding: '24px',
					position: 'relative'
				}}
			>
				<button
					onClick={handleClose}
					style={{
						position: 'absolute',
						top: '16px',
						right: '16px',
						background: 'none',
						border: 'none',
						fontSize: '24px',
						cursor: 'pointer',
						padding: '4px',
						lineHeight: 1,
						color: '#666',
						width: '28px',
						height: '28px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = '#333';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = '#666';
					}}
				>
					×
				</button>

				<h2
					style={{
						fontSize: '20px',
						fontWeight: 'bold',
						marginBottom: '16px',
						color: '#1a1a1a'
					}}
				>
					分享聊天室链接
				</h2>

				<p
					style={{
						fontSize: '14px',
						color: '#666',
						marginBottom: '20px',
						lineHeight: 1.5
					}}
				>
					复制此链接并分享给其他用户，他们可以通过链接直接加入聊天室
				</p>

				<div style={{ marginBottom: '20px' }}>
					<label
						style={{
							display: 'block',
							fontSize: '14px',
							fontWeight: '500',
							color: '#333',
							marginBottom: '8px'
						}}
					>
						聊天室链接
					</label>
					<div style={{ display: 'flex', gap: '8px' }}>
						<input
							type="text"
							readOnly
							value={inviteUrl}
							style={{
								flex: 1,
								padding: '10px 12px',
								border: '1px solid #ddd',
								borderRadius: '6px',
								fontSize: '14px',
								background: '#f9f9f9',
								color: '#333'
							}}
						/>
						<button
							onClick={copyInviteUrl}
							style={{
								padding: '10px 20px',
								background: copied ? '#10b981' : '#3b82f6',
								color: 'white',
								border: 'none',
								borderRadius: '6px',
								cursor: 'pointer',
								fontSize: '14px',
								fontWeight: '500',
								transition: 'background 0.2s'
							}}
							onMouseEnter={(e) => {
								if (!copied) {
									e.currentTarget.style.background = '#2563eb';
								}
							}}
							onMouseLeave={(e) => {
								if (!copied) {
									e.currentTarget.style.background = '#3b82f6';
								}
							}}
						>
							{copied ? '已复制！' : '复制链接'}
						</button>
					</div>
				</div>

				<button
					onClick={handleClose}
					style={{
						width: '100%',
						padding: '10px 20px',
						background: '#f3f4f6',
						color: '#333',
						border: 'none',
						borderRadius: '6px',
						cursor: 'pointer',
						fontSize: '14px',
						fontWeight: '500'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = '#e5e7eb';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = '#f3f4f6';
					}}
				>
					关闭
				</button>
			</div>
		</div>
	);
}

