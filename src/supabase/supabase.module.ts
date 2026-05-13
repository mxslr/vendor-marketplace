import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { SupabaseController } from './supabase.controller';

@Module({
  providers: [SupabaseService],
  controllers: [SupabaseController],
  exports: [SupabaseService],
})
export class SupabaseModule {}
