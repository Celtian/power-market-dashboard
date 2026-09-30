import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureHttp(app: INestApplication) {
  app.setGlobalPrefix('api');

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Power Market Dashboard Importer')
      .setVersion('1')
      .setDescription('Imports power-market data from ENTSO-E and exposes importer HTTP endpoints.')
      .build(),
  );

  SwaggerModule.setup('api/docs', app, document);
}
