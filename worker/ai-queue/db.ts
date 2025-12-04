// Worker-specific Prisma Client initialization
// This ensures Prisma Client is properly initialized for the worker process
import { PrismaClient } from '@prisma/client';

declare global {
	// eslint-disable-next-line no-var
	var prismaWorker: PrismaClient | undefined;
}

// Use the same pattern as web app to avoid multiple instances
export const prisma = global.prismaWorker || new PrismaClient({
	// Ensure we use the same schema path
	log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
	global.prismaWorker = prisma;
}








