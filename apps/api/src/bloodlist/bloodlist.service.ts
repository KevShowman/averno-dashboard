import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BloodStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BloodListService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Blood In - Neues Mitglied aufnehmen
  async bloodIn(
    vorname: string,
    nachname: string,
    telefon: number,
    steam: string,
    bloodinDurch: string,
  ) {
    // Validierung: Telefonnummer bereits bei aktivem Mitglied?
    const existingByPhone = await this.prisma.bloodRecord.findFirst({
      where: {
        telefon,
        status: BloodStatus.ACTIVE,
      },
    });

    if (existingByPhone) {
      throw new BadRequestException(
        `Telefonnummer ${telefon} ist bereits bei einem aktiven Mitglied registriert: ${existingByPhone.vorname} ${existingByPhone.nachname}`,
      );
    }

    // Validierung: Name bereits bei aktivem Mitglied?
    const existingByName = await this.prisma.bloodRecord.findFirst({
      where: {
        vorname,
        nachname,
        status: BloodStatus.ACTIVE,
      },
    });

    if (existingByName) {
      throw new BadRequestException(
        `${vorname} ${nachname} ist bereits ein aktives Mitglied`,
      );
    }

    // Erstelle Blood In Eintrag
    const bloodRecord = await this.prisma.bloodRecord.create({
      data: {
        vorname,
        nachname,
        telefon,
        steam,
        bloodinDurch,
        status: BloodStatus.ACTIVE,
      },
    });

    // Audit Log
    await this.auditService.log({
      userId: null, // System action
      action: 'BLOOD_IN',
      entity: 'BloodRecord',
      entityId: bloodRecord.id,
      meta: {
        vorname,
        nachname,
        telefon,
        steam,
        bloodinDurch,
      },
    });

    return {
      success: true,
      message: `${vorname} ${nachname} wurde erfolgreich aufgenommen`,
      data: bloodRecord,
    };
  }

  // Blood Out - Mitglied entfernen
  async bloodOut(
    identifier: string, // Telefonnummer oder "Vorname Nachname"
    grund: string,
    bloodoutDurch: string,
  ) {
    let bloodRecord = null;

    // Versuche zuerst als Telefonnummer zu parsen
    const telefonNumber = parseInt(identifier);
    
    if (!isNaN(telefonNumber)) {
      // Suche nach Telefonnummer
      bloodRecord = await this.prisma.bloodRecord.findFirst({
        where: {
          telefon: telefonNumber,
          status: BloodStatus.ACTIVE,
        },
      });
    }

    // Falls nicht gefunden, versuche als Name
    if (!bloodRecord) {
      const nameParts = identifier.trim().split(' ');
      
      if (nameParts.length >= 2) {
        const vorname = nameParts[0];
        const nachname = nameParts.slice(1).join(' ');

        bloodRecord = await this.prisma.bloodRecord.findFirst({
          where: {
            vorname,
            nachname,
            status: BloodStatus.ACTIVE,
          },
        });
      }
    }

    if (!bloodRecord) {
      throw new NotFoundException(
        `Kein aktives Mitglied mit Identifier "${identifier}" gefunden`,
      );
    }

    // Update auf BLOODOUT
    const updatedRecord = await this.prisma.bloodRecord.update({
      where: { id: bloodRecord.id },
      data: {
        status: BloodStatus.BLOODOUT,
        bloodoutTimestamp: new Date(),
        bloodoutDurch,
        bloodoutGrund: grund,
      },
    });

    // Audit Log
    await this.auditService.log({
      userId: null, // System action
      action: 'BLOOD_OUT',
      entity: 'BloodRecord',
      entityId: updatedRecord.id,
      meta: {
        vorname: updatedRecord.vorname,
        nachname: updatedRecord.nachname,
        telefon: updatedRecord.telefon,
        grund,
        bloodoutDurch,
      },
    });

    return {
      success: true,
      message: `${updatedRecord.vorname} ${updatedRecord.nachname} wurde erfolgreich aus der Family entfernt`,
      data: {
        vorname: updatedRecord.vorname,
        nachname: updatedRecord.nachname,
        telefon: updatedRecord.telefon,
        grund,
      },
    };
  }

  // Aktive Blood List abrufen
  async getActiveBloodList() {
    const activeMembers = await this.prisma.bloodRecord.findMany({
      where: {
        status: BloodStatus.ACTIVE,
      },
      orderBy: {
        bloodinTimestamp: 'desc',
      },
    });

    return activeMembers;
  }

  // Blood Out Historie abrufen
  async getBloodOutHistory() {
    const bloodOuts = await this.prisma.bloodRecord.findMany({
      where: {
        status: BloodStatus.BLOODOUT,
      },
      orderBy: {
        bloodoutTimestamp: 'desc',
      },
    });

    return bloodOuts;
  }

  // Alle Records abrufen (für Admin)
  async getAllRecords() {
    const allRecords = await this.prisma.bloodRecord.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return allRecords;
  }

  // Einzelnen Record abrufen
  async getRecordById(id: string) {
    const record = await this.prisma.bloodRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Record nicht gefunden');
    }

    return record;
  }

  // Statistiken
  async getStats() {
    const totalActive = await this.prisma.bloodRecord.count({
      where: { status: BloodStatus.ACTIVE },
    });

    const totalBloodOuts = await this.prisma.bloodRecord.count({
      where: { status: BloodStatus.BLOODOUT },
    });

    const totalRecords = await this.prisma.bloodRecord.count();

    // Letzte 5 Blood Ins
    const recentBloodIns = await this.prisma.bloodRecord.findMany({
      where: { status: BloodStatus.ACTIVE },
      orderBy: { bloodinTimestamp: 'desc' },
      take: 5,
    });

    // Letzte 5 Blood Outs
    const recentBloodOuts = await this.prisma.bloodRecord.findMany({
      where: { status: BloodStatus.BLOODOUT },
      orderBy: { bloodoutTimestamp: 'desc' },
      take: 5,
    });

    return {
      totalActive,
      totalBloodOuts,
      totalRecords,
      recentBloodIns,
      recentBloodOuts,
    };
  }

  // Suche
  async searchRecords(query: string) {
    const searchNumber = parseInt(query);

    return this.prisma.bloodRecord.findMany({
      where: {
        OR: [
          {
            vorname: {
              contains: query,
            },
          },
          {
            nachname: {
              contains: query,
            },
          },
          {
            steam: {
              contains: query,
            },
          },
          ...(isNaN(searchNumber)
            ? []
            : [
                {
                  telefon: searchNumber,
                },
              ]),
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

