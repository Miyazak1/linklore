/**
 * 溯源AI分析逻辑
 * 评估溯源的可信度、完整性、准确性和来源质量
 */

import { prisma } from '@/lib/db/client';
import { routeAiCall } from '@/lib/ai/router';
import { TRACE_PROCESSING_CONFIG } from '@/lib/config/trace-processing';
import { updateTraceStatus } from './traceStateMachine';
import crypto from 'crypto';

export interface TraceAnalysisResult {
	credibilityScore: number;
	completenessScore?: number;
	accuracyScore?: number;
	sourceQualityScore?: number;
	analysis: any;
	strengths: string[];
	weaknesses: string[];
	missingAspects: string[];
	sourceEvaluation: any;
	conflicts?: any;
	suggestions: string[];
	canApprove: boolean;
}

/**
 * 计算内容hash（用于缓存）
 */
function calculateContentHash(trace: { body: string; citations: any[] }): string {
	const content = JSON.stringify({
		body: trace.body,
		citations: trace.citations.map((c: any) => ({
			url: c.url,
			title: c.title,
			quote: c.quote
		}))
	});
	return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 分析溯源
 * @param traceId 溯源ID
 * @returns 分析结果
 */
export async function analyzeTrace(traceId: string): Promise<TraceAnalysisResult> {
	// 获取溯源
	const trace = await prisma.trace.findUnique({
		where: { id: traceId },
		include: {
			citationsList: {
				orderBy: { order: 'asc' }
			}
		}
	});

	if (!trace) {
		throw new Error('溯源不存在');
	}

	if (trace.status !== 'PUBLISHED' && trace.status !== 'ANALYZING') {
		throw new Error('只能分析已发布的溯源');
	}

	// 检查是否有缓存的分析结果（基于内容hash）
	const { calculateContentHash, getCachedAnalysis } = await import('./traceAnalysisCache');
	const contentHash = calculateContentHash(trace.body, trace.citationsList);

	// 尝试获取缓存的分析结果
	const cachedAnalysis = await getCachedAnalysis(traceId, contentHash);
	if (cachedAnalysis) {
		// 如果内容未变化，直接返回缓存的分析结果
		return {
			credibilityScore: cachedAnalysis.credibilityScore,
			completenessScore: cachedAnalysis.completenessScore,
			accuracyScore: cachedAnalysis.accuracyScore,
			sourceQualityScore: cachedAnalysis.sourceQualityScore,
			strengths: cachedAnalysis.strengths as string[],
			weaknesses: cachedAnalysis.weaknesses as string[],
			missingAspects: cachedAnalysis.missingAspects as string[],
			suggestions: cachedAnalysis.suggestions as string[],
			canApprove: cachedAnalysis.canApprove,
			analysis: cachedAnalysis.analysis
		};
	}

	// 更新状态为ANALYZING
	await updateTraceStatus(traceId, 'ANALYZING', trace.editorId);

	try {
		// 构建AI Prompt
		const citationsText = trace.citationsList
			.map((c, idx) => {
				return `[${idx + 1}] ${c.title}${c.author ? ` - ${c.author}` : ''}${c.year ? ` (${c.year})` : ''}${c.url ? `\n    URL: ${c.url}` : ''}${c.publisher ? `\n    出版机构: ${c.publisher}` : ''}${c.quote ? `\n    引用片段: ${c.quote}` : ''}`;
			})
			.join('\n\n');

		const prompt = `你是一位专业的学术评估专家。请对以下语义溯源进行多维度评估。

**溯源目标**：${trace.target}
**溯源类型**：${trace.traceType}

**正文内容**：
${trace.body.slice(0, 8000)}${trace.body.length > 8000 ? '\n...(内容已截断)' : ''}

**引用列表**：
${citationsText}

**评估维度**：
1. **可信度（Credibility）**（0-1分，核心指标）：
   - 评估溯源内容的可信程度
   - 考虑：来源权威性、证据充分性、逻辑严密性、是否存在明显错误或偏见
   - 0.0-0.3：不可信（存在明显错误、来源不可靠、逻辑混乱）
   - 0.4-0.6：部分可信（有一定依据但不够充分）
   - 0.7-0.8：可信（依据充分、逻辑清晰）
   - 0.9-1.0：高度可信（来源权威、证据充分、逻辑严密）

2. **完整性（Completeness）**（0-1分）：
   - 评估溯源是否充分还原了目标概念/事件/事实
   - 考虑：是否覆盖主要方面、是否遗漏关键信息、是否足够深入
   - 0.0-0.3：不完整（遗漏大量关键信息）
   - 0.4-0.6：部分完整（覆盖主要方面但不够深入）
   - 0.7-0.8：较完整（覆盖主要方面且有一定深度）
   - 0.9-1.0：完整（全面覆盖且深入）

3. **准确性（Accuracy）**（0-1分）：
   - 评估溯源内容的准确性
   - 考虑：事实准确性、引用准确性、表述准确性
   - 0.0-0.3：不准确（存在明显错误）
   - 0.4-0.6：部分准确（基本准确但有小错误）
   - 0.7-0.8：准确（基本无误）
   - 0.9-1.0：高度准确（完全准确）

4. **来源质量（Source Quality）**（0-1分）：
   - 评估引用的来源质量
   - 考虑：来源权威性、多样性、相关性、时效性
   - 0.0-0.3：来源质量差（来源不可靠、不相关）
   - 0.4-0.6：来源质量一般（部分可靠但不够多样）
   - 0.7-0.8：来源质量良好（来源可靠且相关）
   - 0.9-1.0：来源质量优秀（来源权威、多样、相关、时效性好）

**请用JSON格式返回评估结果，格式如下**：
{
  "credibilityScore": 0.85,
  "completenessScore": 0.78,
  "accuracyScore": 0.82,
  "sourceQualityScore": 0.75,
  "analysis": {
    "credibility": "详细说明可信度评估的理由（至少100字）",
    "completeness": "详细说明完整性评估的理由（至少100字）",
    "accuracy": "详细说明准确性评估的理由（至少100字）",
    "sourceQuality": "详细说明来源质量评估的理由（至少100字）"
  },
  "strengths": ["优点1", "优点2", "优点3"],
  "weaknesses": ["不足1", "不足2"],
  "missingAspects": ["缺失的方面1", "缺失的方面2"],
  "sourceEvaluation": {
    "authority": "来源权威性评估",
    "diversity": "来源多样性评估",
    "relevance": "来源相关性评估",
    "timeliness": "来源时效性评估"
  },
  "conflicts": {
    "hasConflicts": false,
    "conflictDetails": []
  },
  "suggestions": ["改进建议1", "改进建议2"],
  "canApprove": true
}

**重要说明**：
- 可信度评分是核心指标，如果可信度 < 0.7，canApprove 应为 false
- 请仔细评估每个维度，给出详细的评估理由
- 如果发现来源之间的冲突，请在conflicts中详细说明
- 改进建议应具体、可操作`;

		// 调用AI（设置超时）
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('分析超时')), TRACE_PROCESSING_CONFIG.AI_ANALYSIS.TIMEOUT_MS);
		});

		const aiCallPromise = routeAiCall({
			userId: trace.editorId,
			task: 'evaluate',
			estimatedMaxCostCents: 50,
			prompt
		});

		const result = await Promise.race([aiCallPromise, timeoutPromise]);

		// 解析AI响应
		let analysisResult: TraceAnalysisResult;

		try {
			const jsonMatch = result.text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				analysisResult = {
					credibilityScore: Math.max(0, Math.min(1, parsed.credibilityScore || 0)),
					completenessScore: parsed.completenessScore ? Math.max(0, Math.min(1, parsed.completenessScore)) : undefined,
					accuracyScore: parsed.accuracyScore ? Math.max(0, Math.min(1, parsed.accuracyScore)) : undefined,
					sourceQualityScore: parsed.sourceQualityScore ? Math.max(0, Math.min(1, parsed.sourceQualityScore)) : undefined,
					analysis: parsed.analysis || {},
					strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
					weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
					missingAspects: Array.isArray(parsed.missingAspects) ? parsed.missingAspects : [],
					sourceEvaluation: parsed.sourceEvaluation || {},
					conflicts: parsed.conflicts,
					suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
					canApprove: parsed.credibilityScore >= TRACE_PROCESSING_CONFIG.AI_ANALYSIS.CREDIBILITY_THRESHOLD
				};
			} else {
				throw new Error('AI返回格式不正确');
			}
		} catch (err: any) {
			console.error(`[TraceAnalysis] Failed to parse AI response:`, err);
			// Fallback: 使用默认值
			analysisResult = {
				credibilityScore: 0.5,
				analysis: { error: 'AI分析失败，使用默认值' },
				strengths: [],
				weaknesses: ['AI分析失败'],
				missingAspects: [],
				sourceEvaluation: {},
				suggestions: ['请重新分析'],
				canApprove: false
			};
		}

		// 保存分析结果（包含内容hash用于缓存验证）
		const { saveAnalysisWithHash } = await import('./traceAnalysisCache');
		await saveAnalysisWithHash(
			traceId,
			{
				credibilityScore: analysisResult.credibilityScore,
				completenessScore: analysisResult.completenessScore,
				accuracyScore: analysisResult.accuracyScore,
				sourceQualityScore: analysisResult.sourceQualityScore,
				analysis: analysisResult.analysis as any,
				strengths: analysisResult.strengths,
				weaknesses: analysisResult.weaknesses,
				missingAspects: analysisResult.missingAspects,
				sourceEvaluation: analysisResult.sourceEvaluation as any,
				conflicts: analysisResult.conflicts as any,
				suggestions: analysisResult.suggestions,
				canApprove: analysisResult.canApprove,
				analyzedAt: new Date()
			},
			contentHash
		);

		// 更新溯源状态为PUBLISHED（分析完成）
		await updateTraceStatus(traceId, 'PUBLISHED', trace.editorId);

		// 更新analyzedAt时间戳
		await prisma.trace.update({
			where: { id: traceId },
			data: { analyzedAt: new Date() }
		});

		return analysisResult;
	} catch (err: any) {
		console.error(`[TraceAnalysis] Analysis failed for trace ${traceId}:`, err);

		// 分析失败，回退状态到PUBLISHED
		try {
			await updateTraceStatus(traceId, 'PUBLISHED', trace.editorId);
		} catch (statusErr) {
			console.error(`[TraceAnalysis] Failed to revert status:`, statusErr);
		}

		throw err;
	}
}

