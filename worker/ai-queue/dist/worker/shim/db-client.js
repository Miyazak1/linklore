// Worker-specific database client shim
// This provides a direct path to Prisma client without using @/ aliases
import { PrismaClient } from '@prisma/client';
export const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production')
    global.prisma = prisma;
