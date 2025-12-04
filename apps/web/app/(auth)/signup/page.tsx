 'use client';
import { useState } from 'react';

export default function SignUpPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [inviteCode, setInviteCode] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMsg(null);
		
		// 获取匿名用户ID（如果存在）
		const guestUserId = localStorage.getItem('guestUserId');
		
		const res = await fetch('/api/auth/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ 
				email, 
				password, 
				inviteCode,
				guestUserId: guestUserId || undefined
			})
		});
		const data = await res.json();
		if (res.ok) {
			// 清除匿名用户ID
			localStorage.removeItem('guestUserId');
			location.href = '/';
		} else {
			setMsg(data.error || '注册失败');
		}
	};
	return (
		<main style={{ padding: 24, maxWidth: 480 }}>
			<h1>注册账号</h1>
			<form onSubmit={onSubmit}>
				<div style={{ marginBottom: 12 }}>
					<label>邮箱</label>
					<input style={{ width: '100%' }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
				</div>
				<div style={{ marginBottom: 12 }}>
					<label>密码（≥8位）</label>
					<input style={{ width: '100%' }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
				</div>
				<div style={{ marginBottom: 12 }}>
					<label>邀请码（可选）</label>
					<input style={{ width: '100%' }} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="可选，暂时不需要邀请码" />
				</div>
				<button type="submit">注册</button>
			</form>
			{msg && <p style={{ color: 'red' }}>{msg}</p>}
			<p>已有账号？<a href="/signin">去登录</a></p>
		</main>
	);
}


