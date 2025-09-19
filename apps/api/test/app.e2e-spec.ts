import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Health Check', () => {
    it('/api (GET)', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('LaSanta Calavera API is running! 💀');
    });

    it('/api/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('service', 'LaSanta Calavera API');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Modules', () => {
    it('/api/modules (GET) should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/modules')
        .expect(401);
    });
  });

  describe('Items', () => {
    it('/api/items (GET) should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/items')
        .expect(401);
    });
  });

  describe('Cash', () => {
    it('/api/cash/summary (GET) should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/cash/summary')
        .expect(401);
    });
  });
});

