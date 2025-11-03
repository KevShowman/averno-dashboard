import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAbmeldungEndDates() {
  try {
    console.log('🔍 Suche Abmeldungen mit endDate auf 00:00:00...\n');
    
    const abmeldungen = await prisma.abmeldung.findMany();
    
    let fixed = 0;
    
    for (const abmeldung of abmeldungen) {
      const endDate = new Date(abmeldung.endDate);
      
      // Prüfe ob die Zeit auf 00:00:00 ist
      if (endDate.getHours() === 0 && endDate.getMinutes() === 0 && endDate.getSeconds() === 0) {
        // Setze auf 23:59:59
        endDate.setHours(23, 59, 59, 999);
        
        await prisma.abmeldung.update({
          where: { id: abmeldung.id },
          data: { endDate },
        });
        
        console.log(`✅ Fixed: ${abmeldung.user ? 'User ' + abmeldung.userId : 'Unknown'} - ${abmeldung.startDate.toLocaleDateString('de-DE')} bis ${endDate.toLocaleDateString('de-DE')}`);
        fixed++;
      }
    }
    
    console.log(`\n✅ ${fixed} von ${abmeldungen.length} Abmeldungen aktualisiert!`);
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAbmeldungEndDates();

