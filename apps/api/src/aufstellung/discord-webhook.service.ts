import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordWebhookService {
  private readonly webhookUrl: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('DISCORD_WEBHOOK_URL');
    this.baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  async sendAufstellungNotification(aufstellung: any) {
    if (!this.webhookUrl) {
      console.warn('DISCORD_WEBHOOK_URL nicht konfiguriert, überspringe Discord-Benachrichtigung');
      return;
    }

    const aufstellungDate = new Date(aufstellung.date);
    
    // Unix Timestamp für Discord (Sekunden seit 1970)
    const unixTimestamp = Math.floor(aufstellungDate.getTime() / 1000);
    
    // Formatiere Datum und Uhrzeit für statische Anzeige
    const dateStr = aufstellungDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = aufstellungDate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    });

    // Erstelle Discord Embed
    const embed = {
      title: '📋 AUFSTELLUNG - CASA',
      description: '¡HOLA COMPADRES! 👥\n\nEine neue Aufstellung wurde erstellt!\n\n¡La familia se organiza para la actividad! 📊',
      color: 0xD4AF37, // Gold
      fields: [
        {
          name: '📅 TERMIN',
          value: `${dateStr} um ${timeStr} Uhr (Deutsche Zeit)`,
          inline: false,
        },
        {
          name: '📍 ORT / GRUND',
          value: aufstellung.reason,
          inline: false,
        },
        {
          name: '⏰ DEADLINE',
          value: `<t:${unixTimestamp}:R>`,
          inline: false,
        },
        {
          name: '🔗 LINK',
          value: `[Zur Aufstellung](${this.baseUrl}/aufstellungen)`,
          inline: false,
        },
      ],
      footer: {
        text: '¡Reacciona rápido, compadre! Die Zeit läuft...',
      },
      timestamp: new Date().toISOString(),
    };

    // Sende an Discord
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'Aufstellungen Bot',
          content: '@everyone',
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord API Fehler: ${response.status}`);
      }

      console.log('✅ Discord-Benachrichtigung erfolgreich gesendet');
    } catch (error) {
      console.error('❌ Fehler beim Senden der Discord-Benachrichtigung:', error);
      throw error;
    }
  }
}

