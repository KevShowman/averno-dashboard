import { Module } from '@nestjs/common';
import { CasaController } from './casa.controller';
import { CasaService } from './casa.service';
import { CasaInitService } from './casa-init.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CasaController],
  providers: [CasaService, CasaInitService],
})
export class CasaModule {}

