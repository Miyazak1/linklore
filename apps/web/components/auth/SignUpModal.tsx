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
	const [showPassword, setShowPassword] = useState(false);
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [verificationCode, setVerificationCode] = useState('');
	const [codeSent, setCodeSent] = useState(false);
	const [codeCountdown, setCodeCountdown] = useState(0);
	const [sendingCode, setSendingCode] = useState(false);
	const [inviteCode, setInviteCode] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// 发送验证码
	const sendCode = async () => {
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			setMsg('请输入有效的邮箱地址');
			return;
		}

		setSendingCode(true);
		setMsg(null);

		try {
			const res = await fetch('/api/auth/send-registration-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});
			const data = await res.json();
			if (res.ok) {
				setCodeSent(true);
				setCodeCountdown(60); // 60秒倒计时
				setMsg('验证码已发送到您的邮箱，请查收');
				
				// 倒计时
				const timer = setInterval(() => {
					setCodeCountdown(prev => {
						if (prev <= 1) {
							clearInterval(timer);
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
			} else {
				setMsg(data.error || '发送验证码失败');
			}
		} catch (err: any) {
			log.error('发送验证码失败', err as Error);
			setMsg('发送验证码失败，请稍后重试');
		} finally {
			setSendingCode(false);
		}
	};

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMsg(null);
		
		if (password !== confirmPassword) {
			setMsg('两次输入的密码不一致');
			return;
		}

		if (!codeSent || !verificationCode || verificationCode.length !== 6) {
			setMsg('请先获取并输入验证码');
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
					verificationCode,
					inviteCode: inviteCode.trim() || undefined
				})
			});
			const data = await res.json();
			if (res.ok) {
				// 注册成功，等待 cookie 设置完成
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// 强制刷新认证状态
				try {
					await refreshAuth(true);
					window.dispatchEvent(new Event('auth:changed'));
					await new Promise(resolve => setTimeout(resolve, 200));
				} catch (err) {
					log.warn('刷新认证状态失败，但注册已成功', err as Error);
				}
				
				// 关闭弹窗并保持在当前页面（不刷新）
				onClose();
				setMsg(null);
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
			setShowPassword(false);
			setConfirmPassword('');
			setShowConfirmPassword(false);
			setVerificationCode('');
			setCodeSent(false);
			setCodeCountdown(0);
			setSendingCode(false);
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
					<div style={{ position: 'relative', width: '100%' }}>
						<input
							id="modal-signup-password"
							type={showPassword ? 'text' : 'password'}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={8}
							disabled={loading}
							placeholder="至少8个字符"
							style={{
								width: '100%',
								padding: '10px 40px 10px 12px',
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
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							style={{
								position: 'absolute',
								right: '8px',
								top: '50%',
								transform: 'translateY(-50%)',
								background: 'transparent',
								border: 'none',
								cursor: 'pointer',
								padding: '4px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: 'var(--color-text-secondary)',
								transition: 'color 150ms'
							}}
							tabIndex={-1}
							onMouseEnter={(e) => {
								e.currentTarget.style.color = 'var(--color-text-primary)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.color = 'var(--color-text-secondary)';
							}}
						>
							{showPassword ? (
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
									<circle cx="12" cy="12" r="3"/>
								</svg>
							) : (
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
									<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
									<path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
									<line x1="2" y1="2" x2="22" y2="22"/>
								</svg>
							)}
						</button>
					</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					<label htmlFor="modal-signup-confirm" style={{ 
						fontSize: '13px',
						fontWeight: 500,
						color: 'var(--color-text-secondary)'
					}}>
						确认密码
					</label>
					<div style={{ position: 'relative', width: '100%' }}>
						<input
							id="modal-signup-confirm"
							type={showConfirmPassword ? 'text' : 'password'}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							minLength={8}
							disabled={loading}
							placeholder="再次输入密码"
							style={{
								width: '100%',
								padding: '10px 40px 10px 12px',
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
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							style={{
								position: 'absolute',
								right: '8px',
								top: '50%',
								transform: 'translateY(-50%)',
								background: 'transparent',
								border: 'none',
								cursor: 'pointer',
								padding: '4px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: 'var(--color-text-secondary)',
								transition: 'color 150ms'
							}}
							tabIndex={-1}
							onMouseEnter={(e) => {
								e.currentTarget.style.color = 'var(--color-text-primary)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.color = 'var(--color-text-secondary)';
							}}
						>
							{showConfirmPassword ? (
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
									<circle cx="12" cy="12" r="3"/>
								</svg>
							) : (
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
									<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
									<path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
									<line x1="2" y1="2" x2="22" y2="22"/>
								</svg>
							)}
						</button>
					</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					<label htmlFor="modal-signup-code" style={{ 
						fontSize: '13px',
						fontWeight: 500,
						color: 'var(--color-text-secondary)'
					}}>
						验证码
					</label>
					<div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
						<input
							id="modal-signup-code"
							type="text"
							value={verificationCode}
							onChange={(e) => {
								const value = e.target.value.replace(/\D/g, '').slice(0, 6);
								setVerificationCode(value);
							}}
							required
							disabled={loading}
							placeholder={codeSent ? "请输入6位验证码" : "请先发送验证码"}
							maxLength={6}
							readOnly={!codeSent}
							style={{
								flex: 1,
								padding: '10px 12px',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: '14px',
								background: codeSent ? 'var(--color-background)' : 'var(--color-background-subtle)',
								color: codeSent ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
								transition: 'all 150ms',
								fontFamily: 'var(--font-family)',
								boxSizing: 'border-box',
								lineHeight: '1.5',
								letterSpacing: '4px',
								textAlign: 'center',
								fontWeight: 600,
								cursor: codeSent ? 'text' : 'not-allowed'
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
						<button
							type="button"
							onClick={sendCode}
							disabled={sendingCode || codeCountdown > 0 || !email || loading}
							style={{
								padding: '10px 16px',
								fontSize: '13px',
								fontWeight: 500,
								borderRadius: 'var(--radius-md)',
								border: '1px solid var(--color-border)',
								background: codeCountdown > 0 || sendingCode || !email
									? 'var(--color-background-subtle)'
									: 'var(--color-primary)',
								color: codeCountdown > 0 || sendingCode || !email
									? 'var(--color-text-secondary)'
									: '#ffffff',
								cursor: codeCountdown > 0 || sendingCode || !email
									? 'not-allowed'
									: 'pointer',
								transition: 'all 150ms',
								whiteSpace: 'nowrap',
								minWidth: '100px'
							}}
						>
							{codeCountdown > 0 ? `${codeCountdown}秒` : sendingCode ? '发送中...' : '发送验证码'}
						</button>
					</div>
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

