'use client';
import { useState } from 'react';

export default function SignInPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMsg(null);
		
		// 获取匿名用户ID（如果存在）
		const guestUserId = localStorage.getItem('guestUserId');
		
		const res = await fetch('/api/auth/signin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ 
				email, 
				password,
				guestUserId: guestUserId || undefined
			})
		});
		const data = await res.json();
		if (res.ok) {
			// 清除匿名用户ID
			localStorage.removeItem('guestUserId');
			location.href = '/';
		} else {
			setMsg(data.error || '登录失败');
		}
	};
	return (
		<main style={{ padding: 24, maxWidth: 480 }}>
			<h1>登录</h1>
			<form onSubmit={onSubmit}>
				<div style={{ marginBottom: 12 }}>
					<label>邮箱</label>
					<input style={{ width: '100%' }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
				</div>
				<div style={{ marginBottom: 12 }}>
					<label>密码</label>
					<input style={{ width: '100%' }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
				</div>
				<button type="submit">登录</button>
			</form>
			{msg && <p style={{ color: 'red' }}>{msg}</p>}
			<p>没有账号？<a href="/signup">使用邀请码注册</a></p>
		</main>
	);
}


