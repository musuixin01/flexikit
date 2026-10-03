import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ToolsModule } from './tools/tools.module';
import { CategoriesModule } from './categories/categories.module';
import { FavoritesModule } from './favorites/favorites.module';
import { OrdersModule } from './orders/orders.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { SeedModule } from './seed/seed.module';
import { StatsModule } from './stats/stats.module'; // 确保这一行存在
import { DiscoveryModule } from './discovery/discovery.module';
import { CrawlerModule } from './crawler/crawler.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { RequestLoggingMiddleware } from './common/logging/request-logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migration/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: false,
        // 生产环境关闭 SQL 日志，避免泄露敏感信息
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ToolsModule,
    CategoriesModule,
    FavoritesModule,
    OrdersModule,
    RecommendationsModule,
    EmbeddingModule,
    SeedModule,
    StatsModule, // 已添加
    DiscoveryModule,
    CrawlerModule,
    AiModule,
    AdminModule,
  ],
  controllers: [AppController], // 这里只保留 AppController
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
