'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('TopicSetupDialog');

interface TopicSetupDialogProps {
	roomId?: string; // 可选，创建新聊天时可能为空
	onComplete: (topic: string, description: string) => void;
	onClose?: () => void; // 取消/关闭回调
}

/**
 * 话题设置对话框
 * 允许用户设置讨论主题，并可借助AI完善描述
 */
export default function TopicSetupDialog({ roomId, onComplete, onClose }: TopicSetupDialogProps) {
	const [topic, setTopic] = useState('');
	const [description, setDescription] = useState('');
	const [isAiAssisting, setIsAiAssisting] = useState(false);
	const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

	// 使用AI辅助完善主题描述
	const handleAiAssist = async () => {
		if (!topic.trim()) {
			alert('请先输入主题');
			return;
		}

		setIsAiAssisting(true);
		setAiSuggestion(null);

		try {
			// AI辅助功能不依赖roomId，可以在创建新聊天时使用
			const res = await fetch('/api/chat/ai/assist-topic', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					topic,
					currentDescription: description
				})
			});

			if (!res.ok) {
				throw new Error('AI辅助失败');
			}

			const data = await res.json();
			setAiSuggestion(data.suggestion);
		} catch (error: any) {
			log.error('AI辅助失败', error as Error);
			alert(`AI辅助失败: ${error.message || '未知错误'}`);
		} finally {
			setIsAiAssisting(false);
		}
	};

	const handleUseSuggestion = () => {
		if (aiSuggestion) {
			setDescription(aiSuggestion);
			setAiSuggestion(null);
		}
	};

	const handleSubmit = () => {
		if (!topic.trim()) {
			alert('请输入讨论主题');
			return;
		}
		onComplete(topic.trim(), description.trim());
	};

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				zIndex: 1000
			}}
		>
			<div
				style={{
					background: 'var(--color-background-paper)',
					borderRadius: '12px',
					padding: '24px',
					maxWidth: '600px',
					width: '90%',
					maxHeight: '80vh',
					overflowY: 'auto',
					boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
					position: 'relative'
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* 关闭按钮 */}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						style={{
							position: 'absolute',
							top: '16px',
							right: '16px',
							width: '32px',
							height: '32px',
							padding: 0,
							border: 'none',
							background: 'transparent',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							borderRadius: '6px',
							color: 'var(--color-text-secondary)',
							fontSize: '20px',
							lineHeight: 1
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--color-background-subtle)';
							e.currentTarget.style.color = 'var(--color-text-primary)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'transparent';
							e.currentTarget.style.color = 'var(--color-text-secondary)';
						}}
						title="关闭"
					>
						×
					</button>
				)}
				<h2
					style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: '16px',
						color: 'var(--color-text-primary)',
						paddingRight: onClose ? '40px' : '0'
					}}
				>
					设置讨论主题
				</h2>
				<p
					style={{
						fontSize: '14px',
						color: 'var(--color-text-secondary)',
						marginBottom: '20px',
						lineHeight: '1.5'
					}}
				>
					请为本次讨论设置一个明确的主题。你可以先输入主题，然后使用AI辅助来完善主题描述，以便更准确地表达你的想法。
				</p>

				<div style={{ marginBottom: '16px' }}>
					<label
						style={{
							display: 'block',
							fontSize: '14px',
							fontWeight: 500,
							marginBottom: '8px',
							color: 'var(--color-text-primary)'
						}}
					>
						讨论主题 <span style={{ color: 'var(--color-error)' }}>*</span>
					</label>
					<input
						type="text"
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						placeholder="例如：人工智能对教育的影响"
						style={{
							width: '100%',
							padding: '12px',
							border: '1px solid var(--color-border)',
							borderRadius: '8px',
							fontSize: '14px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)'
						}}
					/>
				</div>

				<div style={{ marginBottom: '16px' }}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '8px'
						}}
					>
						<label
							style={{
								fontSize: '14px',
								fontWeight: 500,
								color: 'var(--color-text-primary)'
							}}
						>
							主题描述（可选）
						</label>
						<button
							type="button"
							onClick={handleAiAssist}
							disabled={isAiAssisting || !topic.trim()}
							style={{
								padding: '6px 12px',
								border: '1px solid var(--color-primary)',
								borderRadius: '6px',
								background: isAiAssisting || !topic.trim() ? 'var(--color-background-subtle)' : 'var(--color-primary)',
								color: isAiAssisting || !topic.trim() ? 'var(--color-text-secondary)' : 'white',
								fontSize: '12px',
								cursor: isAiAssisting || !topic.trim() ? 'not-allowed' : 'pointer',
								opacity: isAiAssisting || !topic.trim() ? 0.6 : 1
							}}
						>
							{isAiAssisting ? 'AI思考中...' : '🤖 AI辅助完善'}
						</button>
					</div>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="详细描述讨论主题的背景、范围、目标等（可留空，或使用AI辅助完善）"
						rows={6}
						style={{
							width: '100%',
							padding: '12px',
							border: '1px solid var(--color-border)',
							borderRadius: '8px',
							fontSize: '14px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							resize: 'vertical',
							fontFamily: 'inherit'
						}}
					/>
				</div>

				{/* AI建议显示 */}
				{aiSuggestion && (
					<div
						style={{
							marginBottom: '16px',
							padding: '12px',
							background: 'var(--color-primary-lighter)',
							borderRadius: '8px',
							border: '1px solid var(--color-primary)'
						}}
					>
						<div
							style={{
								fontSize: '12px',
								fontWeight: 600,
								marginBottom: '8px',
								color: 'var(--color-primary)'
							}}
						>
							🤖 AI建议的描述：
						</div>
						<div
							style={{
								fontSize: '13px',
								color: 'var(--color-text-primary)',
								lineHeight: '1.6',
								marginBottom: '8px',
								whiteSpace: 'pre-wrap'
							}}
						>
							<ReactMarkdown>{aiSuggestion}</ReactMarkdown>
						</div>
						<button
							type="button"
							onClick={handleUseSuggestion}
							style={{
								padding: '6px 12px',
								border: '1px solid var(--color-primary)',
								borderRadius: '6px',
								background: 'var(--color-primary)',
								color: 'white',
								fontSize: '12px',
								cursor: 'pointer'
							}}
						>
							使用此建议
						</button>
					</div>
				)}

				<div
					style={{
						display: 'flex',
						justifyContent: 'flex-end',
						gap: '12px',
						marginTop: '24px'
					}}
				>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							style={{
								padding: '10px 24px',
								border: '1px solid var(--color-border)',
								borderRadius: '8px',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								fontSize: '14px',
								fontWeight: 500,
								cursor: 'pointer',
								transition: 'all 0.2s'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--color-background-subtle)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'var(--color-background)';
							}}
						>
							取消
						</button>
					)}
					<button
						type="button"
						onClick={handleSubmit}
						disabled={!topic.trim()}
						style={{
							padding: '10px 24px',
							border: 'none',
							borderRadius: '8px',
							background: !topic.trim() ? 'var(--color-background-subtle)' : 'var(--color-primary)',
							color: !topic.trim() ? 'var(--color-text-secondary)' : 'white',
							fontSize: '14px',
							fontWeight: 500,
							cursor: !topic.trim() ? 'not-allowed' : 'pointer',
							opacity: !topic.trim() ? 0.6 : 1
						}}
					>
						开始讨论
					</button>
				</div>
			</div>
		</div>
	);
}

