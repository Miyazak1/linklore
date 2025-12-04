// Worker-specific database client
// This file provides a direct import path for Prisma client in the worker environment
// to avoid path alias resolution issues

import { PrismaClient } from '@prisma/client';

// Import Prisma client from the web app's generated location
// The Prisma client is generated in apps/web/node_modules/.prisma/client
// In a monorepo, we need to find it relative to the worker location
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to import from the web app's Prisma client location
// In a pnpm monorepo, Prisma client should be hoisted to the root
let prisma: PrismaClient;

try {
	// First, try to import from the standard location (hoisted in monorepo)
	prisma = new PrismaClient();
} catch (err) {
	// Fallback: try to import from web app's node_modules
	try {
		const prismaPath = resolve(__dirname, '../../apps/web/node_modules/.prisma/client');
		const PrismaClientModule = await import(prismaPath);
		prisma = new PrismaClientModule.PrismaClient();
	} catch (fallbackErr) {
		// Last resort: create a new instance (should work if Prisma is installed)
		prisma = new PrismaClient();
	}
}

export { prisma };



