import { Module } from '@nestjs/common';
import { MemberFilesController } from './member-files.controller';
import { MemberFilesService } from './member-files.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MemberFilesController],
  providers: [MemberFilesService],
  exports: [MemberFilesService],
})
export class MemberFilesModule {}

