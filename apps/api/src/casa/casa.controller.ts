import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CasaService } from './casa.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('casa')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CasaController {
  constructor(private readonly casaService: CasaService) {}

  @Get()
  async getCasaInfo() {
    return this.casaService.getCasaInfo();
  }

  @Put('location')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  async updateLocation(@Body() data: { postalCode: string; additionalInfo: string }) {
    return this.casaService.updateLocation(data.postalCode, data.additionalInfo);
  }

  @Post('images')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/casa',
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Nur Bilddateien sind erlaubt'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Keine Datei hochgeladen');
    }
    return this.casaService.addImage(file.filename, file.path);
  }

  @Delete('images/:id')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  async deleteImage(@Param('id') id: string) {
    return this.casaService.deleteImage(id);
  }
}

