import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth";
import { envSchema } from "./config";
import { LoggingModule } from "./logging";
import { PrismaModule } from "./prisma";

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => envSchema.parse(config),
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    LoggingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
