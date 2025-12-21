import { prisma } from '../shim/prisma';
import { analyzePracticeDepth } from '../../apps/web/lib/practices/ai-analysis';
import { calculateCompositeScore } from '../../apps/web/lib/practices/sorting';
import { validatePracticeReality } from '../../apps/web/lib/practices/reality-validator';

/**
 * 分析实践记录的深度（Worker任务）
 */
export async function analyzePracticeJob(practiceId: string) {
  try {
    // 获取实践记录
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        content: true,
        structuredData: true,
        createdAt: true,
        authorId: true,
        mediaFiles: {
          select: {
            id: true,
          },
        },
        verificationStatus: true,
      },
    });

    if (!practice) {
      throw new Error(`Practice ${practiceId} not found`);
    }

    // 更新处理状态
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        aiProcessingStatus: {
          analysis: 'processing',
        },
      },
    });

    // 执行AI分析
    const [analysis, realityCheck] = await Promise.all([
      analyzePracticeDepth(
        practice.content,
        practice.structuredData as any,
        practice.authorId
      ),
      // 执行现实性验证
      validatePracticeReality(
        practice.content,
        practice.structuredData as any,
        practice.mediaFiles.length,
        practice.authorId
      ),
    ]);

    // 获取互动数据
    const [likeCount, commentCount] = await Promise.all([
      prisma.practiceLike.count({ where: { practiceId } }),
      prisma.practiceComment.count({ where: { practiceId } }),
    ]);

    // 计算综合分数（包含现实性分数和验证状态）
    const compositeScore = calculateCompositeScore(
      analysis.depthScore,
      analysis.densityScore,
      practice.createdAt,
      likeCount,
      commentCount,
      realityCheck.score, // 现实性分数
      practice.verificationStatus === 'verified' // 是否已验证
    );

    // 保存分析结果
    await prisma.$transaction([
      // 更新或创建分析结果
      prisma.practiceAnalysis.upsert({
        where: { practiceId },
        update: {
          depthScore: analysis.depthScore,
          densityScore: analysis.densityScore,
          theoreticalDepth: analysis.theoreticalDepth,
          keyPoints: analysis.keyPoints,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          theoryMatches: analysis.theoryMatches as any,
          analyzedAt: new Date(),
        },
        create: {
          practiceId,
          depthScore: analysis.depthScore,
          densityScore: analysis.densityScore,
          theoreticalDepth: analysis.theoreticalDepth,
          keyPoints: analysis.keyPoints,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          theoryMatches: analysis.theoryMatches as any,
        },
      }),
      // 更新实践记录的综合分数、现实性检查和处理状态
      prisma.practice.update({
        where: { id: practiceId },
        data: {
          depthScore: analysis.depthScore,
          densityScore: analysis.densityScore,
          compositeScore,
          realityCheck: realityCheck as any, // 保存现实性检查结果
          aiProcessingStatus: {
            analysis: 'completed',
          },
        },
      }),
    ]);

    console.log(`[analyzePracticeJob] Completed analysis for ${practiceId}`);
  } catch (error: any) {
    console.error(`[analyzePracticeJob] Error for ${practiceId}:`, error);
    
    // 更新处理状态为失败
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        aiProcessingStatus: {
          analysis: 'failed',
          error: error.message,
        },
      },
    });
    
    throw error;
  }
}

