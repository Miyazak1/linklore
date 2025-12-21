import { routeAiCall } from '@/lib/ai/router';
import { prisma } from '@/lib/db/client';

export interface ModerationResult {
	status: 'SAFE' | 'WARNING' | 'BLOCKED';
	score: number; // 0-1，偏离度评分（1表示严重偏离）
	note: string; // 监督AI的提醒内容
	details: {
		// 主题相关
		topicDrift?: string; // 主题偏离说明
		topicUnclear?: string; // 主题不明确说明
		
		// 事实与前提相关
		premiseError?: string; // 前提错误说明（第5条）
		premiseUnclear?: string; // 前提不明确说明（第5条）
		factSpeculationConfusion?: string; // 事实与推测混淆说明（第4条）
		
		// 推理相关
		logicalFallacies?: string[]; // 逻辑谬误列表（第6条）
		reasoningChainBreak?: string; // 推理链条断裂说明（第6条）
		
		// 表达方式相关
		emotionalExpression?: string; // 情绪化表达说明（第7条）
		emotionalEscalation?: string; // 情绪升级预警（第8条）
		disrespectfulContent?: string; // 不尊重内容说明（第7条）
		
		// 分歧处理相关
		disagreementType?: string; // 分歧类型（第9条）：事实层/概念定义/推理链/价值取向
		consensusConflict?: string; // 与已锁定共识冲突说明（第10条）
		
		// AI回答相关（如果是AI生成内容）
		aiFactualError?: string; // AI事实错误（第12条）
		aiEmotionalTone?: string; // AI情绪化语气（第13条）
		aiValueJudgment?: string; // AI价值裁决（第14条）
		aiConsensusBlocking?: string; // AI阻碍共识（第15条）
		
		// 改进建议
		suggestions?: string[]; // 改进建议（具体、可操作）
	};
}

/**
 * 监督AI：分析消息是否偏离话题、存在逻辑谬误或事实错误
 * @param messageId 消息ID
 * @param roomId 房间ID
 * @returns 监督分析结果
 */
export async function moderateMessage(
	messageId: string,
	roomId: string
): Promise<ModerationResult> {
	console.log(`[Moderation] 开始分析消息 ${messageId}，房间 ${roomId}`);

	// 获取消息和房间信息
	const message = await prisma.chatMessage.findUnique({
		where: { id: messageId },
		include: {
			sender: { select: { id: true, email: true, name: true } },
			room: {
				include: {
					creator: { select: { id: true, email: true, name: true } },
					participant: { select: { id: true, email: true, name: true } }
				}
			}
		}
	});

	if (!message) {
		throw new Error('消息不存在');
	}

	// 获取房间内的所有讨论消息（用于上下文）
	const discussionMessages = await prisma.chatMessage.findMany({
		where: {
			roomId,
			contentType: { in: ['USER', 'AI_SUGGESTION', 'AI_ADOPTED'] }, // 包含所有讨论消息
			deletedAt: null
		},
		include: {
			sender: { select: { id: true, email: true, name: true } }
		},
		orderBy: { sequence: 'asc' },
		take: 30 // 最近30条消息作为上下文（需要更多上下文以判断主题和共识）
	});

	// 获取已锁定的共识点（从ChatAnalysis中获取）
	const analysis = await prisma.chatAnalysis.findUnique({
		where: { roomId },
		select: { consensusPoints: true }
	});
	
	const lockedConsensus = analysis?.consensusPoints 
		? (Array.isArray(analysis.consensusPoints) ? analysis.consensusPoints : [])
		: [];

	// 构建讨论上下文
	const discussionContext = discussionMessages
		.map((m) => {
			const senderName = m.sender.name || m.sender.email;
			const messageType = m.contentType === 'AI_SUGGESTION' ? '[AI建议]' : 
			                   m.contentType === 'AI_ADOPTED' ? '[AI已采纳]' : '[用户]';
			return `${messageType}[${senderName}]: ${m.content}`;
		})
		.join('\n\n');
	
	// 提取讨论主题（从最近的消息中推断）
	const recentUserMessages = discussionMessages
		.filter(m => m.contentType === 'USER' || m.contentType === 'AI_ADOPTED')
		.slice(-10)
		.map(m => m.content)
		.join(' ');
	
	// 判断是否是AI生成的内容
	const isAiGenerated = message.contentType === 'AI_SUGGESTION' || message.contentType === 'AI_ADOPTED';

	// 构建监督AI提示词（完全按照《双人讨论宪章》）
	const prompt = `你是系统内的监督AI，必须严格按照《双人讨论宪章》执行监督职责。

**讨论房间信息**：
- 创建者：${message.room.creator.name || message.room.creator.email}
- 参与者：${message.room.participant?.name || message.room.participant?.email || '无'}

**讨论上下文**（最近30条消息）：
${discussionContext || '（暂无讨论内容）'}

**已锁定的共识点**（第12条：阶段性共识锁定）：
${lockedConsensus.length > 0 
	? JSON.stringify(lockedConsensus, null, 2)
	: '（暂无锁定共识）'}

**待分析的消息**：
发送者：${message.sender.name || message.sender.email}
消息类型：${isAiGenerated ? 'AI生成内容' : '用户发言'}
内容：${message.content}

**《双人讨论宪章》核心原则**：

**第一章：总目标与基本原则**
- 讨论目的：澄清事实与前提、促进理解与协调、最终达成可共同接受的共识
- 合作精神：讨论是合作性活动，非竞争或攻击
- AI从属性：AI必须服务于讨论目的，不能代替用户做最终判断

**第二章：事实、前提与推理**
- 第4条：必须区分"已确认的事实"、"未确认的推测"、"价值判断与个人偏好"
- 第5条：前提明确义务 - 必须说明观点依赖的前提，禁止在不明前提上继续推论
- 第6条：推理链条要求 - 禁止偷换概念、跳步推理、以偏概全、稻草人论证、情绪替代推理

**第三章：表达方式与情绪管理**
- 第7条：理性表达义务 - 观点清晰、不得侮辱/讽刺/贬低、不得以情绪替代事实、不得攻击性假设
- 第8条：情绪升级预警 - 当出现指责/归罪/标签化、情绪负荷增加、目的转为证明对方错误时，必须启动"降级模式"

**第四章：分歧处理与共识机制**
- 第9条：分歧拆分原则 - 必须拆分为：事实层分歧、概念定义分歧、推理链分歧、价值取向分歧
- 第10条：阶段性共识锁定 - 双方确认的事实/定义/前提必须被记录；推翻锁定共识必须先提供理由
- 第11条：可分歧结论原则 - 允许形成"明确标注的分歧点"，不强求绝对一致

${isAiGenerated ? `**第五章：AI辅助回答规范（本条消息是AI生成，需严格检查）**
- 第12条：AI不得制造虚假事实 - 不得虚构事实、编造数据、未标注的不确定推论
- 第13条：AI不得情绪化 - 语气必须中立、冷静、建设性
- 第14条：AI不得参与价值裁决 - 不得对用户谁"更正确"做裁定
- 第15条：AI必须促进共识形成 - 必须提高清晰度、降低冲突、增强可理解性、促进问题收敛` : ''}

**第六章：监督AI的权限与责任**
- 第16条：监督权 - 可标注逻辑错误、拦截不符合宪章的AI回答、降级情绪对话、要求澄清前提、要求结构化表达、协助记录共识点与分歧点
- 第17条：公正中立原则 - 无立场偏向、无情绪态度、不得协助任何一方"赢得讨论"、仅就"表达与逻辑质量"进行监督
- 第18条：最低干预原则 - 仅在偏离发生时介入，不改变双方讨论意图，仅恢复秩序

**分析任务**（按优先级）：

1. **主题明确性与偏离检测**（第4-5条）
   - 检查主题是否明确
   - 检查是否偏离核心问题
   - 识别无根据的旁枝观点
   - 识别转向动机/身份/情绪的非议题内容

2. **前提验证**（第7条，最高优先级）
   - 检查前提是否明确
   - 检查前提是否正确
   - 如果前提错误且影响整个论证，必须标记为BLOCKED

2. **事实与假设区分**（第4条）
   - 识别混淆"已确认事实"、"未确认推测"、"价值判断"的情况
   - 要求明确标注

3. **推理链条检查**（第6条）
   - 识别偷换概念、跳步推理、以偏概全、稻草人论证、情绪替代推理
   - 检查推理链条是否完整

4. **理性表达检查**（第7条）
   - 识别侮辱、讽刺、贬低性词汇
   - 识别以情绪表达替代事实或推理
   - 识别攻击性假设

5. **情绪升级预警**（第8条）
   - 检测指责、归罪、标签化
   - 检测情绪负荷明显增加
   - 检测发言目的转为证明对方错误而非推进讨论
   - 如果出现，必须启动"降级模式"，标记为WARNING或BLOCKED

6. **分歧拆分**（第9条）
   - 识别分歧类型：事实层/概念定义/推理链/价值取向
   - 避免不同类别分歧混为一谈

7. **共识冲突检查**（第10条）
   - 检查是否与已锁定的共识冲突
   - 如果冲突且无理由，必须提示

${isAiGenerated ? `8. **AI回答规范检查**（第12-15条，仅对AI生成内容）
   - 检查是否制造虚假事实
   - 检查是否情绪化
   - 检查是否参与价值裁决
   - 检查是否阻碍共识形成` : ''}

**评分标准**：
- 0.0-0.3：安全（消息正常，符合宪章要求）
- 0.4-0.6：警告（轻微违反宪章，需要提醒改进）
- 0.7-1.0：阻止（严重违反宪章，阻碍共识达成，必须阻止）

**请用JSON格式返回分析结果**：
{
  "status": "SAFE" | "WARNING" | "BLOCKED",
  "score": 0.0-1.0,
  "note": "监督AI的提醒内容（如果有问题，清晰、友好地说明具体违反了宪章哪一条，如何改进；如果安全，可以简短说明）",
  "details": {
    "premiseError": "前提错误说明（第5条，如果前提错误）",
    "premiseUnclear": "前提不明确说明（第5条，如果前提未明）",
    "factSpeculationConfusion": "事实与推测混淆说明（第4条，如果混淆）",
    "logicalFallacies": ["逻辑谬误1（第6条）", "逻辑谬误2"],
    "reasoningChainBreak": "推理链条断裂说明（第6条，如果断裂）",
    "emotionalExpression": "情绪化表达说明（第7条，如果存在）",
    "emotionalEscalation": "情绪升级预警（第8条，如果检测到升级）",
    "disrespectfulContent": "不尊重内容说明（第7条，如果存在）",
    "disagreementType": "分歧类型（第9条）：事实层/概念定义/推理链/价值取向",
    "consensusConflict": "与已锁定共识冲突说明（第10条，如果冲突）",
    ${isAiGenerated ? `"aiFactualError": "AI事实错误（第12条，如果存在）",
    "aiEmotionalTone": "AI情绪化语气（第13条，如果存在）",
    "aiValueJudgment": "AI价值裁决（第14条，如果存在）",
    "aiConsensusBlocking": "AI阻碍共识（第15条，如果存在）",` : ''}
    "suggestions": ["改进建议1（具体、可操作，引用宪章条款）", "改进建议2"]
  }
}

**重要说明**：
- 如果消息正常，status应为"SAFE"，score应<0.3
- 如果存在轻微问题，status应为"WARNING"，score应在0.4-0.6之间
- 如果存在严重问题（特别是前提错误、严重情绪化、阻碍共识、AI违反规范），status应为"BLOCKED"，score应>0.7
- note应该清晰、友好地说明问题，引用宪章具体条款，帮助用户改进讨论质量，引导用户回到事实和共识的轨道
- 对于前提错误，要明确指出错误的前提是什么，并提供正确的前提建议
- 对于情绪化表达，要引导用户用事实和证据表达观点
- 对于AI生成内容，必须严格按照第12-15条检查
- 必须保持公正中立，不得偏向任何一方`;

	try {
		// 调用AI（使用系统AI，因为这是官方监督功能）
		const aiResponse = await routeAiCall({
			userId: message.senderId,
			task: 'moderate',
			estimatedMaxCostCents: 10,
			prompt
		});

		// 解析AI响应
		let result: ModerationResult;
		try {
			const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				result = {
					status: parsed.status || 'SAFE',
					score: Math.max(0, Math.min(1, parsed.score || 0)),
					note: parsed.note || '',
					details: {
						// 主题相关
						topicDrift: parsed.details?.topicDrift,
						topicUnclear: parsed.details?.topicUnclear,
						
						// 事实与前提相关
						premiseError: parsed.details?.premiseError,
						premiseUnclear: parsed.details?.premiseUnclear,
						factSpeculationConfusion: parsed.details?.factSpeculationConfusion,
						
						// 推理相关
						logicalFallacies: Array.isArray(parsed.details?.logicalFallacies)
							? parsed.details.logicalFallacies
							: [],
						reasoningChainBreak: parsed.details?.reasoningChainBreak,
						
						// 表达方式相关
						emotionalExpression: parsed.details?.emotionalExpression,
						emotionalEscalation: parsed.details?.emotionalEscalation,
						disrespectfulContent: parsed.details?.disrespectfulContent,
						
						// 分歧处理相关
						disagreementType: parsed.details?.disagreementType,
						consensusConflict: parsed.details?.consensusConflict,
						
						// AI回答相关（如果是AI生成内容）
						aiFactualError: isAiGenerated ? parsed.details?.aiFactualError : undefined,
						aiEmotionalTone: isAiGenerated ? parsed.details?.aiEmotionalTone : undefined,
						aiValueJudgment: isAiGenerated ? parsed.details?.aiValueJudgment : undefined,
						aiConsensusBlocking: isAiGenerated ? parsed.details?.aiConsensusBlocking : undefined,
						
						// 改进建议
						suggestions: Array.isArray(parsed.details?.suggestions)
							? parsed.details.suggestions
							: []
					}
				};
			} else {
				throw new Error('AI返回格式不正确');
			}
		} catch (err: any) {
			console.error('[Moderation] 解析AI响应失败:', err);
			// 默认返回安全状态
			result = {
				status: 'SAFE',
				score: 0,
				note: '分析失败，默认标记为安全',
				details: {}
			};
		}

		// 更新消息的监督状态
		await prisma.chatMessage.update({
			where: { id: messageId },
			data: {
				moderationStatus: result.status,
				moderationNote: result.note,
				moderationScore: result.score,
				moderationDetails: result.details as any
			}
		});

		// 更新房间的分析统计
		await updateRoomAnalysisStats(roomId, result, message.senderId);

		console.log(`[Moderation] 分析完成: ${messageId}, status: ${result.status}, score: ${result.score}`);

		return result;
	} catch (error: any) {
		console.error('[Moderation] 分析失败:', error);
		// 出错时返回安全状态，不阻止消息
		return {
			status: 'SAFE',
			score: 0,
			note: '分析失败，默认标记为安全',
			details: {}
		};
	}
}

/**
 * 更新房间的分析统计
 */
async function updateRoomAnalysisStats(
	roomId: string,
	result: ModerationResult,
	senderId: string
) {
	try {
		// 获取或创建分析记录
		const room = await prisma.chatRoom.findUnique({
			where: { id: roomId },
			select: { creatorId: true, participantId: true }
		});

		if (!room) return;

		const analysis = await prisma.chatAnalysis.upsert({
			where: { roomId },
			update: {
				totalWarnings: result.status === 'WARNING' ? { increment: 1 } : undefined,
				blockedMessages: result.status === 'BLOCKED' ? { increment: 1 } : undefined,
				creatorWarnings:
					result.status === 'WARNING' && senderId === room.creatorId ? { increment: 1 } : undefined,
				participantWarnings:
					result.status === 'WARNING' && senderId === room.participantId ? { increment: 1 } : undefined,
				lastAnalyzedAt: new Date()
			},
			create: {
				roomId,
				consensusPoints: [],
				consensusScore: 0,
				consensusTrend: [],
				disagreementPoints: [],
				divergenceScore: 0,
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
				participantAiSuggestionCount: 0,
				totalWarnings: result.status === 'WARNING' ? 1 : 0,
				blockedMessages: result.status === 'BLOCKED' ? 1 : 0,
				creatorWarnings:
					result.status === 'WARNING' && senderId === room.creatorId ? 1 : 0,
				participantWarnings:
					result.status === 'WARNING' && senderId === room.participantId ? 1 : 0,
				lastAnalyzedAt: new Date()
			}
		});
	} catch (error) {
		console.error('[Moderation] 更新分析统计失败:', error);
	}
}

