import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { createValidationException } from './common/errors/validation-error';
import { API_VERSIONING_OPTIONS } from './common/versioning/api-versioning';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableVersioning(API_VERSIONING_OPTIONS);
  
  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: createValidationException,
  }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  
  // CORS 配置：根据环境限制允许的源
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get('NODE_ENV') || 'development';
  const corsOrigin = nodeEnv === 'production'
    ? (configService.get('CORS_ORIGIN') || 'https://flexikit.app').split(',')
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://tauri.localhost',
        'tauri://localhost',
      ];
  
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-Id', 'X-FlexiKit-Auth-Mode'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  });
  
  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`CORS origin: ${corsOrigin.join(', ')}`);
}
bootstrap();
