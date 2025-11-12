import { Module } from '@nestjs/common';
import { OrganigrammController } from './organigramm.controller';
import { OrganigrammService } from './organigramm.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrganigrammController],
  providers: [OrganigrammService],
  exports: [OrganigrammService],
})
export class OrganigrammModule {}

