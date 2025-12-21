'use client';

// 禁用静态生成，强制动态渲染
export const dynamic = 'force-dynamic';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createModuleLogger } from '@/lib/utils/logger';
import { useAuth } from '@/contexts/AuthContext';

const log = createModuleLogger('SignInPage');

function SignInPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirect = searchParams.get('redirect') || '/';
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
				// 登录成功，强制刷新认证状态（跳过防抖）
				try {
					await refreshAuth(true);
					// 触发全局事件，通知所有组件更新
					window.dispatchEvent(new Event('auth:changed'));
				} catch (err) {
					log.warn('刷新认证状态失败，但登录已成功', err as Error);
				}
				// 跳转到目标页面
				router.push(redirect);
				// 强制刷新页面以确保状态同步
				router.refresh();
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
						🔐
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
					登录
				</h1>

				<p style={{
					textAlign: 'center',
					color: 'var(--color-text-secondary)',
					marginBottom: 'var(--spacing-xl)',
					fontSize: 'var(--font-size-base)'
				}}>
					欢迎回来
				</p>

				{/* Form */}
				<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="email" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							邮箱
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={loading}
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
							密码
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={loading}
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
								登录中...
							</>
						) : (
							<>
								<span>🔑</span>
								登录
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
						没有账号？{' '}
						<a 
							href="/signup"
							className="academic-link"
							style={{
								fontWeight: 600,
								color: 'var(--color-primary)'
							}}
						>
							注册账号
						</a>
					</p>
				</div>
			</div>
		</main>
	);
}

export default function SignInPage() {
	return (
		<Suspense fallback={<div style={{ padding: '24px', textAlign: 'center' }}>加载中...</div>}>
			<SignInPageContent />
		</Suspense>
	);
}
