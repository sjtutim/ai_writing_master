import { PrismaClient } from '../generated/prisma';
export declare const prisma: PrismaClient<{
    log: ("warn" | "error")[];
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, "warn" | "error", import("../generated/prisma/runtime/library").DefaultArgs>;
export declare function testPrismaConnection(): Promise<boolean>;
export declare function disconnectPrisma(): Promise<void>;
//# sourceMappingURL=prisma.d.ts.map