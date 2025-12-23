/**
 * 聊天模块数据库访问层
 * 
 * 目的：隔离聊天模块的数据库访问，避免其他模块直接访问聊天相关的表
 * 
 * 使用方式：
 * - 聊天模块内：使用 chatDb.rooms.findMany() 而不是 prisma.chatRoom.findMany()
 * - 其他模块：不应直接导入此文件
 * 
 * 注意：这是渐进式隔离的第一步，旧代码可以继续使用 prisma.chatRoom，
 * 但新代码应该使用 chatDb
 */

import { prisma } from '@/lib/db/client';

/**
 * 聊天室数据库操作
 */
export const chatRooms = {
	findMany: (args: any) => prisma.chatRoom.findMany(args),
	findUnique: (args: any) => prisma.chatRoom.findUnique(args),
	findFirst: (args: any) => prisma.chatRoom.findFirst(args),
	create: (args: any) => prisma.chatRoom.create(args),
	update: (args: any) => prisma.chatRoom.update(args),
	delete: (args: any) => prisma.chatRoom.delete(args),
	deleteMany: (args: any) => prisma.chatRoom.deleteMany(args),
	count: (args: any) => prisma.chatRoom.count(args),
	aggregate: (args: any) => prisma.chatRoom.aggregate(args),
	groupBy: (args: any) => prisma.chatRoom.groupBy(args),
	upsert: (args: any) => prisma.chatRoom.upsert(args),
};

/**
 * 聊天消息数据库操作
 */
export const chatMessages = {
	findMany: (args: any) => prisma.chatMessage.findMany(args),
	findUnique: (args: any) => prisma.chatMessage.findUnique(args),
	findFirst: (args: any) => prisma.chatMessage.findFirst(args),
	create: (args: any) => prisma.chatMessage.create(args),
	update: (args: any) => prisma.chatMessage.update(args),
	delete: (args: any) => prisma.chatMessage.delete(args),
	deleteMany: (args: any) => prisma.chatMessage.deleteMany(args),
	count: (args: any) => prisma.chatMessage.count(args),
	aggregate: (args: any) => prisma.chatMessage.aggregate(args),
	groupBy: (args: any) => prisma.chatMessage.groupBy(args),
	upsert: (args: any) => prisma.chatMessage.upsert(args),
};

/**
 * 聊天分析数据库操作
 */
export const chatAnalysis = {
	findMany: (args: any) => prisma.chatAnalysis.findMany(args),
	findUnique: (args: any) => prisma.chatAnalysis.findUnique(args),
	findFirst: (args: any) => prisma.chatAnalysis.findFirst(args),
	create: (args: any) => prisma.chatAnalysis.create(args),
	update: (args: any) => prisma.chatAnalysis.update(args),
	delete: (args: any) => prisma.chatAnalysis.delete(args),
	deleteMany: (args: any) => prisma.chatAnalysis.deleteMany(args),
	count: (args: any) => prisma.chatAnalysis.count(args),
	aggregate: (args: any) => prisma.chatAnalysis.aggregate(args),
	groupBy: (args: any) => prisma.chatAnalysis.groupBy(args),
	upsert: (args: any) => prisma.chatAnalysis.upsert(args),
};

/**
 * 消息引用数据库操作
 */
export const chatMessageReferences = {
	findMany: (args: any) => prisma.chatMessageReference.findMany(args),
	findUnique: (args: any) => prisma.chatMessageReference.findUnique(args),
	findFirst: (args: any) => prisma.chatMessageReference.findFirst(args),
	create: (args: any) => prisma.chatMessageReference.create(args),
	update: (args: any) => prisma.chatMessageReference.update(args),
	delete: (args: any) => prisma.chatMessageReference.delete(args),
	deleteMany: (args: any) => prisma.chatMessageReference.deleteMany(args),
	count: (args: any) => prisma.chatMessageReference.count(args),
	aggregate: (args: any) => prisma.chatMessageReference.aggregate(args),
	groupBy: (args: any) => prisma.chatMessageReference.groupBy(args),
	upsert: (args: any) => prisma.chatMessageReference.upsert(args),
};

/**
 * 聊天模块数据库访问对象
 * 
 * 使用示例：
 * ```typescript
 * import { chatDb } from '@/lib/modules/chat/db';
 * 
 * const rooms = await chatDb.rooms.findMany({ where: { ... } });
 * const message = await chatDb.messages.create({ data: { ... } });
 * ```
 */
export const chatDb = {
	rooms: chatRooms,
	messages: chatMessages,
	analysis: chatAnalysis,
	messageReferences: chatMessageReferences,
};





