'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { createModuleLogger } from '@/lib/utils/logger';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import GameBoard from '@/components/games/baike/GameBoard';
import GameInput from '@/components/games/baike/GameInput';
import GameStats from '@/components/games/baike/GameStats';
import BaikeCalendar from '@/components/games/baike/BaikeCalendar';
import BaikeRulesModal from '@/components/games/baike/BaikeRulesModal';

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
 * 每日百科游戏页面内容
 */
function BaikeGamePageContent() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [totalGuessed, setTotalGuessed] = useState<number>(0);
	const [submitting, setSubmitting] = useState(false);
	const [lastGuessedChar, setLastGuessedChar] = useState<string | undefined>(undefined);
	const [showCalendar, setShowCalendar] = useState(false);
	const [showRules, setShowRules] = useState(false);
	const [availableDates, setAvailableDates] = useState<string[]>([]);
	const searchParams = useSearchParams();
	const router = useRouter();

	// 获取今天的日期
	const getTodayDate = useCallback(() => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}${month}${day}`;
	}, []);

	// 加载游戏
	const loadGame = useCallback(async (targetDate?: string) => {
		try {
			setLoading(true);
			setError(null);

			// 优先使用传入的日期，其次使用 URL 参数，最后使用今天
			const dateFromUrl = searchParams?.get('date');
			const date = targetDate || dateFromUrl || getTodayDate();

			// 每次进入页面都重置，不恢复任何状态
			// 清除本地存储的状态（如果有）
			if (typeof window !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
			}

			// 清除服务器端的状态（如果用户已登录）
			// 注意：这里不等待重置完成，即使失败也继续，因为我们会在前端重置状态
			try {
				const resetRes = await fetch(`/api/games/baike/reset?date=${date}`, {
					method: 'DELETE'
				});
				// 不检查 resetRes.ok，因为匿名用户会返回 401，这是正常的
			} catch (err) {
				// 忽略重置错误，继续加载游戏
				log.warn('清除服务器端状态失败（可能是匿名用户）', err as Error);
			}

			// 获取当日题目
			const questionRes = await fetch(`/api/games/baike/question?date=${date}`);
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
				date: date,
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
			loadStats(date);

			// 更新 URL（如果日期不是今天）
			if (date !== getTodayDate()) {
				router.replace(`/games/baike?date=${date}`, { scroll: false });
			} else {
				router.replace('/games/baike', { scroll: false });
			}
		} catch (err: any) {
			log.error('加载游戏失败', err as Error);
			setError(err.message || '加载游戏失败');
		} finally {
			setLoading(false);
		}
	}, [getTodayDate, searchParams, router]);

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

	// 处理猜测 - 优化为即时反馈
	const handleGuess = useCallback(async (char: string) => {
		if (!gameState || submitting || gameState.isCompleted) {
			return;
		}

		// 检查是否已猜过（避免重复猜测）
		if (gameState.guessedChars.includes(char)) {
			setError('这个字符已经猜过了');
			setTimeout(() => setError(null), 2000);
			return;
		}

		// 即时更新：先更新 UI，然后同步到服务器
		setSubmitting(true);
		setError(null);

		// 乐观更新：立即检查字符是否在标题或内容中（全局猜测）
		const normalizedChar = char.toLowerCase();
		const targetTitle = gameState.targetTitle.toLowerCase();
		const targetContent = (gameState.description || '').toLowerCase();
		// 检查字符是否在标题或内容中
		const isFound = targetTitle.includes(normalizedChar) || targetContent.includes(normalizedChar);

		// 如果猜对了，先更新 revealedChars，确保字符不会出现在错误区域
		const newRevealedChars = isFound 
			? [...gameState.revealedChars, char]
			: gameState.revealedChars;
		
		// guessedChars 包含所有猜过的字符
		// 注意：如果猜对了，字符会同时出现在 revealedChars 和 guessedChars 中
		// 但计算错误字符时，会过滤掉在 revealedChars 中的字符，所以不会出现在错误列表中
		const newGuessedChars = [...gameState.guessedChars, char];
		const newGuessCount = gameState.guessCount + 1;

		// 检查是否完成（基于标题）
		const allCharsRevealed = gameState.targetTitle.split('').every(c => {
			if (/[《》【】「」『』，。、；：！？…—～（）【】,.!?;:()\[\]{}'"-]/.test(c)) {
				return true; // 标点符号
			}
			return newRevealedChars.some(rc => rc.toLowerCase() === c.toLowerCase());
		});
		const newIsCompleted = allCharsRevealed;

		// 立即更新 UI - 如果猜对了，使用 flushSync 强制同步更新，确保 revealedChars 先更新
		// 这样可以避免字符短暂出现在错误列表中
		if (isFound) {
			// 猜对了：强制同步更新，确保 revealedChars 立即生效
			flushSync(() => {
				setGameState(prevState => {
					if (!prevState) return prevState;
					return {
						...prevState,
						revealedChars: newRevealedChars,
						guessCount: newGuessCount,
						isCompleted: newIsCompleted,
						guessedChars: newGuessedChars
					};
				});
			});
		} else {
			// 猜错了：正常更新即可
			setGameState(prevState => {
				if (!prevState) return prevState;
				return {
					...prevState,
					revealedChars: newRevealedChars,
					guessCount: newGuessCount,
					isCompleted: newIsCompleted,
					guessedChars: newGuessedChars
				};
			});
		}

		// 如果猜中了，立即显示红色高亮
		if (isFound) {
			setLastGuessedChar(char);
			setTimeout(() => setLastGuessedChar(undefined), 2000);
		}

		// 如果完成，更新统计信息
		if (newIsCompleted) {
			loadStats(gameState.date);
		}

		// 异步同步到服务器（不阻塞 UI）
		fetch('/api/games/baike/guess', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				questionId: gameState.questionId,
				char,
				date: gameState.date
			})
		})
			.then(res => res.json())
			.then(responseData => {
				if (!responseData.success) {
					// 如果服务器返回错误，回滚乐观更新
					log.warn('服务器验证失败，回滚状态', responseData);
					// 可以选择回滚或显示错误
					if (responseData.error?.includes('already guessed')) {
						setError('这个字符已经猜过了');
						setTimeout(() => setError(null), 2000);
					}
				} else {
					// 服务器验证成功，使用服务器返回的准确数据
					const serverRevealedChars = responseData.data.revealedChars || newRevealedChars;
					const serverGuessCount = responseData.data.guessCount;
					const serverIsCompleted = responseData.data.isCompleted || false;

					// 只在服务器数据与乐观更新不一致时更新
					if (
						JSON.stringify(serverRevealedChars.sort()) !== JSON.stringify(newRevealedChars.sort()) ||
						serverGuessCount !== newGuessCount ||
						serverIsCompleted !== newIsCompleted
					) {
						setGameState(prevState => {
							if (!prevState) return prevState;
							return {
								...prevState,
								revealedChars: serverRevealedChars,
								guessCount: serverGuessCount,
								isCompleted: serverIsCompleted
							};
						});
					}
				}
			})
			.catch(err => {
				log.error('同步到服务器失败', err as Error);
				// 不显示错误，因为 UI 已经更新了
			})
			.finally(() => {
				setSubmitting(false);
			});
	}, [gameState, submitting, loadStats]);

	// 加载可用日期列表
	const loadAvailableDates = useCallback(async () => {
		try {
			const res = await fetch('/api/games/baike/dates');
			if (res.ok) {
				const data = await res.json();
				if (data.success) {
					setAvailableDates(data.data.dates || []);
				}
			}
		} catch (err) {
			log.warn('加载可用日期失败', err as Error);
		}
	}, []);

	// 处理日期选择
	const handleDateSelect = useCallback((date: string) => {
		// 先关闭日历，避免状态冲突
		setShowCalendar(false);
		// 然后加载游戏（这会触发路由变化）
		loadGame(date);
	}, [loadGame]);

	// 初始化 - 加载可用日期列表
	useEffect(() => {
		loadAvailableDates();
	}, [loadAvailableDates]);

	// 监听 URL 参数变化，重新加载游戏
	useEffect(() => {
		// 当 searchParams 变化时，loadGame 会自动使用新的 searchParams 值
		// 这里直接调用 loadGame，它会从 searchParams 读取日期
		loadGame();
	}, [searchParams, loadGame]);

	// 计算猜错的字符：在 guessedChars 中但不在 revealedChars 中（大小写不敏感）
	// 必须在所有条件返回之前调用，确保 Hooks 调用顺序一致
	// 使用 useMemo 并依赖 gameState 对象本身，确保状态更新时立即重新计算
	const wrongGuessedChars = useMemo(() => {
		if (!gameState) return [];
		// 使用 Set 优化查找性能，并确保逻辑正确
		// 关键：使用最新的 revealedChars 来过滤，确保猜对的字符不会出现在错误列表中
		const revealedCharsSet = new Set(
			gameState.revealedChars.map(c => c.toLowerCase())
		);
		return gameState.guessedChars.filter(char => {
			const normalizedChar = char.toLowerCase();
			// 如果字符在 revealedChars 中，就不应该出现在错误列表中
			return !revealedCharsSet.has(normalizedChar);
		});
	}, [gameState]);

	// 加载状态
	if (loading) {
		return (
			<LoadingSpinner fullscreen 
				message="加载中..."
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
					onClick={() => loadGame()}
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
		<div className="page-container" style={{
			maxWidth: 800,
			margin: '0 auto',
			padding: '24px 16px',
			minHeight: 'calc(100vh - 200px)'
		}}>
			{/* 页面标题 */}
			<div style={{
				textAlign: 'center',
				marginBottom: '32px',
				position: 'relative'
			}}>
				{/* 操作按钮组 */}
				<div style={{
					position: 'absolute',
					right: 0,
					top: 0,
					display: 'flex',
					gap: '8px',
					alignItems: 'center'
				}}>
					{/* 日历按钮 */}
					<button
						onClick={() => setShowCalendar(true)}
						style={{
							padding: '8px 12px',
							background: 'var(--color-background-secondary)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-sm)',
							cursor: 'pointer',
							fontSize: '14px',
							color: 'var(--color-text-primary)',
							display: 'flex',
							alignItems: 'center',
							gap: '6px',
							transition: 'all 0.2s'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--color-background-subtle)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'var(--color-background-secondary)';
						}}
					>
						📅 回溯
					</button>
					{/* 规则提示按钮 */}
					<button
						onClick={() => setShowRules(true)}
						style={{
							padding: '8px',
							background: 'var(--color-background-secondary)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-sm)',
							cursor: 'pointer',
							fontSize: '18px',
							color: 'var(--color-text-primary)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '36px',
							height: '36px',
							transition: 'all 0.2s'
						}}
						title="规则说明"
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--color-background-subtle)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'var(--color-background-secondary)';
						}}
					>
						❓
					</button>
				</div>
				<h1 style={{
					fontSize: '24px',
					fontWeight: 500,
					marginBottom: '8px',
					color: 'var(--color-text-primary)',
					letterSpacing: 0
				}}>
					每日挑战 - 百科
				</h1>
				<p style={{
					color: 'var(--color-text-secondary)',
					fontSize: '14px',
					margin: 0
				}}>
					你能用最少的次数猜出今天的隐藏百科标题（第一行）吗？
				</p>
			</div>

			{/* 错误提示 */}
			{error && (
				<div className="error-message" style={{
					marginBottom: '16px',
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
					marginBottom: '16px'
				}}>
					<button
						onClick={() => {
							const updatedState: GameState = {
								...gameState,
								categoryRevealed: true
							};
							setGameState(updatedState);
						}}
						className="btn-academic-primary"
						style={{
							padding: '4px 16px',
							fontSize: '14px'
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
				wrongGuessedChars={wrongGuessedChars}
				isCompleted={gameState.isCompleted}
				guessedChars={gameState.guessedChars}
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

			{/* 日历组件 */}
			<BaikeCalendar
				isOpen={showCalendar}
				onClose={() => setShowCalendar(false)}
				onSelectDate={handleDateSelect}
				availableDates={availableDates}
				currentDate={gameState?.date || getTodayDate()}
			/>

			{/* 规则说明弹窗 */}
			<BaikeRulesModal
				isOpen={showRules}
				onClose={() => setShowRules(false)}
			/>
		</div>
	);
}

/**
 * 每日百科游戏页面
 * 参考 xiaoce.fun/baike 的实现
 */
export default function BaikeGamePage() {
	return (
		<Suspense fallback={<LoadingSpinner fullscreen message="加载中..." />}>
			<BaikeGamePageContent />
		</Suspense>
	);
}
