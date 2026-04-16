import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function addFuturoRole() {
  try {
    console.log('🔄 Füge FUTURO Discord-Rollen-Mapping hinzu...');

    // Prüfe ob bereits existiert
    const existing = await prisma.discordRoleMapping.findUnique({
      where: { discordRoleId: '1431388062427906227' }
    });

    if (existing) {
      console.log('✅ FUTURO-Mapping existiert bereits:', existing);
      return;
    }

    // Erstelle neues Mapping
    const futuroMapping = await prisma.discordRoleMapping.create({
      data: {
        discordRoleId: '1431388062427906227',
        systemRole: Role.FUTURO,
        name: 'Futuro',
        isActive: true,
      }
    });

    console.log('✅ FUTURO Discord-Rollen-Mapping erfolgreich erstellt:', futuroMapping);

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des FUTURO-Mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addFuturoRole();

