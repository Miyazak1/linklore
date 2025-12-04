/**
 * 实时协作系统
 * 使用 Server-Sent Events (SSE) 推送编辑事件
 */

import { prisma } from '@/lib/db/client';

export interface CollaborationEvent {
	type: 'edit' | 'cursor' | 'conflict' | 'user_joined' | 'user_left';
	traceId: string;
	userId: string;
	userEmail: string;
	timestamp: number;
	data: any;
}

/**
 * 追踪活跃编辑者
 */
const activeEditors = new Map<string, Set<string>>(); // traceId -> Set<userId>

/**
 * 追踪用户光标位置
 */
const cursorPositions = new Map<string, Map<string, { line: number; column: number }>>(); // traceId -> userId -> position

/**
 * 添加活跃编辑者
 */
export function addActiveEditor(traceId: string, userId: string) {
	if (!activeEditors.has(traceId)) {
		activeEditors.set(traceId, new Set());
	}
	activeEditors.get(traceId)!.add(userId);
}

/**
 * 移除活跃编辑者
 */
export function removeActiveEditor(traceId: string, userId: string) {
	const editors = activeEditors.get(traceId);
	if (editors) {
		editors.delete(userId);
		if (editors.size === 0) {
			activeEditors.delete(traceId);
		}
	}
}

/**
 * 获取活跃编辑者列表
 */
export function getActiveEditors(traceId: string): string[] {
	return Array.from(activeEditors.get(traceId) || []);
}

/**
 * 更新光标位置
 */
export function updateCursorPosition(traceId: string, userId: string, line: number, column: number) {
	if (!cursorPositions.has(traceId)) {
		cursorPositions.set(traceId, new Map());
	}
	cursorPositions.get(traceId)!.set(userId, { line, column });
}

/**
 * 获取所有光标位置
 */
export function getCursorPositions(traceId: string): Map<string, { line: number; column: number }> {
	return cursorPositions.get(traceId) || new Map();
}

/**
 * 检测编辑冲突
 */
export async function detectConflict(
	traceId: string,
	userId: string,
	version: number
): Promise<boolean> {
	const trace = await prisma.trace.findUnique({
		where: { id: traceId },
		select: { version: true }
	});

	if (!trace) {
		return false;
	}

	// 如果服务器版本大于客户端版本，说明有冲突
	return trace.version > version;
}

/**
 * 创建协作事件
 */
export function createCollaborationEvent(
	type: CollaborationEvent['type'],
	traceId: string,
	userId: string,
	userEmail: string,
	data: any
): CollaborationEvent {
	return {
		type,
		traceId,
		userId,
		userEmail,
		timestamp: Date.now(),
		data
	};
}

