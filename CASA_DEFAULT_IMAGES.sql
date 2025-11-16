-- Migration: Casa Default-Bilder in Datenbank eintragen
-- Fügt die 4 Standard-Bilder der Casa hinzu

-- Standard-Bild 1: Außen Einfahrt
INSERT INTO `casa_images` (`id`, `filename`, `path`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('casa-default-1-', REPLACE(UUID(), '-', '')) as id,
  'default-aussen-einfahrt.png' as filename,
  './uploads/casa/default-aussen-einfahrt.png' as path,
  NOW() as createdAt,
  NOW() as updatedAt
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM casa_images WHERE filename = 'default-aussen-einfahrt.png'
)
LIMIT 1;

-- Standard-Bild 2: Außen Terrasse und Pool
INSERT INTO `casa_images` (`id`, `filename`, `path`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('casa-default-2-', REPLACE(UUID(), '-', '')) as id,
  'default-aussen-terasseundpool.png' as filename,
  './uploads/casa/default-aussen-terasseundpool.png' as path,
  NOW() as createdAt,
  NOW() as updatedAt
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM casa_images WHERE filename = 'default-aussen-terasseundpool.png'
)
LIMIT 1;

-- Standard-Bild 3: Innen Barbereich
INSERT INTO `casa_images` (`id`, `filename`, `path`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('casa-default-3-', REPLACE(UUID(), '-', '')) as id,
  'default-innen-barbereich.png' as filename,
  './uploads/casa/default-innen-barbereich.png' as path,
  NOW() as createdAt,
  NOW() as updatedAt
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM casa_images WHERE filename = 'default-innen-barbereich.png'
)
LIMIT 1;

-- Standard-Bild 4: Innen Wohnzimmer
INSERT INTO `casa_images` (`id`, `filename`, `path`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('casa-default-4-', REPLACE(UUID(), '-', '')) as id,
  'default-innen-wohnzimmer.png' as filename,
  './uploads/casa/default-innen-wohnzimmer.png' as path,
  NOW() as createdAt,
  NOW() as updatedAt
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM casa_images WHERE filename = 'default-innen-wohnzimmer.png'
)
LIMIT 1;

-- Verifikation: Zeige alle Casa-Bilder
SELECT 
  filename,
  path,
  DATE_FORMAT(createdAt, '%d.%m.%Y %H:%i') as erstellt
FROM casa_images
ORDER BY createdAt DESC;
