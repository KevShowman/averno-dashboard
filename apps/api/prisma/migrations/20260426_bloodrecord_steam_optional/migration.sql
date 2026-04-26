-- Make steam field optional (nullable)
ALTER TABLE "blood_records" ALTER COLUMN "steam" DROP NOT NULL;
