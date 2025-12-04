'use client';

import { useState, useRef, KeyboardEvent, useEffect, useMemo } from 'react';

interface ChatInputProps {
	onSend: (content: string) => void;
	disabled?: boolean;
	placeholder?: string;
	aiNickname?: string | null; // AI昵称，用于@提示
	onMentionSelect?: (mention: string) => void; // 处理特殊@提及（如更换话题）
}

export default function ChatInput({
	onSend,
	disabled = false,
	placeholder = '输入消息...',
	aiNickname = null,
	onMentionSelect
}: ChatInputProps) {
	const [content, setContent] = useState('');
	const [showMentionMenu, setShowMentionMenu] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const mentionMenuRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// 监听引用消息事件
	useEffect(() => {
		const handleQuoteMessage = (e: CustomEvent) => {
			const { quoteText } = e.detail;
			if (!quoteText || !textareaRef.current) {
				console.warn('[ChatInput] ⚠️ 引用事件无效:', { quoteText: !!quoteText, textarea: !!textareaRef.current });
				return;
			}
			
			console.log('[ChatInput] 📝 收到引用消息事件，quoteText:', quoteText.substring(0, 50));
			
			// 使用函数式更新，避免依赖content
			setContent((prevContent) => {
				return prevContent + quoteText;
			});
			
			// 在下一个事件循环中设置光标位置（避免在渲染期间调用）
			setTimeout(() => {
				if (textareaRef.current) {
					const currentContent = textareaRef.current.value;
					const newPos = currentContent.length;
					textareaRef.current.setSelectionRange(newPos, newPos);
					textareaRef.current.focus();
					console.log('[ChatInput] ✅ 引用文本已插入，光标位置:', newPos, '内容长度:', currentContent.length);
				}
			}, 10);
		};

		window.addEventListener('quote-message', handleQuoteMessage as EventListener);
		return () => {
			window.removeEventListener('quote-message', handleQuoteMessage as EventListener);
		};
	}, []); // 移除content依赖

	// 获取@提示选项列表（AI昵称 + 特殊选项如更换话题）
	const mentionOptions = useMemo(() => {
		const options: Array<{ type: 'ai' | 'action'; label: string; value: string; icon: string }> = [];
		
		// 添加AI选项
		const aiName = aiNickname || 'AI助手';
		options.push({
			type: 'ai',
			label: aiName,
			value: aiName,
			icon: 'AI'
		});
		
		// 添加特殊操作选项
		options.push({
			type: 'action',
			label: '更换话题',
			value: '更换话题',
			icon: '🔄'
		});
		
		return options;
	}, [aiNickname]);

	// 检测@符号并显示提示菜单
	useEffect(() => {
		if (!textareaRef.current) return;

		const textarea = textareaRef.current;
		const cursorPos = textarea.selectionStart;
		const textBeforeCursor = content.substring(0, cursorPos);
		
		// 查找最后一个@符号
		const lastAtIndex = textBeforeCursor.lastIndexOf('@');
		
		if (lastAtIndex !== -1) {
			// 检查@后面是否有空格或其他分隔符（如果有，则不显示菜单）
			const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
			if (textAfterAt.trim() && !textAfterAt.match(/^[a-zA-Z0-9\u4e00-\u9fa5]*$/)) {
				setShowMentionMenu(false);
				return;
			}

			// 获取@后面的文本（用于过滤）
			const query = textAfterAt.toLowerCase();
			
			// 如果@后面有文本，过滤选项
			const filteredOptions = query
				? mentionOptions.filter(opt => opt.label.toLowerCase().includes(query))
				: mentionOptions;

			if (filteredOptions.length > 0) {
				// 只在状态需要改变时才更新，避免无限循环
				setShowMentionMenu((prev) => {
					if (!prev) {
						setSelectedIndex(0);
						// 计算菜单位置（简化版：显示在输入框上方）
						if (containerRef.current) {
							setMentionPosition({
								top: -200, // 显示在输入框上方
								left: 16 // 左边距
							});
						}
						return true;
					}
					return prev;
				});
			} else {
				setShowMentionMenu((prev) => prev ? false : prev);
			}
		} else {
			setShowMentionMenu((prev) => prev ? false : prev);
		}
	}, [content, mentionOptions]);

	// 选择@提及项
	const selectMention = (option: { type: 'ai' | 'action'; label: string; value: string }) => {
		if (!textareaRef.current) return;

		// 如果是特殊操作（如更换话题），直接触发回调，不插入文本
		if (option.type === 'action' && onMentionSelect) {
			onMentionSelect(option.value);
			setShowMentionMenu(false);
			return;
		}

		// 如果是AI选项，插入到输入框
		const textarea = textareaRef.current;
		const cursorPos = textarea.selectionStart;
		const textBeforeCursor = content.substring(0, cursorPos);
		const textAfterCursor = content.substring(cursorPos);
		
		// 找到最后一个@符号
		const lastAtIndex = textBeforeCursor.lastIndexOf('@');
		if (lastAtIndex === -1) return;

		// 替换@后面的文本
		const newText = 
			content.substring(0, lastAtIndex + 1) + 
			option.value + 
			' ' + 
			textAfterCursor;
		
		setContent(newText);
		setShowMentionMenu(false);
		
		// 设置光标位置
		setTimeout(() => {
			if (textareaRef.current) {
				const newCursorPos = lastAtIndex + 1 + option.value.length + 1;
				textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
				textareaRef.current.focus();
			}
		}, 0);
	};

	const handleSend = () => {
		if (!content.trim() || disabled) return;

		onSend(content.trim());
		setContent('');
		setShowMentionMenu(false);

		// 重置 textarea 高度
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
		}
	};

		const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (showMentionMenu) {
			const filteredOptions = mentionOptions.filter(opt => {
				const textBeforeCursor = content.substring(0, textareaRef.current?.selectionStart || 0);
				const lastAtIndex = textBeforeCursor.lastIndexOf('@');
				if (lastAtIndex === -1) return false;
				const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
				const query = textAfterAt.toLowerCase();
				return !query || opt.label.toLowerCase().includes(query);
			});

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setSelectedIndex((prev) => 
					prev < filteredOptions.length - 1 ? prev + 1 : prev
				);
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
				return;
			}
			if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				if (filteredOptions[selectedIndex]) {
					selectMention(filteredOptions[selectedIndex]);
				}
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				setShowMentionMenu(false);
				return;
			}
		}

		if (e.key === 'Enter' && !e.shiftKey && !showMentionMenu) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleInput = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
			textareaRef.current.style.height = `${Math.min(
				textareaRef.current.scrollHeight,
				200
			)}px`;
		}
	};

	return (
		<div
			ref={containerRef}
			style={{
				position: 'relative',
				display: 'flex',
				alignItems: 'flex-end',
				gap: '12px',
				background: 'var(--color-background)',
				borderRadius: '24px',
				border: '1px solid var(--color-border)',
				padding: '12px 16px',
				transition: 'border-color 0.2s, box-shadow 0.2s',
				boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
			}}
			onFocus={(e) => {
				e.currentTarget.style.borderColor = 'var(--color-primary)';
				e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb), 0.1)';
			}}
			onBlur={(e) => {
				// 延迟隐藏菜单，以便点击菜单项时不会立即关闭
				setTimeout(() => {
					if (mentionMenuRef.current && !mentionMenuRef.current.contains(document.activeElement)) {
						setShowMentionMenu(false);
					}
				}, 200);
				e.currentTarget.style.borderColor = 'var(--color-border)';
				e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
			}}
		>
			<textarea
				ref={textareaRef}
				value={content}
				onChange={(e) => setContent(e.target.value)}
				onKeyDown={handleKeyDown}
				onInput={handleInput}
				placeholder={placeholder}
				disabled={disabled}
				style={{
					flex: 1,
					minHeight: '24px',
					maxHeight: '200px',
					padding: '0',
					border: 'none',
					background: 'transparent',
					fontSize: '15px',
					fontFamily: 'var(--font-family)',
					resize: 'none',
					overflowY: 'auto',
					color: 'var(--color-text-primary)',
					lineHeight: '1.5',
					outline: 'none'
				}}
			/>
			<button
				onClick={handleSend}
				disabled={disabled || !content.trim()}
				style={{
					padding: '8px 20px',
					background:
						disabled || !content.trim()
							? 'var(--color-border)'
							: 'var(--color-primary)',
					color: 'white',
					border: 'none',
					borderRadius: '20px',
					cursor:
						disabled || !content.trim() ? 'not-allowed' : 'pointer',
					fontSize: '14px',
					fontWeight: 500,
					opacity: disabled || !content.trim() ? 0.5 : 1,
					transition: 'opacity 0.2s, background 0.2s',
					flexShrink: 0
				}}
				onMouseEnter={(e) => {
					if (!disabled && content.trim()) {
						e.currentTarget.style.opacity = '0.9';
					}
				}}
				onMouseLeave={(e) => {
					if (!disabled && content.trim()) {
						e.currentTarget.style.opacity = '1';
					}
				}}
			>
				发送
			</button>
			
			{/* @提示菜单 */}
			{showMentionMenu && (() => {
				const textBeforeCursor = content.substring(0, textareaRef.current?.selectionStart || 0);
				const lastAtIndex = textBeforeCursor.lastIndexOf('@');
				const textAfterAt = lastAtIndex !== -1 ? textBeforeCursor.substring(lastAtIndex + 1) : '';
				const query = textAfterAt.toLowerCase();
				const filteredOptions = query
					? mentionOptions.filter(opt => opt.label.toLowerCase().includes(query))
					: mentionOptions;

				return filteredOptions.length > 0 ? (
					<div
						ref={mentionMenuRef}
						style={{
							position: 'absolute',
							bottom: '100%',
							left: `${mentionPosition.left}px`,
							marginBottom: '8px',
							background: 'var(--color-background-paper)',
							border: '1px solid var(--color-border)',
							borderRadius: '8px',
							boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
							zIndex: 1000,
							minWidth: '200px',
							maxWidth: '300px',
							overflow: 'hidden'
						}}
						onMouseDown={(e) => e.preventDefault()} // 防止blur事件
					>
						{filteredOptions.map((option, index) => (
							<div
								key={`${option.type}-${option.value}`}
								onClick={() => selectMention(option)}
								onMouseEnter={() => setSelectedIndex(index)}
								style={{
									padding: '10px 16px',
									cursor: 'pointer',
									background: index === selectedIndex 
										? 'var(--color-primary-lighter)' 
										: 'transparent',
									color: 'var(--color-text-primary)',
									fontSize: '14px',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									transition: 'background 0.15s'
								}}
							>
								<span
									style={{
										width: '20px',
										height: '20px',
										borderRadius: option.type === 'ai' ? '50%' : '4px',
										background: option.type === 'ai' ? 'var(--color-primary)' : 'var(--color-background-subtle)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: option.type === 'ai' ? 'white' : 'var(--color-text-primary)',
										fontSize: option.type === 'ai' ? '12px' : '14px',
										fontWeight: 600,
										flexShrink: 0
									}}
								>
									{option.type === 'ai' ? option.icon : option.icon}
								</span>
								<span style={{ fontWeight: index === selectedIndex ? 600 : 400 }}>
									{option.label}
								</span>
							</div>
						))}
					</div>
				) : null;
			})()}
		</div>
	);
}
