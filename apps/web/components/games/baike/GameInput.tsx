'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface GameInputProps {
	onGuess: (char: string) => void;
	disabled?: boolean;
	guessedChars?: string[]; // 已猜过的字符
}

/**
 * 游戏输入组件
 * 单字符输入框，支持键盘和鼠标输入
 * 自动聚焦并保持聚焦状态
 */
export default function GameInput({ onGuess, disabled = false, guessedChars = [] }: GameInputProps) {
	const [input, setInput] = useState('');
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// 自动聚焦并保持聚焦状态
	useEffect(() => {
		if (!disabled && inputRef.current) {
			inputRef.current.focus();
		}
	}, [disabled]);

	// 当输入框失去焦点时，自动重新聚焦（除非被禁用）
	useEffect(() => {
		const inputElement = inputRef.current;
		if (!inputElement || disabled) return;

		const handleBlur = () => {
			// 延迟重新聚焦，避免与其他交互冲突
			setTimeout(() => {
				if (inputElement && !disabled) {
					inputElement.focus();
				}
			}, 100);
		};

		inputElement.addEventListener('blur', handleBlur);
		return () => {
			inputElement.removeEventListener('blur', handleBlur);
		};
	}, [disabled]);

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
			gap: '4px',
			alignItems: 'center'
		}}>
			<style>{`
				.baike-input:focus {
					outline: none;
					box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.15);
				}
			`}</style>
			<div style={{
				display: 'flex',
				gap: '4px',
				alignItems: 'center',
				width: '100%',
				maxWidth: '320px'
			}}>
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={handleChange}
					onKeyPress={handleKeyPress}
					disabled={disabled}
					placeholder="只输入一个字"
					maxLength={1}
					autoFocus
					className="baike-input"
					style={{
						flex: 1,
						padding: '8px 12px',
						fontSize: '15px',
						border: `1.5px solid ${error ? 'var(--color-error)' : 'var(--color-primary)'}`,
						borderRadius: '6px',
						background: 'var(--color-background)',
						color: 'var(--color-text-primary)',
						textAlign: 'center',
						fontWeight: 500,
						transition: 'all 0.2s ease',
						boxShadow: error 
							? '0 0 0 2px rgba(244, 67, 54, 0.1)' 
							: 'none',
						...(disabled ? {
							opacity: 0.6,
							cursor: 'not-allowed'
						} : {})
					}}
				/>
				<button
					onClick={handleSubmit}
					disabled={disabled || input.trim().length === 0}
					className="btn-academic-primary"
					style={{
						padding: '8px 16px',
						fontSize: '14px',
						fontWeight: 600,
						minWidth: '48px',
						borderRadius: '6px',
						transition: 'all 0.2s ease',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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

