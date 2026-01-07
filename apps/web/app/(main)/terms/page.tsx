'use client';

import { useEffect } from 'react';

export default function TermsPage() {
	useEffect(() => {
		// 确保页面标题正确
		document.title = '服务条款 - Mooyu';
	}, []);

	return (
		<div style={{
			maxWidth: '800px',
			margin: '0 auto',
			padding: 'var(--spacing-xl)',
			fontFamily: 'var(--font-family)',
			lineHeight: 'var(--line-height-relaxed)',
			color: 'var(--color-text-primary)'
		}}>
			<h1 style={{
				fontSize: '28px',
				fontWeight: 700,
				marginBottom: 'var(--spacing-lg)',
				color: 'var(--color-text-primary)'
			}}>
				服务条款
			</h1>

			<div style={{
				fontSize: '14px',
				color: 'var(--color-text-secondary)',
				marginBottom: 'var(--spacing-xl)'
			}}>
				最后更新日期：{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
			</div>

			<div style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--spacing-lg)'
			}}>
				{/* 1. 接受条款 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						1. 接受条款
					</h2>
					<p style={{
						margin: 0,
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						欢迎使用 Mooyu（以下简称"本平台"或"我们"）。通过访问、注册或使用本平台，您表示同意遵守本服务条款（以下简称"条款"）。如果您不同意这些条款，请不要使用本平台。
					</p>
				</section>

				{/* 2. 服务描述 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						2. 服务描述
					</h2>
					<p style={{
						margin: 0,
						marginBottom: 'var(--spacing-sm)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						Mooyu 是一个知识管理和讨论平台，提供以下服务：
					</p>
					<ul style={{
						margin: 0,
						paddingLeft: 'var(--spacing-lg)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						<li>话题讨论和共识达成</li>
						<li>文档上传和管理</li>
						<li>每日百科游戏</li>
						<li>AI 辅助功能</li>
						<li>其他相关服务</li>
					</ul>
				</section>

				{/* 3. 用户账户 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						3. 用户账户
					</h2>
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 'var(--spacing-sm)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						<p style={{ margin: 0 }}>
							<strong>3.1 注册要求</strong>：您必须提供真实、准确、完整的注册信息，并保持信息的及时更新。
						</p>
						<p style={{ margin: 0 }}>
							<strong>3.2 账户安全</strong>：您有责任维护账户密码的保密性，并对使用您账户进行的所有活动负责。如发现任何未经授权的账户使用，请立即通知我们。
						</p>
						<p style={{ margin: 0 }}>
							<strong>3.3 账户终止</strong>：我们保留在任何时候因违反本条款而暂停或终止您账户的权利，恕不另行通知。
						</p>
					</div>
				</section>

				{/* 4. 用户行为规范 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						4. 用户行为规范
					</h2>
					<p style={{
						margin: 0,
						marginBottom: 'var(--spacing-sm)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						您同意在使用本平台时遵守以下规定：
					</p>
					<ul style={{
						margin: 0,
						paddingLeft: 'var(--spacing-lg)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						<li>不得发布、传播任何违法、有害、威胁、辱骂、骚扰、诽谤、粗俗、淫秽或其他令人反感的内容</li>
						<li>不得侵犯他人的知识产权、隐私权或其他合法权益</li>
						<li>不得使用本平台进行任何商业活动或未经授权的广告宣传</li>
						<li>不得尝试未经授权访问本平台的系统、网络或数据</li>
						<li>不得使用自动化工具（如机器人、爬虫）干扰本平台的正常运行</li>
						<li>不得从事任何可能损害本平台或其他用户利益的行为</li>
					</ul>
				</section>

				{/* 5. 知识产权 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						5. 知识产权
					</h2>
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 'var(--spacing-sm)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						<p style={{ margin: 0 }}>
							<strong>5.1 平台内容</strong>：本平台的所有内容，包括但不限于文字、图片、音频、视频、软件、代码、设计等，均受知识产权法保护，归 Mooyu 或其授权方所有。
						</p>
						<p style={{ margin: 0 }}>
							<strong>5.2 用户内容</strong>：您在本平台上发布的内容，您保留其所有权。通过发布内容，您授予我们非独占、全球性、免费的使用、复制、修改、分发、展示和表演这些内容的权利。
						</p>
						<p style={{ margin: 0 }}>
							<strong>5.3 第三方内容</strong>：本平台可能包含第三方提供的内容。这些内容的知识产权归其各自所有者所有。
						</p>
					</div>
				</section>

				{/* 6. 隐私保护 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						6. 隐私保护
					</h2>
					<p style={{
						margin: 0,
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						我们重视您的隐私。有关我们如何收集、使用和保护您的个人信息，请参阅我们的隐私政策。使用本平台即表示您同意我们的隐私政策。
					</p>
				</section>

				{/* 7. 服务变更和终止 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						7. 服务变更和终止
					</h2>
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 'var(--spacing-sm)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						<p style={{ margin: 0 }}>
							<strong>7.1 服务变更</strong>：我们保留随时修改、暂停或终止本平台或其任何部分的权利，恕不另行通知。
						</p>
						<p style={{ margin: 0 }}>
							<strong>7.2 服务中断</strong>：我们不对因维护、升级、故障或其他原因导致的服务中断承担责任。
						</p>
						<p style={{ margin: 0 }}>
							<strong>7.3 账户终止</strong>：您可以随时停止使用本平台并删除您的账户。我们也有权因违反本条款而终止您的账户。
						</p>
					</div>
				</section>

				{/* 8. 免责声明 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						8. 免责声明
					</h2>
					<p style={{
						margin: 0,
						marginBottom: 'var(--spacing-sm)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						本平台按"现状"提供，不提供任何明示或暗示的保证，包括但不限于：
					</p>
					<ul style={{
						margin: 0,
						paddingLeft: 'var(--spacing-lg)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						<li>服务的准确性、完整性、及时性或可靠性</li>
						<li>服务不会中断、无错误或安全</li>
						<li>通过本平台获得的任何信息、建议或服务的质量</li>
					</ul>
				</section>

				{/* 9. 责任限制 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						9. 责任限制
					</h2>
					<p style={{
						margin: 0,
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						在法律允许的最大范围内，Mooyu 及其关联方不对因使用或无法使用本平台而产生的任何直接、间接、偶然、特殊或后果性损害承担责任，包括但不限于利润损失、数据丢失或业务中断。
					</p>
				</section>

				{/* 10. 赔偿 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						10. 赔偿
					</h2>
					<p style={{
						margin: 0,
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						您同意赔偿并保护 Mooyu 及其关联方、员工、代理免受因您违反本条款、使用本平台或侵犯他人权利而产生的任何索赔、损失、责任和费用（包括合理的律师费）。
					</p>
				</section>

				{/* 11. 适用法律 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						11. 适用法律
					</h2>
					<p style={{
						margin: 0,
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						本条款受中华人民共和国法律管辖。因本条款引起的任何争议，双方应友好协商解决；协商不成的，应提交有管辖权的人民法院解决。
					</p>
				</section>

				{/* 12. 条款修改 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						12. 条款修改
					</h2>
					<p style={{
						margin: 0,
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						我们保留随时修改本条款的权利。修改后的条款将在本页面上公布，并在公布后立即生效。继续使用本平台即表示您接受修改后的条款。我们建议您定期查看本页面以了解最新条款。
					</p>
				</section>

				{/* 13. 联系方式 */}
				<section>
					<h2 style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: 'var(--spacing-md)',
						color: 'var(--color-text-primary)'
					}}>
						13. 联系我们
					</h2>
					<p style={{
						margin: 0,
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						如果您对本服务条款有任何疑问，请通过以下方式联系我们：
					</p>
					<ul style={{
						margin: 0,
						marginTop: 'var(--spacing-sm)',
						paddingLeft: 'var(--spacing-lg)',
						color: 'var(--color-text-primary)',
						lineHeight: '1.8'
					}}>
						<li>邮箱：<a href="mailto:misakitoufu@gmail.com" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>misakitoufu@gmail.com</a></li>
						<li>网站：<a href="https://www.mooyu.fun" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>www.mooyu.fun</a></li>
					</ul>
				</section>

				{/* 结尾 */}
				<div style={{
					marginTop: 'var(--spacing-xl)',
					padding: 'var(--spacing-lg)',
					background: 'var(--color-background-subtle)',
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-border)'
				}}>
					<p style={{
						margin: 0,
						fontSize: '13px',
						color: 'var(--color-text-secondary)',
						lineHeight: '1.8'
					}}>
						<strong>重要提示</strong>：请仔细阅读本服务条款。使用本平台即表示您已阅读、理解并同意受本条款的约束。如果您不同意本条款的任何部分，请不要使用本平台。
					</p>
				</div>
			</div>
		</div>
	);
}

