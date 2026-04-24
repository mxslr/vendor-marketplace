import { Module } from '@nestjs/common';
import { FeaturedPlacementService} from './featured-placements.service';
import { FeaturedPlacementController} from './featured-placements.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [FeaturedPlacementController],
    providers: [FeaturedPlacementService],
})

export class FeaturedPlacementModule {}