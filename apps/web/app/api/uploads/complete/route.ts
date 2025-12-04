import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { getOssClient, isLocalStorage } from '@/lib/storage/oss';
import { fileExists } from '@/lib/storage/local';
import { validateParentId } from '@/lib/topics/documentTree';
// Lazy import to avoid module loading errors
const getEnqueueExtract = () => import('@/lib/queue/jobs').then(m => m.enqueueExtract);
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Schema = z.object({
	key: z.string().min(3),
	mime: z.string().min(1),
	size: z.number().int().positive(),
	topicId: z.string().optional(),
	title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200字').optional(),
	parentId: z.string().nullable().optional()
});

export async function POST(req: Request) {
	console.log('[Upload Complete] ===== POST /api/uploads/complete called =====');
	try {
		// Read session with error handling
		let session;
		try {
			session = await readSession();
		} catch (sessionErr: any) {
			console.error('[Upload Complete] Session error:', sessionErr);
			return NextResponse.json({ error: '会话读取失败，请重新登录' }, { 
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { 
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		// Parse request body with error handling
		let json: any;
		try {
			json = await req.json();
		} catch (jsonErr: any) {
			console.error('[Upload Complete] JSON parse error:', jsonErr);
			return NextResponse.json({ error: '请求格式错误' }, { 
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		// Validate schema
		let validatedData: { key: string; mime: string; size: number; topicId?: string; title?: string; parentId?: string | null };
		try {
			validatedData = Schema.parse(json);
		} catch (schemaErr: any) {
			console.error('[Upload Complete] Schema validation error:', schemaErr);
			return NextResponse.json({ error: '请求参数错误：' + (schemaErr.errors?.[0]?.message || schemaErr.message) }, { 
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		const { key, mime, size, topicId, title, parentId } = validatedData;
		console.log(`[Upload Complete] Validated data: key=${key}, mime=${mime}, size=${size}, topicId=${topicId || 'new'}, title=${title || 'N/A'}, parentId=${parentId || 'null'}`);
		
		// Validate parentId if provided (only for existing topics)
		if (topicId && parentId !== undefined) {
			const validation = await validateParentId(parentId, topicId);
			if (!validation.valid) {
				return NextResponse.json({ error: validation.error || 'parentId 验证失败' }, { 
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// Basic existence check
		try {
			if (isLocalStorage()) {
				const exists = await fileExists(key);
				if (!exists) {
					return NextResponse.json({ error: '文件不存在或未上传完成' }, { 
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}
			} else {
				const client = getOssClient();
				try {
					await client.head(key);
				} catch (headErr: any) {
					console.error('[Upload Complete] OSS head error:', headErr);
					return NextResponse.json({ error: '对象不存在或未上传完成' }, { 
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}
			}
		} catch (fileCheckErr: any) {
			console.error('[Upload Complete] File check error:', fileCheckErr);
			return NextResponse.json({ error: '文件检查失败：' + fileCheckErr.message }, { 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Create topic and document with error handling
		let topicIdOut = topicId || null;
		let doc: { id: string };
		try {
			if (!topicIdOut) {
				// Create new topic with user-provided title
				// AI-generated subtitle will be updated asynchronously
				// Note: subtitle field is optional, so we don't set it here
				// It will be set by AI summary later when Prisma Client is regenerated
				if (!title) {
					return NextResponse.json({ error: '创建新话题时必须提供标题' }, { 
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				const topic = await prisma.topic.create({
					data: { 
						title: title.trim(), // User-provided title
						authorId: String(session.sub) 
					}
				});
				topicIdOut = topic.id;
			}

			// Initialize processing status
			const processingStatus = {
				extract: 'pending' as const,
				summarize: 'pending' as const,
				evaluate: 'pending' as const
			};

			doc = await prisma.document.create({
				data: {
					topicId: topicIdOut!,
					parentId: parentId || null,
					authorId: String(session.sub),
					fileKey: key,
					mime,
					size,
					processingStatus: processingStatus as any
				}
			});
			console.log(`[Upload Complete] Document created: ${doc.id}, Topic: ${topicIdOut}, Parent: ${parentId || 'null'}`);
		} catch (dbErr: any) {
			console.error('[Upload Complete] Database error:', dbErr);
			return NextResponse.json({ error: '数据库操作失败：' + dbErr.message }, { 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Try to extract text immediately for simple file types (txt, md, docx)
		// docx is also fast with mammoth library (usually < 500ms)
		// This allows users to see content right away without waiting
		const isSimpleFile = mime.startsWith('text/') || 
			key.endsWith('.txt') || 
			key.endsWith('.md') || 
			mime === 'text/markdown' ||
			key.endsWith('.docx') ||
			mime.includes('wordprocessingml');
		
		if (isSimpleFile) {
			// For simple files, extract immediately and wait for completion
			// This ensures content is available when user sees the page
			console.log(`[Upload] Detected simple file type, starting immediate extraction for ${doc.id}`);
			try {
				const { extractAndStore } = await import('@/lib/processing/extract');
				// Wait for extraction with timeout (max 5 seconds for docx)
				// This way content is ready when user sees the page
				const extractPromise = extractAndStore(doc.id);
				const timeoutMs = key.endsWith('.docx') || mime.includes('wordprocessingml') ? 5000 : 3000;
				const timeoutPromise = new Promise((_, reject) => 
					setTimeout(() => reject(new Error('Extraction timeout')), timeoutMs)
				);
				
				console.log(`[Upload] Waiting for extraction (timeout: ${timeoutMs}ms)...`);
				try {
					await Promise.race([extractPromise, timeoutPromise]);
					console.log(`[Upload] ✅ Immediate extract completed for simple file: ${doc.id}`);
				} catch (extractErr: any) {
					if (extractErr.message === 'Extraction timeout') {
						console.warn(`[Upload] ⚠️ Extract timeout (${timeoutMs}ms) for ${doc.id}, will continue in background`);
						// Continue extraction in background
						extractPromise.then(() => {
							console.log(`[Upload] ✅ Background extract completed for ${doc.id}`);
						}).catch((err) => {
							console.error('[Upload] ❌ Background extract failed:', err);
						});
					} else {
						console.error('[Upload] ❌ Immediate extract failed for simple file:', extractErr);
						console.error('[Upload] Error details:', extractErr.stack);
						// Fallback to async queue if immediate extract fails
						getEnqueueExtract().then(enqueueExtract => {
							enqueueExtract(doc.id).catch((err) => {
								console.error('[Upload] Failed to enqueue extract:', err);
							});
						}).catch(() => {});
					}
				}
			} catch (extractErr: any) {
				console.warn('[Upload] Failed to do immediate extract, will use async:', extractErr);
				console.warn('[Upload] Error details:', extractErr.stack);
				// Fallback to async extraction
				try {
					const enqueueExtract = await getEnqueueExtract();
					enqueueExtract(doc.id).catch((err) => {
						console.error('[Upload] Failed to enqueue extract:', err);
					});
				} catch (enqueueErr: any) {
					console.error('[Upload] Failed to load enqueueExtract module:', enqueueErr);
				}
			}
		} else {
			// For complex files (doc, pdf, rtf, etc.), use async extraction
			// This ensures upload returns immediately while processing happens in background
			try {
				const enqueueExtract = await getEnqueueExtract();
				enqueueExtract(doc.id).catch((err) => {
					console.error('[Upload] Failed to enqueue extract:', err);
					// Log error but don't fail the upload
				});
			} catch (enqueueErr: any) {
				console.error('[Upload] Failed to load enqueueExtract module:', enqueueErr);
				// Continue even if enqueue module fails to load
			}
		}

		// Log audit (non-blocking - don't fail upload if audit fails)
		try {
			await logAudit({
				action: 'document.upload',
				userId: String(session.sub),
				resourceType: 'document',
				resourceId: doc.id,
				metadata: { topicId: topicIdOut, fileKey: key, mime, size, isNewTopic: !topicId },
				ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
				userAgent: req.headers.get('user-agent') || undefined,
			});
		} catch (auditErr: any) {
			console.warn('[Upload] Failed to log audit (non-fatal):', auditErr);
			// Continue even if audit fails
		}

		// Return immediately - AI processing will happen in background
		return NextResponse.json({ ok: true, topicId: topicIdOut, documentId: doc.id }, {
			status: 200,
			headers: { 
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store'
			}
		});
	} catch (err: any) {
		// Log full error details
		console.error('[Upload Complete] Unexpected error:', err);
		console.error('[Upload Complete] Error stack:', err?.stack);
		console.error('[Upload Complete] Error name:', err?.name);
		console.error('[Upload Complete] Error message:', err?.message);
		
		// Always return JSON, never HTML
		const errorMessage = err?.message || '完成上传失败';
		const errorDetails = process.env.NODE_ENV === 'development' 
			? { 
				message: errorMessage,
				stack: err?.stack,
				name: err?.name,
				type: typeof err
			}
			: { message: errorMessage };
		
		return NextResponse.json(errorDetails, { 
			status: 500,
			headers: { 
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store'
			}
		});
	}
}


