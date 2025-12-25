import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
  });

  // Enable CORS
  // Allow localhost for local dev, Vercel deployments, and any additional frontend URLs from env
  const allowedOrigins = [
    'http://localhost:3000',
    'https://v0-fashion-advisory-dashboard-prdv4qk99-brscn2s-projects.vercel.app',
    /\.vercel\.app$/, // Allows ANY Vercel app subdomain
  ];

  // Add FRONTEND_URL from environment if provided
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    // Check if it's already in the array (as a string)
    const isAlreadyIncluded = allowedOrigins.some(
      (origin) => typeof origin === 'string' && origin === frontendUrl
    );
    if (!isAlreadyIncluded) {
      allowedOrigins.push(frontendUrl);
    }
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin matches any allowed origin
      for (const allowedOrigin of allowedOrigins) {
        if (typeof allowedOrigin === 'string') {
          if (origin === allowedOrigin) {
            return callback(null, true);
          }
        } else if (allowedOrigin instanceof RegExp) {
          if (allowedOrigin.test(origin)) {
            return callback(null, true);
          }
        }
      }

      // Origin not allowed
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('AesthetIQ API')
    .setDescription('AI-fashion advisory web app API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('users')
    .addTag('analysis')
    .addTag('style-profile')
    .addTag('wardrobe')
    .addTag('chat')
    .addTag('webhooks')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Use PORT from environment or fallback to 3000
  const port = process.env.PORT || 3000;
  // Bind to 0.0.0.0 to accept external connections
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`Swagger documentation: http://0.0.0.0:${port}/api/docs`);
}
bootstrap();
