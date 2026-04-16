import { Module, Global } from '@nestjs/common';
import { ExclusionService } from './exclusion.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ExclusionService],
  exports: [ExclusionService],
})
export class ExclusionModule {}
