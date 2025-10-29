import { Role } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Helper Funktionen für JSON-Array-Konvertierung
 * MySQL/MariaDB speichert Arrays als JSON, daher müssen wir sie konvertieren
 */

/**
 * Konvertiert ein JSON-Feld zu einem String-Array
 * @param jsonValue - Das JSON-Feld aus der Datenbank
 * @returns String-Array oder leeres Array
 */
export function jsonToStringArray(jsonValue: Prisma.JsonValue | null | undefined): string[] {
  if (!jsonValue) return [];
  if (Array.isArray(jsonValue)) {
    return jsonValue.filter(item => typeof item === 'string') as string[];
  }
  return [];
}

/**
 * Konvertiert ein JSON-Feld zu einem Role-Array
 * @param jsonValue - Das JSON-Feld aus der Datenbank
 * @returns Role-Array oder leeres Array
 */
export function jsonToRoleArray(jsonValue: Prisma.JsonValue | null | undefined): Role[] {
  if (!jsonValue) return [];
  if (Array.isArray(jsonValue)) {
    return jsonValue.filter(item => 
      typeof item === 'string' && Object.values(Role).includes(item as Role)
    ) as Role[];
  }
  return [];
}

/**
 * Konvertiert ein String-Array zu JSON für die Datenbank
 * @param array - Das Array zum Konvertieren
 * @returns JSON-kompatibles Array
 */
export function stringArrayToJson(array: string[]): Prisma.JsonValue {
  return array;
}

/**
 * Konvertiert ein Role-Array zu JSON für die Datenbank
 * @param array - Das Array zum Konvertieren
 * @returns JSON-kompatibles Array
 */
export function roleArrayToJson(array: Role[]): Prisma.JsonValue {
  return array;
}

/**
 * Prüft ob ein User eine bestimmte Rolle hat (in role oder allRoles)
 * @param user - User-Objekt mit role und allRoles
 * @param requiredRole - Die zu prüfende Rolle
 * @returns true wenn User die Rolle hat
 */
export function userHasRole(
  user: { role: Role; allRoles: Prisma.JsonValue | null },
  requiredRole: Role
): boolean {
  if (user.role === requiredRole) return true;
  
  const allRoles = jsonToRoleArray(user.allRoles);
  return allRoles.includes(requiredRole);
}

/**
 * Prüft ob ein User eine von mehreren Rollen hat
 * @param user - User-Objekt mit role und allRoles
 * @param requiredRoles - Die zu prüfenden Rollen
 * @returns true wenn User mindestens eine der Rollen hat
 */
export function userHasAnyRole(
  user: { role: Role; allRoles: Prisma.JsonValue | null },
  requiredRoles: Role[]
): boolean {
  if (requiredRoles.includes(user.role)) return true;
  
  const allRoles = jsonToRoleArray(user.allRoles);
  return requiredRoles.some(role => allRoles.includes(role));
}

/**
 * Gibt alle Rollen eines Users zurück (role + allRoles)
 * @param user - User-Objekt mit role und allRoles
 * @returns Array aller Rollen des Users
 */
export function getUserRoles(
  user: { role: Role; allRoles: Prisma.JsonValue | null }
): Role[] {
  const allRoles = jsonToRoleArray(user.allRoles);
  const roles = allRoles.length > 0 ? allRoles : [user.role];
  // Deduplizieren
  return Array.from(new Set(roles));
}

