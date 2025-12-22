'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import HeroSection from './HeroSection';
import FeatureCard from './FeatureCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const features = [
	{
		icon: '🤖',
		title: 'AI 辅助对话',
		description: '智能 AI 助手实时提供建议和反馈，帮助你深入思考，发现新的观点和见解。',
	},
	{
		icon: '👥',
		title: '双人深度讨论',
		description: '邀请朋友或同事加入对话，进行一对一的深度讨论，共同探索复杂话题。',
	},
	{
		icon: '📊',
		title: '共识分析',
		description: '自动分析对话中的共识点和分歧，帮助你理解讨论的进展和关键观点。',
	},
	{
		icon: '📚',
		title: '知识库引用',
		description: '在对话中引用图书馆中的资料，让讨论更有依据，观点更有说服力。',
	},
];

export default function LandingPage() {
	const router = useRouter();
	const [isNavigating, setIsNavigating] = useState(false);
	const [isPending, startTransition] = useTransition();

	const handleStartChat = () => {
		setIsNavigating(true);
		startTransition(() => {
			router.push('/chat');
		});
		// 如果3秒后还在加载，重置状态（防止卡住）
		setTimeout(() => {
			setIsNavigating(false);
		}, 3000);
	};

	const handleSignIn = () => {
		startTransition(() => {
			router.push('/signin');
		});
	};

	const isLoading = isNavigating || isPending;

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
						立即开始你的第一次对话，体验智能辅助的深度讨论
					</p>
					<div
						style={{
							display: 'flex',
							gap: 'var(--spacing-md)',
							justifyContent: 'center',
							flexWrap: 'wrap',
						}}
					>
						{/* 全局加载层 - 在点击后立即显示 */}
						{isLoading && (
							<LoadingSpinner 
								fullscreen 
								message="正在进入聊天..." 
							/>
						)}
						
						<Button
							size="lg"
							variant="primary"
							onClick={handleStartChat}
							disabled={isLoading}
						>
							{isLoading ? '加载中...' : '立即开始对话'}
						</Button>
						<Button
							size="lg"
							variant="secondary"
							onClick={handleSignIn}
							disabled={isPending}
						>
							登录账号
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}

