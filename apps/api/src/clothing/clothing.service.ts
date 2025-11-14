import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

export interface ClothingItem {
  item: number | null;
  variation: number | null;
  customizable: boolean;
  color: number | null;
}

export interface ClothingTemplate {
  rankGroup: string;
  maske: ClothingItem;
  torso: ClothingItem;
  tshirt: ClothingItem;
  veste: ClothingItem;
  hose: ClothingItem;
  schuhe: ClothingItem;
}

export interface UserClothingData {
  maske?: { item: number; variation: number };
  torso?: { item: number; variation: number };
  tshirt?: { item: number; variation: number };
  veste?: { item: number; variation: number };
  hose?: { item: number; variation: number };
  schuhe?: { item: number; variation: number };
}

@Injectable()
export class ClothingService {
  // Mapping von Rollen zu Rang-Gruppen
  private readonly roleToGroupMap: Record<Role, string> = {
    // Leaderschaft (individuelle Kleidung)
    [Role.EL_PATRON]: 'EL_PATRON',
    [Role.DON_CAPITAN]: 'DON_CAPITAN',
    [Role.DON_COMANDANTE]: 'DON_COMANDANTE',
    [Role.EL_MANO_DERECHA]: 'EL_MANO_DERECHA',
    // Ränge 7-9
    [Role.EL_CUSTODIO]: '7-9',
    [Role.EL_MENTOR]: '7-9',
    [Role.EL_ENCARGADO]: '7-9',
    // Ränge 4-6
    [Role.EL_TENIENTE]: '4-6',
    [Role.SOLDADO]: '4-6',
    [Role.EL_PREFECTO]: '4-6',
    // Ränge 1-3
    [Role.EL_CONFIDENTE]: '1-3',
    [Role.EL_PROTECTOR]: '1-3',
    [Role.EL_NOVATO]: '1-3',
    // Legacy (default zu 1-3)
    [Role.FUTURO]: '1-3',
    [Role.SICARIO]: '4-6',
    [Role.ROUTENVERWALTUNG]: '4-6',
    [Role.LOGISTICA]: '4-6',
    [Role.ADMIN]: 'EL_PATRON',
    [Role.QUARTIERMEISTER]: '4-6',
    [Role.MITGLIED]: '1-3',
    [Role.GAST]: '1-3',
  };

  // Leaderschaft-Rollen (dürfen Kleidung bearbeiten)
  private readonly leadershipRoles = [
    Role.EL_PATRON,
    Role.DON_CAPITAN,
    Role.DON_COMANDANTE,
    Role.EL_MANO_DERECHA,
    Role.ADMIN,
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Prüft ob ein User zur Leaderschaft gehört
   */
  isLeadership(userRole: Role): boolean {
    return this.leadershipRoles.includes(userRole);
  }

  /**
   * Gibt die Rang-Gruppe für eine Rolle zurück
   */
  getRankGroup(role: Role): string {
    return this.roleToGroupMap[role] || '1-3';
  }

  /**
   * Holt alle Kleidungs-Templates
   */
  async getAllTemplates(): Promise<ClothingTemplate[]> {
    const templates = await this.prisma.rankClothingTemplate.findMany();
    return templates.map(this.mapTemplateToDto);
  }

  /**
   * Holt ein Template für eine bestimmte Rang-Gruppe
   */
  async getTemplateByRankGroup(rankGroup: string): Promise<ClothingTemplate | null> {
    const template = await this.prisma.rankClothingTemplate.findUnique({
      where: { rankGroup },
    });

    if (!template) {
      return null;
    }

    return this.mapTemplateToDto(template);
  }

  /**
   * Erstellt oder aktualisiert ein Kleidungs-Template
   * Nur Leaderschaft darf diese Funktion aufrufen
   */
  async upsertTemplate(
    userRole: Role,
    rankGroup: string,
    data: Partial<ClothingTemplate>
  ): Promise<ClothingTemplate> {
    if (!this.isLeadership(userRole)) {
      throw new ForbiddenException('Nur die Leaderschaft darf Kleidungs-Templates bearbeiten');
    }

    const template = await this.prisma.rankClothingTemplate.upsert({
      where: { rankGroup },
      update: {
        maskItem: data.maske?.item,
        maskVariation: data.maske?.variation,
        maskCustomizable: data.maske?.customizable ?? false,
        maskColor: data.maske?.color,
        torsoItem: data.torso?.item,
        torsoVariation: data.torso?.variation,
        torsoCustomizable: data.torso?.customizable ?? false,
        torsoColor: data.torso?.color,
        tshirtItem: data.tshirt?.item,
        tshirtVariation: data.tshirt?.variation,
        tshirtCustomizable: data.tshirt?.customizable ?? false,
        tshirtColor: data.tshirt?.color,
        vesteItem: data.veste?.item,
        vesteVariation: data.veste?.variation,
        vesteCustomizable: data.veste?.customizable ?? false,
        vesteColor: data.veste?.color,
        hoseItem: data.hose?.item,
        hoseVariation: data.hose?.variation,
        hoseCustomizable: data.hose?.customizable ?? false,
        hoseColor: data.hose?.color,
        schuheItem: data.schuhe?.item,
        schuheVariation: data.schuhe?.variation,
        schuheCustomizable: data.schuhe?.customizable ?? false,
        schuheColor: data.schuhe?.color,
      },
      create: {
        rankGroup,
        maskItem: data.maske?.item,
        maskVariation: data.maske?.variation,
        maskCustomizable: data.maske?.customizable ?? false,
        maskColor: data.maske?.color,
        torsoItem: data.torso?.item,
        torsoVariation: data.torso?.variation,
        torsoCustomizable: data.torso?.customizable ?? false,
        torsoColor: data.torso?.color,
        tshirtItem: data.tshirt?.item,
        tshirtVariation: data.tshirt?.variation,
        tshirtCustomizable: data.tshirt?.customizable ?? false,
        tshirtColor: data.tshirt?.color,
        vesteItem: data.veste?.item,
        vesteVariation: data.veste?.variation,
        vesteCustomizable: data.veste?.customizable ?? false,
        vesteColor: data.veste?.color,
        hoseItem: data.hose?.item,
        hoseVariation: data.hose?.variation,
        hoseCustomizable: data.hose?.customizable ?? false,
        hoseColor: data.hose?.color,
        schuheItem: data.schuhe?.item,
        schuheVariation: data.schuhe?.variation,
        schuheCustomizable: data.schuhe?.customizable ?? false,
        schuheColor: data.schuhe?.color,
      },
    });

    return this.mapTemplateToDto(template);
  }

  /**
   * Holt die Kleidung für einen User basierend auf seinem Rang
   */
  async getUserClothing(userId: string): Promise<{
    template: ClothingTemplate | null;
    userCustomization: UserClothingData | null;
    combinedClothing: any;
  }> {
    // User und dessen Rolle holen
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Rang-Gruppe ermitteln
    const rankGroup = this.getRankGroup(user.role);

    // Template für die Rang-Gruppe holen
    const template = await this.getTemplateByRankGroup(rankGroup);

    // User-spezifische Kleidung holen (falls vorhanden)
    const userClothing = await this.prisma.userClothing.findUnique({
      where: { userId },
    });

    const userCustomization = userClothing
      ? {
          maske: userClothing.maskItem && userClothing.maskVariation
            ? { item: userClothing.maskItem, variation: userClothing.maskVariation }
            : undefined,
          torso: userClothing.torsoItem && userClothing.torsoVariation
            ? { item: userClothing.torsoItem, variation: userClothing.torsoVariation }
            : undefined,
          tshirt: userClothing.tshirtItem && userClothing.tshirtVariation
            ? { item: userClothing.tshirtItem, variation: userClothing.tshirtVariation }
            : undefined,
          veste: userClothing.vesteItem && userClothing.vesteVariation
            ? { item: userClothing.vesteItem, variation: userClothing.vesteVariation }
            : undefined,
          hose: userClothing.hoseItem && userClothing.hoseVariation
            ? { item: userClothing.hoseItem, variation: userClothing.hoseVariation }
            : undefined,
          schuhe: userClothing.schuheItem && userClothing.schuheVariation
            ? { item: userClothing.schuheItem, variation: userClothing.schuheVariation }
            : undefined,
        }
      : null;

    // Kombiniere Template und User-Customization
    const combinedClothing = this.combineClothing(template, userCustomization);

    return {
      template,
      userCustomization,
      combinedClothing,
    };
  }

  /**
   * Aktualisiert die individuelle Kleidung eines Users
   * Nur customizable Teile dürfen geändert werden
   */
  async updateUserClothing(
    userId: string,
    data: UserClothingData
  ): Promise<UserClothingData> {
    // User und Rolle holen
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Rang-Gruppe und Template holen
    const rankGroup = this.getRankGroup(user.role);
    const template = await this.getTemplateByRankGroup(rankGroup);

    if (!template) {
      throw new NotFoundException('Kein Kleidungs-Template für diese Rang-Gruppe gefunden');
    }

    // Prüfe, welche Teile customizable sind
    const updates: any = {};

    if (data.maske && template.maske.customizable) {
      updates.maskItem = data.maske.item;
      updates.maskVariation = data.maske.variation;
    }

    if (data.torso && template.torso.customizable) {
      updates.torsoItem = data.torso.item;
      updates.torsoVariation = data.torso.variation;
    }

    if (data.tshirt && template.tshirt.customizable) {
      updates.tshirtItem = data.tshirt.item;
      updates.tshirtVariation = data.tshirt.variation;
    }

    if (data.veste && template.veste.customizable) {
      updates.vesteItem = data.veste.item;
      updates.vesteVariation = data.veste.variation;
    }

    if (data.hose && template.hose.customizable) {
      updates.hoseItem = data.hose.item;
      updates.hoseVariation = data.hose.variation;
    }

    if (data.schuhe && template.schuhe.customizable) {
      updates.schuheItem = data.schuhe.item;
      updates.schuheVariation = data.schuhe.variation;
    }

    // Aktualisiere User-Kleidung
    const userClothing = await this.prisma.userClothing.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });

    return {
      maske: userClothing.maskItem && userClothing.maskVariation
        ? { item: userClothing.maskItem, variation: userClothing.maskVariation }
        : undefined,
      torso: userClothing.torsoItem && userClothing.torsoVariation
        ? { item: userClothing.torsoItem, variation: userClothing.torsoVariation }
        : undefined,
      tshirt: userClothing.tshirtItem && userClothing.tshirtVariation
        ? { item: userClothing.tshirtItem, variation: userClothing.tshirtVariation }
        : undefined,
      veste: userClothing.vesteItem && userClothing.vesteVariation
        ? { item: userClothing.vesteItem, variation: userClothing.vesteVariation }
        : undefined,
      hose: userClothing.hoseItem && userClothing.hoseVariation
        ? { item: userClothing.hoseItem, variation: userClothing.hoseVariation }
        : undefined,
      schuhe: userClothing.schuheItem && userClothing.schuheVariation
        ? { item: userClothing.schuheItem, variation: userClothing.schuheVariation }
        : undefined,
    };
  }

  /**
   * Kombiniert Template und User-Customization
   */
  private combineClothing(
    template: ClothingTemplate | null,
    userCustomization: UserClothingData | null
  ): any {
    if (!template) {
      return null;
    }

    return {
      maske: {
        item: template.maske.customizable && userCustomization?.maske
          ? userCustomization.maske.item
          : template.maske.item,
        variation: template.maske.customizable && userCustomization?.maske
          ? userCustomization.maske.variation
          : template.maske.variation,
        color: template.maske.color,
        customizable: template.maske.customizable,
      },
      torso: {
        item: template.torso.customizable && userCustomization?.torso
          ? userCustomization.torso.item
          : template.torso.item,
        variation: template.torso.customizable && userCustomization?.torso
          ? userCustomization.torso.variation
          : template.torso.variation,
        color: template.torso.color,
        customizable: template.torso.customizable,
      },
      tshirt: {
        item: template.tshirt.customizable && userCustomization?.tshirt
          ? userCustomization.tshirt.item
          : template.tshirt.item,
        variation: template.tshirt.customizable && userCustomization?.tshirt
          ? userCustomization.tshirt.variation
          : template.tshirt.variation,
        color: template.tshirt.color,
        customizable: template.tshirt.customizable,
      },
      veste: {
        item: template.veste.customizable && userCustomization?.veste
          ? userCustomization.veste.item
          : template.veste.item,
        variation: template.veste.customizable && userCustomization?.veste
          ? userCustomization.veste.variation
          : template.veste.variation,
        color: template.veste.color,
        customizable: template.veste.customizable,
      },
      hose: {
        item: template.hose.customizable && userCustomization?.hose
          ? userCustomization.hose.item
          : template.hose.item,
        variation: template.hose.customizable && userCustomization?.hose
          ? userCustomization.hose.variation
          : template.hose.variation,
        color: template.hose.color,
        customizable: template.hose.customizable,
      },
      schuhe: {
        item: template.schuhe.customizable && userCustomization?.schuhe
          ? userCustomization.schuhe.item
          : template.schuhe.item,
        variation: template.schuhe.customizable && userCustomization?.schuhe
          ? userCustomization.schuhe.variation
          : template.schuhe.variation,
        color: template.schuhe.color,
        customizable: template.schuhe.customizable,
      },
    };
  }

  /**
   * Mappt ein Datenbank-Template zu einem DTO
   */
  private mapTemplateToDto(template: any): ClothingTemplate {
    return {
      rankGroup: template.rankGroup,
      maske: {
        item: template.maskItem,
        variation: template.maskVariation,
        customizable: template.maskCustomizable,
        color: template.maskColor,
      },
      torso: {
        item: template.torsoItem,
        variation: template.torsoVariation,
        customizable: template.torsoCustomizable,
        color: template.torsoColor,
      },
      tshirt: {
        item: template.tshirtItem,
        variation: template.tshirtVariation,
        customizable: template.tshirtCustomizable,
        color: template.tshirtColor,
      },
      veste: {
        item: template.vesteItem,
        variation: template.vesteVariation,
        customizable: template.vesteCustomizable,
        color: template.vesteColor,
      },
      hose: {
        item: template.hoseItem,
        variation: template.hoseVariation,
        customizable: template.hoseCustomizable,
        color: template.hoseColor,
      },
      schuhe: {
        item: template.schuheItem,
        variation: template.schuheVariation,
        customizable: template.schuheCustomizable,
        color: template.schuheColor,
      },
    };
  }
}

