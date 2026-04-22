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

export function formatCurrency(amount: number | string) {
  // Konvertiere zu Number und entferne führende Nullen
  let numAmount: number
  
  if (typeof amount === 'string') {
    // Entferne führende Nullen und konvertiere zu Number
    const cleaned = amount.replace(/^0+/, '') || '0'
    numAmount = parseInt(cleaned, 10)
  } else {
    numAmount = amount
  }
  
  if (isNaN(numAmount) || numAmount === null || numAmount === undefined) {
    return '0 Schwarzgeld'
  }
  
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(numAmount) + ' Schwarzgeld'
}

export function getRoleColor(role: string) {
  switch (role) {
    case 'PATRON':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'DON':
    case 'CAPO':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'ROUTENVERWALTUNG':
    case 'RUTAS':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'LOGISTICA':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'SICARIO':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'LINCE':
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    case 'FUTURO':
      return 'bg-slate-600/20 text-slate-500 border-slate-600/30'
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}

export function getRoleDisplayName(role: string) {
  switch (role) {
    case 'PATRON':
      return 'Patron'
    case 'DON':
      return 'Don'
    case 'CAPO':
      return 'Capo'
    case 'CONSULTORA':
      return 'Consultora'
    case 'PADRINO':
      return 'Padrino'
    case 'GESTION_DE_RUTAS':
      return 'Gestión de Rutas'
    case 'EL_MUDO':
      return 'El Mudo'
    case 'CAPATAZ':
      return 'Capataz'
    case 'MERCADER':
      return 'Mercader'
    case 'COYOTE':
      return 'Coyote'
    case 'RECLUTA':
      return 'Recluta'
    case 'ROUTENVERWALTUNG':
      return 'Routenverwaltung'
    case 'LOGISTICA':
      return 'Logistica'
    case 'SICARIO':
      return 'Sicario'
    case 'LINCE':
      return 'Lince'
    case 'FUTURO':
      return 'Futuro'
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

// Leaderschaft-Rollen Konstante
export const LEADERSHIP_ROLES = ['PATRON', 'DON', 'CAPO']
export const TOP_LEADERSHIP_ROLES = ['PATRON', 'DON', 'CAPO']

// Normale Ränge 1-9 (keine Leadership, keine Funktionsrollen)
export const RANK_1_9_ROLES = [
  // Ränge 7-9
  'CONSULTORA', 'PADRINO', 'GESTION_DE_RUTAS',
  // Ränge 4-6
  'EL_MUDO', 'LINCE', 'CAPATAZ',
  // Ränge 1-3
  'MERCADER', 'COYOTE', 'RECLUTA',
]

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
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'RESERVE':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'RELEASE':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}

export function getTransactionStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'PENDING':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'REJECTED':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}
