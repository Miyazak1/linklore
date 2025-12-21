import { routeAiCall } from '@/lib/ai/router';
/**
 * 分析实践记录的深度和密度
 */
export async function analyzePracticeDepth(content, structuredData, userId = null) {
    const prompt = `
分析以下实践记录的深度和密度：

内容：
${content}

结构化数据：
${JSON.stringify(structuredData || {}, null, 2)}

请从以下维度评分（0-1）：
1. 理论深度：是否结合理论思考，理论运用是否恰当
2. 反思深度：是否有深入反思，是否触及本质问题
3. 系统性：是否有完整的实践链条（背景-目标-方法-结果-反思）
4. 信息密度：信息量是否充足，是否包含关键细节
5. 结构化程度：是否结构清晰，逻辑严密

同时请提取：
- 关键点（3-5个）
- 优点（2-3个）
- 改进建议（2-3个）

如果可能，推荐相关的理论引用（理论家、来源、相关段落）。

请以JSON格式返回：
{
  "depthScore": 0.85,
  "densityScore": 0.72,
  "theoreticalDepth": 0.78,
  "keyPoints": ["关键点1", "关键点2", ...],
  "strengths": ["优点1", "优点2", ...],
  "improvements": ["建议1", "建议2", ...],
  "theoryMatches": [
    {
      "theorist": "马克思",
      "relevance": 0.92,
      "suggestedQuotes": ["引用1", "引用2"]
    }
  ],
  "reasoning": "分析理由..."
}
`;
    try {
        const response = await routeAiCall({
            userId,
            task: 'summarize', // 使用现有的task类型
            estimatedMaxCostCents: 20,
            prompt,
        });
        // 解析JSON
        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) ||
            response.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }
        const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
            depthScore: Math.max(0, Math.min(1, result.depthScore || 0)),
            densityScore: Math.max(0, Math.min(1, result.densityScore || 0)),
            theoreticalDepth: result.theoreticalDepth
                ? Math.max(0, Math.min(1, result.theoreticalDepth))
                : undefined,
            keyPoints: result.keyPoints || [],
            strengths: result.strengths || [],
            improvements: result.improvements || [],
            theoryMatches: result.theoryMatches || [],
        };
    }
    catch (error) {
        console.error('[analyzePracticeDepth] Error:', error);
        // 返回默认值
        return {
            depthScore: 0.5,
            densityScore: 0.5,
            keyPoints: [],
            strengths: [],
            improvements: [],
        };
    }
}
