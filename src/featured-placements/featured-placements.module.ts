import { Module } from '@nestjs/common';
import { FeaturedPlacementService } from './featured-placements.service';
import { FeaturedPlacementController } from './featured-placements.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, AuthModule, StorageModule],
  controllers: [FeaturedPlacementController],
  providers: [FeaturedPlacementService],
})
export class FeaturedPlacementModule {}
