import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: de })
}

export function formatDateShort(date: string | Date) {
  return format(new Date(date), 'dd.MM.yyyy', { locale: de })
}

export function formatRelativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: de })
}

export function formatCurrency(amount: number) {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 Schwarzgeld'
  }
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
  }).format(amount) + ' Schwarzgeld'
}

export function getRoleColor(role: string) {
  switch (role) {
    case 'EL_PATRON':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'DON':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'ASESOR':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'ROUTENVERWALTUNG':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'LOGISTICA':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    case 'SICARIO':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'SOLDADO':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

export function getRoleDisplayName(role: string) {
  switch (role) {
    case 'EL_PATRON':
      return 'El Patrón'
    case 'DON':
      return 'Don'
    case 'ASESOR':
      return 'Asesor'
    case 'ROUTENVERWALTUNG':
      return 'Routenverwaltung'
    case 'LOGISTICA':
      return 'Logistica'
    case 'SICARIO':
      return 'Sicario'
    case 'SOLDADO':
      return 'Soldado'
    default:
      return role
  }
}

export function getDisplayName(user: { icFirstName?: string; icLastName?: string; username: string }): string {
  if (user.icFirstName && user.icLastName) {
    return `${user.icFirstName} ${user.icLastName}`
  }
  return user.username
}

export function hasRole(user: any, requiredRoles: string | string[]) {
  if (!user) return false
  
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  
  // Prüfe Hauptrolle
  if (roles.includes(user.role)) return true
  
  // Prüfe alle Rollen
  if (user.allRoles && user.allRoles.some((role: string) => roles.includes(role))) return true
  
  return false
}

export function hasAnyRole(user: any, requiredRoles: string[]) {
  return hasRole(user, requiredRoles)
}

export function hasAllRoles(user: any, requiredRoles: string[]) {
  if (!user) return false
  
  // Prüfe Hauptrolle
  const hasMainRole = requiredRoles.includes(user.role)
  
  // Prüfe alle Rollen
  const hasAllUserRoles = user.allRoles ? 
    requiredRoles.every(role => user.allRoles.includes(role)) : 
    hasMainRole
  
  return hasAllUserRoles
}

export function getMovementTypeColor(type: string) {
  switch (type) {
    case 'IN':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'OUT':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'ADJUST':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'RESERVE':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'RELEASE':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

export function getTransactionStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'PENDING':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'REJECTED':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}
