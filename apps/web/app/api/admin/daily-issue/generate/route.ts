import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { routeAiCall } from '@/lib/ai/router';
import { readSession } from '@/lib/auth/session';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueGenerateAPI');

/**
 * AI生成每日议题
 * POST /api/admin/daily-issue/generate
 * 
 * 请求体：
 * {
 *   topic: string, // 议题主题（如"城市交通拥堵"）
 *   category?: string, // 分类
 *   difficulty?: number // 难度1-5
 * }
 */
export async function POST(req: NextRequest) {
	try {
		await requireAdmin();
		const session = await readSession();
		const userId = session?.userId || 'admin';

		const body = await req.json();
		const { topic, category, difficulty = 3 } = body;

		if (!topic) {
			return NextResponse.json(
				{ error: 'Missing required field: topic' },
				{ status: 400 }
			);
		}

		// 构建AI提示词
		const prompt = buildGenerationPrompt(topic, category, difficulty);

		log.info('开始AI生成议题', { topic, category, difficulty });

		// 调用AI生成（使用routeAiCall的正确签名）
		// 生成完整议题需要较多token，估算成本较高
		const result = await routeAiCall({
			userId: userId || null,
			task: 'summarize', // 使用现有任务类型
			estimatedMaxCostCents: 300, // 估算成本（生成完整议题需要更多token，约3元）
			prompt
		});

		// 检查AI返回的是否是占位文本或错误信息
		if (result.text.includes('任务超过单次成本上限') || 
		    result.text.includes('已降级为占位') ||
		    result.text.length < 50) {
			throw new Error('AI任务被成本限制阻止或返回数据不完整。请检查环境变量 AI_JOB_COST_LIMIT_CENTS 的设置（建议设置为500或更高），或联系管理员提高限制。');
		}

		// 解析AI返回的JSON
		let generatedData;
		try {
			// 尝试提取JSON（可能包含markdown代码块）
			let jsonStr = result.text.trim();
			
			// 方法1: 尝试提取markdown代码块中的JSON
			const codeBlockMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
			if (codeBlockMatch && codeBlockMatch[1]) {
				jsonStr = codeBlockMatch[1].trim();
			} else {
				// 方法2: 尝试提取第一个完整的JSON对象（从第一个{到最后一个}）
				const firstBrace = result.text.indexOf('{');
				const lastBrace = result.text.lastIndexOf('}');
				if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
					jsonStr = result.text.substring(firstBrace, lastBrace + 1);
				} else {
					// 方法3: 尝试找到JSON对象（使用正则）
					const jsonMatch = result.text.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						jsonStr = jsonMatch[0];
					}
				}
			}
			
			// 如果仍然没有找到有效的JSON，抛出错误
			if (!jsonStr || jsonStr.length < 10) {
				throw new Error('无法从AI返回的文本中提取JSON数据。AI可能返回了非JSON格式的内容。');
			}
			
			// 清理可能的额外字符和注释
			jsonStr = jsonStr
				.replace(/^[^{]*/, '') // 移除开头的非JSON字符
				.replace(/[^}]*$/, '') // 移除结尾的非JSON字符
				.replace(/\/\*[\s\S]*?\*\//g, '') // 移除块注释
				.replace(/\/\/.*$/gm, '') // 移除行注释
				.trim();
			
			// 尝试修复不完整的JSON（如果以{开头但没有以}结尾）
			if (jsonStr.startsWith('{') && !jsonStr.endsWith('}')) {
				// 尝试找到最后一个完整的对象（通过计算大括号匹配）
				let braceCount = 0;
				let lastValidIndex = -1;
				for (let i = 0; i < jsonStr.length; i++) {
					if (jsonStr[i] === '{') braceCount++;
					if (jsonStr[i] === '}') {
						braceCount--;
						if (braceCount === 0) {
							lastValidIndex = i;
							break;
						}
					}
				}
				if (lastValidIndex > 0) {
					jsonStr = jsonStr.substring(0, lastValidIndex + 1);
				} else {
					// 如果找不到完整的对象，尝试添加缺失的结束括号（简单修复）
					// 注意：这可能不总是有效，但可以处理一些简单情况
					jsonStr = jsonStr + '}';
				}
			}
			
			// 尝试解析JSON
			generatedData = JSON.parse(jsonStr);
			
			// 验证生成的数据结构
			if (!generatedData.title || !generatedData.caseDescription) {
				throw new Error('AI返回的数据缺少标题或案例描述');
			}
			
			if (!Array.isArray(generatedData.nodes) || generatedData.nodes.length === 0) {
				throw new Error('AI返回的数据缺少节点或节点数组为空');
			}
			
			// 验证节点结构
			for (const node of generatedData.nodes) {
				if (!node.nodeKey || !node.title || !node.content || node.stage === undefined) {
					throw new Error(`节点结构不完整: ${node.nodeKey || 'unknown'}`);
				}
			}
			
			// 确保有根节点
			const rootNode = generatedData.nodes.find((n: any) => n.isRoot || n.stage === 0);
			if (!rootNode) {
				throw new Error('缺少根节点（阶段0）');
			}
			
		} catch (parseError) {
			log.error('AI返回数据解析失败', {
				error: parseError instanceof Error ? parseError.message : String(parseError),
				rawTextLength: result.text.length,
				rawTextPreview: result.text.substring(0, 500)
			});
			
			// 如果解析失败，返回详细错误信息
			return NextResponse.json({
				success: false,
				error: `AI返回数据格式错误: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				rawText: result.text.substring(0, 2000), // 只返回前2000字符，避免响应过大
				parseError: parseError instanceof Error ? parseError.message : String(parseError),
				hint: '请检查AI返回的JSON格式是否正确，或尝试重新生成'
			}, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			data: generatedData,
			usage: result.usage
		});
	} catch (error: any) {
		log.error('AI生成议题失败', error as Error);
		return NextResponse.json(
			{ 
				success: false,
				error: error.message || '生成失败' 
			},
			{ status: 500 }
		);
	}
}

/**
 * 构建AI生成提示词
 */
function buildGenerationPrompt(topic: string, category?: string, difficulty: number = 3): string {
	return `你是一个专业的公共议题思考游戏设计师。请为一个名为"${topic}"的议题设计一个完整的思考游戏。

要求：
1. 议题必须中立，不偏向任何立场
2. 每个阶段的问题要引导用户深入思考，而不是简单的是非判断
3. 选项要平衡，每个选项都有合理的理由和代价
4. 难度等级：${difficulty}/5（${getDifficultyDescription(difficulty)}）
${category ? `5. 分类：${category}` : ''}

请生成一个完整的JSON结构，包含以下内容：

{
  "title": "议题标题（简洁，20字以内）",
  "caseDescription": "阶段0的案例描述（200-300字，描述一个具体的公共问题场景，包含数据、不同群体的反应等）",
  "category": "${category || '社会'}",
  "difficulty": ${difficulty},
  "nodes": [
    {
      "stage": 0,
      "nodeKey": "stage0",
      "title": "案例呈现",
      "content": "（与caseDescription相同）",
      "isRoot": true,
      "order": 0
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionA",
      "title": "阶段1问题标题（如：你认为最值得优先关注的是？）",
      "content": "选项A的内容（如：直接后果 - 谁受影响）",
      "parentNodeKey": "stage0",
      "order": 0
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionB",
      "title": "阶段1问题标题（与选项A相同）",
      "content": "选项B的内容",
      "parentNodeKey": "stage0",
      "order": 1
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionC",
      "title": "阶段1问题标题（与选项A相同）",
      "content": "选项C的内容",
      "parentNodeKey": "stage0",
      "order": 2
    },
    // 继续生成阶段2-5的节点
    // 每个阶段应该有2-3个选项
    // 根据上一阶段的选择，下一阶段可以有不同的选项（分支）
    // 使用nextNodeKeys数组指定每个节点可以到达的下一个节点
  ]
}

重要规则：
1. 阶段1-5，每个阶段都要有2-3个选项
2. 节点之间要形成完整的决策树，每个路径都要能到达阶段5
3. 使用nodeKey作为唯一标识，格式如：stage{阶段号}_option{选项}
4. 每个节点需要指定nextNodeKeys数组，表示选择该选项后可以到达的下一个节点
5. 确保所有路径最终都能到达阶段5

请直接返回JSON，不要包含其他说明文字。确保JSON格式完全正确，可以直接被JSON.parse()解析。`;
}

function getDifficultyDescription(difficulty: number): string {
	const descriptions: Record<number, string> = {
		1: '简单 - 问题直接，选项明确',
		2: '较简单 - 需要基本思考',
		3: '中等 - 需要权衡多个因素',
		4: '较难 - 涉及复杂的价值判断',
		5: '困难 - 需要深入思考和多角度分析'
	};
	return descriptions[difficulty] || descriptions[3];
}

