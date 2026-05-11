import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findAll() {
    return this.notesService.findAll();
  }

  @Post()
  create(@CurrentUser() user: any, @Body() data: { content: string }) {
    return this.notesService.create(user, data);
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { content: string },
  ) {
    return this.notesService.update(user, id, data);
  }

  @Patch(':id/archive')
  toggleArchive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notesService.toggleArchive(user, id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.notesService.getHistory(id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notesService.delete(user, id);
  }
}
