'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface TopicChangeDialogProps {
	roomId: string;
	currentTopic: string;
	currentDescription?: string | null;
	onComplete: () => void;
	onCancel: () => void;
}

/**
 * 更换话题对话框
 * 允许用户请求更换话题，并可借助AI完善新话题描述
 */
export default function TopicChangeDialog({
	roomId,
	currentTopic,
	currentDescription,
	onComplete,
	onCancel
}: TopicChangeDialogProps) {
	const [newTopic, setNewTopic] = useState('');
	const [newDescription, setNewDescription] = useState('');
	const [isAiAssisting, setIsAiAssisting] = useState(false);
	const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

	// 使用AI辅助完善新话题描述
	const handleAiAssist = async () => {
		if (!newTopic.trim()) {
			alert('请先输入新主题');
			return;
		}

		setIsAiAssisting(true);
		setAiSuggestion(null);

		try {
			const res = await fetch('/api/chat/ai/assist-topic', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					topic: newTopic,
					currentDescription: newDescription
				})
			});

			if (!res.ok) {
				throw new Error('AI辅助失败');
			}

			const data = await res.json();
			setAiSuggestion(data.suggestion);
		} catch (error: any) {
			console.error('[TopicChangeDialog] AI辅助失败:', error);
			alert(`AI辅助失败: ${error.message || '未知错误'}`);
		} finally {
			setIsAiAssisting(false);
		}
	};

	const handleUseSuggestion = () => {
		if (aiSuggestion) {
			setNewDescription(aiSuggestion);
			setAiSuggestion(null);
		}
	};

	const handleSubmit = async () => {
		if (!newTopic.trim()) {
			alert('请输入新讨论主题');
			return;
		}

		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/topic/change`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					newTopic: newTopic.trim(),
					newDescription: newDescription.trim() || undefined,
					action: 'request'
				})
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || '请求更换话题失败');
			}

			alert('更换话题请求已发送，等待对方同意');
			onComplete();
		} catch (error: any) {
			console.error('[TopicChangeDialog] 请求更换话题失败:', error);
			alert(`请求失败: ${error.message || '未知错误'}`);
		}
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
					boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
				}}
			>
				<h2
					style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: '16px',
						color: 'var(--color-text-primary)'
					}}
				>
					请求更换话题
				</h2>
				<p
					style={{
						fontSize: '14px',
						color: 'var(--color-text-secondary)',
						marginBottom: '20px',
						lineHeight: '1.5'
					}}
				>
					当前话题：<strong>{currentTopic}</strong>
					{currentDescription && (
						<>
							<br />
							<span style={{ fontSize: '12px', opacity: 0.8 }}>
								{currentDescription}
							</span>
						</>
					)}
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
						新讨论主题 <span style={{ color: 'var(--color-error)' }}>*</span>
					</label>
					<input
						type="text"
						value={newTopic}
						onChange={(e) => setNewTopic(e.target.value)}
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
							新主题描述（可选）
						</label>
						<button
							type="button"
							onClick={handleAiAssist}
							disabled={isAiAssisting || !newTopic.trim()}
							style={{
								padding: '6px 12px',
								border: '1px solid var(--color-primary)',
								borderRadius: '6px',
								background: isAiAssisting || !newTopic.trim() ? 'var(--color-background-subtle)' : 'var(--color-primary)',
								color: isAiAssisting || !newTopic.trim() ? 'var(--color-text-secondary)' : 'white',
								fontSize: '12px',
								cursor: isAiAssisting || !newTopic.trim() ? 'not-allowed' : 'pointer',
								opacity: isAiAssisting || !newTopic.trim() ? 0.6 : 1
							}}
						>
							{isAiAssisting ? 'AI思考中...' : '🤖 AI辅助完善'}
						</button>
					</div>
					<textarea
						value={newDescription}
						onChange={(e) => setNewDescription(e.target.value)}
						placeholder="详细描述新讨论主题的背景、范围、目标等（可留空，或使用AI辅助完善）"
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
					<button
						type="button"
						onClick={onCancel}
						style={{
							padding: '10px 24px',
							border: '1px solid var(--color-border)',
							borderRadius: '8px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							fontSize: '14px',
							fontWeight: 500,
							cursor: 'pointer'
						}}
					>
						取消
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={!newTopic.trim()}
						style={{
							padding: '10px 24px',
							border: 'none',
							borderRadius: '8px',
							background: !newTopic.trim() ? 'var(--color-background-subtle)' : 'var(--color-primary)',
							color: !newTopic.trim() ? 'var(--color-text-secondary)' : 'white',
							fontSize: '14px',
							fontWeight: 500,
							cursor: !newTopic.trim() ? 'not-allowed' : 'pointer',
							opacity: !newTopic.trim() ? 0.6 : 1
						}}
					>
						发送请求
					</button>
				</div>
			</div>
		</div>
	);
}











