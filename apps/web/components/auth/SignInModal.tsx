'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createModuleLogger } from '@/lib/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';

const log = createModuleLogger('SignInModal');

interface SignInModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSwitchToSignUp?: () => void;
}

export default function SignInModal({ isOpen, onClose, onSwitchToSignUp }: SignInModalProps) {
	const router = useRouter();
	const { refreshAuth } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMsg(null);
		setLoading(true);
		
		try {
			const res = await fetch('/api/auth/signin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					email, 
					password
				})
			});
			const data = await res.json();
			if (res.ok) {
				// 登录成功，等待 cookie 设置完成
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// 强制刷新认证状态
				try {
					await refreshAuth(true);
					window.dispatchEvent(new Event('auth:changed'));
					await new Promise(resolve => setTimeout(resolve, 200));
				} catch (err) {
					log.warn('刷新认证状态失败，但登录已成功', err as Error);
				}
				
				// 关闭弹窗并刷新页面
				onClose();
				window.location.reload();
			} else {
				setMsg(data.error || '登录失败');
			}
		} catch (err: any) {
			log.error('登录失败', err as Error);
			setMsg('登录失败，请稍后重试');
		} finally {
			setLoading(false);
		}
	};

	// 关闭时重置表单
	useEffect(() => {
		if (!isOpen) {
			setEmail('');
			setPassword('');
			setMsg(null);
			setLoading(false);
		}
	}, [isOpen]);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			maxWidth="400px"
			title="登录"
		>

			{/* Form */}
			<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					<label htmlFor="modal-email" style={{ 
						fontSize: '13px',
						fontWeight: 500,
						color: 'var(--color-text-secondary)'
					}}>
						邮箱
					</label>
					<input
						id="modal-email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						disabled={loading}
						placeholder="your@email.com"
						style={{
							width: '100%',
							padding: '10px 12px',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							fontSize: '14px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							transition: 'all 150ms',
							fontFamily: 'var(--font-family)',
							boxSizing: 'border-box',
							lineHeight: '1.5'
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
							e.currentTarget.style.outline = 'none';
							e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
							e.currentTarget.style.boxShadow = 'none';
						}}
					/>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					<label htmlFor="modal-password" style={{ 
						fontSize: '13px',
						fontWeight: 500,
						color: 'var(--color-text-secondary)'
					}}>
						密码
					</label>
					<input
						id="modal-password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						disabled={loading}
						placeholder="••••••••"
						style={{
							width: '100%',
							padding: '10px 12px',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							fontSize: '14px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							transition: 'all 150ms',
							fontFamily: 'var(--font-family)',
							boxSizing: 'border-box',
							lineHeight: '1.5'
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
							e.currentTarget.style.outline = 'none';
							e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
							e.currentTarget.style.boxShadow = 'none';
						}}
					/>
				</div>

				{msg && (
					<div style={{
						padding: '10px 12px',
						background: msg.includes('成功') 
							? 'var(--color-success-lighter)' 
							: 'rgba(198, 40, 40, 0.08)',
						color: msg.includes('成功') 
							? 'var(--color-success)' 
							: 'var(--color-error)',
						borderRadius: 'var(--radius-md)',
						fontSize: '13px',
						fontWeight: 400,
						lineHeight: '1.4'
					}}>
						{msg}
					</div>
				)}

				<button
					type="submit"
					disabled={loading}
					style={{
						width: '100%',
						padding: '10px 16px',
						fontSize: '14px',
						fontWeight: 500,
						borderRadius: 'var(--radius-md)',
						border: 'none',
						background: 'var(--color-primary)',
						color: '#ffffff',
						opacity: loading ? 0.6 : 1,
						cursor: loading ? 'not-allowed' : 'pointer',
						transition: 'all 150ms',
						marginTop: '8px',
						fontFamily: 'var(--font-family)',
						lineHeight: '1.5'
					}}
					onMouseEnter={(e) => {
						if (!loading) {
							e.currentTarget.style.opacity = '0.9';
							e.currentTarget.style.transform = 'translateY(-1px)';
						}
					}}
					onMouseLeave={(e) => {
						if (!loading) {
							e.currentTarget.style.opacity = '1';
							e.currentTarget.style.transform = 'translateY(0)';
						}
					}}
				>
					{loading ? '登录中...' : '登录'}
				</button>
			</form>

			{/* Footer - 切换到注册 */}
			<div style={{
				marginTop: '24px',
				paddingTop: '20px',
				borderTop: '1px solid var(--color-border-light)',
				textAlign: 'center'
			}}>
				<p style={{
					color: 'var(--color-text-secondary)',
					fontSize: '13px',
					margin: 0,
					marginBottom: '12px',
					lineHeight: '1.5'
				}}>
					没有账号？
				</p>
				<button
					type="button"
					onClick={() => {
						onClose();
						onSwitchToSignUp?.();
					}}
					style={{
						width: '100%',
						padding: '10px 16px',
						fontSize: '14px',
						fontWeight: 500,
						borderRadius: 'var(--radius-md)',
						border: '1px solid var(--color-border)',
						background: 'var(--color-background-paper)',
						color: 'var(--color-text-primary)',
						cursor: 'pointer',
						transition: 'all 150ms',
						fontFamily: 'inherit',
						lineHeight: '1.5'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = 'var(--color-background-subtle)';
						e.currentTarget.style.borderColor = 'var(--color-primary)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = 'var(--color-background-paper)';
						e.currentTarget.style.borderColor = 'var(--color-border)';
					}}
				>
					注册
				</button>
			</div>
		</Modal>
	);
}

