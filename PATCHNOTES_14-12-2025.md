# 📋 Patchnotes - 14. Dezember 2025

## 🆕 Neue Module

### 🗣️ Akzent / Slang Modul
- **Neues Modul** für den spanischen Cartel-Akzent der Familia
- **87+ Vokabeln** in 10 Kategorien:
  - 👋 Grüße (Hola, Buenos días, Hasta luego, etc.)
  - 💗 Höflichkeit (¿Cómo estás?, Gracias, Por favor, etc.)
  - 📻 Funk (¿Cómo?, ¡Ayuda!, Entendido, Confirmado, etc.)
  - 👨‍👩‍👧‍👦 Familie (Hermano, Hermana, El Patrón, Soldado, etc.)
  - ⚔️ Konflikte (Enemigo, Peligro, Venganza, Honor, etc.)
  - 📍 Orte (Casa, Ciudad, Territorio, etc.)
  - 💰 Geschäft (Dinero, Negocio, Mercancía, etc.)
  - 🚗 Ausrüstung (Carro, Arma, Teléfono, etc.)
  - ⏰ Zeit (Ahora, Hoy, Mañana, ¡Rápido!, etc.)
  - ⭐ Phrasen (Por la familia, Vámonos, Cuídate, etc.)
- Schnellreferenz-Karten für die wichtigsten Wörter
- Hinweis zur spanischen Interpunktion (¿...? und ¡...!)
- Erreichbar unter **Kommunikation → Akzent / Slang**
- Im Dashboard als Modul-Karte hinzugefügt

---

## 🗺️ Listenführung & Interaktive Karte

### Listenführung
- Ansicht für alle Mitglieder (nur Kontaktdetails für Berechtigte)

### Interaktive Karte
- **Vorschlagssystem:**
  - Normale Benutzer können Kartenänderungen vorschlagen (Rechtsklick)
  - Leadership kann Vorschläge prüfen und genehmigen/ablehnen
  - **Vorschau-Funktion**: "Vorschau"-Button zeigt Ghost-Marker an Position
  - Karte zoomt automatisch zur vorgeschlagenen Position
- **Kontaktdetails-Schutz:**
  - Nur Contacto, Leadership oder per Berechtigung freigeschaltete User sehen Kontaktdetails im Popup

---

## 👔 Kleidungssystem

### Männer-Outfits
- **5 vordefinierte Outfits** statt rangbasierter Kleidung
- Leadership kann Outfits mit allen Nummern konfigurieren
- Outfit-Bild wird links neben der Nummer-Tabelle angezeigt (vertikal zentriert)
- Statische Bilder unter `/outfit-images/outfit-{1-5}.png`

### Frauen
- **Freie Klamottenwahl** auf allen Rängen
- Nur Farbe, Maske, Weste und Hose sind vorgegeben
- Accessoires frei wählbar

---

## 🔫 Sicario Division

### Sicario-Aufstellungen
- **Abmeldungen-Integration:** Abgemeldete Sicarios werden automatisch als "Nicht dabei" markiert
- Gleiche Logik wie bei normalen Aufstellungen

---

## 🔧 Technische Verbesserungen

### Docker & Deployment
- **Dockerfile.prod**: Outfit-Bilder werden jetzt korrekt nach `/usr/share/nginx/html/outfit-images/` kopiert
- **nginx.conf**: Neue Location-Rule für `/outfit-images/` statische Assets mit 1 Jahr Caching
- `.gitkeep` Datei für `outfit-images` Ordner zur Git-Versionierung

---

## 📝 Hinweise

- **Outfit-Bilder:** Müssen als `outfit-1.png` bis `outfit-5.png` im `public/outfit-images/` Ordner abgelegt werden
- Nach Deployment: Container neu bauen mit `docker-compose build --no-cache web`

---

*La Familia se cuida, Compadres!* 🏴‍☠️
