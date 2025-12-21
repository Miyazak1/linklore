'use client';

interface BoardCell {
	char: string;
	isRevealed: boolean;
	isPunctuation: boolean;
	displayChar: string;
	isTitle: boolean; // 是否属于标题行
	isLastGuessed?: boolean; // 是否是最近猜出的字符
}

interface GameBoardProps {
	targetTitle: string;
	content?: string; // 内容描述
	revealedChars: string[];
	lastGuessedChar?: string; // 最近猜出的字符（用于红色高亮）
	wrongGuessedChars?: string[]; // 猜错的字符列表
}

/**
 * 游戏棋盘组件
 * 显示隐藏的标题和内容，已猜中的字符显示，未猜中的显示方块
 * 第一行是标题，下面的是内容
 */
export default function GameBoard({ targetTitle, content, revealedChars, lastGuessedChar, wrongGuessedChars = [] }: GameBoardProps) {
	// 构建完整的文本（标题 + 内容）
	const fullText = content ? `${targetTitle}\n${content}` : targetTitle;
	
	// 将文本按行分割
	const lines = fullText.split('\n');
	const titleLine = lines[0] || '';
	const contentLines = lines.slice(1);

	// 渲染标题行
	// 已猜中的字符（revealedChars）会在所有位置显示，并一直保持显示
	// 使用大小写不敏感匹配
	const titleCells: BoardCell[] = titleLine.split('').map((char) => {
		const isPunct = isPunctuation(char);
		// 标点符号自动显示，或字符在已猜中列表中则显示（大小写不敏感）
		const isRevealed = isPunct || revealedChars.some(c => c.toLowerCase() === char.toLowerCase());
		// 检查是否是最近猜出的字符（用于红色高亮）
		const isLastGuessed = lastGuessedChar && !isPunct && lastGuessedChar.toLowerCase() === char.toLowerCase();
		
		return {
			char,
			isRevealed,
			isPunctuation: isPunct,
			displayChar: isRevealed ? char : '■',
			isTitle: true,
			isLastGuessed: !!isLastGuessed
		};
	});

	// 渲染内容行
	// 已猜中的字符（revealedChars）会在所有位置显示，并一直保持显示
	// 使用大小写不敏感匹配
	const contentCells: BoardCell[][] = contentLines.map((line) =>
		line.split('').map((char) => {
			const isPunct = isPunctuation(char);
			// 标点符号自动显示，或字符在已猜中列表中则显示（大小写不敏感）
			const isRevealed = isPunct || revealedChars.some(c => c.toLowerCase() === char.toLowerCase());
			// 检查是否是最近猜出的字符（用于红色高亮）
			const isLastGuessed = lastGuessedChar && !isPunct && lastGuessedChar.toLowerCase() === char.toLowerCase();
			
			return {
				char,
				isRevealed,
				isPunctuation: isPunct,
				displayChar: isRevealed ? char : '■',
				isTitle: false,
				isLastGuessed: !!isLastGuessed
			};
		})
	);

	return (
		<div style={{
			padding: 'var(--spacing-xl)',
			background: 'var(--color-background-paper)',
			borderRadius: 'var(--radius-md)',
			border: '1px solid var(--color-border-light)'
		}}>
			{/* 标题行 */}
			<div style={{
				display: 'flex',
				flexWrap: 'wrap',
				gap: '4px', // 增加方块间距
				marginBottom: 'var(--spacing-md)',
				paddingBottom: 'var(--spacing-md)',
				borderBottom: '1px solid var(--color-border-light)'
			}}>
				{titleCells.map((cell, index) => (
					<span
						key={`title-${index}`}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: cell.isPunctuation ? 'auto' : '22px',
							height: '22px',
							textAlign: 'center',
							fontSize: '13px',
							fontWeight: cell.isRevealed ? 600 : 400,
							color: cell.isRevealed 
								? 'var(--color-text-primary)' 
								: 'transparent',
							// 已猜出的字符使用绿色背景高亮，标点符号使用透明背景直接显示
							background: cell.isPunctuation
								? 'transparent' // 标点符号透明背景
								: cell.isRevealed
								? '#4caf50' // 绿色背景
								: '#1a1a1a',
							// 最近猜出的字符用红色边框高亮（保持绿色背景），标点符号无边框
							border: cell.isPunctuation
								? 'none' // 标点符号无边框
								: cell.isLastGuessed
								? '2px solid #ff4444'
								: cell.isRevealed
								? 'none'
								: '0.5px solid #333',
							borderRadius: '3px',
							padding: cell.isPunctuation ? '0 3px' : '0',
							transition: 'all 0.2s ease',
							fontFamily: cell.isPunctuation ? 'inherit' : 'monospace',
							userSelect: 'none',
							boxSizing: 'border-box'
						}}
					>
						{cell.displayChar}
					</span>
				))}
			</div>

			{/* 内容行 */}
			<div style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '4px' // 增加行间距
			}}>
				{contentCells.map((line, lineIndex) => (
					<div
						key={`content-${lineIndex}`}
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: '4px' // 增加方块间距
						}}
					>
						{line.map((cell, cellIndex) => (
							<span
								key={`content-${lineIndex}-${cellIndex}`}
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: cell.isPunctuation ? 'auto' : '22px',
									height: '22px',
									textAlign: 'center',
									fontSize: '13px',
									fontWeight: cell.isRevealed ? 400 : 400,
									color: cell.isRevealed 
										? 'var(--color-text-primary)' 
										: 'transparent',
									// 已猜出的字符使用绿色背景高亮，标点符号使用透明背景直接显示
									background: cell.isPunctuation
										? 'transparent' // 标点符号透明背景
										: cell.isRevealed
										? '#4caf50' // 绿色背景
										: '#1a1a1a',
									// 最近猜出的字符用红色边框高亮（保持绿色背景），标点符号无边框
									border: cell.isPunctuation
										? 'none' // 标点符号无边框
										: cell.isLastGuessed
										? '2px solid #ff4444'
										: cell.isRevealed
										? 'none'
										: '0.5px solid #333',
									borderRadius: '3px',
									padding: cell.isPunctuation ? '0 3px' : '0',
									transition: 'all 0.2s ease',
									fontFamily: cell.isPunctuation ? 'inherit' : 'monospace',
									userSelect: 'none',
									boxSizing: 'border-box'
								}}
							>
								{cell.displayChar}
							</span>
						))}
					</div>
				))}
			</div>

			{/* 猜错的字符显示区域 */}
			{wrongGuessedChars.length > 0 && (
				<div style={{
					marginTop: 'var(--spacing-lg)',
					paddingTop: 'var(--spacing-md)',
					borderTop: '1px solid var(--color-border-light)'
				}}>
					<div style={{
						fontSize: '12px',
						color: 'var(--color-text-secondary)',
						marginBottom: 'var(--spacing-sm)'
					}}>
						猜错的字符：
					</div>
					<div style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: '4px' // 与游戏棋盘相同的间距
					}}>
						{wrongGuessedChars.map((char, index) => (
							<span
								key={`wrong-${index}-${char}`}
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: '22px', // 与游戏棋盘相同的宽度
									height: '22px', // 与游戏棋盘相同的高度
									fontSize: '13px',
									color: 'white', // 字符白色
									background: '#666', // 灰色背景，区别于猜中的绿色
									border: '0.5px solid #333',
									borderRadius: '3px',
									fontFamily: 'monospace',
									textAlign: 'center',
									userSelect: 'none',
									boxSizing: 'border-box'
								}}
							>
								{char}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * 判断字符是否为标点符号
 */
function isPunctuation(char: string): boolean {
	const chinesePunctuation = /[《》【】「」『』，。、；：！？…—～（）【】]/;
	const englishPunctuation = /[,.!?;:()\[\]{}'"-]/;
	return chinesePunctuation.test(char) || englishPunctuation.test(char);
}

