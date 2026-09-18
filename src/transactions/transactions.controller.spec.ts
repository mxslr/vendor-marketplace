import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppModule } from 'src/app.module';
import request from 'supertest';
import { OrderStatus } from '@prisma/client';
import { verify } from 'crypto';

describe('TransactionsController', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken!: string;
  let buyerToken!: string

  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = module.createNestApplication();

    app.useGlobalPipes(new ValidationPipe());
    await app.init()

    prisma= app.get<PrismaService>(PrismaService);


    const loginAdminResponse = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'finance@test.com',
        password: 'finance123',
        role: 'ADMIN_FINANCE'
      })

      adminToken = loginAdminResponse.body.data?.access_token
      console.log('Response admin login:', loginAdminResponse.body)

      const loginBuyerResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'client1@test.com',
        password: 'client123',
        role: 'CLIENT'
      })

      buyerToken = loginBuyerResponse.body.data?.access_token

      console.log('Response buyer login:', loginBuyerResponse.body)
  });

  afterAll(async () => {
    await app.close();
  })

  describe('PATCH /transactions/:id/refund', () => {
    // arrange
    it('harus mengembalikan status code 200/201', async () => {
      return request(app.getHttpServer())
      .patch('/transactions/1/refund')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminId: 4})
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe(OrderStatus.REFUNDED)
      });
    });

    it('harus mengembalikan 403 jika bukan admin', async () => {
      expect(buyerToken).toBeDefined();
      const response = await request(app.getHttpServer())
      .patch('/transactions/1/refund')
      .set('Authorization', `Bearer ${buyerToken}`)
      expect(response.status).toBe(403)
    })

    it('data tidak di temukan di database', async () => {
      return request(app.getHttpServer())
      .patch('/transactions/999/refund')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
    })
  })
});
