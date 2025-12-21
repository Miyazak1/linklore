/**
 * 房间SSE连接池管理器
 * 用于实时推送AI流式输出给房间内所有用户
 */

interface SSEConnection {
	controller: ReadableStreamDefaultController<Uint8Array>;
	userId: string;
	roomId: string;
	connectedAt: number;
}

// 房间ID -> Set<SSEConnection>
const roomConnections = new Map<string, Set<SSEConnection>>();

/**
 * 添加连接到房间
 */
export function addRoomConnection(
	roomId: string,
	userId: string,
	controller: ReadableStreamDefaultController<Uint8Array>
): void {
	if (!roomConnections.has(roomId)) {
		roomConnections.set(roomId, new Set());
	}

	const connection: SSEConnection = {
		controller,
		userId,
		roomId,
		connectedAt: Date.now()
	};

	roomConnections.get(roomId)!.add(connection);

	console.log(`[RoomConnections] ✅ 用户 ${userId} 加入房间 ${roomId}，当前连接数: ${roomConnections.get(roomId)!.size}`);
}

/**
 * 从房间移除连接
 */
export function removeRoomConnection(
	roomId: string,
	userId: string,
	controller: ReadableStreamDefaultController<Uint8Array>
): void {
	const connections = roomConnections.get(roomId);
	if (!connections) return;

	// 找到并移除对应的连接
	for (const conn of connections) {
		if (conn.controller === controller && conn.userId === userId) {
			connections.delete(conn);
			console.log(`[RoomConnections] ❌ 用户 ${userId} 离开房间 ${roomId}，剩余连接数: ${connections.size}`);
			
			// 如果房间没有连接了，清理
			if (connections.size === 0) {
				roomConnections.delete(roomId);
			}
			break;
		}
	}
}

/**
 * 向房间内所有连接广播事件
 */
export function broadcastToRoom(
	roomId: string,
	event: string,
	data: any,
	excludeUserId?: string
): void {
	const connections = roomConnections.get(roomId);
	if (!connections || connections.size === 0) {
		return;
	}

	const encoder = new TextEncoder();
	const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
	const encoded = encoder.encode(message);

	let successCount = 0;
	let errorCount = 0;

	for (const conn of connections) {
		// 如果指定了排除用户，跳过该用户
		if (excludeUserId && conn.userId === excludeUserId) {
			continue;
		}

		try {
			conn.controller.enqueue(encoded);
			successCount++;
		} catch (error) {
			// 连接可能已关闭，移除它
			console.warn(`[RoomConnections] ⚠️ 推送失败，移除连接:`, {
				roomId,
				userId: conn.userId,
				error: error instanceof Error ? error.message : String(error)
			});
			connections.delete(conn);
			errorCount++;
		}
	}

	// 如果房间没有连接了，清理
	if (connections.size === 0) {
		roomConnections.delete(roomId);
	}

	if (successCount > 0) {
		console.log(`[RoomConnections] 📢 向房间 ${roomId} 广播事件 "${event}"，成功: ${successCount}，失败: ${errorCount}`);
	}
}

/**
 * 获取房间内的连接数
 */
export function getRoomConnectionCount(roomId: string): number {
	return roomConnections.get(roomId)?.size || 0;
}

/**
 * 获取房间内的所有连接（用于直接发送消息）
 */
export function getRoomConnections(roomId: string): Set<SSEConnection> | undefined {
	return roomConnections.get(roomId);
}

/**
 * 向房间内所有连接广播默认事件（不带event字段，onmessage可以接收）
 */
export function broadcastDefaultMessage(
	roomId: string,
	data: any,
	excludeUserId?: string
): void {
	const connections = roomConnections.get(roomId);
	if (!connections || connections.size === 0) {
		console.log(`[RoomConnections] ⚠️ 房间 ${roomId} 没有活跃连接，无法广播消息`, {
			messageId: data.id,
			contentPreview: data.content?.substring(0, 50)
		});
		return;
	}

	const encoder = new TextEncoder();
	// 发送默认事件格式（不带 event 字段，只有 data）
	const messageStr = `data: ${JSON.stringify(data)}\n\n`;
	const encoded = encoder.encode(messageStr);

	let successCount = 0;
	let errorCount = 0;
	const userIds: string[] = [];

	for (const conn of connections) {
		// 如果指定了排除用户，跳过该用户
		if (excludeUserId && conn.userId === excludeUserId) {
			continue;
		}

		userIds.push(conn.userId);

		try {
			conn.controller.enqueue(encoded);
			successCount++;
		} catch (error) {
			// 连接可能已关闭，移除它
			console.warn(`[RoomConnections] ⚠️ 推送失败，移除连接:`, {
				roomId,
				userId: conn.userId,
				error: error instanceof Error ? error.message : String(error)
			});
			connections.delete(conn);
			errorCount++;
		}
	}

	// 如果房间没有连接了，清理
	if (connections.size === 0) {
		roomConnections.delete(roomId);
	}

	if (successCount > 0) {
		console.log(`[RoomConnections] 📢 向房间 ${roomId} 广播默认消息，成功: ${successCount}，失败: ${errorCount}，用户: ${userIds.join(', ')}`, {
			messageId: data.id,
			contentPreview: data.content?.substring(0, 50)
		});
	} else {
		console.warn(`[RoomConnections] ⚠️ 房间 ${roomId} 广播失败，所有连接都被排除或失败`, {
			messageId: data.id,
			totalConnections: connections.size,
			excludeUserId
		});
	}
}

/**
 * 获取所有房间的连接统计
 */
export function getAllRoomStats(): Map<string, number> {
	const stats = new Map<string, number>();
	for (const [roomId, connections] of roomConnections.entries()) {
		stats.set(roomId, connections.size);
	}
	return stats;
}


