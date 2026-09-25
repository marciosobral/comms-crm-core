import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AttachmentsModule } from "./attachments";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { envSchema } from "./config";
import { CustomersModule } from "./customers";
import { ImportsModule } from "./imports";
import { LoggingModule } from "./logging";
import { NotificationsModule } from "./notifications";
import { PermissionsModule } from "./permissions";
import { PlansModule } from "./plans";
import { PrismaModule } from "./prisma";
import { ReportsModule } from "./reports";
import { RolesModule } from "./roles";
import { SalesModule } from "./sales";
import { SettingsModule } from "./settings";
import { UsersModule } from "./users";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ConfigModule.forRoot({
      validate: (config) => envSchema.parse(config),
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
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
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
