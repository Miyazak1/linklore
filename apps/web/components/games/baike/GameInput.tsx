'use client';

import { useState, KeyboardEvent } from 'react';

interface GameInputProps {
	onGuess: (char: string) => void;
	disabled?: boolean;
	guessedChars?: string[]; // 已猜过的字符
}

/**
 * 游戏输入组件
 * 单字符输入框，支持键盘和鼠标输入
 */
export default function GameInput({ onGuess, disabled = false, guessedChars = [] }: GameInputProps) {
	const [input, setInput] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = () => {
		const trimmed = input.trim();
		
		// 验证输入
		if (trimmed.length === 0) {
			setError('请输入一个字符');
			return;
		}

		if (trimmed.length > 1) {
			setError('只能输入一个字符');
			return;
		}

		// 检查是否已猜过
		if (guessedChars.includes(trimmed)) {
			setError('这个字符已经猜过了');
			return;
		}

		// 清除错误，提交猜测
		setError(null);
		onGuess(trimmed);
		setInput('');
	};

	const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && !disabled) {
			handleSubmit();
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		// 只允许输入一个字符
		if (value.length <= 1) {
			setInput(value);
			setError(null); // 清除错误
		}
	};

	return (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			gap: 'var(--spacing-sm)',
			alignItems: 'center'
		}}>
			<div style={{
				display: 'flex',
				gap: 'var(--spacing-sm)',
				alignItems: 'center',
				width: '100%',
				maxWidth: '400px'
			}}>
				<input
					type="text"
					value={input}
					onChange={handleChange}
					onKeyPress={handleKeyPress}
					disabled={disabled}
					placeholder="只输入一个字"
					maxLength={1}
					style={{
						flex: 1,
						padding: 'var(--spacing-sm) var(--spacing-md)',
						fontSize: 'var(--font-size-lg)',
						border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
						borderRadius: 'var(--radius-sm)',
						background: 'var(--color-background)',
						color: 'var(--color-text-primary)',
						textAlign: 'center',
						...(disabled ? {
							opacity: 0.6,
							cursor: 'not-allowed'
						} : {})
					}}
				/>
				<button
					onClick={handleSubmit}
					disabled={disabled || input.trim().length === 0}
					style={{
						padding: 'var(--spacing-sm) var(--spacing-lg)',
						fontSize: 'var(--font-size-base)',
						fontWeight: 500,
						background: disabled || input.trim().length === 0
							? 'var(--color-background-subtle)'
							: 'var(--color-primary)',
						color: disabled || input.trim().length === 0
							? 'var(--color-text-tertiary)'
							: 'white',
						border: 'none',
						borderRadius: 'var(--radius-sm)',
						cursor: disabled || input.trim().length === 0 ? 'not-allowed' : 'pointer',
						transition: 'background-color var(--transition-fast)',
						opacity: disabled || input.trim().length === 0 ? 0.6 : 1
					}}
				>
					猜
				</button>
			</div>
			
			{error && (
				<p style={{
					color: 'var(--color-error)',
					fontSize: 'var(--font-size-sm)',
					margin: 0
				}}>
					{error}
				</p>
			)}
		</div>
	);
}

