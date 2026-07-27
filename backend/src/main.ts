import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';
  const port = process.env.PORT ?? 3000;
  if (isProduction && !process.env.FRONTEND_URL?.trim()) {
    throw new Error('FRONTEND_URL is required in production');
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : isProduction
        ? []
        : [
          'http://localhost:3004',
          'http://127.0.0.1:3004',
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mvplab-api-key', 'X-CSRF-Token', 'x-paystack-signature'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('MVPLab API')
      .setDescription('The central API for the MVPLab ecosystem')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log(`Swagger documentation: http://localhost:${port}/docs`);
  }

  await app.listen(port);
  
  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
