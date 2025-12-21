import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('BaikeGuessAPI');

/**
 * 提交猜测
 * POST /api/games/baike/guess
 * Body: { questionId: string, char: string, date: string }
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { questionId, char, date } = body;

		// 验证参数
		if (!questionId || !char || !date) {
			return NextResponse.json(
				{ error: 'Missing required fields: questionId, char, date' },
				{ status: 400 }
			);
		}

		// 验证字符（只能是一个字符）
		const normalizedChar = char.trim();
		if (normalizedChar.length !== 1) {
			return NextResponse.json(
				{ error: 'Char must be exactly one character' },
				{ status: 400 }
			);
		}

		// 规范化字符：转换为小写用于匹配（但保存原始字符）
		// 注意：对于中文等非字母字符，toLowerCase() 不会改变字符
		const normalizedForMatch = normalizedChar.toLowerCase();

		// 检查是否为标点符号，标点符号不参与猜测
		if (isPunctuation(normalizedChar)) {
			return NextResponse.json(
				{ error: 'Punctuation marks cannot be guessed' },
				{ status: 400 }
			);
		}

		// 获取用户ID（可选，支持匿名）
		const session = await readSession();
		const userId = session?.sub || null;

		// 获取题目
		const question = await prisma.baikeQuestion.findUnique({
			where: { id: questionId }
		});

		if (!question) {
			return NextResponse.json(
				{ error: 'Question not found' },
				{ status: 404 }
			);
		}

		// 验证日期是否匹配
		if (question.date !== date) {
			return NextResponse.json(
				{ error: 'Date mismatch' },
				{ status: 400 }
			);
		}

		// 获取或创建游戏记录
		let gameRecord = userId
			? await prisma.baikeGameRecord.findUnique({
					where: { date_userId: { date, userId } }
				})
			: null;

		// 如果用户已登录但没有记录，创建新记录
		if (userId && !gameRecord) {
			gameRecord = await prisma.baikeGameRecord.create({
				data: {
					questionId: question.id,
					userId,
					date,
					guessCount: 0,
					isCompleted: false,
					guesses: [],
					revealedChars: []
				}
			});
		}

		// 如果已完成，不允许继续猜测
		if (gameRecord?.isCompleted) {
			return NextResponse.json(
				{ error: 'Game already completed' },
				{ status: 400 }
			);
		}

		// 检查字符是否在标题或内容中（全局猜测）
		const targetTitle = question.title;
		const targetContent = question.description || '';
		
		// 检查标题中的位置（用于完成判断 - 只需要猜中标题即可完成）
		// 使用大小写不敏感匹配
		const positions: number[] = [];
		for (let i = 0; i < targetTitle.length; i++) {
			if (targetTitle[i].toLowerCase() === normalizedForMatch) {
				positions.push(i);
			}
		}

		// 检查内容中是否有该字符（全局猜测，包括标题和内容）
		// 使用大小写不敏感匹配
		const foundInContent = targetContent.toLowerCase().includes(normalizedForMatch);
		
		// 如果字符在标题或内容中，都算找到
		// 这样字符会在标题和内容的所有位置都显示
		const isFound = positions.length > 0 || foundInContent;

		// 更新游戏记录
		const revealedChars = gameRecord
			? (gameRecord.revealedChars as string[])
			: [];
		
		const guesses = gameRecord
			? (gameRecord.guesses as Array<{ char: string; positions: number[]; timestamp: string }>)
			: [];

		// 检查是否已经猜过这个字符（大小写不敏感）
		const alreadyGuessed = guesses.some(g => g.char.toLowerCase() === normalizedForMatch);
		if (alreadyGuessed) {
			return NextResponse.json(
				{ error: 'Character already guessed' },
				{ status: 400 }
			);
		}

		// 如果找到且未在已揭示字符中（大小写不敏感检查），添加到已揭示列表
		// 保存原始字符，但匹配时使用小写
		const alreadyRevealed = revealedChars.some(c => c.toLowerCase() === normalizedForMatch);
		if (isFound && !alreadyRevealed) {
			// 保存原始字符（保留大小写）
			revealedChars.push(normalizedChar);
		}

		// 添加猜测历史（无论是否找到都记录）
		guesses.push({
			char: normalizedChar, // 保存原始字符
			positions,
			timestamp: new Date().toISOString()
		});

		const guessCount = guesses.length;

		// 检查是否完成
		// 注意：只需要第一行（标题）的所有非标点字符都已揭示即可完成
		// 内容中的字符不需要全部猜中
		// 使用大小写不敏感匹配
		const isCompleted = checkCompletion(targetTitle, revealedChars);

		// 更新数据库（如果用户已登录）
		if (userId && gameRecord) {
			await prisma.baikeGameRecord.update({
				where: { id: gameRecord.id },
				data: {
					guessCount,
					isCompleted,
					completedAt: isCompleted ? new Date() : null,
					guesses,
					revealedChars
				}
			});
		} else if (!userId) {
			// 匿名用户：状态只保存在本地存储（前端处理）
			// 这里返回状态，让前端保存
		}

		return NextResponse.json({
			success: true,
			data: {
				positions,
				isFound,
				guessCount,
				isCompleted,
				revealedChars
			}
		});
	} catch (error: any) {
		log.error('提交猜测失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '提交猜测失败' },
			{ status: 500 }
		);
	}
}

/**
 * 检查游戏是否完成
 * 使用大小写不敏感匹配
 */
function checkCompletion(targetTitle: string, revealedChars: string[]): boolean {
	// 将已揭示字符转换为小写集合用于匹配
	const revealedSet = new Set(revealedChars.map(c => c.toLowerCase()));
	
	for (const char of targetTitle) {
		if (!isPunctuation(char)) {
			// 使用大小写不敏感匹配
			if (!revealedSet.has(char.toLowerCase())) {
				return false;
			}
		}
	}
	
	return true;
}

/**
 * 判断字符是否为标点符号
 */
function isPunctuation(char: string): boolean {
	const chinesePunctuation = /[《》【】「」『』，。、；：！？…—～（）【】]/;
	const englishPunctuation = /[,.!?;:()\[\]{}'"-]/;
	return chinesePunctuation.test(char) || englishPunctuation.test(char);
}

