import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { envSchema } from "./config";
import { LoggingModule } from "./logging";
import { PermissionsModule } from "./permissions";
import { PrismaModule } from "./prisma";
import { RolesModule } from "./roles";
import { SettingsModule } from "./settings";

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => envSchema.parse(config),
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    LoggingModule,
    PermissionsModule,
    AuditModule,
    RolesModule,
    SettingsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
