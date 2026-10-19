import { AuthModule } from "@/auth";
import { LoggingModule } from "@/logging";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DemoScheduler } from "./demo-scheduler";
import { DemoController } from "./demo.controller";
import { DemoService } from "./demo.service";
import { SandboxMiddleware } from "./sandbox.middleware";
import { TemplateBuilder } from "./template-builder";

@Module({
  imports: [AuthModule, LoggingModule, JwtModule.register({})],
  controllers: [DemoController],
  providers: [DemoService, TemplateBuilder, DemoScheduler, SandboxMiddleware],
})
export class DemoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SandboxMiddleware).forRoutes("*");
  }
}
