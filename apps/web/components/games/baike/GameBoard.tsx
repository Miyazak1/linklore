'use client';

interface BoardCell {
	char: string;
	isRevealed: boolean;
	isPunctuation: boolean;
	displayChar: string;
	isTitle: boolean; // 是否属于标题行
	isLastGuessed?: boolean; // 是否是最近猜出的字符
	isGuessedCorrectly?: boolean; // 是否是猜对的字符（仅在游戏完成时使用）
}

interface GameBoardProps {
	targetTitle: string;
	content?: string; // 内容描述
	revealedChars: string[];
	lastGuessedChar?: string; // 最近猜出的字符（用于红色高亮）
	wrongGuessedChars?: string[]; // 猜错的字符列表
	isCompleted?: boolean; // 游戏是否完成
	guessedChars?: string[]; // 所有猜过的字符（用于判断哪些字符是猜对的）
}

/**
 * 游戏棋盘组件
 * 显示隐藏的标题和内容，已猜中的字符显示，未猜中的显示方块
 * 第一行是标题，下面的是内容
 * 当游戏完成时，显示所有字符，并区分猜对的字符和未猜对的字符
 */
export default function GameBoard({ 
	targetTitle, 
	content, 
	revealedChars, 
	lastGuessedChar, 
	wrongGuessedChars = [],
	isCompleted = false,
	guessedChars = []
}: GameBoardProps) {
	// 构建完整的文本（标题 + 内容）
	const fullText = content ? `${targetTitle}\n${content}` : targetTitle;
	
	// 将文本按行分割，保留空行以保持段落结构
	// 先按 \n 分割，然后处理段落分隔（空行）
	// 注意：需要保留原始的换行符，包括 \r\n 和 \n
	const lines = fullText.split(/\r?\n/);
	const titleLine = lines[0] || '';
	const contentLines = lines.slice(1);
	
	// 处理段落：将空行标记为段落分隔
	// 如果一行是空的（去除空白后为空），它表示段落分隔
	const processedContentLines: (string | null)[] = [];
	for (let i = 0; i < contentLines.length; i++) {
		const trimmedLine = contentLines[i].trim();
		if (trimmedLine === '') {
			// 空行表示段落分隔，用 null 标记
			processedContentLines.push(null);
		} else {
			processedContentLines.push(contentLines[i]);
		}
	}

	// 渲染标题行
	// 已猜中的字符（revealedChars）会在所有位置显示，并一直保持显示
	// 使用大小写不敏感匹配
	// 当游戏完成时，显示所有字符，并区分猜对的字符和未猜对的字符
	const titleCells: BoardCell[] = titleLine.split('').map((char) => {
		const isPunct = isPunctuation(char);
		// 标点符号自动显示，或字符在已猜中列表中则显示（大小写不敏感）
		// 如果游戏完成，显示所有字符
		const isRevealed = isPunct || (isCompleted ? true : revealedChars.some(c => c.toLowerCase() === char.toLowerCase()));
		// 检查是否是最近猜出的字符（用于红色高亮）
		const isLastGuessed = lastGuessedChar && !isPunct && lastGuessedChar.toLowerCase() === char.toLowerCase();
		// 检查是否是猜对的字符（在 revealedChars 中）
		const isGuessedCorrectly = !isPunct && revealedChars.some(c => c.toLowerCase() === char.toLowerCase());
		
		return {
			char,
			isRevealed,
			isPunctuation: isPunct,
			displayChar: isRevealed ? char : '■',
			isTitle: true,
			isLastGuessed: !!isLastGuessed,
			isGuessedCorrectly: isCompleted ? isGuessedCorrectly : undefined // 只在游戏完成时标记
		};
	});

	// 渲染内容行
	// 已猜中的字符（revealedChars）会在所有位置显示，并一直保持显示
	// 使用大小写不敏感匹配
	// 当游戏完成时，显示所有字符，并区分猜对的字符和未猜对的字符
	// 注意：保留空行以保持段落结构
	const contentCells: (BoardCell[] | null)[] = processedContentLines.map((line) => {
		// 如果是段落分隔（null），返回 null
		if (line === null) {
			return null;
		}
		// 否则正常处理字符
		return line.split('').map((char) => {
			const isPunct = isPunctuation(char);
			// 标点符号自动显示，或字符在已猜中列表中则显示（大小写不敏感）
			// 如果游戏完成，显示所有字符
			const isRevealed = isPunct || (isCompleted ? true : revealedChars.some(c => c.toLowerCase() === char.toLowerCase()));
			// 检查是否是最近猜出的字符（用于红色高亮）
			const isLastGuessed = lastGuessedChar && !isPunct && lastGuessedChar.toLowerCase() === char.toLowerCase();
			// 检查是否是猜对的字符（在 revealedChars 中）
			const isGuessedCorrectly = !isPunct && revealedChars.some(c => c.toLowerCase() === char.toLowerCase());
			
			return {
				char,
				isRevealed,
				isPunctuation: isPunct,
				displayChar: isRevealed ? char : '■',
				isTitle: false,
				isLastGuessed: !!isLastGuessed,
				isGuessedCorrectly: isCompleted ? isGuessedCorrectly : undefined // 只在游戏完成时标记
			};
		});
	});

	return (
		<div className="card-academic" style={{
			padding: '24px',
			background: 'var(--color-background-paper)',
			borderRadius: '4px',
			border: '1px solid var(--color-border)',
			overflow: 'visible', // 确保内容不被截断
			userSelect: 'text' // 允许选中文字
		}}>
			{/* 标题行 */}
			<div style={{
				display: 'flex',
				flexWrap: 'wrap',
				gap: '4px', // 增加方块间距
				marginBottom: 'var(--spacing-md)',
				paddingBottom: 'var(--spacing-md)',
				borderBottom: '1px solid var(--color-border-light)',
				userSelect: 'text' // 允许选中文字
			}}>
				{titleCells.map((cell, index) => (
					<span
						key={`title-${index}`}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							// 标题行方块尺寸（与内容区域保持一致）
							width: cell.isPunctuation ? 'auto' : '20px',
							height: cell.isPunctuation ? 'auto' : '20px',
							WebkitUserSelect: 'text', // 兼容 WebKit 浏览器
							MozUserSelect: 'text', // 兼容 Firefox
							msUserSelect: 'text', // 兼容 IE/Edge
							textAlign: 'center',
							color: cell.isRevealed 
								? 'var(--color-text-primary)' 
								: 'transparent',
							// 已猜出的字符使用绿色背景高亮，标点符号使用透明背景直接显示
							// 游戏完成时：猜对的字符用绿色背景，未猜对的字符用普通文字（无背景）
							background: cell.isPunctuation
								? 'transparent' // 标点符号透明背景
								: cell.isRevealed
								? (isCompleted && cell.isGuessedCorrectly === false)
									? 'transparent' // 游戏完成时，未猜对的字符用透明背景（普通文字）
									: '#4caf50' // 猜对的字符用绿色背景
								: '#000000', // 未显示的字符用纯黑色背景
							// 最近猜出的字符用红色边框高亮（保持绿色背景），标点符号无边框
							// 游戏完成时，未猜对的字符用很细的边框
							border: cell.isPunctuation
								? 'none' // 标点符号无边框
								: (isCompleted && cell.isGuessedCorrectly === false)
								? '0.5px solid #ccc' // 游戏完成时，未猜对的字符用很细的边框
								: cell.isLastGuessed
								? '2px solid #ff4444'
								: cell.isRevealed
								? 'none' // 猜对的字符无边框
								: 'none', // 未猜中的字符无边框，保持纯黑
							borderRadius: '0', // 所有方块都无圆角
							padding: (isCompleted && cell.isGuessedCorrectly === false) || cell.isPunctuation 
								? '0' 
								: '0',
							transition: 'all 0.2s ease',
							fontFamily: cell.isPunctuation 
								? 'inherit' 
								: (isCompleted && cell.isGuessedCorrectly === false)
								? '"KaiTi", "楷体", "STKaiti", serif' // 未猜对的字符也用楷体
								: cell.isRevealed 
								? '"KaiTi", "楷体", "STKaiti", serif' // 猜对的字用楷体
								: 'monospace',
							fontSize: (isCompleted && cell.isGuessedCorrectly === false) 
								? '17px' // 未猜对的字符大小与猜对的保持一致
								: (cell.isRevealed ? '17px' : '13px'), // 标题区域字体统一为 17px
							fontWeight: (isCompleted && cell.isGuessedCorrectly === false) 
								? 400 
								: (cell.isRevealed ? 700 : 400), // 猜对的字加粗
							userSelect: 'text', // 允许选中文字
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
				gap: '4px', // 增加行间距
				overflow: 'visible', // 确保内容不被截断
				maxHeight: 'none', // 移除高度限制，允许完整显示
				userSelect: 'text' // 允许选中文字
			}}>
				{contentCells.map((line, lineIndex) => {
					// 如果是段落分隔（null），渲染空行
					if (line === null) {
						return (
							<div
								key={`paragraph-break-${lineIndex}`}
								style={{
									height: '16px', // 段落间距
									width: '100%'
								}}
							/>
						);
					}
					
					// 否则正常渲染字符行
					return (
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
									width: cell.isPunctuation ? 'auto' : '20px', // 方块大小刚好装下 17px 字体
									height: '20px', // 方块大小刚好装下 17px 字体
									WebkitUserSelect: 'text', // 兼容 WebKit 浏览器
									MozUserSelect: 'text', // 兼容 Firefox
									msUserSelect: 'text', // 兼容 IE/Edge
									textAlign: 'center',
									color: cell.isRevealed 
										? 'var(--color-text-primary)' 
										: 'transparent',
									// 已猜出的字符使用绿色背景高亮，标点符号使用透明背景直接显示
									// 游戏完成时：猜对的字符用绿色背景，未猜对的字符用透明背景+细边框
									background: cell.isPunctuation
										? 'transparent' // 标点符号透明背景
										: cell.isRevealed
										? (isCompleted && cell.isGuessedCorrectly === false)
											? 'transparent' // 游戏完成时，未猜对的字符用透明背景
											: '#4caf50' // 猜对的字符用绿色背景
										: '#000000', // 未显示的字符用纯黑色背景
									// 最近猜出的字符用红色边框高亮（保持绿色背景），标点符号无边框
									// 游戏完成时，未猜对的字符用很细的边框
									border: cell.isPunctuation
										? 'none' // 标点符号无边框
										: (isCompleted && cell.isGuessedCorrectly === false)
										? '0.5px solid #ccc' // 游戏完成时，未猜对的字符用很细的边框
										: cell.isLastGuessed
										? '2px solid #ff4444'
										: cell.isRevealed
										? 'none' // 猜对的字符无边框
										: 'none', // 未猜中的字符无边框，保持纯黑
									borderRadius: '0', // 所有方块都无圆角
									padding: cell.isPunctuation ? '0 3px' : '0',
									transition: 'all 0.2s ease',
									fontFamily: cell.isPunctuation 
										? 'inherit' 
										: (isCompleted && cell.isGuessedCorrectly === false)
										? '"KaiTi", "楷体", "STKaiti", serif' // 未猜对的字符也用楷体
										: cell.isRevealed 
										? '"KaiTi", "楷体", "STKaiti", serif' // 猜对的字用楷体
										: 'monospace',
									fontSize: (isCompleted && cell.isGuessedCorrectly === false) 
										? '17px' // 未猜对的字符大小与猜对的保持一致
										: (cell.isRevealed ? '17px' : '13px'), // 内容区域字体统一为 17px
									fontWeight: (isCompleted && cell.isGuessedCorrectly === false) 
										? 400 
										: (cell.isRevealed ? 700 : 400), // 猜对的字加粗
									userSelect: 'text', // 允许选中文字
									boxSizing: 'border-box'
								}}
							>
								{cell.displayChar}
							</span>
						))}
						</div>
					);
				})}
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
									width: '20px', // 方块大小刚好装下 17px 字体
									height: '20px', // 方块大小刚好装下 17px 字体
									fontSize: '17px', // 字体大小与内容区域保持一致
									fontWeight: 700, // 加粗
									color: 'white', // 字符白色
									background: '#666', // 灰色背景，区别于猜中的绿色
									border: '0.5px solid #333',
									borderRadius: '0', // 无圆角
									fontFamily: '"KaiTi", "楷体", "STKaiti", serif', // 楷体
									textAlign: 'center',
									userSelect: 'text', // 允许选中文字
									WebkitUserSelect: 'text', // 兼容 WebKit 浏览器
									MozUserSelect: 'text', // 兼容 Firefox
									msUserSelect: 'text', // 兼容 IE/Edge
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

