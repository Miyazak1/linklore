/**
 * Audit logging utility
 * Logs important user actions and system events
 */

import { prisma } from '@/lib/db/client';

export type AuditAction =
	| 'user.login'
	| 'user.logout'
	| 'user.register'
	| 'user.role.update'
	| 'document.upload'
	| 'document.delete'
	| 'topic.create'
	| 'topic.update'
	| 'topic.delete'
	| 'book.add'
	| 'book.remove'
	| 'ai.config.update'
	| 'disagreement.create'
	| 'disagreement.update'
	| 'trace.create'
	| 'trace.update'
	| 'trace.delete'
	| 'trace.publish'
	| 'trace.approve'
	| 'entry.update';

export interface AuditLogEntry {
	userId?: string;
	action: AuditAction;
	resourceType?: string;
	resourceId?: string;
	metadata?: Record<string, any>;
	ipAddress?: string;
	userAgent?: string;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
	try {
		// In production, you might want to use a separate audit log table
		// For now, we'll use console logging and optionally store in database
		const logMessage = `[AUDIT] ${entry.action} | User: ${entry.userId || 'anonymous'} | Resource: ${entry.resourceType}/${entry.resourceId || 'N/A'}`;
		console.log(logMessage, entry.metadata || '');

		// Optionally store in database (create AuditLog model if needed)
		// await prisma.auditLog.create({
		//   data: {
		//     userId: entry.userId,
		//     action: entry.action,
		//     resourceType: entry.resourceType,
		//     resourceId: entry.resourceId,
		//     metadata: entry.metadata,
		//     ipAddress: entry.ipAddress,
		//     userAgent: entry.userAgent,
		//   },
		// });
	} catch (err) {
		// Don't fail the request if audit logging fails
		console.error('[Audit] Failed to log audit entry:', err);
	}
}










