'use client';

import { useState, useEffect } from 'react';

interface RegisterPromptProps {
	isGuest: boolean;
	onRegisterSuccess?: () => void;
}

export default function RegisterPrompt({ isGuest, onRegisterSuccess }: RegisterPromptProps) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [registering, setRegistering] = useState(false);
	const [registered, setRegistered] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false); // 是否收缩

	// 检测是否是移动端
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	// 如果用户不是匿名用户，不显示
	if (!isGuest) {
		return null;
	}

	// 如果已经注册成功，显示成功提示后关闭
	if (registered) {
		return null;
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// 验证
		if (!email.trim()) {
			setError('请输入邮箱');
			return;
		}

		if (!email.includes('@')) {
			setError('请输入有效的邮箱地址');
			return;
		}

		if (password.length < 8) {
			setError('密码至少需要8位');
			return;
		}

		if (password !== confirmPassword) {
			setError('两次输入的密码不一致');
			return;
		}

		setRegistering(true);

		try {
			// 获取匿名用户ID
			const guestUserId = localStorage.getItem('guestUserId');

			// 调用注册 API
			const res = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: email.trim(),
					password,
					guestUserId: guestUserId || undefined
				})
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || '注册失败');
			}

			// 注册成功
			setRegistered(true);
			
			// 清除匿名用户ID
			localStorage.removeItem('guestUserId');

			// 延迟一下再调用回调，让用户看到成功状态
			setTimeout(() => {
				if (onRegisterSuccess) {
					onRegisterSuccess();
				}
				// 刷新页面以更新用户状态
				window.location.reload();
			}, 500);
		} catch (err: any) {
			setError(err.message || '注册失败，请重试');
			setRegistering(false);
		}
	};

	return (
		<div
			style={{
				position: 'fixed',
				bottom: isMobile ? '80px' : '20px', // 移动端距离底部更远，避免遮挡输入框
				right: isMobile ? '10px' : '20px',
				width: isCollapsed 
					? (isMobile ? '200px' : '180px') 
					: (isMobile ? 'calc(100vw - 20px)' : '320px'),
				maxWidth: 'calc(100vw - 40px)',
				maxHeight: isMobile ? 'calc(100vh - 100px)' : 'none', // 移动端限制高度
				background: 'var(--color-background)',
				border: '1px solid var(--color-border)',
				borderRadius: '12px',
				boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
				padding: isCollapsed ? (isMobile ? '12px' : '12px 16px') : (isMobile ? '16px' : '20px'),
				zIndex: 1000,
				animation: 'fadeIn 0.3s ease-in',
				overflowY: isMobile && !isCollapsed ? 'auto' : 'visible',
				transition: 'width 0.3s ease, padding 0.3s ease'
			}}
		>
			<style>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>

			{/* 标题栏（包含收缩/展开按钮） */}
			<div 
				style={{ 
					marginBottom: isCollapsed ? '0' : '16px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					cursor: 'pointer',
					userSelect: 'none'
				}}
				onClick={() => setIsCollapsed(!isCollapsed)}
			>
				<div style={{ flex: 1 }}>
					<h3
						style={{
							margin: 0,
							fontSize: isCollapsed ? '14px' : '16px',
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							marginBottom: isCollapsed ? '0' : '4px'
						}}
					>
						注册账号
					</h3>
					{!isCollapsed && (
						<p
							style={{
								margin: 0,
								fontSize: '13px',
								color: 'var(--color-text-secondary)',
								lineHeight: '1.5'
							}}
						>
							注册后可以保存聊天记录，方便随时查看
						</p>
					)}
				</div>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setIsCollapsed(!isCollapsed);
					}}
					style={{
						marginLeft: '12px',
						padding: '4px 8px',
						background: 'transparent',
						border: 'none',
						cursor: 'pointer',
						color: 'var(--color-text-secondary)',
						fontSize: '18px',
						lineHeight: 1,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						transition: 'transform 0.3s ease',
						transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'
					}}
					title={isCollapsed ? '展开' : '收缩'}
				>
					▼
				</button>
			</div>

			{/* 注册表单（收缩时隐藏） */}
			{!isCollapsed && (
				<form onSubmit={handleSubmit}>
				{/* 邮箱输入 */}
				<div style={{ marginBottom: '12px' }}>
					<label
						style={{
							display: 'block',
							fontSize: '13px',
							color: 'var(--color-text-secondary)',
							marginBottom: '6px',
							fontWeight: 500
						}}
					>
						邮箱
					</label>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="your@email.com"
						disabled={registering}
						required
						style={{
							width: '100%',
							padding: '10px 12px',
							border: '1px solid var(--color-border)',
							borderRadius: '6px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							fontSize: '14px',
							outline: 'none',
							boxSizing: 'border-box',
							transition: 'border-color 0.2s'
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
						}}
					/>
				</div>

				{/* 密码输入 */}
				<div style={{ marginBottom: '12px' }}>
					<label
						style={{
							display: 'block',
							fontSize: '13px',
							color: 'var(--color-text-secondary)',
							marginBottom: '6px',
							fontWeight: 500
						}}
					>
						密码（至少8位）
					</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="••••••••"
						disabled={registering}
						required
						minLength={8}
						style={{
							width: '100%',
							padding: '10px 12px',
							border: '1px solid var(--color-border)',
							borderRadius: '6px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							fontSize: '14px',
							outline: 'none',
							boxSizing: 'border-box',
							transition: 'border-color 0.2s'
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
						}}
					/>
				</div>

				{/* 确认密码输入 */}
				<div style={{ marginBottom: '16px' }}>
					<label
						style={{
							display: 'block',
							fontSize: '13px',
							color: 'var(--color-text-secondary)',
							marginBottom: '6px',
							fontWeight: 500
						}}
					>
						确认密码
					</label>
					<input
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder="••••••••"
						disabled={registering}
						required
						minLength={8}
						style={{
							width: '100%',
							padding: '10px 12px',
							border: '1px solid var(--color-border)',
							borderRadius: '6px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							fontSize: '14px',
							outline: 'none',
							boxSizing: 'border-box',
							transition: 'border-color 0.2s'
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
						}}
					/>
				</div>

				{/* 错误提示 */}
				{error && (
					<div
						style={{
							marginBottom: '12px',
							padding: '10px',
							background: 'rgba(239, 68, 68, 0.1)',
							border: '1px solid rgba(239, 68, 68, 0.3)',
							borderRadius: '6px',
							color: '#ef4444',
							fontSize: '13px',
							lineHeight: '1.5'
						}}
					>
						{error}
					</div>
				)}

				{/* 注册按钮 */}
				<button
					type="submit"
					disabled={registering}
					style={{
						width: '100%',
						padding: '12px',
						background: registering
							? 'var(--color-background-subtle)'
							: 'var(--color-primary)',
						color: 'white',
						border: 'none',
						borderRadius: '6px',
						fontSize: '14px',
						fontWeight: 500,
						cursor: registering ? 'not-allowed' : 'pointer',
						opacity: registering ? 0.6 : 1,
						transition: 'opacity 0.2s, background 0.2s'
					}}
					onMouseEnter={(e) => {
						if (!registering) {
							e.currentTarget.style.opacity = '0.9';
						}
					}}
					onMouseLeave={(e) => {
						if (!registering) {
							e.currentTarget.style.opacity = '1';
						}
					}}
				>
					{registering ? '注册中...' : '注册'}
				</button>
			</form>
			)}
		</div>
	);
}

