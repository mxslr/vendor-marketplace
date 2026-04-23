import { Module } from '@nestjs/common';
import { FeaturedPlacementService} from './featured-placements.service';
import { FeaturedPlacementController} from './featured-placements.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [FeaturedPlacementController],
    providers: [FeaturedPlacementService],
})

export class FeaturedPlacementModule {}