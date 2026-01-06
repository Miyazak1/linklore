import { getOssClient, isLocalStorage } from '@/lib/storage/oss';
import { getFile } from '@/lib/storage/local';
import { prisma } from '@/lib/db/client';
import { cleanHtml } from './sanitize';
import { updateProcessingStatus } from './status';
import { processWithRetry } from './retry';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Extract');
import * as mammoth from 'mammoth';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { marked } from 'marked';
// pdf-parse is a CommonJS module, use dynamic import
const getPdfParse = async () => {
	const pdfParse = await import('pdf-parse');
	// pdf-parse 可能是 default export 或者 named export
	// 使用类型断言避免类型检查错误
	return (pdfParse as any).default || (pdfParse as any);
};

const pExecFile = promisify(execFile);

async function convertDocToDocx(buffer: Buffer): Promise<Buffer> {
	// Requires libreoffice installed on the system.
	// Write to tmp and run headless conversion.
	const fs = await import('node:fs/promises');
	const path = await import('node:path');
	const os = await import('node:os');
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'll-doc-'));
	const inPath = path.join(dir, 'input.doc');
	const outPath = path.join(dir, 'input.docx');
	await fs.writeFile(inPath, buffer);
	await pExecFile('libreoffice', ['--headless', '--convert-to', 'docx', '--outdir', dir, inPath], {
		timeout: 30_000
	});
	const out = await fs.readFile(outPath);
	return out;
}

export async function extractAndStore(documentId: string) {
	log.debug('Starting extraction', { documentId });
	
	// 更新状态为 processing
	await updateProcessingStatus(documentId, 'extract', 'processing');
	
	try {
		const doc = await prisma.document.findUnique({ where: { id: documentId } });
		if (!doc) throw new Error('Document not found');

		log.debug('Document found', { fileKey: doc.fileKey, mime: doc.mime });
	
	let buffer: Buffer;
	try {
		if (isLocalStorage()) {
			buffer = await getFile(doc.fileKey);
		} else {
					const client = getOssClient();
					const object = await client.get(doc.fileKey);
					if (!object.content) {
						throw new Error('File content is empty');
					}
					buffer = Buffer.isBuffer(object.content) ? object.content : Buffer.from(object.content);
		}
		log.debug('File loaded', { size: buffer.length });
	} catch (fileErr: any) {
		log.error('Failed to load file', fileErr);
		throw new Error(`文件加载失败: ${fileErr.message}`);
	}

	let html = '';
	try {
		if (doc.mime.includes('wordprocessingml') || doc.fileKey.endsWith('.docx')) {
			log.debug('Converting docx to HTML using mammoth');
			const { value } = await mammoth.convertToHtml({ buffer });
			html = value;
			log.debug('Docx conversion completed', { htmlLength: html.length });
	} else if (doc.fileKey.endsWith('.doc')) {
		const converted = await convertDocToDocx(buffer);
		const { value } = await mammoth.convertToHtml({ buffer: converted });
		html = value;
	} else if (doc.mime.startsWith('text/') || doc.fileKey.endsWith('.txt')) {
		const text = buffer.toString('utf-8');
		html = `<pre>${escapeHtml(text)}</pre>`;
	} else if (doc.fileKey.endsWith('.md') || doc.mime === 'text/markdown') {
		// Render markdown to HTML
		const text = buffer.toString('utf-8');
		const markedResult = marked(text, {
			breaks: true, // Convert line breaks to <br>
			gfm: true // GitHub Flavored Markdown
		});
		html = typeof markedResult === 'string' ? markedResult : await markedResult;
	} else if (doc.fileKey.endsWith('.pdf') || doc.mime === 'application/pdf') {
		// Extract text from PDF
		try {
			log.debug('Parsing PDF');
			const pdfParse = await getPdfParse();
			const pdfData = await pdfParse(buffer);
			const text = pdfData.text;
			html = `<pre>${escapeHtml(text)}</pre>`;
			log.debug('PDF parsing completed', { textLength: text.length });
		} catch (err: any) {
			log.error('PDF parsing error', err);
			throw new Error(`PDF 解析失败: ${err.message}`);
		}
	} else if (doc.fileKey.endsWith('.rtf')) {
		// RTF files - basic text extraction (full RTF parsing would require a library)
		const text = buffer.toString('utf-8');
		// Simple RTF text extraction (remove RTF control codes)
		const plainText = text.replace(/\{[^}]*\}/g, '').replace(/\\[a-z]+\d*\s?/gi, ' ').trim();
		html = `<pre>${escapeHtml(plainText)}</pre>`;
		} else {
			throw new Error('Unsupported type for extraction');
		}
	} catch (convertErr: any) {
		log.error('Conversion error', convertErr);
		throw new Error(`文档转换失败: ${convertErr.message}`);
	}

	log.debug('Cleaning HTML');
	const clean = cleanHtml(html);
	log.debug('HTML cleaned', { length: clean.length });
	
	// Try to extract title from document (before AI summary)
	// This allows topic title to be updated immediately
	let extractedTitle: string | null = null;
	try {
		// Method 1: Extract from HTML h1 tag
		const h1Match = clean.match(/<h1[^>]*>([^<]+)<\/h1>/i);
		if (h1Match && h1Match[1]) {
			extractedTitle = h1Match[1].trim().slice(0, 100);
		} else {
			// Method 2: Extract from first line of text (for plain text files)
			const textContent = clean.replace(/<[^>]+>/g, ' ').trim();
			const firstLine = textContent.split('\n')[0]?.trim();
			if (firstLine && firstLine.length > 5 && firstLine.length < 100) {
				// Check if it looks like a title (not too long, not too short)
				extractedTitle = firstLine;
			}
		}
		
		// Update topic title if we extracted one and topic title is still "处理中..."
		if (extractedTitle) {
			const topic = await prisma.topic.findUnique({ where: { id: doc.topicId } });
			if (topic && (topic.title === '处理中...' || !topic.title)) {
				await prisma.topic.update({
					where: { id: doc.topicId },
					data: { title: extractedTitle }
				});
				log.debug('Updated topic title from extracted text', { title: extractedTitle });
			}
		}
	} catch (titleErr: any) {
		log.warn('Failed to extract/update title', { error: titleErr });
		// Continue even if title extraction fails
	}
	
		// store into Document.extractedText (as bytes)
		log.debug('Saving extracted text to database');
		await prisma.document.update({
			where: { id: doc.id },
			data: { extractedText: Buffer.from(clean, 'utf-8') }
		});
		log.debug('Extracted text saved successfully');
		
		// 更新状态为 completed
		await updateProcessingStatus(documentId, 'extract', 'completed');
		
		// Trigger summarize job after extraction completes
		try {
			const { enqueueSummarize } = await import('@/lib/queue/jobs');
			const job = await enqueueSummarize(doc.id);
			log.debug('Summarize job enqueued', { jobId: job.id, jobName: job.name, documentId: doc.id });
		} catch (err: any) {
			log.error('Failed to enqueue summarize', err, { documentId: doc.id });
			// Continue even if summarize fails - can be retried manually
		}
		
		log.debug('Extraction completed successfully', { documentId });
		return { ok: true };
	} catch (error: any) {
		// 更新状态为 failed
		await updateProcessingStatus(documentId, 'extract', 'failed', error.message);
		log.error('Extraction failed', error, { documentId });
		throw error;
	}
}

function escapeHtml(str: string) {
	return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));
}


