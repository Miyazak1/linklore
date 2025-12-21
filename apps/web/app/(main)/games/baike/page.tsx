'use client';

import { useState, useEffect, useCallback } from 'react';
import { createModuleLogger } from '@/lib/utils/logger';
import ChatPageLoader from '@/components/ui/ChatPageLoader';
import GameBoard from '@/components/games/baike/GameBoard';
import GameInput from '@/components/games/baike/GameInput';
import GameStats from '@/components/games/baike/GameStats';

const log = createModuleLogger('BaikeGame');

const STORAGE_KEY = 'baike_game_state';

interface GameState {
	questionId: string;
	date: string;
	targetTitle: string;
	description?: string; // 词条描述
	category?: string; // 分类
	revealedChars: string[];
	guessCount: number;
	isCompleted: boolean;
	guessedChars: string[]; // 所有猜过的字符（包括未找到的）
	categoryRevealed?: boolean; // 是否已使用提醒显示分类
}

/**
 * 每日百科游戏页面
 * 参考 xiaoce.fun/baike 的实现
 */
export default function BaikeGamePage() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [totalGuessed, setTotalGuessed] = useState<number>(0);
	const [submitting, setSubmitting] = useState(false);
	const [lastGuessedChar, setLastGuessedChar] = useState<string | undefined>(undefined);

	// 获取今天的日期
	const getTodayDate = useCallback(() => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}${month}${day}`;
	}, []);

	// 加载游戏
	const loadGame = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const today = getTodayDate();

			// 每次进入页面都重置，不恢复任何状态
			// 清除本地存储的状态（如果有）
			if (typeof window !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
			}

			// 清除服务器端的状态（如果用户已登录）
			// 注意：这里不等待重置完成，即使失败也继续，因为我们会在前端重置状态
			try {
				const resetRes = await fetch(`/api/games/baike/reset?date=${today}`, {
					method: 'DELETE'
				});
				// 不检查 resetRes.ok，因为匿名用户会返回 401，这是正常的
			} catch (err) {
				// 忽略重置错误，继续加载游戏
				log.warn('清除服务器端状态失败（可能是匿名用户）', err as Error);
			}

			// 获取当日题目
			const questionRes = await fetch(`/api/games/baike/question?date=${today}`);
			if (!questionRes.ok) {
				throw new Error('获取题目失败');
			}

			const questionData = await questionRes.json();
			if (!questionData.success) {
				throw new Error(questionData.error || '获取题目失败');
			}

			// 获取题目信息
			const targetTitle = questionData.data.title || '';
			const description = questionData.data.description || null;
			const category = questionData.data.category || null;

			// 每次都从初始状态开始（不恢复任何状态）
			const newState: GameState = {
				questionId: questionData.data.questionId,
				date: today,
				targetTitle,
				description: description || undefined,
				category: category || undefined,
				revealedChars: [],
				guessCount: 0,
				isCompleted: false,
				guessedChars: [],
				categoryRevealed: false
			};

			setGameState(newState);

			// 加载统计信息
			loadStats(today);
		} catch (err: any) {
			log.error('加载游戏失败', err as Error);
			setError(err.message || '加载游戏失败');
		} finally {
			setLoading(false);
		}
	}, [getTodayDate]);

	// 加载统计信息
	const loadStats = useCallback(async (date: string) => {
		try {
			const res = await fetch(`/api/games/baike/stats?date=${date}`);
			if (res.ok) {
				const data = await res.json();
				if (data.success) {
					setTotalGuessed(data.data.totalGuessed || 0);
				}
			}
		} catch (err) {
			log.warn('加载统计信息失败', err as Error);
		}
	}, []);

	// 处理猜测
	const handleGuess = useCallback(async (char: string) => {
		if (!gameState || submitting || gameState.isCompleted) {
			return;
		}

		// 检查是否已猜过（避免重复猜测）
		if (gameState.guessedChars.includes(char)) {
			setError('这个字符已经猜过了');
			// 3秒后自动清除错误提示
			setTimeout(() => {
				setError(null);
			}, 3000);
			return;
		}

		try {
			setSubmitting(true);
			setError(null); // 清除之前的错误

			const res = await fetch('/api/games/baike/guess', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					questionId: gameState.questionId,
					char,
					date: gameState.date
				})
			});

			const responseData = await res.json();

			if (!res.ok || !responseData.success) {
				// 处理各种错误情况
				const errorMessage = responseData.error || '提交猜测失败';
				
				// 如果是字符已猜过的错误，显示友好提示
				if (errorMessage.includes('already guessed') || errorMessage.includes('已猜过')) {
					setError('这个字符已经猜过了');
				} else if (errorMessage.includes('punctuation') || errorMessage.includes('标点')) {
					setError('标点符号不需要猜测');
				} else {
					setError(errorMessage);
				}
				
				// 3秒后自动清除错误提示
				setTimeout(() => {
					setError(null);
				}, 3000);
				return;
			}

			const data = responseData;

			// 更新游戏状态
			const newRevealedChars = data.data.revealedChars || gameState.revealedChars;
			const newGuessCount = data.data.guessCount;
			const newIsCompleted = data.data.isCompleted || false;

			const updatedState: GameState = {
				...gameState,
				revealedChars: newRevealedChars,
				guessCount: newGuessCount,
				isCompleted: newIsCompleted,
				guessedChars: [...gameState.guessedChars, char],
				categoryRevealed: gameState.categoryRevealed || false
			};

			// 如果猜中了，设置最近猜出的字符（用于红色高亮）
			if (data.data.isFound) {
				setLastGuessedChar(char);
				// 3秒后清除红色高亮
				setTimeout(() => {
					setLastGuessedChar(undefined);
				}, 3000);
			}

			setGameState(updatedState);

			// 如果完成，更新统计信息
			if (newIsCompleted) {
				loadStats(gameState.date);
			}
		} catch (err: any) {
			log.error('提交猜测失败', err as Error);
			setError(err.message || '提交猜测失败');
			// 3秒后自动清除错误提示
			setTimeout(() => {
				setError(null);
			}, 3000);
		} finally {
			setSubmitting(false);
		}
	}, [gameState, submitting, loadStats]);

	// 初始化
	useEffect(() => {
		loadGame();
	}, [loadGame]);

	// 加载状态
	if (loading) {
		return (
			<ChatPageLoader 
				message="加载中..." 
				subMessage="正在准备今日题目"
			/>
		);
	}

	// 错误状态
	if (error && !gameState) {
		return (
			<div style={{
				maxWidth: 1200,
				margin: '0 auto',
				padding: 'var(--spacing-xl) var(--spacing-md)',
				textAlign: 'center'
			}}>
				<p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-lg)' }}>
					{error}
				</p>
				<button
					onClick={loadGame}
					style={{
						padding: 'var(--spacing-sm) var(--spacing-lg)',
						background: 'var(--color-primary)',
						color: 'white',
						border: 'none',
						borderRadius: 'var(--radius-sm)',
						cursor: 'pointer'
					}}
				>
					重试
				</button>
			</div>
		);
	}

	if (!gameState) {
		return null;
	}

	return (
		<div style={{
			maxWidth: 1200,
			margin: '0 auto',
			padding: 'var(--spacing-xl) var(--spacing-md)',
			minHeight: 'calc(100vh - 200px)'
		}}>
			{/* 页面标题 */}
			<div style={{
				textAlign: 'center',
				marginBottom: 'var(--spacing-xxl)'
			}}>
				<h1 style={{
					fontSize: 'var(--font-size-3xl)',
					fontWeight: 600,
					marginBottom: 'var(--spacing-sm)',
					color: 'var(--color-text-primary)'
				}}>
					每日挑战 - 百科
				</h1>
				<p style={{
					color: 'var(--color-text-secondary)',
					fontSize: 'var(--font-size-base)'
				}}>
					你能用最少的次数猜出今天的隐藏百科标题（第一行）吗？
				</p>
			</div>

			{/* 错误提示 */}
			{error && (
				<div style={{
					padding: 'var(--spacing-sm) var(--spacing-md)',
					background: 'var(--color-error)',
					color: 'white',
					borderRadius: 'var(--radius-sm)',
					marginBottom: 'var(--spacing-lg)',
					textAlign: 'center'
				}}>
					{error}
				</div>
			)}

			{/* 分类标签 - 仅在使用了提醒后显示 */}
			{gameState.category && gameState.categoryRevealed && (
				<div style={{
					textAlign: 'center',
					marginBottom: 'var(--spacing-md)'
				}}>
					<span style={{
						display: 'inline-block',
						padding: '4px 12px',
						background: 'var(--color-primary-light)',
						color: 'var(--color-primary)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500
					}}>
						{gameState.category}
					</span>
				</div>
			)}

			{/* 申请提醒按钮 - 猜了20次且未使用提醒且未完成时显示 */}
			{gameState.guessCount >= 20 && !gameState.categoryRevealed && !gameState.isCompleted && gameState.category && (
				<div style={{
					textAlign: 'center',
					marginBottom: 'var(--spacing-md)'
				}}>
					<button
						onClick={() => {
							const updatedState: GameState = {
								...gameState,
								categoryRevealed: true
							};
							setGameState(updatedState);
						}}
						style={{
							padding: '8px 24px',
							background: 'var(--color-primary)',
							color: 'white',
							border: 'none',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--font-size-base)',
							fontWeight: 500,
							cursor: 'pointer',
							transition: 'background-color var(--transition-fast)'
						}}
						onMouseOver={(e) => {
							e.currentTarget.style.background = 'var(--color-primary-dark)';
						}}
						onMouseOut={(e) => {
							e.currentTarget.style.background = 'var(--color-primary)';
						}}
					>
						申请一次提醒（查看分类）
					</button>
				</div>
			)}

			{/* 游戏棋盘（包含标题和内容） */}
			<div style={{ 
				marginBottom: 'var(--spacing-xl)'
			}}>
			<GameBoard
				targetTitle={gameState.targetTitle}
				content={gameState.description}
				revealedChars={gameState.revealedChars}
				lastGuessedChar={lastGuessedChar}
				wrongGuessedChars={gameState.guessedChars.filter(char => {
					// 计算猜错的字符：在 guessedChars 中但不在 revealedChars 中（大小写不敏感）
					const normalizedChar = char.toLowerCase();
					return !gameState.revealedChars.some(c => c.toLowerCase() === normalizedChar);
				})}
			/>
			</div>

			{/* 输入区域 */}
			<div style={{ marginBottom: 'var(--spacing-xl)' }}>
				<GameInput
					onGuess={handleGuess}
					disabled={submitting || gameState.isCompleted}
					guessedChars={gameState.guessedChars}
				/>
			</div>

			{/* 统计信息 */}
			<GameStats
				guessCount={gameState.guessCount}
				totalGuessed={totalGuessed}
				isCompleted={gameState.isCompleted}
			/>
		</div>
	);
}


