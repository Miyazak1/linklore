'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createModuleLogger } from '@/lib/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';

const log = createModuleLogger('SignUpModal');

interface SignUpModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSwitchToSignIn?: () => void;
}

export default function SignUpModal({ isOpen, onClose, onSwitchToSignIn }: SignUpModalProps) {
	const router = useRouter();
	const { refreshAuth } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [inviteCode, setInviteCode] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMsg(null);
		
		if (password !== confirmPassword) {
			setMsg('两次输入的密码不一致');
			return;
		}

		setLoading(true);
		
		try {
			const res = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					email, 
					password, 
					inviteCode: inviteCode.trim() || undefined
				})
			});
			const data = await res.json();
			if (res.ok) {
				// 注册成功
				setMsg('注册成功！验证邮件已发送到您的邮箱，请查收并点击验证链接激活账户。');
				
				// 3秒后关闭并切换到登录
				setTimeout(() => {
					onClose();
					setMsg(null);
					onSwitchToSignIn?.();
				}, 3000);
			} else {
				setMsg(data.error || '注册失败');
			}
		} catch (err: any) {
			log.error('注册失败', err as Error);
			setMsg('注册失败，请稍后重试');
		} finally {
			setLoading(false);
		}
	};

	// 关闭时重置表单
	useEffect(() => {
		if (!isOpen) {
			setEmail('');
			setPassword('');
			setConfirmPassword('');
			setInviteCode('');
			setMsg(null);
			setLoading(false);
		}
	}, [isOpen]);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			maxWidth="400px"
			title="注册账号"
		>
			{/* 描述文字 */}
			<p style={{
				color: 'var(--color-text-secondary)',
				marginTop: 0,
				marginBottom: '20px',
				fontSize: '13px',
				lineHeight: '1.5'
			}}>
				创建账号以转换并发送书籍到其他平台，保存到收藏和书单等。
			</p>

			{/* Form */}
			<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					<label htmlFor="modal-signup-email" style={{ 
						fontSize: '13px',
						fontWeight: 500,
						color: 'var(--color-text-secondary)'
					}}>
						邮箱
					</label>
					<input
						id="modal-signup-email"
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
					<label htmlFor="modal-signup-password" style={{ 
						fontSize: '13px',
						fontWeight: 500,
						color: 'var(--color-text-secondary)'
					}}>
						密码（≥8位）
					</label>
					<input
						id="modal-signup-password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						minLength={8}
						disabled={loading}
						placeholder="至少8个字符"
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
					<label htmlFor="modal-signup-confirm" style={{ 
						fontSize: '13px',
						fontWeight: 500,
						color: 'var(--color-text-secondary)'
					}}>
						确认密码
					</label>
					<input
						id="modal-signup-confirm"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
						minLength={8}
						disabled={loading}
						placeholder="再次输入密码"
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
					<label htmlFor="modal-signup-invite" style={{ 
						fontSize: '13px',
						fontWeight: 500,
						color: 'var(--color-text-secondary)'
					}}>
						邀请码（可选）
					</label>
					<input
						id="modal-signup-invite"
						type="text"
						value={inviteCode}
						onChange={(e) => setInviteCode(e.target.value)}
						disabled={loading}
						placeholder="可选"
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

				{/* 服务条款 */}
				<p style={{
					fontSize: '12px',
					color: 'var(--color-text-secondary)',
					margin: 0,
					lineHeight: '1.5'
				}}>
					注册即表示您同意我们的{' '}
					<a 
						href="/terms" 
						target="_blank"
						style={{
							color: 'var(--color-primary)',
							textDecoration: 'none'
						}}
					>
						服务条款
					</a>
				</p>

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
					{loading ? '注册中...' : '创建账号'}
				</button>
			</form>

			{/* Footer - 切换到登录 */}
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
					已有账号？
				</p>
				<button
					type="button"
					onClick={() => {
						onClose();
						onSwitchToSignIn?.();
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
					登录
				</button>
			</div>
		</Modal>
	);
}

