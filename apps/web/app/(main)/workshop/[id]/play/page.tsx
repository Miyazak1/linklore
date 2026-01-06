'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { EditIcon } from '@/components/ui/Icons';
import type { GameInstance, Question } from '@/types/workshop';
import { PageLayout, ErrorMessage, FormField, ProgressBar, ResultCard } from '@/components/styles';

interface AnswerRecord {
	questionId: string;
	answer: string;
	correct: boolean;
	timestamp: string;
}

export default function GamePlayPage({ params }: { params: Promise<{ id: string }> }) {
	const router = useRouter();
	const { user } = useAuth();
	const [game, setGame] = useState<GameInstance | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<AnswerRecord[]>([]);
	const [userAnswer, setUserAnswer] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [showResult, setShowResult] = useState(false);
	const [score, setScore] = useState(0);
	const [startTime] = useState(Date.now());
	const [completed, setCompleted] = useState(false);
	const [gameId, setGameId] = useState<string | null>(null);

	useEffect(() => {
		params.then(({ id }) => {
			setGameId(id);
		});
	}, [params]);

	useEffect(() => {
		if (gameId) {
			loadGame();
		}
	}, [gameId]);

	const loadGame = async () => {
		if (!gameId) return;
		try {
			setLoading(true);
			setError(null);
			const res = await fetch(`/api/workshop/games/${gameId}`);
			const data = await res.json();
			
			if (!res.ok) {
				throw new Error(data.error || '加载失败');
			}
			
			if (data.game.status !== 'published') {
				throw new Error('游戏尚未发布');
			}
			
			setGame(data.game);
		} catch (err: any) {
			setError(err.message || '加载游戏失败');
		} finally {
			setLoading(false);
		}
	};

	const handleSubmitAnswer = useCallback(async () => {
		if (!game || submitting || !userAnswer.trim()) return;

		const currentQuestion = game.questions[currentQuestionIndex];
		if (!currentQuestion) return;

		const correctAnswer = Array.isArray(currentQuestion.content.correctAnswer)
			? currentQuestion.content.correctAnswer
			: [currentQuestion.content.correctAnswer];

		const normalizedUserAnswer = userAnswer.trim().toLowerCase();
		const isCorrect = correctAnswer.some(ans => 
			ans.trim().toLowerCase() === normalizedUserAnswer
		);

		const answerRecord: AnswerRecord = {
			questionId: currentQuestion.id,
			answer: userAnswer.trim(),
			correct: isCorrect,
			timestamp: new Date().toISOString()
		};

		const newAnswers = [...answers, answerRecord];
		setAnswers(newAnswers);
		setShowResult(true);

		if (isCorrect) {
			setScore(prev => prev + 1);
		}

		setSubmitting(true);
	}, [game, currentQuestionIndex, userAnswer, answers, submitting]);

	const handleNext = useCallback(() => {
		if (!game) return;

		if (currentQuestionIndex < game.questions.length - 1) {
			setCurrentQuestionIndex(prev => prev + 1);
			setUserAnswer('');
			setShowResult(false);
		} else {
			// 完成游戏
			handleComplete();
		}
	}, [game, currentQuestionIndex]);

	const handleComplete = useCallback(async () => {
		if (!game || completed) return;

		setCompleted(true);
		const timeSpent = Math.floor((Date.now() - startTime) / 1000);

		try {
			const res = await fetch('/api/workshop/games/play', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					gameId: game.id,
					score: score,
					completed: true,
					answers: answers,
					timeSpent: timeSpent
				})
			});

			if (!res.ok) {
				console.error('保存游戏记录失败');
			}
		} catch (err) {
			console.error('保存游戏记录失败', err);
		}
	}, [game, completed, score, answers, startTime]);

	if (loading) {
		return (
			<LoadingSpinner fullscreen message="加载中..." />
		);
	}

	if (error || !game) {
		return (
			<PageLayout
				title=""
				className=""
				showBackButton={false}
			>
				<div style={{ textAlign: 'center' }}>
					<ErrorMessage
						message={error || '游戏不存在'}
						type="error"
						visible={true}
					/>
					<div style={{ marginTop: 'var(--spacing-lg)' }}>
						<Link href="/workshop" className="btn-academic-primary" style={{ textDecoration: 'none' }}>
							返回游戏工坊
						</Link>
					</div>
				</div>
			</PageLayout>
		);
	}

	const currentQuestion = game.questions[currentQuestionIndex];
	const isLastQuestion = currentQuestionIndex === game.questions.length - 1;
	const progress = ((currentQuestionIndex + 1) / game.questions.length) * 100;
	const isAuthor = user?.id === game.authorId;

	if (completed) {
		return (
			<PageLayout
				title="游戏完成！"
				subtitle={`得分：${score} / ${game.questions.length} | 正确率：${Math.round((score / game.questions.length) * 100)}%`}
				showBackButton={false}
				className=""
			>
				<div className="card-academic" style={{ padding: 'var(--spacing-xxl)', textAlign: 'center' }}>
					<div className="flex-row" style={{ justifyContent: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
						{isAuthor && (
							<Link
								href={`/workshop/${game.id}/edit`}
								className="btn-academic-primary"
								style={{ textDecoration: 'none' }}
							>
								编辑游戏
							</Link>
						)}
						<Link
							href="/workshop"
							className="btn-academic"
							style={{ textDecoration: 'none' }}
						>
							浏览更多游戏
						</Link>
					</div>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout
			title={game.title}
			subtitle={`题目 ${currentQuestionIndex + 1} / ${game.questions.length}`}
			showBackButton={false}
			className=""
		>
			{/* 编辑按钮 - 仅作者可见 */}
			{isAuthor && (
				<div style={{
					position: 'absolute',
					top: 'var(--spacing-xl)',
					right: 'var(--spacing-xl)'
				}}>
					<Link
						href={`/workshop/${game.id}/edit`}
						className="btn-academic"
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)',
							textDecoration: 'none',
							padding: 'var(--spacing-xs) var(--spacing-md)'
						}}
					>
						<EditIcon size={16} color="currentColor" />
						<span>编辑</span>
					</Link>
				</div>
			)}
			
			{/* 进度条 */}
			<div style={{
				marginBottom: 'var(--spacing-xl)',
				textAlign: 'center'
			}}>
				<ProgressBar percent={progress} />
			</div>

			{/* 题目卡片 */}
			<div className="card-academic" style={{
				padding: 'var(--spacing-xxl)',
				marginBottom: 'var(--spacing-lg)'
			}}>
				{currentQuestion && (
					<>
						<div style={{
							fontSize: 'var(--font-size-lg)',
							marginBottom: 'var(--spacing-lg)',
							color: 'var(--color-text-primary)',
							lineHeight: 'var(--line-height-relaxed)'
						}}>
							{currentQuestion.content.text || `第 ${currentQuestion.order} 题`}
						</div>

						{currentQuestion.content.imageUrl && (
							<div style={{
								marginBottom: 'var(--spacing-lg)',
								textAlign: 'center'
							}}>
								<img
									src={currentQuestion.content.imageUrl}
									alt="题目图片"
									style={{
										maxWidth: '100%',
										height: 'auto',
										borderRadius: 'var(--radius-sm)'
									}}
								/>
							</div>
						)}

						{!showResult && (
							<FormField>
								<input
									type="text"
									value={userAnswer}
									onChange={(e) => setUserAnswer(e.target.value)}
									onKeyPress={(e) => {
										if (e.key === 'Enter' && userAnswer.trim()) {
											handleSubmitAnswer();
										}
									}}
									placeholder="请输入答案"
									className="form-input"
									autoFocus
								/>
							</FormField>
						)}

						{showResult && (
							<ResultCard
								correct={answers[answers.length - 1]?.correct || false}
								correctAnswer={currentQuestion.content.correctAnswer}
							/>
						)}

						<div className="flex-row" style={{
							gap: 'var(--spacing-md)',
							justifyContent: 'flex-end'
						}}>
							{!showResult && (
								<button
									onClick={handleSubmitAnswer}
									disabled={!userAnswer.trim() || submitting}
									className="btn-academic-primary"
								>
									提交答案
								</button>
							)}
							{showResult && (
								<button
									onClick={handleNext}
									className="btn-academic-primary"
								>
									{isLastQuestion ? '完成游戏' : '下一题'}
								</button>
							)}
						</div>
					</>
				)}
			</div>

			{/* 当前得分 */}
			<div style={{
				textAlign: 'center',
				fontSize: 'var(--font-size-base)',
				color: 'var(--color-text-secondary)'
			}}>
				当前得分：{score} / {currentQuestionIndex + 1}
			</div>
		</PageLayout>
	);
}

