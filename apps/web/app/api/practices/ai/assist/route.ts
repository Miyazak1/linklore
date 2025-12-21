import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { routeAiCall } from '@/lib/ai/router';

export async function POST(req: NextRequest) {
  try {
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { simpleInput } = await req.json();

    if (!simpleInput || typeof simpleInput !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const prompt = `
用户输入了以下简单的实践描述：
"${simpleInput}"

请帮助用户将其完善成一篇结构化的实践记录，确保符合马克思的实践概念（"感性的、对象性的、现实的活动"）。

**重要要求：**
1. **感性的（现实发生的行动）**：必须强调具体行动、时间地点、参与者
2. **对象性的（作用于客观世界）**：必须明确作用对象（人/物/制度/环境），不是自我感动
3. **现实的活动（物质性结果）**：必须有可验证的物质性结果（量化数据或质性改变）

请以JSON格式返回，包含以下字段：

{
  "background": "实践背景（问题是什么？）",
  "goal": "目标（试图改变什么？）",
  "method": "方法（采取了什么具体行动？何时何地？和谁一起？）",
  "participants": "主体（和谁一起行动？）",
  "targetObject": "作用对象（人/物/制度/环境）",
  "beforeState": "实践前状态",
  "afterState": "实践后状态（改变了什么？）",
  "quantitativeResult": "量化结果（影响人数、范围、持续时间等数据）",
  "qualitativeResult": "质性结果（具体改变描述）",
  "results": "成果总结（数据型、故事型都行）",
  "difficulties": "遇到的困难",
  "reflection": "反思",
  "nextSteps": "下一步计划",
  "suggestedTitle": "建议的标题",
  "suggestedTags": ["标签1", "标签2"]
}

请根据用户的简单描述，尽可能详细地展开每个部分。如果用户的描述不符合实践三要素，请引导用户补充：
- 具体行动描述（不是想法）
- 作用对象和前后对比
- 物质性结果（数据或改变）

如果某个部分无法从输入中推断，可以留空或给出建议。
`;

    const response = await routeAiCall({
      userId: session.sub,
      task: 'summarize',
      estimatedMaxCostCents: 20,
      prompt,
    });

    // 解析AI返回的JSON
    let structuredData;
    try {
      // 尝试提取JSON（AI可能返回markdown格式的代码块）
      const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) ||
                       response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        structuredData = JSON.parse(response.text);
      }
    } catch (e) {
      // 如果解析失败，返回错误
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      structuredData: {
        background: structuredData.background || '',
        goal: structuredData.goal || '',
        method: structuredData.method || '',
        participants: structuredData.participants || '',
        results: structuredData.results || '',
        difficulties: structuredData.difficulties || '',
        reflection: structuredData.reflection || '',
        nextSteps: structuredData.nextSteps || '',
      },
      suggestedTitle: structuredData.suggestedTitle,
      suggestedTags: structuredData.suggestedTags || [],
    });
  } catch (error: any) {
    console.error('[POST /api/practices/ai/assist] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get AI assistance' },
      { status: 500 }
    );
  }
}

