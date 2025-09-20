# SSL Setup für Cloudflare

## Cloudflare Origin Certificate erstellen

1. Loggen Sie sich in Ihr Cloudflare Dashboard ein
2. Wählen Sie die Domain `lsc-nc.de` aus
3. Gehen Sie zu **SSL/TLS** > **Origin Server**
4. Klicken Sie auf **Create Certificate**
5. Konfigurieren Sie das Zertifikat:
   - **Hostnames**: `lsc-nc.de`, `*.lsc-nc.de`
   - **Certificate Validity**: 15 years
   - **Key type**: RSA (2048)

6. Kopieren Sie das **Origin Certificate** und speichern Sie es als `cloudflare-origin.pem`
7. Kopieren Sie den **Private Key** und speichern Sie ihn als `cloudflare-origin.key`

## Cloudflare SSL/TLS Einstellungen

1. Gehen Sie zu **SSL/TLS** > **Overview**
2. Setzen Sie den **SSL/TLS encryption mode** auf **Full (strict)**

## Nginx Konfiguration

Die Nginx-Konfiguration ist bereits für Cloudflare optimiert:
- Cloudflare IP-Ranges für echte IP-Erkennung
- HTTPS-Weiterleitung von HTTP
- Cloudflare-spezifische Header
- SSL-Konfiguration für Origin Server

## Deployment

Nach dem Erstellen der Zertifikate:

```bash
# Produktionsumgebung starten
docker-compose -f docker-compose.prod.yml up -d

# Logs überprüfen
docker-compose -f docker-compose.prod.yml logs nginx
```
