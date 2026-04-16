-- Entfernung des CONFIRMED Status aus WeeklyDeliveryStatus
-- Alle CONFIRMED deliveries werden zu PAID gesetzt
UPDATE `weekly_deliveries` SET `status` = 'PAID' WHERE `status` = 'CONFIRMED';

-- Der CONFIRMED enum-Wert wird durch Prisma Migration automatisch entfernt

