import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { MidtransService } from 'src/midtrans/midtrans.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: any;
  let midtrans: any;
  let notifications: any;
  
// Data dummy Arrange
  const mockOrder = {
    id: 1,
    status: OrderStatus.REFUND_APPROVED_WAITING_FINANCE,
    clientId: 10,
    merchantId: 20,
    totalAmount: new Decimal(100000),
    adminFee: new Decimal(5000),
    paymentMethod: 'midtrans',
    midtransTransactionId: '123456789',
  }
    
  

  beforeEach(async () => {

    const mockPrisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(mockOrder),
      },
      merchant: {
        update: jest.fn(),
      },
      dispute: {
        updateMany: jest.fn()
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const mockMidtrans = {
      createRefund: jest.fn(),
    };

    const mockNotifications = {
      create: jest.fn(),
    };


    const module: TestingModule = await Test.createTestingModule({
    providers: [TransactionsService, { provide: PrismaService, useValue: mockPrisma }, { provide: MidtransService, useValue: mockMidtrans }, { provide: NotificationsService, useValue: mockNotifications }],
    }).compile();
    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);
    midtrans = module.get<MidtransService>(MidtransService);
    notifications = module.get<NotificationsService>(NotificationsService);

    jest.spyOn(service as any, 'checkAdminRole').mockResolvedValue(true);
  });

  // afterEach(() => {
  //   jest.clearAllMocks();
  // })
  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Arrange
  describe('refundTransaction', () => {
    it('berhasil melakukan refund jika data transaksi valid', async () => {

      // Arrange
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      midtrans.createRefund.mockResolvedValue({ fraud_status: 'success' });

      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.REFUNDED,
      });
    
      
      // ACT
      const result =await service.refundTransaction(1,1)

      // ASSERT
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });

      expect(midtrans.createRefund).toHaveBeenCalledWith(
        '123456789',
        100000,
        'Dispute resolved — refund approved by validator'
      )
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: OrderStatus.REFUNDED }
      })
      expect(notifications.create).toHaveBeenCalledWith(
        mockOrder.clientId,
  NotificationType.ORDER_REFUNDED,
  'Sengketa Diselesaikan — Refund Diproses',
  expect.any(String),
  JSON.stringify({ orderId: mockOrder.id }),
      );
      expect(result.status).toBe(OrderStatus.REFUNDED)
    });

    it('transaksi tidak ada di database', async () => {
      // Arrange
      prisma.order.findUnique.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.refundTransaction(1,9999)).rejects.toThrow(NotFoundException);

    });
  })
});
