-- Migration: Sicario-Kleidungsvorlage hinzufügen
-- Erstellt eine leere Kleidungsvorlage für Sicarios, die von der Leaderschaft angepasst werden kann

-- Prüfen ob SICARIO Vorlage bereits existiert
INSERT INTO rank_clothing_templates (
  id,
  rankGroup,
  maskItemMale, maskVariationMale, maskCustomizableMale, maskColorMale,
  maskItemFemale, maskVariationFemale, maskCustomizableFemale, maskColorFemale,
  torsoItemMale, torsoVariationMale, torsoCustomizableMale, torsoColorMale,
  torsoItemFemale, torsoVariationFemale, torsoCustomizableFemale, torsoColorFemale,
  tshirtItemMale, tshirtVariationMale, tshirtCustomizableMale, tshirtColorMale,
  tshirtItemFemale, tshirtVariationFemale, tshirtCustomizableFemale, tshirtColorFemale,
  vesteItemMale, vesteVariationMale, vesteCustomizableMale, vesteColorMale,
  vesteItemFemale, vesteVariationFemale, vesteCustomizableFemale, vesteColorFemale,
  hoseItemMale, hoseVariationMale, hoseCustomizableMale, hoseColorMale,
  hoseItemFemale, hoseVariationFemale, hoseCustomizableFemale, hoseColorFemale,
  schuheItemMale, schuheVariationMale, schuheCustomizableMale, schuheColorMale,
  schuheItemFemale, schuheVariationFemale, schuheCustomizableFemale, schuheColorFemale,
  createdAt,
  updatedAt
)
SELECT 
  CONCAT('sicario-clothing-', UUID()),
  'SICARIO',
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NULL, NULL, FALSE, NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM rank_clothing_templates WHERE rankGroup = 'SICARIO'
);

-- Verifikation
SELECT 
  rankGroup,
  CASE 
    WHEN maskItemMale IS NULL THEN 'Nicht festgelegt'
    ELSE CONCAT('Item: ', maskItemMale)
  END as maskStatus,
  createdAt
FROM rank_clothing_templates 
WHERE rankGroup = 'SICARIO';

