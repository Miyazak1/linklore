/**
 * 计算实践记录的综合分数（用于深度优先排序）
 * 增强版：包含现实性分数和验证状态
 */
export function calculateCompositeScore(
  depthScore: number,
  densityScore: number,
  createdAt: Date,
  likeCount: number = 0,
  commentCount: number = 0,
  realityScore: number = 0.5, // 新增：现实性分数（0-1）
  isVerified: boolean = false // 新增：是否已验证
): number {
  // 权重配置（调整后）
  const depthWeight = 0.25;        // 深度权重：25%（降低）
  const densityWeight = 0.15;      // 密度权重：15%（降低）
  const realityWeight = 0.30;      // 现实性权重：30%（新增）
  const interactionWeight = 0.15;  // 互动质量权重：15%（降低）
  const timeWeight = 0.05;         // 时间衰减：5%（降低）

  // 互动质量分数（限制上限，避免刷量）
  // 点赞权重0.6，评论权重0.4，上限50
  const interactionScore = Math.min(
    (likeCount * 0.6 + commentCount * 0.4) / 50,
    1
  );

  // 时间衰减（越新越好，但权重较低）
  // 使用指数衰减，30天半衰期
  const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const timeDecay = Math.exp(-daysSince / 30);

  // 验证状态加分（已验证的实践获得额外加分）
  const verificationBonus = isVerified ? 0.10 : 0;

  // 综合分数
  const compositeScore =
    depthScore * depthWeight +
    densityScore * densityWeight +
    realityScore * realityWeight +  // 新增：现实性分数
    interactionScore * interactionWeight +
    timeDecay * timeWeight +
    verificationBonus;  // 新增：验证加分

  return Math.max(0, Math.min(1, compositeScore)); // 限制在0-1之间
}

/**
 * 批量更新实践记录的综合分数
 * 这个函数应该在AI分析完成后调用，或者在定时任务中批量更新
 */
export async function updateCompositeScores(practiceIds: string[]) {
  // 这个函数需要访问数据库，应该在调用时传入prisma实例
  // 实现逻辑：查询实践记录，计算分数，批量更新
  // 暂时留空，在API路由中直接调用calculateCompositeScore
}

