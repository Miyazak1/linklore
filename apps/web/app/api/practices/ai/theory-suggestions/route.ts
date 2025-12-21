import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { routeAiCall } from '@/lib/ai/router';

export async function POST(req: NextRequest) {
  try {
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, keywords } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const prompt = `
根据以下实践内容，推荐相关的马克思主义理论引用：

实践内容：
${content}

关键词：${keywords?.join(', ') || '无'}

请推荐3-5个最相关的理论引用，包括：
- 理论家（马克思、列宁、毛泽东、恩格斯等）
- 来源作品（如《资本论》、《国家与革命》等）
- 相关段落（直接引用）
- 相关性评分（0-1）

请以JSON数组格式返回：
[
  {
    "theorist": "马克思",
    "source": "《资本论》",
    "quote": "相关段落...",
    "relevance": 0.92,
    "page": "第一卷，第123页",
    "year": 1867
  },
  ...
]

请确保推荐的引用与实践内容高度相关。
`;

    const response = await routeAiCall({
      userId: session.sub,
      task: 'summarize',
      estimatedMaxCostCents: 15,
      prompt,
    });

    // 解析AI返回的JSON
    let suggestions;
    try {
      const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) ||
                       response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        suggestions = JSON.parse(response.text);
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('[POST /api/practices/ai/theory-suggestions] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get theory suggestions' },
      { status: 500 }
    );
  }
}











