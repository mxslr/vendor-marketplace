import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MerchantsModule } from './merchants/merchants.module';
import { GigsModule } from './gigs/gigs.module';
import { OrdersModule } from './orders/orders.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MerchantAssociatesModule } from './merchant-associates/merchant-associates.module';
import { AdminValidatorModule } from './admin-validator/admin-validator.module';
import { DisputesModule } from './disputes/disputes.module';
import { CustomOffersModule } from './custom-offers/custom-offers.module';
import { CategoriesModule } from './categories/categories.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { FeaturedPlacementModule } from './featured-placements/featured-placements.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { MonthlyReportModule } from './monthly-report/monthly-report.module';
import { ConfigModule } from '@nestjs/config';
import { StreamModule } from './chat/stream.module';
@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    MerchantsModule,
    GigsModule,
    OrdersModule,
    DeliverablesModule,
    ReviewsModule,
    MerchantAssociatesModule,
    AdminValidatorModule,
    DisputesModule,
    CustomOffersModule,
    CustomOffersModule,
    CategoriesModule,
    BankAccountsModule,
    WithdrawalsModule,
    CustomOffersModule,
    FeaturedPlacementModule,
    MonthlyReportModule,
    StreamModule,
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
