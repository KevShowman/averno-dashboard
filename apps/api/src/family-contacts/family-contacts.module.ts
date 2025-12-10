import { Module } from '@nestjs/common';
import { FamilyContactsController } from './family-contacts.controller';
import { FamilyContactsService } from './family-contacts.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FamilyContactsController],
  providers: [FamilyContactsService],
  exports: [FamilyContactsService],
})
export class FamilyContactsModule {}

