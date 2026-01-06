'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import HeroSection from './HeroSection';
import FeatureCard from './FeatureCard';
import Button from '@/components/ui/Button';

const features = [
	{
		icon: '📚',
		title: '知识库管理',
		description: '管理你的图书和文档，建立个人知识库，方便随时查阅和引用。',
	},
	{
		icon: '💬',
		title: '讨论版',
		description: '参与话题讨论，分享观点，与社区成员进行深度交流。',
	},
	{
		icon: '🎮',
		title: '小游戏',
		description: '每日百科和每日议题等小游戏，在娱乐中学习知识。',
	},
];

export default function LandingPage() {
	const router = useRouter();
	const [isNavigating, setIsNavigating] = useState(false);
	const [isPending, startTransition] = useTransition();

	const handleSignIn = () => {
		// 触发打开登录弹窗的事件
		window.dispatchEvent(new CustomEvent('open-signin-modal'));
	};

	const isLoading = isPending;

	return (
		<div
			style={{
				minHeight: '100vh',
				background: 'var(--color-background)',
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			<main
				style={{
					flex: 1,
					padding: 'var(--spacing-xl) var(--spacing-md)',
				}}
			>
				{/* Hero Section */}
				<HeroSection />

				{/* Features Section */}
				<div
					style={{
						maxWidth: '1200px',
						margin: 'var(--spacing-xxl) auto 0',
						padding: '0 var(--spacing-md)',
					}}
				>
					<h2
						style={{
							textAlign: 'center',
							fontSize: 'var(--font-size-3xl)',
							fontWeight: 600,
							marginBottom: 'var(--spacing-xl)',
							color: 'var(--color-text-primary)',
						}}
					>
						核心功能
					</h2>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
							gap: 'var(--spacing-lg)',
							marginBottom: 'var(--spacing-xxl)',
						}}
					>
						{features.map((feature, index) => (
							<FeatureCard
								key={index}
								icon={feature.icon}
								title={feature.title}
								description={feature.description}
							/>
						))}
					</div>
				</div>

				{/* CTA Section */}
				<div
					style={{
						textAlign: 'center',
						padding: 'var(--spacing-xxl) var(--spacing-md)',
						background: 'var(--color-background-subtle)',
						borderRadius: 'var(--radius-xl)',
						maxWidth: '800px',
						margin: 'var(--spacing-xxl) auto',
						border: '1px solid var(--color-border-light)',
					}}
				>
					<h2
						style={{
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 600,
							marginBottom: 'var(--spacing-md)',
							color: 'var(--color-text-primary)',
						}}
					>
						准备好开始了吗？
					</h2>
					<p
						style={{
							fontSize: 'var(--font-size-base)',
							color: 'var(--color-text-secondary)',
							marginBottom: 'var(--spacing-lg)',
						}}
					>
						立即注册账号，开始使用 Mooyu 的各项功能
					</p>
					<div
						style={{
							display: 'flex',
							gap: 'var(--spacing-md)',
							justifyContent: 'center',
							flexWrap: 'wrap',
						}}
					>
						<Button
							size="lg"
							variant="primary"
							onClick={handleSignIn}
							disabled={isPending}
						>
							登录账号
						</Button>
						<Button
							size="lg"
							variant="secondary"
							onClick={() => {
								window.dispatchEvent(new CustomEvent('open-signup-modal'));
							}}
							disabled={isPending}
						>
							注册账号
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}

