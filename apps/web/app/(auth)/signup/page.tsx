 'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('SignUpPage');

export default function SignUpPage() {
	const router = useRouter();
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
				// 注册成功，跳转到首页
				router.push('/');
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

	return (
		<main style={{ 
			minHeight: '100vh',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			background: 'var(--color-background)',
			padding: 'var(--spacing-xl)'
		}}>
			<div className="card-academic" style={{
				maxWidth: '480px',
				width: '100%',
				padding: 'var(--spacing-xxl)',
				boxShadow: 'var(--shadow-lg)'
			}}>
				{/* Logo/Icon */}
				<div style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: 'var(--spacing-xl)'
				}}>
					<div style={{
						width: '64px',
						height: '64px',
						borderRadius: 'var(--radius-lg)',
						background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: '32px',
						boxShadow: 'var(--shadow-md)',
						marginBottom: 'var(--spacing-md)'
					}}>
						📝
					</div>
				</div>

				{/* Title */}
				<h1 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-md)',
					fontSize: 'var(--font-size-3xl)',
					fontWeight: 700,
					textAlign: 'center',
					background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundClip: 'text',
					letterSpacing: '-0.02em'
				}}>
					注册账号
				</h1>

				<p style={{
					textAlign: 'center',
					color: 'var(--color-text-secondary)',
					marginBottom: 'var(--spacing-xl)',
					fontSize: 'var(--font-size-base)'
				}}>
					加入 LinkLore，开始您的学术讨论之旅
				</p>

				{/* Form */}
				<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="email" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							邮箱 <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-lg)' }}>*</span>
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={loading}
							placeholder="your@email.com"
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								transition: 'all var(--transition-fast)',
								fontFamily: 'var(--font-family)',
								boxSizing: 'border-box'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						/>
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="password" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							密码（≥8位） <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-lg)' }}>*</span>
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={8}
							disabled={loading}
							placeholder="至少8个字符"
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								transition: 'all var(--transition-fast)',
								fontFamily: 'var(--font-family)',
								boxSizing: 'border-box'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						/>
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="confirmPassword" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							确认密码 <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-lg)' }}>*</span>
						</label>
						<input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							minLength={8}
							disabled={loading}
							placeholder="再次输入密码"
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								transition: 'all var(--transition-fast)',
								fontFamily: 'var(--font-family)',
								boxSizing: 'border-box'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						/>
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="inviteCode" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-secondary)'
						}}>
							邀请码（可选）
						</label>
						<input
							id="inviteCode"
							type="text"
							value={inviteCode}
							onChange={(e) => setInviteCode(e.target.value)}
							disabled={loading}
							placeholder="可选，暂时不需要邀请码"
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								transition: 'all var(--transition-fast)',
								fontFamily: 'var(--font-family)',
								boxSizing: 'border-box'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						/>
					</div>

					{msg && (
						<div style={{
							padding: 'var(--spacing-md) var(--spacing-lg)',
							background: msg.includes('成功') 
								? 'var(--color-success-lighter)' 
								: 'rgba(198, 40, 40, 0.1)',
							color: msg.includes('成功') 
								? 'var(--color-success)' 
								: 'var(--color-error)',
							borderLeft: `4px solid ${msg.includes('成功') ? 'var(--color-success)' : 'var(--color-error)'}`,
							borderRadius: 'var(--radius-md)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500
						}}>
							{msg}
						</div>
					)}

					<button
						type="submit"
						disabled={loading}
						className="btn-academic-primary"
						style={{
							width: '100%',
							padding: 'var(--spacing-md) var(--spacing-xl)',
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							borderRadius: 'var(--radius-md)',
							opacity: loading ? 0.6 : 1,
							cursor: loading ? 'not-allowed' : 'pointer',
							transition: 'all var(--transition-fast)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 'var(--spacing-sm)',
							marginTop: 'var(--spacing-md)'
						}}
						onMouseEnter={(e) => {
							if (!loading) {
								e.currentTarget.style.transform = 'translateY(-2px)';
								e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
							}
						}}
						onMouseLeave={(e) => {
							if (!loading) {
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.boxShadow = 'none';
							}
						}}
					>
						{loading ? (
							<>
								<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
								注册中...
							</>
						) : (
							<>
								<span>📝</span>
								注册
							</>
						)}
					</button>
				</form>

				{/* Footer */}
				<div style={{
					marginTop: 'var(--spacing-xl)',
					paddingTop: 'var(--spacing-lg)',
					borderTop: '1px solid var(--color-border-light)',
					textAlign: 'center'
				}}>
					<p style={{
						color: 'var(--color-text-secondary)',
						fontSize: 'var(--font-size-sm)',
						margin: 0
					}}>
						已有账号？{' '}
						<a 
							href="/signin"
							className="academic-link"
							style={{
								fontWeight: 600,
								color: 'var(--color-primary)'
							}}
						>
							去登录
						</a>
					</p>
				</div>
				</div>
		</main>
	);
}
