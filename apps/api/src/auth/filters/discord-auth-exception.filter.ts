import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class DiscordAuthExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Nur für Discord Callback Route
    if (request.url.includes('/auth/discord/callback')) {
      const exceptionResponse = exception.getResponse();
      const message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || 'Benutzer ist nicht im Discord-Server oder hat keine Rollen';

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const encodedMessage = encodeURIComponent(message);
      
      return response.redirect(`${frontendUrl}/discord-error?message=${encodedMessage}&type=discord_access`);
    }

    // Für alle anderen Routen: Standard JSON Response
    const status = exception.getStatus();
    response.status(status).json(exception.getResponse());
  }
}

