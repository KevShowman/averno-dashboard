/**
 * Map Tile Generator Script
 * 
 * Generiert Tile-Pyramiden aus hochauflösenden Kartenbildern für Leaflet.
 * 
 * Usage: node scripts/generate-map-tiles.js
 * 
 * Input:  apps/web/map-sources/{map-name}.png
 * Output: apps/web/assets/map-tiles/{map-name}/{z}/{x}/{y}.png
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Karten-Konfiguration
const MAPS = [
  { name: 'narco-city', expectedWidth: 6144, expectedHeight: 9216 },
  { name: 'roxwood', expectedWidth: 3415, expectedHeight: 2362 },
  { name: 'cayo-perico', expectedWidth: 1819, expectedHeight: 1773 },
];

const TILE_SIZE = 256;
const SOURCE_DIR = path.join(process.cwd(), 'apps/web/map-sources');
const OUTPUT_DIR = path.join(process.cwd(), 'apps/web/assets/map-tiles');

/**
 * Berechnet die maximale Zoom-Stufe basierend auf Bildgröße
 */
function calculateMaxZoom(width, height) {
  const maxDimension = Math.max(width, height);
  return Math.ceil(Math.log2(maxDimension / TILE_SIZE));
}

/**
 * Erstellt Verzeichnis rekursiv falls nicht vorhanden
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generiert alle Tiles für eine Zoom-Stufe
 */
async function generateTilesForZoom(sourceBuffer, config, zoom, originalWidth, originalHeight) {
  const scale = Math.pow(2, zoom) / Math.pow(2, config.maxZoom);
  const scaledWidth = Math.round(originalWidth * scale);
  const scaledHeight = Math.round(originalHeight * scale);
  
  // Skaliere das Bild für diese Zoom-Stufe
  const resizedBuffer = await sharp(sourceBuffer)
    .resize(scaledWidth, scaledHeight, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .toBuffer();

  const tilesX = Math.ceil(scaledWidth / TILE_SIZE);
  const tilesY = Math.ceil(scaledHeight / TILE_SIZE);
  
  const zoomDir = path.join(OUTPUT_DIR, config.name, zoom.toString());
  ensureDir(zoomDir);

  let tileCount = 0;

  for (let x = 0; x < tilesX; x++) {
    const xDir = path.join(zoomDir, x.toString());
    ensureDir(xDir);

    for (let y = 0; y < tilesY; y++) {
      const left = x * TILE_SIZE;
      const top = y * TILE_SIZE;
      
      // Berechne die tatsächliche Tile-Größe (kann am Rand kleiner sein)
      const tileWidth = Math.min(TILE_SIZE, scaledWidth - left);
      const tileHeight = Math.min(TILE_SIZE, scaledHeight - top);

      if (tileWidth <= 0 || tileHeight <= 0) continue;

      const tilePath = path.join(xDir, `${y}.png`);

      try {
        // Extrahiere den Tile-Bereich
        let tile = sharp(resizedBuffer).extract({
          left,
          top,
          width: tileWidth,
          height: tileHeight,
        });

        // Wenn der Tile kleiner als TILE_SIZE ist, erweitere mit transparentem Hintergrund
        if (tileWidth < TILE_SIZE || tileHeight < TILE_SIZE) {
          tile = tile.extend({
            top: 0,
            bottom: TILE_SIZE - tileHeight,
            left: 0,
            right: TILE_SIZE - tileWidth,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          });
        }

        await tile.png({ compressionLevel: 9 }).toFile(tilePath);
        tileCount++;
      } catch (err) {
        console.error(`  Fehler bei Tile ${x}/${y}: ${err}`);
      }
    }
  }

  return tileCount;
}

/**
 * Generiert alle Tiles für eine Karte
 */
async function generateMapTiles(mapConfig) {
  const sourcePath = path.join(SOURCE_DIR, `${mapConfig.name}.png`);
  
  // Prüfe ob JPG existiert falls PNG nicht vorhanden
  let actualSourcePath = sourcePath;
  if (!fs.existsSync(sourcePath)) {
    const jpgPath = sourcePath.replace('.png', '.jpg');
    if (fs.existsSync(jpgPath)) {
      actualSourcePath = jpgPath;
    } else {
      console.log(`⏭️  ${mapConfig.name}: Quelldatei nicht gefunden, überspringe...`);
      return;
    }
  }

  console.log(`\n🗺️  Verarbeite ${mapConfig.name}...`);

  const image = sharp(actualSourcePath);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    console.error(`  ❌ Konnte Bildgröße nicht ermitteln`);
    return;
  }

  console.log(`  📐 Originalgröße: ${metadata.width}x${metadata.height}`);

  const maxZoom = calculateMaxZoom(metadata.width, metadata.height);
  console.log(`  🔍 Zoom-Level: 0-${maxZoom}`);

  const config = {
    name: mapConfig.name,
    width: metadata.width,
    height: metadata.height,
    maxZoom,
  };

  // Erstelle Output-Verzeichnis
  const mapOutputDir = path.join(OUTPUT_DIR, config.name);
  ensureDir(mapOutputDir);

  // Speichere Metadaten für das Frontend
  const metadataPath = path.join(mapOutputDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify({
    name: config.name,
    width: config.width,
    height: config.height,
    tileSize: TILE_SIZE,
    minZoom: 0,
    maxZoom: config.maxZoom,
  }, null, 2));

  // Kopiere auch das volle Bild als Fallback
  const fullImagePath = path.join(mapOutputDir, 'full.png');
  console.log(`  📋 Kopiere Vollbild als Fallback...`);
  await sharp(actualSourcePath)
    .png({ compressionLevel: 6 })
    .toFile(fullImagePath);

  // Lade Source-Buffer einmal für alle Zoom-Level
  const sourceBuffer = await image.toBuffer();
  let totalTiles = 0;

  // Generiere Tiles für jede Zoom-Stufe
  for (let zoom = 0; zoom <= maxZoom; zoom++) {
    process.stdout.write(`  📦 Zoom ${zoom}/${maxZoom}... `);
    const tileCount = await generateTilesForZoom(
      sourceBuffer,
      config,
      zoom,
      metadata.width,
      metadata.height
    );
    console.log(`${tileCount} Tiles`);
    totalTiles += tileCount;
  }

  console.log(`  ✅ Fertig! ${totalTiles} Tiles generiert`);
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🗺️  Map Tile Generator - La Santa Calavera');
  console.log('═══════════════════════════════════════════════════════');

  // Prüfe ob Source-Verzeichnis existiert
  if (!fs.existsSync(SOURCE_DIR)) {
    console.log(`\n📁 Erstelle Quellverzeichnis: ${SOURCE_DIR}`);
    ensureDir(SOURCE_DIR);
    console.log('\n⚠️  Bitte lege die Kartenbilder in diesem Ordner ab:');
    MAPS.forEach(m => {
      console.log(`   - ${m.name}.png (${m.expectedWidth}x${m.expectedHeight})`);
    });
    return;
  }

  // Erstelle Output-Verzeichnis
  ensureDir(OUTPUT_DIR);

  // Verarbeite jede Karte
  for (const mapConfig of MAPS) {
    await generateMapTiles(mapConfig);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ Tile-Generierung abgeschlossen!');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);

