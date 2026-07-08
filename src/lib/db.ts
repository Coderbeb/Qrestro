import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Cache in both dev and production to avoid cold-start connection overhead
globalForPrisma.prisma = prisma;

export default prisma;
