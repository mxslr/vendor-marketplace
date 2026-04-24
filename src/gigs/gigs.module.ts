import { Module } from '@nestjs/common';
import { GigsService } from './gigs.service';
import { GigsController } from './gigs.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [GigsService],
  controllers: [GigsController],
  exports: [GigsService]
})
export class GigsModule {}
