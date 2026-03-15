import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(
    @Request() req: { user: { sub: string | number } },
    @Body() body: { orderId: number; rating: number; comment?: string },
  ) {
    return this.reviewsService.createReview(
      Number(req.user.sub),
      body.orderId,
      body.rating,
      body.comment,
    );
  }
}
