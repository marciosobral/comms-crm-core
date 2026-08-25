import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import type { Env } from "./config";
import { WinstonLoggerService } from "./logging";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  app.useLogger(app.get(WinstonLoggerService));
  app.enableCors({ origin: config.get("CORS_ORIGIN") });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.get("PORT");
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
