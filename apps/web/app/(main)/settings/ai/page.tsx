'use client';
import { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';

type Provider = 'openai' | 'qwen' | 'siliconflow';

export default function MyAiSettingsPage() {
	// 个人信息状态
	const [userName, setUserName] = useState<string>('');
	const [userEmail, setUserEmail] = useState<string>('');
	const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
	const [avatarUrlInput, setAvatarUrlInput] = useState<string>('');
	const [profileMsg, setProfileMsg] = useState<string | null>(null);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	
	// AI 设置状态
	const [provider, setProvider] = useState<Provider>('siliconflow');
	const [apiKey, setApiKey] = useState('');
	const [model, setModel] = useState('');
	const [apiEndpoint, setApiEndpoint] = useState('');
	const [aiNickname, setAiNickname] = useState<string>(''); // AI昵称
	const [persist, setPersist] = useState(true);
	const [msg, setMsg] = useState<string | null>(null);
	const [usage, setUsage] = useState<any>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [systemConfig, setSystemConfig] = useState<any>(null);
	const [isSystemConfig, setIsSystemConfig] = useState(false); // 是否在编辑系统配置

	useEffect(() => {
		(async () => {
			try {
				// 加载用户个人信息
				const profileRes = await fetch('/api/user/profile');
				if (profileRes.ok) {
					const profileData = await profileRes.json();
					if (profileData.user) {
						setUserName(profileData.user.name || '');
						setUserEmail(profileData.user.email || '');
						setUserAvatarUrl(profileData.user.avatarUrl || null);
						setAvatarUrlInput(profileData.user.avatarUrl || '');
					}
				}
				
				// 检查用户信息
				const meRes = await fetch('/api/auth/me');
				if (meRes.ok) {
					const me = await meRes.json();
					if (me.user?.role === 'admin') {
						setIsAdmin(true);
						setIsSystemConfig(true); // 管理员默认显示系统配置
						
						// 加载系统配置
						const configRes = await fetch('/api/admin/ai-config');
						if (configRes.ok) {
							const data = await configRes.json();
							if (data.config) {
								setSystemConfig(data.config);
								setProvider(data.config.provider || 'siliconflow');
								setModel(data.config.model || '');
								setApiEndpoint(data.config.apiEndpoint || '');
							}
						}
					}
				}
				
				// 加载使用统计
				const usageRes = await fetch('/api/ai/usage');
				if (usageRes.ok) setUsage(await usageRes.json());
				
				// 加载AI昵称（仅个人配置）
				if (!isSystemConfig) {
					const nicknameRes = await fetch('/api/ai/nickname');
					if (nicknameRes.ok) {
						const nicknameData = await nicknameRes.json();
						setAiNickname(nicknameData.nickname || '');
					}
				}
			} catch {}
		})();
	}, [isSystemConfig]);

	const onTest = async () => {
		setMsg(null);
		const res = await fetch('/api/ai/test-credential', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ provider, apiKey, model, apiEndpoint: apiEndpoint || undefined })
		});
		const data = await res.json();
		if (res.ok) setMsg('连接成功');
		else setMsg(data.error || '测试失败');
	};

	const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// 验证文件类型
			if (!file.type.startsWith('image/')) {
				setProfileMsg('请选择图片文件');
				return;
			}
			// 验证文件大小（2MB）
			if (file.size > 2 * 1024 * 1024) {
				setProfileMsg('图片大小不能超过 2MB');
				return;
			}
			setAvatarFile(file);
			// 创建预览
			const reader = new FileReader();
			reader.onload = (e) => {
				setAvatarPreview(e.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleAvatarUpload = async () => {
		if (!avatarFile) {
			setProfileMsg('请先选择图片');
			return;
		}

		setUploadingAvatar(true);
		setProfileMsg(null);
		try {
			const formData = new FormData();
			formData.append('file', avatarFile);

			const res = await fetch('/api/user/avatar/upload', {
				method: 'POST',
				body: formData
			});

			const data = await res.json();
			if (res.ok) {
				setProfileMsg('头像上传成功');
				setUserAvatarUrl(data.avatarUrl);
				setAvatarUrlInput(data.avatarUrl);
				setAvatarFile(null);
				setAvatarPreview(null);
				// 刷新页面以更新导航栏
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				setProfileMsg(data.error || '上传失败');
			}
		} catch (err: any) {
			setProfileMsg(err.message || '上传失败');
		} finally {
			setUploadingAvatar(false);
		}
	};

	const onSaveProfile = async () => {
		setProfileMsg(null);
		try {
			// 构建请求体：空字符串转为 null，undefined 不发送
			const body: any = {};
			if (userName !== undefined && userName !== '') {
				body.name = userName;
			}
			if (avatarUrlInput !== undefined) {
				body.avatarUrl = avatarUrlInput === '' ? null : avatarUrlInput;
			}
			
			const res = await fetch('/api/user/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const data = await res.json();
			if (res.ok) {
				setProfileMsg('个人信息已保存');
				setUserAvatarUrl(data.user.avatarUrl || null);
				// 刷新页面以更新导航栏
				window.location.reload();
			} else {
				setProfileMsg(data.error || '保存失败');
			}
		} catch (err: any) {
			setProfileMsg(err.message || '保存失败');
		}
	};

	const onSave = async () => {
		setMsg(null);
		
		if (isSystemConfig && isAdmin) {
			// 保存系统配置
			const res = await fetch('/api/admin/ai-config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider, apiKey, model, apiEndpoint: apiEndpoint || undefined })
			});
			const data = await res.json();
			if (res.ok) {
				setMsg('系统 AI 配置已保存，所有用户将使用此配置');
				// 重新加载系统配置
				const configRes = await fetch('/api/admin/ai-config');
				if (configRes.ok) {
					const configData = await configRes.json();
					if (configData.config) {
						setSystemConfig(configData.config);
					}
				}
			} else {
				setMsg(data.error || '保存失败');
			}
		} else {
			// 保存个人配置（但系统会优先使用管理员配置）
		const res = await fetch('/api/ai/config', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ provider, apiKey, model, apiEndpoint: apiEndpoint || undefined, aiNickname: aiNickname || undefined, persist })
		});
		
		// 同时保存AI昵称
		if (!isSystemConfig && aiNickname !== undefined) {
			await fetch('/api/ai/nickname', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nickname: aiNickname || null })
			}).catch(err => console.error('Failed to save AI nickname:', err));
		}
			const data = await res.json();
			if (res.ok) setMsg('已保存（注意：系统会优先使用管理员配置）');
			else setMsg(data.error || '保存失败');
		}
	};

	return (
		<main style={{ 
			padding: 'var(--spacing-xl)', 
			maxWidth: 800, 
			margin: '0 auto',
			background: 'var(--color-background)'
		}}>
			{/* 页面标题 */}
			<div className="card-academic" style={{ 
				marginBottom: 'var(--spacing-xl)',
				padding: 'var(--spacing-xl)',
				borderLeftColor: 'var(--color-primary)'
			}}>
				<h1 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-sm)',
					fontSize: 'var(--font-size-3xl)',
					fontWeight: 700,
					color: 'var(--color-primary)'
				}}>
					账号信息
				</h1>
				<p style={{ 
					color: 'var(--color-text-secondary)', 
					marginBottom: 0,
					fontSize: 'var(--font-size-base)',
					lineHeight: 'var(--line-height-relaxed)'
				}}>
					管理您的个人信息和 AI 配置
				</p>
			</div>

			{/* 个人信息 */}
			<div className="card-academic" style={{ 
				marginBottom: 'var(--spacing-xl)',
				padding: 'var(--spacing-xl)',
				borderLeftColor: 'var(--color-primary)'
			}}>
				<h2 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-lg)',
					fontSize: 'var(--font-size-2xl)',
					color: 'var(--color-primary)'
				}}>
					个人信息
				</h2>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
					{/* 头像设置 */}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
						<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
							<span style={{ 
								fontSize: 'var(--font-size-sm)', 
								fontWeight: 600,
								color: 'var(--color-text-primary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								头像
							</span>
							<div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
								{/* 头像预览 */}
								<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
									<Avatar
										avatarUrl={avatarPreview || userAvatarUrl}
										name={userName}
										email={userEmail}
										size={80}
									/>
									{avatarPreview && (
										<small style={{ 
											fontSize: 'var(--font-size-xs)',
											color: 'var(--color-text-tertiary)'
										}}>
											预览
										</small>
									)}
								</div>
								
								{/* 上传区域 */}
								<div style={{ flex: 1, minWidth: 200 }}>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
										{/* 文件选择器 */}
										<label style={{
											display: 'inline-block',
											padding: 'var(--spacing-sm) var(--spacing-md)',
											border: '1px solid var(--color-border)',
											borderRadius: 'var(--radius-md)',
											background: 'var(--color-background-paper)',
											color: 'var(--color-text-primary)',
											cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
											textAlign: 'center',
											fontSize: 'var(--font-size-sm)',
											opacity: uploadingAvatar ? 0.6 : 1,
											transition: 'all var(--transition-fast)'
										}}
										onMouseEnter={(e) => {
											if (!uploadingAvatar) {
												e.currentTarget.style.borderColor = 'var(--color-primary)';
												e.currentTarget.style.background = 'var(--color-background-subtle)';
											}
										}}
										onMouseLeave={(e) => {
											if (!uploadingAvatar) {
												e.currentTarget.style.borderColor = 'var(--color-border)';
												e.currentTarget.style.background = 'var(--color-background-paper)';
											}
										}}>
											{uploadingAvatar ? '上传中...' : '选择图片'}
											<input
												type="file"
												accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
												onChange={handleAvatarFileChange}
												disabled={uploadingAvatar}
												style={{ display: 'none' }}
											/>
										</label>
										
										{/* 上传按钮 */}
										{avatarFile && (
											<button
												type="button"
												onClick={handleAvatarUpload}
												disabled={uploadingAvatar}
												className="btn-academic-primary"
												style={{
													padding: 'var(--spacing-sm) var(--spacing-md)',
													fontSize: 'var(--font-size-sm)',
													fontWeight: 600,
													opacity: uploadingAvatar ? 0.6 : 1,
													cursor: uploadingAvatar ? 'not-allowed' : 'pointer'
												}}
											>
												{uploadingAvatar ? '上传中...' : '上传头像'}
											</button>
										)}
										
										{/* URL 输入（备用方式） */}
										<div style={{ marginTop: 'var(--spacing-xs)' }}>
											<input 
												value={avatarUrlInput} 
												onChange={(e) => setAvatarUrlInput(e.target.value)} 
												placeholder="或输入头像 URL"
												style={{
													padding: 'var(--spacing-sm) var(--spacing-md)',
													border: '1px solid var(--color-border)',
													borderRadius: 'var(--radius-md)',
													fontSize: 'var(--font-size-sm)',
													background: 'var(--color-background-paper)',
													color: 'var(--color-text-primary)',
													width: '100%',
													transition: 'all var(--transition-fast)'
												}}
												onFocus={(e) => {
													e.currentTarget.style.borderColor = 'var(--color-primary)';
													e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
												}}
												onBlur={(e) => {
													e.currentTarget.style.borderColor = 'var(--color-border)';
													e.currentTarget.style.boxShadow = 'none';
												}}
											/>
											<small style={{ 
												display: 'block', 
												color: 'var(--color-text-tertiary)', 
												marginTop: 'var(--spacing-xs)',
												fontSize: 'var(--font-size-xs)',
												lineHeight: 'var(--line-height-relaxed)'
											}}>
												支持上传 JPG、PNG、GIF、WebP 格式，最大 2MB。或直接输入图片 URL
											</small>
										</div>
									</div>
								</div>
							</div>
						</label>
					</div>

					{/* 名称设置 */}
					<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
						<span style={{ 
							fontSize: 'var(--font-size-sm)', 
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							显示名称
						</span>
						<input 
							value={userName} 
							onChange={(e) => setUserName(e.target.value)} 
							placeholder="您的显示名称（可选）"
							style={{
								padding: 'var(--spacing-md)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								transition: 'all var(--transition-fast)'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						/>
					</label>

					{/* 邮箱显示（只读） */}
					<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
						<span style={{ 
							fontSize: 'var(--font-size-sm)', 
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							邮箱
						</span>
						<input 
							value={userEmail} 
							disabled
							style={{
								padding: 'var(--spacing-md)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-subtle)',
								color: 'var(--color-text-secondary)',
								cursor: 'not-allowed'
							}}
						/>
						<small style={{ 
							display: 'block', 
							color: 'var(--color-text-tertiary)', 
							marginTop: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-xs)'
						}}>
							邮箱不可修改
						</small>
					</label>

					{/* 保存按钮 */}
					<button 
						type="button" 
						onClick={onSaveProfile}
						className="btn-academic-primary"
						style={{
							padding: 'var(--spacing-md) var(--spacing-lg)',
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							alignSelf: 'flex-start'
						}}
					>
						保存个人信息
					</button>
					{profileMsg && (
						<div style={{ 
							padding: 'var(--spacing-md)', 
							background: profileMsg.includes('成功') || profileMsg.includes('已保存') 
								? 'rgba(45, 122, 50, 0.1)' 
								: 'rgba(198, 40, 40, 0.1)',
							color: profileMsg.includes('成功') || profileMsg.includes('已保存') 
								? 'var(--color-success)' 
								: 'var(--color-error)',
							borderLeft: `4px solid ${profileMsg.includes('成功') || profileMsg.includes('已保存') ? 'var(--color-success)' : 'var(--color-error)'}`,
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500
						}}>
							{profileMsg}
						</div>
					)}
				</div>
			</div>

			{/* AI 配置标题 */}
			<div className="card-academic" style={{ 
				marginBottom: 'var(--spacing-xl)',
				padding: 'var(--spacing-xl)',
				borderLeftColor: isAdmin && isSystemConfig ? 'var(--color-warning)' : 'var(--color-primary)'
			}}>
				<h2 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-sm)',
					fontSize: 'var(--font-size-2xl)',
					fontWeight: 700,
					color: isAdmin && isSystemConfig ? 'var(--color-warning)' : 'var(--color-primary)'
				}}>
					{isAdmin && isSystemConfig ? '系统 AI 配置（管理员）' : 'AI 配置'}
				</h2>
				<p style={{ 
					color: 'var(--color-text-secondary)', 
					marginBottom: 0,
					fontSize: 'var(--font-size-base)',
					lineHeight: 'var(--line-height-relaxed)'
				}}>
					{isAdmin && isSystemConfig 
						? '配置系统 AI 提供商和 API 密钥，所有用户的分析将使用此配置。其他用户无需单独配置。'
						: '配置你的 AI 提供商和 API 密钥，用于文档分析和评价功能。注意：系统会优先使用管理员配置的 AI。'}
				</p>
				{isAdmin && (
					<div style={{ 
						marginTop: 'var(--spacing-md)',
						padding: 'var(--spacing-sm)',
						background: 'rgba(184, 134, 11, 0.1)',
						borderLeft: '3px solid var(--color-warning)',
						borderRadius: 'var(--radius-sm)'
					}}>
						<button
							type="button"
							onClick={() => setIsSystemConfig(!isSystemConfig)}
							style={{
								background: 'none',
								border: 'none',
								color: 'var(--color-warning)',
								cursor: 'pointer',
								fontSize: 'var(--font-size-sm)',
								fontWeight: 600,
								textDecoration: 'underline'
							}}
						>
							{isSystemConfig ? '切换到个人配置' : '切换到系统配置（管理员）'}
						</button>
					</div>
				)}
			</div>

			{/* Configuration Form */}
			<div className="card-academic" style={{ 
				marginBottom: 'var(--spacing-xl)',
				padding: 'var(--spacing-xl)',
				borderLeftColor: 'var(--color-primary)'
			}}>
				<h2 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-lg)',
					fontSize: 'var(--font-size-2xl)',
					color: 'var(--color-primary)'
				}}>
					AI 配置
				</h2>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
					<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
						<span style={{ 
							fontSize: 'var(--font-size-sm)', 
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							提供商
						</span>
						<select 
							value={provider} 
							onChange={(e) => setProvider(e.target.value as Provider)}
							style={{
								padding: 'var(--spacing-md)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								transition: 'all var(--transition-fast)'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						>
							<option value="siliconflow">硅基流动 (SiliconFlow)</option>
							<option value="openai">OpenAI</option>
							<option value="qwen">阿里云通义千问</option>
						</select>
					</label>
					<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
						<span style={{ 
							fontSize: 'var(--font-size-sm)', 
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							模型
						</span>
						<input 
							value={model} 
							onChange={(e) => setModel(e.target.value)} 
							placeholder="如 DeepSeek-V3 / deepseek-chat / gpt-4o-mini"
							style={{
								padding: 'var(--spacing-md)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								transition: 'all var(--transition-fast)'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						/>
						<small style={{ 
							display: 'block', 
							color: 'var(--color-text-tertiary)', 
							marginTop: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-xs)',
							lineHeight: 'var(--line-height-relaxed)'
						}}>
							硅基流动常用模型：DeepSeek-V3, deepseek-chat, Qwen/Qwen2.5-72B-Instruct 等
						</small>
					</label>
					<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
						<span style={{ 
							fontSize: 'var(--font-size-sm)', 
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							API Key
						</span>
						<input 
							value={apiKey} 
							onChange={(e) => setApiKey(e.target.value)} 
							placeholder="sk-..."
							type="password"
							style={{
								padding: 'var(--spacing-md)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								fontFamily: 'var(--font-family-mono)',
								transition: 'all var(--transition-fast)'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						/>
					</label>
					{provider === 'siliconflow' && (
						<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
							<span style={{ 
								fontSize: 'var(--font-size-sm)', 
								fontWeight: 600,
								color: 'var(--color-text-primary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								API 端点（可选，留空使用默认）
							</span>
							<input 
								value={apiEndpoint} 
								onChange={(e) => setApiEndpoint(e.target.value)} 
								placeholder="https://api.siliconflow.cn/v1 或留空使用默认"
								style={{
									padding: 'var(--spacing-md)',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-base)',
									background: 'var(--color-background-paper)',
									color: 'var(--color-text-primary)',
									fontFamily: 'var(--font-family-mono)',
									transition: 'all var(--transition-fast)'
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-primary)';
									e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-border)';
									e.currentTarget.style.boxShadow = 'none';
								}}
							/>
							<small style={{ 
								display: 'block', 
								color: 'var(--color-text-tertiary)', 
								marginTop: 'var(--spacing-xs)',
								fontSize: 'var(--font-size-xs)',
								lineHeight: 'var(--line-height-relaxed)'
							}}>
								留空则使用默认：https://api.siliconflow.cn/v1<br/>
								如果使用自定义端点，填写完整地址（会自动添加 /v1 后缀）
							</small>
						</label>
					)}
					{!isSystemConfig && (
						<>
							<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
								<span style={{ 
									fontSize: 'var(--font-size-sm)', 
									fontWeight: 600,
									color: 'var(--color-text-primary)',
									marginBottom: 'var(--spacing-xs)'
								}}>
									AI 昵称（可选）
								</span>
								<input 
									value={aiNickname} 
									onChange={(e) => setAiNickname(e.target.value)} 
									placeholder="如：小助手、AI助手、我的AI等（最多50字符）"
									maxLength={50}
									style={{
										padding: 'var(--spacing-md)',
										border: '1px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										fontSize: 'var(--font-size-base)',
										background: 'var(--color-background-paper)',
										color: 'var(--color-text-primary)',
										transition: 'all var(--transition-fast)'
									}}
									onFocus={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-primary)';
										e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
									}}
									onBlur={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-border)';
										e.currentTarget.style.boxShadow = 'none';
									}}
								/>
								<small style={{ 
									display: 'block', 
									color: 'var(--color-text-tertiary)', 
									marginTop: 'var(--spacing-xs)',
									fontSize: 'var(--font-size-xs)',
									lineHeight: 'var(--line-height-relaxed)'
								}}>
									设置后，在聊天中需要 @{aiNickname || 'AI昵称'} 才能激活AI回复。如果使用系统AI，将显示"官方AI"标签。
								</small>
							</label>
							<label style={{ 
								display: 'flex', 
								alignItems: 'center',
								gap: 'var(--spacing-sm)',
								cursor: 'pointer'
							}}>
								<input 
									type="checkbox" 
									checked={persist} 
									onChange={(e) => setPersist(e.target.checked)}
									style={{
										width: '18px',
										height: '18px',
										cursor: 'pointer'
									}}
								/>
								<span style={{ 
									fontSize: 'var(--font-size-sm)', 
									color: 'var(--color-text-secondary)'
								}}>
									长期保存（加密）。取消则仅本会话有效。
								</span>
							</label>
						</>
					)}
					<div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
						<button 
							type="button" 
							onClick={onTest}
							className="btn-academic"
							style={{
								padding: 'var(--spacing-md) var(--spacing-lg)',
								fontSize: 'var(--font-size-base)',
								fontWeight: 600
							}}
						>
							测试连通
						</button>
						<button 
							type="button" 
							onClick={onSave}
							className="btn-academic-primary"
							style={{
								padding: 'var(--spacing-md) var(--spacing-lg)',
								fontSize: 'var(--font-size-base)',
								fontWeight: 600
							}}
						>
							{isSystemConfig ? '保存系统配置' : '保存配置'}
						</button>
					</div>
					{msg && (
						<div style={{ 
							padding: 'var(--spacing-md)', 
							background: msg.includes('成功') || msg.includes('已保存') 
								? 'rgba(45, 122, 50, 0.1)' 
								: 'rgba(198, 40, 40, 0.1)',
							color: msg.includes('成功') || msg.includes('已保存') 
								? 'var(--color-success)' 
								: 'var(--color-error)',
							borderLeft: `4px solid ${msg.includes('成功') || msg.includes('已保存') ? 'var(--color-success)' : 'var(--color-error)'}`,
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500
						}}>
							{msg}
						</div>
					)}
				</div>
			</div>

			{/* Usage Statistics */}
			{usage && (
				<div className="card-academic" style={{ 
					padding: 'var(--spacing-xl)',
					borderLeftColor: 'var(--color-secondary)'
				}}>
					<h3 style={{ 
						marginTop: 0,
						marginBottom: 'var(--spacing-md)',
						fontSize: 'var(--font-size-xl)',
						color: 'var(--color-secondary)'
					}}>
						本月用量
					</h3>
					<pre style={{
						background: 'var(--color-background-subtle)',
						padding: 'var(--spacing-lg)',
						borderRadius: 'var(--radius-md)',
						border: '1px solid var(--color-border-light)',
						overflow: 'auto',
						fontSize: 'var(--font-size-sm)',
						fontFamily: 'var(--font-family-mono)',
						color: 'var(--color-text-primary)',
						lineHeight: 'var(--line-height-relaxed)',
						margin: 0
					}}>
						{JSON.stringify(usage, null, 2)}
					</pre>
				</div>
			)}
		</main>
	);
}


