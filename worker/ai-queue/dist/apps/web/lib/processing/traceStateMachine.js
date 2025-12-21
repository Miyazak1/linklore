/**
 * 溯源状态机
 * 定义状态转换规则，确保状态转换的合法性
 */
import { prisma } from '@/lib/db/client';
// 状态转换规则
const STATE_TRANSITIONS = {
    DRAFT: ['DRAFT', 'PUBLISHED'], // 可以保存或发布
    PUBLISHED: ['ANALYZING', 'APPROVED', 'PUBLISHED'], // 可以分析、采纳、或保持
    ANALYZING: ['PUBLISHED', 'APPROVED'], // 分析完成，回到PUBLISHED或直接APPROVED
    APPROVED: [] // 终态，不能转换
};
/**
 * 检查状态转换是否合法
 * @param from 当前状态
 * @param to 目标状态
 * @returns {boolean} 是否可以转换
 */
export function canTransition(from, to) {
    return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}
/**
 * 安全地更新溯源状态
 * @param traceId 溯源ID
 * @param newStatus 新状态
 * @param userId 用户ID（用于验证权限）
 * @throws {Error} 如果状态转换不合法或用户无权限
 */
export async function updateTraceStatus(traceId, newStatus, userId) {
    // 获取当前溯源状态
    const trace = await prisma.trace.findUnique({
        where: { id: traceId },
        select: { status: true, editorId: true }
    });
    if (!trace) {
        throw new Error('溯源不存在');
    }
    // 检查权限（只有创建者或管理员可以修改状态）
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    if (trace.editorId !== userId && user?.role !== 'admin') {
        throw new Error('无权限修改此溯源');
    }
    // 检查状态转换是否合法
    if (!canTransition(trace.status, newStatus)) {
        throw new Error(`不能从 ${trace.status} 转换到 ${newStatus}`);
    }
    // 更新状态
    await prisma.trace.update({
        where: { id: traceId },
        data: {
            status: newStatus,
            // 根据状态设置相应的时间戳
            ...(newStatus === 'PUBLISHED' && !trace.publishedAt && {
                publishedAt: new Date()
            }),
            ...(newStatus === 'APPROVED' && {
                approvedAt: new Date()
            })
        }
    });
}
