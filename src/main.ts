import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as hbs from 'hbs';
import { join } from 'path';
import * as morgan from 'morgan';
import { AppModule } from './modules/app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // set up view engine
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');
  hbs.registerPartials(join(__dirname, '..', 'views', 'partials'));

  // set up request logger
  app.use(
    morgan('tiny', {
      stream: {
        write: (message) => Logger.log(message.replace('\n', '')),
      },
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;

  // set up swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Newspaper API')
    .setDescription('The newspaper API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);

  Logger.log(`Listening on port ${port}`, 'NestApplication');
}
bootstrap();
