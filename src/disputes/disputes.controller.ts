import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DisputesService } from './disputes.service';
import { AuthGuard } from '../auth/auth.guard';
import { OpenDisputesDto } from './dto/open-disputes.dto';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('disputes')
export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async openDispute(
    @Request() req: RequestWithUser,
    @Body() body: OpenDisputesDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1024 * 1024 * 5,
            message: 'Ukuran file bukti maksimal 5MB',
          }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.disputesService.openDispute(
      req.user.sub,
      body.orderId,
      body.reason,
      file,
    );
  }
}
