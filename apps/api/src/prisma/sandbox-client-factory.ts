import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";

const SANDBOX_POOL_SIZE = 2;

@Injectable()
export class SandboxClientFactory {
  create(connectionString: string): PrismaClient {
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString, max: SANDBOX_POOL_SIZE }),
    });
  }
}
