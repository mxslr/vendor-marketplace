import { Module, Global } from '@nestjs/common';
import { MidtransService } from './midtrans.service';

@Global()
@Module({
  providers: [MidtransService],
  exports: [MidtransService],
})
export class MidtransModule {}
