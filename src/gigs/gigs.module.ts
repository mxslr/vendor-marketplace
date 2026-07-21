import { Module } from '@nestjs/common';
import { GigsService } from './gigs.service';
import { GigsController } from './gigs.controller';
import { AuthModule } from 'src/auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AuthModule, StorageModule],
  providers: [GigsService],
  controllers: [GigsController],
  exports: [GigsService],
})
export class GigsModule {}
