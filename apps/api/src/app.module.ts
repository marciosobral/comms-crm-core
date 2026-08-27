import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AttachmentsModule } from "./attachments";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { envSchema } from "./config";
import { CustomersModule } from "./customers";
import { ImportsModule } from "./imports";
import { LoggingModule } from "./logging";
import { PermissionsModule } from "./permissions";
import { PlansModule } from "./plans";
import { PrismaModule } from "./prisma";
import { RolesModule } from "./roles";
import { SalesModule } from "./sales";
import { SettingsModule } from "./settings";
import { UsersModule } from "./users";

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
    PlansModule,
    UsersModule,
    CustomersModule,
    SalesModule,
    AttachmentsModule,
    ImportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
