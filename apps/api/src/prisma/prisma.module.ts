import { Global, Module } from "@nestjs/common";
import { DatabaseAdmin } from "./database-admin";
import { PrismaService } from "./prisma.service";
import { SandboxClientFactory } from "./sandbox-client-factory";
import { SandboxRegistry } from "./sandbox-registry";

@Global()
@Module({
  providers: [PrismaService, SandboxRegistry, DatabaseAdmin, SandboxClientFactory],
  exports: [PrismaService, SandboxRegistry, DatabaseAdmin, SandboxClientFactory],
})
export class PrismaModule {}
