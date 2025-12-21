'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
	onSend: (content: string) => void;
	disabled?: boolean;
	aiNickname?: string | null;
	onMentionSelect?: (mention: string) => void;
	placeholder?: string;
	roomType?: 'SOLO' | 'DUO' | null; // 房间类型，用于显示不同的 @ 选项
}

interface MentionOption {
	id: string;
	label: string;
	icon: string;
	description?: string;
}

export default function ChatInput({
	onSend,
	disabled = false,
	aiNickname,
	onMentionSelect,
	placeholder,
	roomType = null
}: ChatInputProps) {
	const [input, setInput] = useState('');
	const [showMentions, setShowMentions] = useState(false);
	const [mentionQuery, setMentionQuery] = useState('');
	const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
	const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const mentionsRef = useRef<HTMLDivElement>(null);

	// 监听插入文本事件（用于从 BookSearchDialog 插入图书信息）
	useEffect(() => {
		const handleInsertText = (event: CustomEvent<{ text: string }>) => {
			const text = event.detail.text;
			if (inputRef.current) {
				const textarea = inputRef.current;
				const start = textarea.selectionStart || 0;
				const end = textarea.selectionEnd || 0;
				const currentValue = input;
				const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
				setInput(newValue);
				
				// 设置光标位置
				setTimeout(() => {
					if (textarea) {
						const newCursorPos = start + text.length;
						textarea.focus();
						textarea.setSelectionRange(newCursorPos, newCursorPos);
					}
				}, 0);
			}
		};

		window.addEventListener('insert-text', handleInsertText as EventListener);
		return () => {
			window.removeEventListener('insert-text', handleInsertText as EventListener);
		};
	}, [input]);

	// 根据房间类型和上下文生成 @ 选项
	const getMentionOptions = (): MentionOption[] => {
		const options: MentionOption[] = [];

		// 通用选项
		options.push({
			id: 'ai',
			label: aiNickname || 'AI助手',
			icon: '🤖',
			description: '激活AI回复'
		});

		// DUO房间专用选项
		if (roomType === 'DUO') {
			options.push({
				id: 'library',
				label: '资料',
				icon: '📚',
				description: '查阅相关书籍和章节'
			});
		}

		return options;
	};

	// 过滤 @ 选项
	const filteredMentions = (): MentionOption[] => {
		const options = getMentionOptions();
		if (!mentionQuery) {
			return options;
		}
		const query = mentionQuery.toLowerCase();
		return options.filter(
			(opt) =>
				opt.label.toLowerCase().includes(query) ||
				opt.description?.toLowerCase().includes(query)
		);
	};

	// 处理输入变化
	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = e.target.value;
		setInput(value);

		// 检测 @ 符号
		const cursorPos = e.target.selectionStart || 0;
		const textBeforeCursor = value.substring(0, cursorPos);
		const lastAtIndex = textBeforeCursor.lastIndexOf('@');

		if (lastAtIndex !== -1) {
			// 检查 @ 后面是否有空格（如果有，说明不是 @ 提及）
			const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
			if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
				// 提取 @ 后面的查询文本
				const query = textAfterAt.toLowerCase();
				setMentionQuery(query);
				setMentionStartPos(lastAtIndex);
				setShowMentions(true);
				setSelectedMentionIndex(0);
				return;
			}
		}

		// 如果没有 @ 或 @ 后面有空格，隐藏提及菜单
		setShowMentions(false);
		setMentionQuery('');
		setMentionStartPos(null);
	};

	// 选择提及项
	const selectMention = (option: MentionOption) => {
		if (!mentionStartPos && mentionStartPos !== 0) return;

		const beforeAt = input.substring(0, mentionStartPos);
		const afterCursor = input.substring(inputRef.current?.selectionStart || input.length);
		const newValue = `${beforeAt}@${option.label} ${afterCursor}`;

		setInput(newValue);
		setShowMentions(false);
		setMentionQuery('');
		setMentionStartPos(null);

		// 如果提供了 onMentionSelect 回调，调用它
		if (onMentionSelect) {
			onMentionSelect(option.id);
		}

		// 聚焦输入框
		setTimeout(() => {
			if (inputRef.current) {
				const newCursorPos = beforeAt.length + option.label.length + 2; // +2 for '@' and ' '
				inputRef.current.focus();
				inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
			}
		}, 0);
	};

	// 处理键盘事件
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (showMentions) {
			const filtered = filteredMentions();

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setSelectedMentionIndex((prev) =>
					prev < filtered.length - 1 ? prev + 1 : prev
				);
				return;
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault();
				setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
				return;
			}

			if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				if (filtered.length > 0) {
					selectMention(filtered[selectedMentionIndex]);
				}
				return;
			}

			if (e.key === 'Escape') {
				e.preventDefault();
				setShowMentions(false);
				setMentionQuery('');
				setMentionStartPos(null);
				return;
			}
		}

		// 普通 Enter 发送（Shift+Enter 换行）
		if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	// 处理提交
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (input.trim() && !disabled) {
			onSend(input.trim());
			setInput('');
			setShowMentions(false);
			setMentionQuery('');
			setMentionStartPos(null);
		}
	};

	// 自动调整 textarea 高度
	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.style.height = 'auto';
			inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
		}
	}, [input]);

	// 点击外部关闭提及菜单
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				mentionsRef.current &&
				!mentionsRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setShowMentions(false);
			}
		};

		if (showMentions) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	}, [showMentions]);

	// 滚动选中的提及项到可见区域
	useEffect(() => {
		if (showMentions && mentionsRef.current) {
			const selectedElement = mentionsRef.current.children[selectedMentionIndex] as HTMLElement;
			if (selectedElement) {
				selectedElement.scrollIntoView({
					block: 'nearest',
					behavior: 'smooth'
				});
			}
		}
	}, [selectedMentionIndex, showMentions]);

	const filtered = filteredMentions();

	return (
		<div style={{ position: 'relative', width: '100%' }}>
			<form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--spacing-md)', width: '100%', alignItems: 'flex-start' }}>
				<div style={{ position: 'relative', flex: 1 }}>
					<textarea
						ref={inputRef}
						value={input}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						disabled={disabled}
						placeholder={placeholder || `输入消息，@${aiNickname || 'AI助手'} 来激活AI回复...`}
						rows={1}
						style={{
							width: '100%',
							minHeight: '80px',
							maxHeight: '240px',
							paddingTop: 'var(--spacing-md)',
							paddingBottom: 'var(--spacing-md)',
							paddingLeft: 'var(--spacing-lg)',
							paddingRight: 'var(--spacing-lg)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-lg)',
							fontSize: 'var(--font-size-base)',
							fontFamily: 'var(--font-family)',
							resize: 'none',
							outline: 'none',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							lineHeight: 'var(--line-height-normal)',
							boxSizing: 'border-box',
							transition: 'all var(--transition-fast)'
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
							e.currentTarget.style.boxShadow = '0 0 0 2px rgba(26, 68, 128, 0.2)';
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
							e.currentTarget.style.boxShadow = '';
						}}
					/>

					{/* @ 提及下拉菜单 */}
					{showMentions && filtered.length > 0 && (
						<div
							ref={mentionsRef}
							style={{
								position: 'absolute',
								bottom: '100%',
								left: 0,
								marginBottom: 'var(--spacing-sm)',
								background: 'var(--color-background-paper)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								boxShadow: 'var(--shadow-lg)',
								maxHeight: '300px',
								overflowY: 'auto',
								overflowX: 'hidden',
								zIndex: 1000,
								minWidth: '280px',
								maxWidth: '400px'
							}}
						>
							{filtered.map((option, index) => (
								<button
									key={option.id}
									type="button"
									onClick={() => selectMention(option)}
									onMouseEnter={() => setSelectedMentionIndex(index)}
									style={{
										width: '100%',
										paddingTop: 'var(--spacing-md)',
										paddingBottom: 'var(--spacing-md)',
										paddingLeft: 'var(--spacing-lg)',
										paddingRight: 'var(--spacing-lg)',
										border: 'none',
										background:
											index === selectedMentionIndex
												? 'var(--color-primary-lighter)'
												: 'transparent',
										color: 'var(--color-text-primary)',
										textAlign: 'left',
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
										gap: 'var(--spacing-md)',
										fontSize: 'var(--font-size-base)',
										transition: 'background var(--transition-fast)',
										borderBottom:
											index < filtered.length - 1
												? '1px solid var(--color-border-light)'
												: 'none'
									}}
								>
									<span style={{ fontSize: '18px', flexShrink: 0 }}>{option.icon}</span>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontWeight: 500,
												marginBottom: '2px',
												color: 'var(--color-text-primary)'
											}}
										>
											@{option.label}
										</div>
										{option.description && (
											<div
												style={{
													fontSize: 'var(--font-size-sm)',
													color: 'var(--color-text-secondary)',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap'
												}}
											>
												{option.description}
											</div>
										)}
									</div>
								</button>
							))}
						</div>
					)}
				</div>

				<button
					type="submit"
					disabled={disabled || !input.trim()}
					style={{
						paddingTop: 'var(--spacing-md)',
						paddingBottom: 'var(--spacing-md)',
						paddingLeft: 'var(--spacing-lg)',
						paddingRight: 'var(--spacing-lg)',
						minHeight: '80px',
						alignSelf: 'flex-start',
						marginTop: '0',
						background:
							disabled || !input.trim()
								? 'var(--color-background-subtle)'
								: 'var(--color-primary)',
						color: 'white',
						border: 'none',
						borderRadius: 'var(--radius-lg)',
						cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer',
						fontSize: 'var(--font-size-base)',
						fontWeight: 500,
						transition: 'all var(--transition-fast)',
						opacity: disabled || !input.trim() ? 0.6 : 1,
						whiteSpace: 'nowrap',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center'
					}}
					onMouseEnter={(e) => {
						if (!disabled && input.trim()) {
							e.currentTarget.style.transform = 'translateY(-1px)';
							e.currentTarget.style.boxShadow = 'var(--shadow-md)';
						}
					}}
					onMouseLeave={(e) => {
						if (!disabled && input.trim()) {
							e.currentTarget.style.transform = '';
							e.currentTarget.style.boxShadow = '';
						}
					}}
				>
					发送
				</button>
			</form>
		</div>
	);
}
