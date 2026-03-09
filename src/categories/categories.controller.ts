import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // Endpoint: POST /categories
  @Post()
  @UseGuards(AuthGuard)
  async create(@Request() req, @Body() body: { name: string; commissionRate: number }) {
    return this.categoriesService.create(req.user.sub, body);
  }

  // Endpoint: GET /categories
  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }

  // Endpoint: GET /categories/:id
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  // Endpoint: PATCH /categories/:id
  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; commissionRate?: number },
  ) {
    return this.categoriesService.update(req.user.sub, id, body);
  }

  // Endpoint: DELETE /categories/:id
  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(req.user.sub, id);
  }
}