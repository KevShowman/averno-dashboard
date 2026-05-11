-- AlterTable: add updatedById to notes
ALTER TABLE "notes" ADD COLUMN "updatedById" TEXT;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: note_history
CREATE TABLE "note_history" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "note_history" ADD CONSTRAINT "note_history_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_history" ADD CONSTRAINT "note_history_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
