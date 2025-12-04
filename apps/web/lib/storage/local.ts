import { promises as fs } from 'fs';
import { join } from 'path';
import { mkdir } from 'fs/promises';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
	try {
		await fs.access(UPLOAD_DIR);
	} catch {
		await mkdir(UPLOAD_DIR, { recursive: true });
	}
}

export function makeObjectKey(userId: string, filename: string): string {
	const ts = new Date().toISOString().replace(/[:.]/g, '-');
	const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
	return `uploads/${userId}/${ts}-${safe}`;
}

export function getLocalFilePath(key: string): string {
	return join(UPLOAD_DIR, key.replace(/^uploads\//, ''));
}

export async function saveFile(key: string, buffer: Buffer): Promise<void> {
	await ensureUploadDir();
	const filePath = getLocalFilePath(key);
	const dir = join(filePath, '..');
	await mkdir(dir, { recursive: true });
	await fs.writeFile(filePath, buffer);
}

export async function fileExists(key: string): Promise<boolean> {
	try {
		const filePath = getLocalFilePath(key);
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function getFile(key: string): Promise<Buffer> {
	const filePath = getLocalFilePath(key);
	return await fs.readFile(filePath);
}

export function getFileUrl(key: string): string {
	// In local dev, serve files via Next.js API route
	return `/api/files/${encodeURIComponent(key)}`;
}










