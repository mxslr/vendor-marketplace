import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { AuthModule } from 'src/auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [AuthModule, SupabaseModule],
  providers: [DisputesService],
  controllers: [DisputesController],
})
export class DisputesModule {}
