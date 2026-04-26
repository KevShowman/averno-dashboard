-- Change telefon column from INT4 to TEXT to support large phone numbers
ALTER TABLE "blood_records" DROP CONSTRAINT IF EXISTS "blood_records_telefon_status_key";
ALTER TABLE "blood_records" ALTER COLUMN "telefon" TYPE TEXT USING "telefon"::TEXT;
ALTER TABLE "blood_records" ADD CONSTRAINT "blood_records_telefon_status_key" UNIQUE ("telefon", "status");
