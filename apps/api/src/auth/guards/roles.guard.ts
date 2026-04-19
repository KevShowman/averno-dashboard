import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private normalizeRole(role: unknown): string | null {
    if (typeof role !== 'string') return null;

    const normalized = role
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s-]+/g, '_')
      .toUpperCase();

    return normalized || null;
  }

  private getUserRoles(user: any): string[] {
    const roles: string[] = [];

    const mainRole = this.normalizeRole(user?.role);
    if (mainRole) roles.push(mainRole);

    let allRoles = user?.allRoles;
    if (typeof allRoles === 'string') {
      try {
        allRoles = JSON.parse(allRoles);
      } catch {
        allRoles = [allRoles];
      }
    }

    if (Array.isArray(allRoles)) {
      for (const role of allRoles) {
        const normalizedRole = this.normalizeRole(role);
        if (normalizedRole) roles.push(normalizedRole);
      }
    }

    return [...new Set(roles)];
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('Benutzer nicht authentifiziert');
    }

    const normalizedRequiredRoles = requiredRoles
      .map((role) => this.normalizeRole(role))
      .filter((role): role is string => !!role);
    const userRoles = this.getUserRoles(user);
    const hasRole = normalizedRequiredRoles.some((role) => userRoles.includes(role));
    
    if (!hasRole) {
      throw new ForbiddenException(`Zugriff verweigert. Erforderliche Rollen: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
