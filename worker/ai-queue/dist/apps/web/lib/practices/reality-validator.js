import { routeAiCall } from '@/lib/ai/router';
/**
 * 验证实践记录是否符合马克思的实践概念
 * "感性的、对象性的、现实的活动"
 */
export async function validatePracticeReality(content, structuredData, mediaFilesCount = 0, userId = null) {
    const prompt = `
分析以下实践记录是否符合马克思的实践概念（"感性的、对象性的、现实的活动"）：

内容：
${content}

结构化数据：
${JSON.stringify(structuredData || {}, null, 2)}

媒体文件数量：${mediaFilesCount}

请从三个维度评估：

1. **感性的（现实发生的行动）**：
   - 是否有具体的、可观察的行动？
   - 是否有明确的时间、地点、参与者？
   - 是否有证据（照片、视频、文档）？
   - 是否只是想法、计划、推理？

2. **对象性的（作用于客观世界）**：
   - 是否作用于外部世界（不是自我感动）？
   - 是否有明确的作用对象（人/物/制度/环境）？
   - 是否改变了客观世界？
   - 是否有实践前后的对比？

3. **现实的活动（物质性结果）**：
   - 是否有物质性的、可验证的结果？
   - 是否有量化数据或质性改变？
   - 是否只是精神活动或情感表达？

返回JSON格式：
{
  "hasConcreteAction": true/false,
  "hasExternalImpact": true/false,
  "hasMaterialResult": true/false,
  "evidenceCount": ${mediaFilesCount},
  "suggestions": ["建议1", "建议2"],
  "score": 0.85,
  "reasoning": "分析理由..."
}

评分标准：
- hasConcreteAction: 有具体行动描述、时间地点、参与者 → true
- hasExternalImpact: 有作用对象、前后对比、改变证据 → true
- hasMaterialResult: 有量化数据或质性改变 → true
- score: 综合评分，三个维度各占1/3，证据数量加分（每张照片+0.1，最高0.3）
`;
    try {
        const response = await routeAiCall({
            userId,
            task: 'summarize',
            estimatedMaxCostCents: 15,
            prompt,
        });
        // 解析AI返回的JSON
        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) ||
            response.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }
        const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        // 计算综合分数
        let score = 0;
        if (result.hasConcreteAction)
            score += 0.33;
        if (result.hasExternalImpact)
            score += 0.33;
        if (result.hasMaterialResult)
            score += 0.34;
        // 证据加分（每张照片+0.1，最高0.3）
        const evidenceBonus = Math.min(mediaFilesCount * 0.1, 0.3);
        score = Math.min(score + evidenceBonus, 1);
        return {
            hasConcreteAction: result.hasConcreteAction || false,
            hasExternalImpact: result.hasExternalImpact || false,
            hasMaterialResult: result.hasMaterialResult || false,
            evidenceCount: mediaFilesCount,
            suggestions: result.suggestions || [],
            score: Math.max(0, Math.min(1, score)),
            reasoning: result.reasoning,
        };
    }
    catch (error) {
        console.error('[validatePracticeReality] Error:', error);
        // 返回默认值
        return {
            hasConcreteAction: false,
            hasExternalImpact: false,
            hasMaterialResult: false,
            evidenceCount: mediaFilesCount,
            suggestions: ['请补充具体行动描述', '请说明作用对象', '请描述物质性结果'],
            score: 0.3, // 默认低分
        };
    }
}
