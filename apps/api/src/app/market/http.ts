import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureHttp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Power Market Dashboard')
      .setVersion('1')
      .setDescription(
        'Hungarian solar and published balancing offers. All intervals are end-exclusive. Missing data is never zero.',
      )
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
}
