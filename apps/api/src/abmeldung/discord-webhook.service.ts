import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AbmeldungWebhookService {
  private readonly webhookUrl: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    // Nutze die separate Webhook URL für Abmeldungen (Channel ID: 1431388063195594983)
    this.webhookUrl = this.configService.get<string>('DISCORD_ABMELDUNG_WEBHOOK_URL');
    this.baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    
    if (!this.webhookUrl) {
      console.error('⚠️  DISCORD_ABMELDUNG_WEBHOOK_URL nicht konfiguriert! Abmeldungs-Benachrichtigungen werden nicht gesendet.');
    }
  }

  async sendAbmeldungNotification(abmeldung: any) {
    if (!this.webhookUrl) {
      console.warn('⚠️  DISCORD_ABMELDUNG_WEBHOOK_URL nicht konfiguriert, überspringe Discord-Benachrichtigung');
      return;
    }

    // Parse dates - extract date part and use local midnight (same as frontend)
    const startDateStr = abmeldung.startDate.split('T')[0];
    const endDateStr = abmeldung.endDate.split('T')[0];
    
    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T00:00:00');
    
    // Formatiere Datum für Discord
    const formattedStartDate = startDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formattedEndDate = endDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Berechne Anzahl Tage (EXAKT wie im Frontend)
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Ist es ein einzelner Tag oder ein Zeitraum?
    const isSingleDay = formattedStartDate === formattedEndDate;
    const dateRange = isSingleDay ? formattedStartDate : `${formattedStartDate} - ${formattedEndDate}`;

    // User Info
    const userName = abmeldung.user.icFirstName && abmeldung.user.icLastName
      ? `${abmeldung.user.icFirstName} ${abmeldung.user.icLastName}`
      : abmeldung.user.username;

    // Erstelle Discord Embed
    const embed = {
      title: '📅 ABMELDUNG',
      description: '¡HOLA COMPADRES!\n\nEin Familienmitglied hat sich abgemeldet.\n\n¡Un compañero estará ausente! 🚫',
      color: 0xFF6B6B, // Rot
      fields: [
        {
          name: '👤 MITGLIED',
          value: userName,
          inline: true,
        },
        {
          name: '📅 ZEITRAUM',
          value: dateRange,
          inline: true,
        },
        {
          name: '⏱️ DAUER',
          value: `${diffDays} Tag${diffDays !== 1 ? 'e' : ''}`,
          inline: true,
        },
      ],
      footer: {
        text: '¡Buen viaje, compadre! Wir sehen uns bald wieder.',
      },
      timestamp: new Date().toISOString(),
    };

    // Füge Grund hinzu, falls vorhanden
    if (abmeldung.reason) {
      embed.fields.push({
        name: '📝 GRUND',
        value: abmeldung.reason,
        inline: false,
      });
    }

    // Link zur Abmeldungsseite
    embed.fields.push({
      name: '🔗 LINK',
      value: `[Zur Abmeldungsseite](${this.baseUrl}/abmeldungen)`,
      inline: false,
    });

    // Sende an Discord
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'Abmeldungen Bot',
          avatar_url: 'https://cdn.discordapp.com/emojis/1234567890.png', // Optional: Custom Avatar
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord API Fehler: ${response.status}`);
      }

      console.log('✅ Abmeldungs-Benachrichtigung erfolgreich an Discord gesendet');
    } catch (error) {
      console.error('❌ Fehler beim Senden der Abmeldungs-Benachrichtigung:', error);
      // Fehler nicht werfen, damit die Abmeldung trotzdem erstellt wird
      console.error(error);
    }
  }
}

