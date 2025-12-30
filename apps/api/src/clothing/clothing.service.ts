import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, Gender } from '@prisma/client';

export interface ClothingItem {
  itemMale: number | null;
  variationMale: number | null;
  customizableMale: boolean;
  colorMale: string | null;
  itemFemale: number | null;
  variationFemale: number | null;
  customizableFemale: boolean;
  colorFemale: string | null;
}

export interface ClothingTemplate {
  rankGroup: string;
  maske: ClothingItem;
  torso: ClothingItem;
  tshirt: ClothingItem;
  veste: ClothingItem;
  hose: ClothingItem;
  schuhe: ClothingItem;
  rucksack: ClothingItem;
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
    // Funktionsrollen (Fallback zu 1-3, außer Sicario hat eigene Kleidung)
    [Role.CONSEJERO]: '1-3',
    [Role.RUTAS]: '1-3',
    [Role.LOGISTICA]: '1-3',
    [Role.INTELIGENCIA]: '1-3',
    [Role.FORMACION]: '1-3',
    [Role.SICARIO]: 'SICARIO',
    [Role.CONTACTO]: '1-3',
    // Legacy
    [Role.FUTURO]: '1-3',
    [Role.ROUTENVERWALTUNG]: '1-3',
    [Role.ADMIN]: 'EL_PATRON',
    [Role.QUARTIERMEISTER]: '4-6',
    [Role.MITGLIED]: '1-3',
    [Role.GAST]: '1-3',
    // Partner (kein Kleidungszugang)
    [Role.PARTNER]: '1-3',
  };

  // Leaderschaft-Rollen (dürfen Kleidung bearbeiten)
  private readonly leadershipRoles: Role[] = [
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
   * Holt das Template für eine bestimmte Rolle
   */
  async getTemplateForRole(role: Role): Promise<ClothingTemplate | null> {
    const rankGroup = this.getRankGroup(role);
    return this.getTemplateByRankGroup(rankGroup);
  }

  /**
   * Konvertiert ein Template in ein flaches Format für das Frontend
   * Beinhaltet BEIDE Geschlechter
   */
  flattenTemplate(template: ClothingTemplate | null): any {
    if (!template) {
      return {
        maskItemMale: null,
        maskVariationMale: null,
        maskCustomizableMale: false,
        maskColorMale: null,
        maskItemFemale: null,
        maskVariationFemale: null,
        maskCustomizableFemale: false,
        maskColorFemale: null,
        torsoItemMale: null,
        torsoVariationMale: null,
        torsoCustomizableMale: false,
        torsoColorMale: null,
        torsoItemFemale: null,
        torsoVariationFemale: null,
        torsoCustomizableFemale: false,
        torsoColorFemale: null,
        tshirtItemMale: null,
        tshirtVariationMale: null,
        tshirtCustomizableMale: false,
        tshirtColorMale: null,
        tshirtItemFemale: null,
        tshirtVariationFemale: null,
        tshirtCustomizableFemale: false,
        tshirtColorFemale: null,
        vesteItemMale: null,
        vesteVariationMale: null,
        vesteCustomizableMale: false,
        vesteColorMale: null,
        vesteItemFemale: null,
        vesteVariationFemale: null,
        vesteCustomizableFemale: false,
        vesteColorFemale: null,
        hoseItemMale: null,
        hoseVariationMale: null,
        hoseCustomizableMale: false,
        hoseColorMale: null,
        hoseItemFemale: null,
        hoseVariationFemale: null,
        hoseCustomizableFemale: false,
        hoseColorFemale: null,
        schuheItemMale: null,
        schuheVariationMale: null,
        schuheCustomizableMale: false,
        schuheColorMale: null,
        schuheItemFemale: null,
        schuheVariationFemale: null,
        schuheCustomizableFemale: false,
        schuheColorFemale: null,
        rucksackItemMale: null,
        rucksackVariationMale: null,
        rucksackCustomizableMale: false,
        rucksackColorMale: null,
        rucksackItemFemale: null,
        rucksackVariationFemale: null,
        rucksackCustomizableFemale: false,
        rucksackColorFemale: null,
      };
    }

    return {
      maskItemMale: template.maske.itemMale,
      maskVariationMale: template.maske.variationMale,
      maskCustomizableMale: template.maske.customizableMale,
      maskColorMale: template.maske.colorMale,
      maskItemFemale: template.maske.itemFemale,
      maskVariationFemale: template.maske.variationFemale,
      maskCustomizableFemale: template.maske.customizableFemale,
      maskColorFemale: template.maske.colorFemale,
      torsoItemMale: template.torso.itemMale,
      torsoVariationMale: template.torso.variationMale,
      torsoCustomizableMale: template.torso.customizableMale,
      torsoColorMale: template.torso.colorMale,
      torsoItemFemale: template.torso.itemFemale,
      torsoVariationFemale: template.torso.variationFemale,
      torsoCustomizableFemale: template.torso.customizableFemale,
      torsoColorFemale: template.torso.colorFemale,
      tshirtItemMale: template.tshirt.itemMale,
      tshirtVariationMale: template.tshirt.variationMale,
      tshirtCustomizableMale: template.tshirt.customizableMale,
      tshirtColorMale: template.tshirt.colorMale,
      tshirtItemFemale: template.tshirt.itemFemale,
      tshirtVariationFemale: template.tshirt.variationFemale,
      tshirtCustomizableFemale: template.tshirt.customizableFemale,
      tshirtColorFemale: template.tshirt.colorFemale,
      vesteItemMale: template.veste.itemMale,
      vesteVariationMale: template.veste.variationMale,
      vesteCustomizableMale: template.veste.customizableMale,
      vesteColorMale: template.veste.colorMale,
      vesteItemFemale: template.veste.itemFemale,
      vesteVariationFemale: template.veste.variationFemale,
      vesteCustomizableFemale: template.veste.customizableFemale,
      vesteColorFemale: template.veste.colorFemale,
      hoseItemMale: template.hose.itemMale,
      hoseVariationMale: template.hose.variationMale,
      hoseCustomizableMale: template.hose.customizableMale,
      hoseColorMale: template.hose.colorMale,
      hoseItemFemale: template.hose.itemFemale,
      hoseVariationFemale: template.hose.variationFemale,
      hoseCustomizableFemale: template.hose.customizableFemale,
      hoseColorFemale: template.hose.colorFemale,
      schuheItemMale: template.schuhe.itemMale,
      schuheVariationMale: template.schuhe.variationMale,
      schuheCustomizableMale: template.schuhe.customizableMale,
      schuheColorMale: template.schuhe.colorMale,
      schuheItemFemale: template.schuhe.itemFemale,
      schuheVariationFemale: template.schuhe.variationFemale,
      schuheCustomizableFemale: template.schuhe.customizableFemale,
      schuheColorFemale: template.schuhe.colorFemale,
      rucksackItemMale: template.rucksack.itemMale,
      rucksackVariationMale: template.rucksack.variationMale,
      rucksackCustomizableMale: template.rucksack.customizableMale,
      rucksackColorMale: template.rucksack.colorMale,
      rucksackItemFemale: template.rucksack.itemFemale,
      rucksackVariationFemale: template.rucksack.variationFemale,
      rucksackCustomizableFemale: template.rucksack.customizableFemale,
      rucksackColorFemale: template.rucksack.colorFemale,
    };
  }

  /**
   * Konvertiert ein Template in ein geschlechts-spezifisches flaches Format
   * (nur für EIN Geschlecht)
   */
  flattenTemplateForGender(template: ClothingTemplate | null, gender: Gender): any {
    if (!template) {
      return {
        maskItem: null,
        maskVariation: null,
        maskCustomizable: false,
        maskColor: null,
        torsoItem: null,
        torsoVariation: null,
        torsoCustomizable: false,
        torsoColor: null,
        tshirtItem: null,
        tshirtVariation: null,
        tshirtCustomizable: false,
        tshirtColor: null,
        vesteItem: null,
        vesteVariation: null,
        vesteCustomizable: false,
        vesteColor: null,
        hoseItem: null,
        hoseVariation: null,
        hoseCustomizable: false,
        hoseColor: null,
        schuheItem: null,
        schuheVariation: null,
        schuheCustomizable: false,
        schuheColor: null,
        rucksackItem: null,
        rucksackVariation: null,
        rucksackCustomizable: false,
        rucksackColor: null,
      };
    }

    const isMale = gender === Gender.MALE;

    return {
      maskItem: isMale ? template.maske.itemMale : template.maske.itemFemale,
      maskVariation: isMale ? template.maske.variationMale : template.maske.variationFemale,
      maskCustomizable: isMale ? template.maske.customizableMale : template.maske.customizableFemale,
      maskColor: isMale ? template.maske.colorMale : template.maske.colorFemale,
      torsoItem: isMale ? template.torso.itemMale : template.torso.itemFemale,
      torsoVariation: isMale ? template.torso.variationMale : template.torso.variationFemale,
      torsoCustomizable: isMale ? template.torso.customizableMale : template.torso.customizableFemale,
      torsoColor: isMale ? template.torso.colorMale : template.torso.colorFemale,
      tshirtItem: isMale ? template.tshirt.itemMale : template.tshirt.itemFemale,
      tshirtVariation: isMale ? template.tshirt.variationMale : template.tshirt.variationFemale,
      tshirtCustomizable: isMale ? template.tshirt.customizableMale : template.tshirt.customizableFemale,
      tshirtColor: isMale ? template.tshirt.colorMale : template.tshirt.colorFemale,
      vesteItem: isMale ? template.veste.itemMale : template.veste.itemFemale,
      vesteVariation: isMale ? template.veste.variationMale : template.veste.variationFemale,
      vesteCustomizable: isMale ? template.veste.customizableMale : template.veste.customizableFemale,
      vesteColor: isMale ? template.veste.colorMale : template.veste.colorFemale,
      hoseItem: isMale ? template.hose.itemMale : template.hose.itemFemale,
      hoseVariation: isMale ? template.hose.variationMale : template.hose.variationFemale,
      hoseCustomizable: isMale ? template.hose.customizableMale : template.hose.customizableFemale,
      hoseColor: isMale ? template.hose.colorMale : template.hose.colorFemale,
      schuheItem: isMale ? template.schuhe.itemMale : template.schuhe.itemFemale,
      schuheVariation: isMale ? template.schuhe.variationMale : template.schuhe.variationFemale,
      schuheCustomizable: isMale ? template.schuhe.customizableMale : template.schuhe.customizableFemale,
      schuheColor: isMale ? template.schuhe.colorMale : template.schuhe.colorFemale,
      rucksackItem: isMale ? template.rucksack.itemMale : template.rucksack.itemFemale,
      rucksackVariation: isMale ? template.rucksack.variationMale : template.rucksack.variationFemale,
      rucksackCustomizable: isMale ? template.rucksack.customizableMale : template.rucksack.customizableFemale,
      rucksackColor: isMale ? template.rucksack.colorMale : template.rucksack.colorFemale,
    };
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
        maskItemMale: data.maske?.itemMale,
        maskVariationMale: data.maske?.variationMale,
        maskCustomizableMale: data.maske?.customizableMale ?? false,
        maskColorMale: data.maske?.colorMale,
        maskItemFemale: data.maske?.itemFemale,
        maskVariationFemale: data.maske?.variationFemale,
        maskCustomizableFemale: data.maske?.customizableFemale ?? false,
        maskColorFemale: data.maske?.colorFemale,
        torsoItemMale: data.torso?.itemMale,
        torsoVariationMale: data.torso?.variationMale,
        torsoCustomizableMale: data.torso?.customizableMale ?? false,
        torsoColorMale: data.torso?.colorMale,
        torsoItemFemale: data.torso?.itemFemale,
        torsoVariationFemale: data.torso?.variationFemale,
        torsoCustomizableFemale: data.torso?.customizableFemale ?? false,
        torsoColorFemale: data.torso?.colorFemale,
        tshirtItemMale: data.tshirt?.itemMale,
        tshirtVariationMale: data.tshirt?.variationMale,
        tshirtCustomizableMale: data.tshirt?.customizableMale ?? false,
        tshirtColorMale: data.tshirt?.colorMale,
        tshirtItemFemale: data.tshirt?.itemFemale,
        tshirtVariationFemale: data.tshirt?.variationFemale,
        tshirtCustomizableFemale: data.tshirt?.customizableFemale ?? false,
        tshirtColorFemale: data.tshirt?.colorFemale,
        vesteItemMale: data.veste?.itemMale,
        vesteVariationMale: data.veste?.variationMale,
        vesteCustomizableMale: data.veste?.customizableMale ?? false,
        vesteColorMale: data.veste?.colorMale,
        vesteItemFemale: data.veste?.itemFemale,
        vesteVariationFemale: data.veste?.variationFemale,
        vesteCustomizableFemale: data.veste?.customizableFemale ?? false,
        vesteColorFemale: data.veste?.colorFemale,
        hoseItemMale: data.hose?.itemMale,
        hoseVariationMale: data.hose?.variationMale,
        hoseCustomizableMale: data.hose?.customizableMale ?? false,
        hoseColorMale: data.hose?.colorMale,
        hoseItemFemale: data.hose?.itemFemale,
        hoseVariationFemale: data.hose?.variationFemale,
        hoseCustomizableFemale: data.hose?.customizableFemale ?? false,
        hoseColorFemale: data.hose?.colorFemale,
        schuheItemMale: data.schuhe?.itemMale,
        schuheVariationMale: data.schuhe?.variationMale,
        schuheCustomizableMale: data.schuhe?.customizableMale ?? false,
        schuheColorMale: data.schuhe?.colorMale,
        schuheItemFemale: data.schuhe?.itemFemale,
        schuheVariationFemale: data.schuhe?.variationFemale,
        schuheCustomizableFemale: data.schuhe?.customizableFemale ?? false,
        schuheColorFemale: data.schuhe?.colorFemale,
        rucksackItemMale: data.rucksack?.itemMale,
        rucksackVariationMale: data.rucksack?.variationMale,
        rucksackCustomizableMale: data.rucksack?.customizableMale ?? false,
        rucksackColorMale: data.rucksack?.colorMale,
        rucksackItemFemale: data.rucksack?.itemFemale,
        rucksackVariationFemale: data.rucksack?.variationFemale,
        rucksackCustomizableFemale: data.rucksack?.customizableFemale ?? false,
        rucksackColorFemale: data.rucksack?.colorFemale,
      },
      create: {
        rankGroup,
        maskItemMale: data.maske?.itemMale,
        maskVariationMale: data.maske?.variationMale,
        maskCustomizableMale: data.maske?.customizableMale ?? false,
        maskColorMale: data.maske?.colorMale,
        maskItemFemale: data.maske?.itemFemale,
        maskVariationFemale: data.maske?.variationFemale,
        maskCustomizableFemale: data.maske?.customizableFemale ?? false,
        maskColorFemale: data.maske?.colorFemale,
        torsoItemMale: data.torso?.itemMale,
        torsoVariationMale: data.torso?.variationMale,
        torsoCustomizableMale: data.torso?.customizableMale ?? false,
        torsoColorMale: data.torso?.colorMale,
        torsoItemFemale: data.torso?.itemFemale,
        torsoVariationFemale: data.torso?.variationFemale,
        torsoCustomizableFemale: data.torso?.customizableFemale ?? false,
        torsoColorFemale: data.torso?.colorFemale,
        tshirtItemMale: data.tshirt?.itemMale,
        tshirtVariationMale: data.tshirt?.variationMale,
        tshirtCustomizableMale: data.tshirt?.customizableMale ?? false,
        tshirtColorMale: data.tshirt?.colorMale,
        tshirtItemFemale: data.tshirt?.itemFemale,
        tshirtVariationFemale: data.tshirt?.variationFemale,
        tshirtCustomizableFemale: data.tshirt?.customizableFemale ?? false,
        tshirtColorFemale: data.tshirt?.colorFemale,
        vesteItemMale: data.veste?.itemMale,
        vesteVariationMale: data.veste?.variationMale,
        vesteCustomizableMale: data.veste?.customizableMale ?? false,
        vesteColorMale: data.veste?.colorMale,
        vesteItemFemale: data.veste?.itemFemale,
        vesteVariationFemale: data.veste?.variationFemale,
        vesteCustomizableFemale: data.veste?.customizableFemale ?? false,
        vesteColorFemale: data.veste?.colorFemale,
        hoseItemMale: data.hose?.itemMale,
        hoseVariationMale: data.hose?.variationMale,
        hoseCustomizableMale: data.hose?.customizableMale ?? false,
        hoseColorMale: data.hose?.colorMale,
        hoseItemFemale: data.hose?.itemFemale,
        hoseVariationFemale: data.hose?.variationFemale,
        hoseCustomizableFemale: data.hose?.customizableFemale ?? false,
        hoseColorFemale: data.hose?.colorFemale,
        schuheItemMale: data.schuhe?.itemMale,
        schuheVariationMale: data.schuhe?.variationMale,
        schuheCustomizableMale: data.schuhe?.customizableMale ?? false,
        schuheColorMale: data.schuhe?.colorMale,
        schuheItemFemale: data.schuhe?.itemFemale,
        schuheVariationFemale: data.schuhe?.variationFemale,
        schuheCustomizableFemale: data.schuhe?.customizableFemale ?? false,
        schuheColorFemale: data.schuhe?.colorFemale,
        rucksackItemMale: data.rucksack?.itemMale,
        rucksackVariationMale: data.rucksack?.variationMale,
        rucksackCustomizableMale: data.rucksack?.customizableMale ?? false,
        rucksackColorMale: data.rucksack?.colorMale,
        rucksackItemFemale: data.rucksack?.itemFemale,
        rucksackVariationFemale: data.rucksack?.variationFemale,
        rucksackCustomizableFemale: data.rucksack?.customizableFemale ?? false,
        rucksackColorFemale: data.rucksack?.colorFemale,
      },
    });

    return this.mapTemplateToDto(template);
  }

  /**
   * Holt die Kleidung für einen User basierend auf Rang + Geschlecht
   * NEU: Männer bekommen 5 vordefinierte Outfits, Frauen haben freie Wahl
   * AUSNAHME: Sicarios erhalten BEIDE Kleidungen (Sicario + Rank/Outfits)
   */
  async getUserClothing(userId: string): Promise<any> {
    // User, Rolle und Geschlecht holen
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, allRoles: true, gender: true },
    });

    if (!user) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Finde den RANG (nicht Funktionsrolle) aus allRoles
    const allRoles = Array.isArray(user.allRoles) ? (user.allRoles as Role[]) : [user.role];
    
    // Prüfe ob User ein Sicario ist
    const isSicario = allRoles.includes(Role.SICARIO);

    // Frauen: Freie Klamottenwahl
    if (user.gender === Gender.FEMALE) {
      const result: any = {
        type: 'free_choice',
        message: 'Freie Klamottenwahl',
      };

      // Wenn Sicario, füge Sicario-Kleidung hinzu
      if (isSicario) {
        const sicarioTemplate = await this.getTemplateByRankGroup('SICARIO');
        result.sicario = this.flattenTemplateForGender(sicarioTemplate, Gender.FEMALE);
      }

      return result;
    }

    // Männer: 5 vordefinierte Outfits
    const outfits = await this.getAllMaleOutfits();
    const result: any = {
      type: 'outfits',
      outfits,
    };

    // Wenn Sicario, füge Sicario-Kleidung hinzu
    if (isSicario) {
      const sicarioTemplate = await this.getTemplateByRankGroup('SICARIO');
      result.sicario = this.flattenTemplateForGender(sicarioTemplate, Gender.MALE);
    }

    return result;
  }

  /**
   * Mappt ein Datenbank-Template zu einem DTO
   */
  private mapTemplateToDto(template: any): ClothingTemplate {
    return {
      rankGroup: template.rankGroup,
      maske: {
        itemMale: template.maskItemMale,
        variationMale: template.maskVariationMale,
        customizableMale: template.maskCustomizableMale,
        colorMale: template.maskColorMale,
        itemFemale: template.maskItemFemale,
        variationFemale: template.maskVariationFemale,
        customizableFemale: template.maskCustomizableFemale,
        colorFemale: template.maskColorFemale,
      },
      torso: {
        itemMale: template.torsoItemMale,
        variationMale: template.torsoVariationMale,
        customizableMale: template.torsoCustomizableMale,
        colorMale: template.torsoColorMale,
        itemFemale: template.torsoItemFemale,
        variationFemale: template.torsoVariationFemale,
        customizableFemale: template.torsoCustomizableFemale,
        colorFemale: template.torsoColorFemale,
      },
      tshirt: {
        itemMale: template.tshirtItemMale,
        variationMale: template.tshirtVariationMale,
        customizableMale: template.tshirtCustomizableMale,
        colorMale: template.tshirtColorMale,
        itemFemale: template.tshirtItemFemale,
        variationFemale: template.tshirtVariationFemale,
        customizableFemale: template.tshirtCustomizableFemale,
        colorFemale: template.tshirtColorFemale,
      },
      veste: {
        itemMale: template.vesteItemMale,
        variationMale: template.vesteVariationMale,
        customizableMale: template.vesteCustomizableMale,
        colorMale: template.vesteColorMale,
        itemFemale: template.vesteItemFemale,
        variationFemale: template.vesteVariationFemale,
        customizableFemale: template.vesteCustomizableFemale,
        colorFemale: template.vesteColorFemale,
      },
      hose: {
        itemMale: template.hoseItemMale,
        variationMale: template.hoseVariationMale,
        customizableMale: template.hoseCustomizableMale,
        colorMale: template.hoseColorMale,
        itemFemale: template.hoseItemFemale,
        variationFemale: template.hoseVariationFemale,
        customizableFemale: template.hoseCustomizableFemale,
        colorFemale: template.hoseColorFemale,
      },
      schuhe: {
        itemMale: template.schuheItemMale,
        variationMale: template.schuheVariationMale,
        customizableMale: template.schuheCustomizableMale,
        colorMale: template.schuheColorMale,
        itemFemale: template.schuheItemFemale,
        variationFemale: template.schuheVariationFemale,
        customizableFemale: template.schuheCustomizableFemale,
        colorFemale: template.schuheColorFemale,
      },
      rucksack: {
        itemMale: template.rucksackItemMale,
        variationMale: template.rucksackVariationMale,
        customizableMale: template.rucksackCustomizableMale,
        colorMale: template.rucksackColorMale,
        itemFemale: template.rucksackItemFemale,
        variationFemale: template.rucksackVariationFemale,
        customizableFemale: template.rucksackCustomizableFemale,
        colorFemale: template.rucksackColorFemale,
      },
    };
  }

  // ============ MALE OUTFITS ============

  /**
   * Holt alle 5 Männer-Outfits
   */
  async getAllMaleOutfits() {
    const outfits = await this.prisma.maleOutfit.findMany({
      orderBy: { outfitNumber: 'asc' },
    });

    // Wenn noch keine Outfits existieren, erstelle sie
    if (outfits.length === 0) {
      const created = await Promise.all(
        [1, 2, 3, 4, 5].map((num) =>
          this.prisma.maleOutfit.create({
            data: {
              outfitNumber: num,
              name: `Outfit ${num}`,
            },
          })
        )
      );
      return created;
    }

    return outfits;
  }

  /**
   * Holt ein einzelnes Outfit
   */
  async getMaleOutfit(outfitNumber: number) {
    const outfit = await this.prisma.maleOutfit.findUnique({
      where: { outfitNumber },
    });

    if (!outfit) {
      throw new NotFoundException(`Outfit ${outfitNumber} nicht gefunden`);
    }

    return outfit;
  }

  /**
   * Aktualisiert ein Männer-Outfit (nur Leadership)
   */
  async updateMaleOutfit(
    userRole: Role,
    outfitNumber: number,
    data: {
      name?: string;
      maskItem?: number | null;
      maskVariation?: number | null;
      torsoItem?: number | null;
      torsoVariation?: number | null;
      tshirtItem?: number | null;
      tshirtVariation?: number | null;
      vesteItem?: number | null;
      vesteVariation?: number | null;
      hoseItem?: number | null;
      hoseVariation?: number | null;
      schuheItem?: number | null;
      schuheVariation?: number | null;
      rucksackItem?: number | null;
      rucksackVariation?: number | null;
    }
  ) {
    if (!this.isLeadership(userRole)) {
      throw new ForbiddenException('Nur die Leaderschaft darf Outfits bearbeiten');
    }

    return this.prisma.maleOutfit.update({
      where: { outfitNumber },
      data,
    });
  }

  /**
   * Aktualisiert das Bild für ein Outfit
   */
  async updateOutfitImage(userRole: Role, outfitNumber: number, filename: string) {
    if (!this.isLeadership(userRole)) {
      throw new ForbiddenException('Nur die Leaderschaft darf Outfit-Bilder hochladen');
    }

    return this.prisma.maleOutfit.update({
      where: { outfitNumber },
      data: { imagePath: filename },
    });
  }
}
