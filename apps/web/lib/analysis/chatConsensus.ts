import { prisma } from '@/lib/db/client';
import { calculateSemanticSimilarity } from '@/lib/ai/semanticSimilarity';

export interface ConsensusPoint {
	messageId: string;
	content: string;
	confidence: number; // 0-1，共识度
	createdAt: string;
	participants: string[]; // 参与的用户ID列表
}

export interface DisagreementPoint {
	messageId1: string;
	messageId2: string;
	type: 'OPPOSITE' | 'DIFFERENT_VIEW' | 'CONTRADICTION';
	severity: number; // 0-1，严重程度
	reason: string;
	createdAt: string;
}

export interface ChatAnalysisResult {
	consensusPoints: ConsensusPoint[];
	consensusScore: number; // 0-1，整体共识度
	consensusTrend: Array<{ timestamp: string; score: number; count: number }>;
	disagreementPoints: DisagreementPoint[];
	divergenceScore: number; // 0-1，整体分歧度
	divergenceTrend: Array<{ timestamp: string; score: number; count: number }>;
	averageDepth: number;
	maxDepth: number;
	totalReferences: number;
	aiAdoptionRate: number;
	creatorMessageCount: number;
	participantMessageCount: number;
	creatorAiAdoptionCount: number;
	participantAiAdoptionCount: number;
	creatorAiSuggestionCount: number;
	participantAiSuggestionCount: number;
}

/**
 * 分析聊天室的共识和分歧
 * @param roomId 房间ID
 * @returns 分析结果
 */
export async function analyzeChatConsensus(roomId: string): Promise<ChatAnalysisResult> {
	console.log(`[ChatConsensus] 开始分析房间 ${roomId}`);

	// 获取房间信息
	const room = await prisma.chatRoom.findUnique({
		where: { id: roomId },
		select: {
			creatorId: true,
			participantId: true,
			type: true
		}
	});

	if (!room) {
		throw new Error('房间不存在');
	}

	// 只分析DUO房间
	if (room.type !== 'DUO') {
		return getDefaultAnalysisResult();
	}

	// 获取所有讨论消息（USER和AI_ADOPTED类型）
	const messages = await prisma.chatMessage.findMany({
		where: {
			roomId,
			contentType: { in: ['USER', 'AI_ADOPTED'] },
			deletedAt: null
		},
		include: {
			sender: { select: { id: true } },
			references: {
				include: {
					referencedMessage: {
						select: { id: true, senderId: true }
					}
				}
			}
		},
		orderBy: { sequence: 'asc' }
	});

	if (messages.length < 2) {
		return getDefaultAnalysisResult();
	}

	// 分析共识点
	const consensusPoints = await analyzeConsensusPoints(messages, room.creatorId, room.participantId!);

	// 分析分歧点
	const disagreementPoints = await analyzeDisagreementPoints(messages, room.creatorId, room.participantId!);

	// 计算共识度（基于共识点的数量和置信度）
	const consensusScore = calculateConsensusScore(consensusPoints, messages.length);

	// 计算分歧度（基于分歧点的数量和严重程度）
	const divergenceScore = calculateDivergenceScore(disagreementPoints, messages.length);

	// 计算引用深度
	const { averageDepth, maxDepth, totalReferences } = calculateReferenceDepth(messages);

	// 计算AI采纳率
	const aiAdoptionRate = calculateAiAdoptionRate(messages);

	// 统计参与度
	const {
		creatorMessageCount,
		participantMessageCount,
		creatorAiAdoptionCount,
		participantAiAdoptionCount,
		creatorAiSuggestionCount,
		participantAiSuggestionCount
	} = calculateParticipationStats(messages, room.creatorId, room.participantId!);

	// 生成趋势数据
	const consensusTrend = generateTrendData(consensusPoints);
	const divergenceTrend = generateTrendData(disagreementPoints);

	return {
		consensusPoints,
		consensusScore,
		consensusTrend,
		disagreementPoints,
		divergenceScore,
		divergenceTrend,
		averageDepth,
		maxDepth,
		totalReferences,
		aiAdoptionRate,
		creatorMessageCount,
		participantMessageCount,
		creatorAiAdoptionCount,
		participantAiAdoptionCount,
		creatorAiSuggestionCount,
		participantAiSuggestionCount
	};
}

/**
 * 分析共识点
 */
async function analyzeConsensusPoints(
	messages: any[],
	creatorId: string,
	participantId: string
): Promise<ConsensusPoint[]> {
	const consensusPoints: ConsensusPoint[] = [];

	// 遍历消息对，寻找相似的观点
	for (let i = 0; i < messages.length; i++) {
		for (let j = i + 1; j < messages.length; j++) {
			const msg1 = messages[i];
			const msg2 = messages[j];

			// 只分析不同用户的消息
			if (msg1.senderId === msg2.senderId) continue;

			// 计算语义相似度
			try {
				const similarity = await calculateSemanticSimilarity(msg1.content, msg2.content);
				
				// 如果相似度 > 0.7，认为是共识点
				if (similarity > 0.7) {
					consensusPoints.push({
						messageId: msg1.id, // 使用第一条消息的ID
						content: msg1.content.substring(0, 200), // 截取前200字符
						confidence: similarity,
						createdAt: msg1.createdAt.toISOString(),
						participants: [msg1.senderId, msg2.senderId]
					});
				}
			} catch (error) {
				console.error('[ChatConsensus] 计算相似度失败:', error);
				// 继续处理其他消息对
			}
		}
	}

	return consensusPoints;
}

/**
 * 分析分歧点
 */
async function analyzeDisagreementPoints(
	messages: any[],
	creatorId: string,
	participantId: string
): Promise<DisagreementPoint[]> {
	const disagreementPoints: DisagreementPoint[] = [];

	// 遍历消息对，寻找分歧
	for (let i = 0; i < messages.length; i++) {
		for (let j = i + 1; j < messages.length; j++) {
			const msg1 = messages[i];
			const msg2 = messages[j];

			// 只分析不同用户的消息
			if (msg1.senderId === msg2.senderId) continue;

			// 检查是否有引用关系（引用通常表示回应或分歧）
			const hasReference = msg2.references?.some(
				(ref: any) => ref.referencedMessage.id === msg1.id
			);

			if (hasReference) {
				// 计算语义相似度
				try {
					const similarity = await calculateSemanticSimilarity(msg1.content, msg2.content);
					
					// 如果相似度 < 0.3，认为是分歧点
					if (similarity < 0.3) {
						disagreementPoints.push({
							messageId1: msg1.id,
							messageId2: msg2.id,
							type: similarity < 0.1 ? 'OPPOSITE' : 'DIFFERENT_VIEW',
							severity: 1 - similarity, // 相似度越低，严重程度越高
							reason: `观点差异较大（相似度: ${(similarity * 100).toFixed(1)}%）`,
							createdAt: msg2.createdAt.toISOString()
						});
					}
				} catch (error) {
					console.error('[ChatConsensus] 计算相似度失败:', error);
				}
			}
		}
	}

	return disagreementPoints;
}

/**
 * 计算共识度
 */
function calculateConsensusScore(consensusPoints: ConsensusPoint[], totalMessages: number): number {
	if (totalMessages < 2) return 0.5;

	// 基于共识点的数量和置信度计算
	const totalConfidence = consensusPoints.reduce((sum, point) => sum + point.confidence, 0);
	const maxPossiblePoints = (totalMessages * (totalMessages - 1)) / 2;
	
	if (maxPossiblePoints === 0) return 0.5;
	
	// 归一化到0-1
	const score = Math.min(1, totalConfidence / (maxPossiblePoints * 0.7)); // 0.7是阈值
	return score;
}

/**
 * 计算分歧度
 */
function calculateDivergenceScore(disagreementPoints: DisagreementPoint[], totalMessages: number): number {
	if (totalMessages < 2) return 0.5;

	const totalSeverity = disagreementPoints.reduce((sum, point) => sum + point.severity, 0);
	const maxPossiblePoints = (totalMessages * (totalMessages - 1)) / 2;
	
	if (maxPossiblePoints === 0) return 0.5;
	
	const score = Math.min(1, totalSeverity / (maxPossiblePoints * 0.3)); // 0.3是阈值
	return score;
}

/**
 * 计算引用深度
 */
function calculateReferenceDepth(messages: any[]): {
	averageDepth: number;
	maxDepth: number;
	totalReferences: number;
} {
	let totalDepth = 0;
	let maxDepth = 0;
	let totalReferences = 0;

	messages.forEach((msg) => {
		if (msg.references && msg.references.length > 0) {
			totalReferences += msg.references.length;
			// 简单的深度计算：引用链的长度
			const depth = msg.references.length;
			totalDepth += depth;
			maxDepth = Math.max(maxDepth, depth);
		}
	});

	const averageDepth = totalReferences > 0 ? totalDepth / totalReferences : 0;

	return { averageDepth, maxDepth, totalReferences };
}

/**
 * 计算AI采纳率
 */
function calculateAiAdoptionRate(messages: any[]): number {
	const aiSuggestions = messages.filter((m) => m.contentType === 'AI_SUGGESTION').length;
	const aiAdopted = messages.filter((m) => m.contentType === 'AI_ADOPTED').length;

	if (aiSuggestions === 0) return 0;
	return aiAdopted / aiSuggestions;
}

/**
 * 统计参与度
 */
function calculateParticipationStats(
	messages: any[],
	creatorId: string,
	participantId: string
) {
	let creatorMessageCount = 0;
	let participantMessageCount = 0;
	let creatorAiAdoptionCount = 0;
	let participantAiAdoptionCount = 0;
	let creatorAiSuggestionCount = 0;
	let participantAiSuggestionCount = 0;

	messages.forEach((msg) => {
		if (msg.senderId === creatorId) {
			if (msg.contentType === 'USER' || msg.contentType === 'AI_ADOPTED') {
				creatorMessageCount++;
			}
			if (msg.contentType === 'AI_ADOPTED') {
				creatorAiAdoptionCount++;
			}
			if (msg.contentType === 'AI_SUGGESTION') {
				creatorAiSuggestionCount++;
			}
		} else if (msg.senderId === participantId) {
			if (msg.contentType === 'USER' || msg.contentType === 'AI_ADOPTED') {
				participantMessageCount++;
			}
			if (msg.contentType === 'AI_ADOPTED') {
				participantAiAdoptionCount++;
			}
			if (msg.contentType === 'AI_SUGGESTION') {
				participantAiSuggestionCount++;
			}
		}
	});

	return {
		creatorMessageCount,
		participantMessageCount,
		creatorAiAdoptionCount,
		participantAiAdoptionCount,
		creatorAiSuggestionCount,
		participantAiSuggestionCount
	};
}

/**
 * 生成趋势数据
 */
function generateTrendData(
	points: Array<{ createdAt: string; confidence?: number; severity?: number }>
): Array<{ timestamp: string; score: number; count: number }> {
	// 按时间分组（每小时一组）
	const timeGroups = new Map<string, { total: number; count: number }>();

	points.forEach((point) => {
		const date = new Date(point.createdAt);
		const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00:00Z`;
		
		const score = point.confidence !== undefined ? point.confidence : (point.severity !== undefined ? point.severity : 0);
		
		if (!timeGroups.has(hourKey)) {
			timeGroups.set(hourKey, { total: 0, count: 0 });
		}
		
		const group = timeGroups.get(hourKey)!;
		group.total += score;
		group.count += 1;
	});

	// 转换为趋势数组
	return Array.from(timeGroups.entries())
		.map(([timestamp, { total, count }]) => ({
			timestamp,
			score: count > 0 ? total / count : 0,
			count
		}))
		.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * 获取默认分析结果
 */
function getDefaultAnalysisResult(): ChatAnalysisResult {
	return {
		consensusPoints: [],
		consensusScore: 0.5,
		consensusTrend: [],
		disagreementPoints: [],
		divergenceScore: 0.5,
		divergenceTrend: [],
		averageDepth: 0,
		maxDepth: 0,
		totalReferences: 0,
		aiAdoptionRate: 0,
		creatorMessageCount: 0,
		participantMessageCount: 0,
		creatorAiAdoptionCount: 0,
		participantAiAdoptionCount: 0,
		creatorAiSuggestionCount: 0,
		participantAiSuggestionCount: 0
	};
}

