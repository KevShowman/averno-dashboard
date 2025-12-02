import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { hasRole } from '../lib/utils'
import { useAuthStore } from '../stores/auth'
import { useQuery } from '@tanstack/react-query'
import { organigrammApi } from '../lib/api'
import {
  BadgeCheck,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Crown,
  Eye,
  Loader2,
  Package,
  Shield,
  Swords,
  Users,
} from 'lucide-react'

interface User {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
  avatarUrl?: string
  role: string
  allRoles?: string[]
}

interface AssignedMember {
  id: string
  displayName: string
  username: string
  avatarUrl?: string
}

interface OverviewSubSection {
  title: string
  description: string
  responsibilities?: string[]
  dailyDuties?: string[]
}

interface OverviewSection {
  id: string
  title: string
  description: string
  responsibilities: string[]
  dailyDuties: string[]
  subSections?: OverviewSubSection[]
}

interface TreeNode {
  id: string
  label: string
  summary: string
  responsibilities: string[]
  dailyDuties: string[]
}

interface AssignmentRole {
  id: string
  label: string
  description: string
  icon: ReactNode
}

interface OrganigramLevel {
  id: string
  title: string
  description?: string
  nodes: string[]
}

type RoleAssignments = Record<string, AssignedMember[]>

const overviewSections: OverviewSection[] = [
  {
    id: 'patron',
    title: '⚜️ Patrón / Jefe Supremo',
    description:
      'La cabeza. El alma. Der Boss. Der Patrón redet selten, aber wenn er es tut, dann ist es Gesetz.',
    responsibilities: [
      'Setzt die Richtung – visión y estrategia.',
      'Entscheidet, wer lebt, wer fällt, wer aufsteigt.',
      'Behält alles im Blick, mischt sich nur ein, wenn es brennt.',
    ],
    dailyDuties: [
      'Besprechungen mit seinen Onces, letzte Worte bei Deals.',
      'Hört sich Berichte an und entscheidet, was passiert.',
      'Gibt Richtung vor – sin rodeos.',
    ],
  },
  {
    id: 'los-onces',
    title: '⚔️ Los Onces – El Capitán & El Comandante',
    description:
      'Die beiden Ersten unter dem Patrón. Sie sind direkt ihm unterstellt und steuern Operationen & Sicherheit.',
    responsibilities: [
      'Operaciones & Seguridad – die beiden Säulen des Geschäfts.',
      'Befehlsgewalt über alle Bereiche unterhalb.',
      'Entscheidungen, die das Ganze bewegen – direkt vom Patrón abgesegnet.',
    ],
    dailyDuties: [
      'Koordinieren ihre Bereiche, halten das System stabil.',
      'Melden direkt an den Patrón, ohne Filter.',
      'Greifen ein, wenn etwas aus dem Ruder läuft.',
    ],
    subSections: [
      {
        title: 'El Capitán – Operaciones',
        description: 'Der, der die Maschine am Laufen hält.',
        responsibilities: [
          'Gibt Aufträge an Logística, Inteligencia und Finanzleute.',
          'Kümmert sich um Lieferketten, Cashflow und Bewegung.',
          'Hat den Überblick über jedes laufende Geschäft.',
        ],
        dailyDuties: [
          'Checkt Routen, segnet Transporte ab.',
          'Schiebt Projekte an – sin errores.',
          'Berichtet direkt an den Patrón.',
        ],
      },
      {
        title: 'El Comandante – Seguridad',
        description: 'Der Schatten. Die Waffe. Der Schutz.',
        responsibilities: [
          'Führt Sicarios, plant Sicherheitsmaßnahmen.',
          'Macht Gegenspionage, sorgt für Ruhe im Territorio.',
          'Schützt Patrón, Familia und Lieferungen.',
        ],
        dailyDuties: [
          'Trainiert Sicarios, analysiert Bewegungen.',
          'Führt verdeckte Treffen – disciplina total.',
          'Schlägt zu, wenn keiner damit rechnet.',
        ],
      },
    ],
  },
  {
    id: 'mano-derecha',
    title: '🕴️ El Mano Derecha – Coordinador',
    description:
      'La voz del Patrón. Er redet, wenn der Boss schweigt. Sorgt dafür, dass alle Rädchen ineinandergreifen – steht aber unter den Onces.',
    responsibilities: [
      'Setzt Befehle um, verteilt Infos, hält alle synchron.',
      'Greift ein, wenn Bereiche sich überschneiden oder blockieren.',
      'Ist die rechte Hand, nicht der zweite Boss.',
    ],
    dailyDuties: [
      'Koordiniert Termine, checkt Berichte.',
      'Spricht für den Patrón, wenn es nötig ist.',
      'Sorgt dafür, dass Capitán & Comandante harmonieren.',
    ],
  },
  {
    id: 'funciones',
    title: '🧭 Funciones – Die Säulen',
    description:
      'Logística, Inteligencia, Mediación, Sicarios – sie halten alles zusammen. Berichten an Mano Derecha.',
    responsibilities: [
      'Jeder Bereich verantwortet sein Tagesgeschäft.',
      'Planen, führen, melden – ohne Fehler.',
      'Halten ihre Teams einsatzbereit.',
    ],
    dailyDuties: [
      'Tägliche Abstimmung mit ihren Leuten.',
      'Berichte an Mano Derecha oder direkt an die Onces.',
      'Reagieren schnell, wenn etwas klemmt.',
    ],
    subSections: [
      {
        title: '🚚 Logística – Transporte & Nachschub',
        description: 'Die Wege des Geldes und der Ware.',
        responsibilities: [
          'Plant Transporte, Routen und Lagerorte.',
          'Koordiniert Fahrer, Schmuggler, Lieferanten.',
          'Hält alles unsichtbar, schnell und sauber.',
        ],
        dailyDuties: [
          'Routen prüfen, Wagen absegnen.',
          'Backups vorbereiten – sin fallos.',
          'Fahrer einteilen, Übergaben koordinieren.',
        ],
      },
      {
        title: '🧠 Inteligencia – Aufklärung & Falcónes',
        description: 'Die Augen und Ohren der Familia.',
        responsibilities: [
          'Beobachten Cops, Rivalen, Bewegungen.',
          'Führen Falcónes und Technikleute.',
          'Liefern Reports, bevor es brennt.',
        ],
        dailyDuties: [
          'Daten sammeln, Beobachtungen filtern.',
          'Warnungen rausgeben – calladitos pero peligrosos.',
          'Observationen planen, Teams einsatzbereit halten.',
        ],
      },
      {
        title: '🕊️ Consejero – Comunicación & Mediación',
        description: 'Die Stimme zwischen den Stimmen.',
        responsibilities: [
          'Vermittelt zwischen Crews und Mitgliedern.',
          'Fängt Spannungen auf, bevor sie eskalieren.',
          'Bringt Leute an einen Tisch, wenn es kracht.',
        ],
        dailyDuties: [
          'Gespräche führen, vermitteln.',
          'Lösungen finden – la paz interna primero.',
          'Konflikte entschärfen, bevor Blut fließt.',
        ],
      },
      {
        title: '🔫 Sicarios – Schutz & Durchsetzung',
        description: 'Die Faust der Familia.',
        responsibilities: [
          'Führen Teams, schützen Transporte & Führung.',
          'Trainieren neue Rekruten.',
          'Halten Respekt und Ordnung durch Präsenz.',
        ],
        dailyDuties: [
          'Trainings, Sicherungen, Einsätze.',
          'Schutz planen, Präsenz zeigen – acción directa.',
          'Neue Leute ausbilden, alte scharf halten.',
        ],
      },
    ],
  },
  {
    id: 'ranks-7-9',
    title: '🔹 Ränge 7-9: Oberste Soldaten',
    description:
      'El Custodio, El Mentor, El Encargado – die erfahrensten und vertrauenswürdigsten Soldaten.',
    responsibilities: [
      'Führen kleinere Teams und mentorieren neue Mitglieder.',
      'Überwachen kritische Operationen und Transporte.',
      'Vertreten die Familia mit Autorität und Respekt.',
    ],
    dailyDuties: [
      'Koordinieren Einsätze, führen Trainings.',
      'Verantworten Sicherheit und Ausführung.',
      'Melden direkt an die Funciones.',
    ],
  },
  {
    id: 'ranks-4-6',
    title: '🔸 Ränge 4-6: Bewährte Soldaten',
    description:
      'El Teniente, Soldado, El Prefecto – das Rückgrat der operativen Arbeit.',
    responsibilities: [
      'Führen Aufträge selbstständig aus.',
      'Unterstützen höhere Ränge bei komplexen Operationen.',
      'Sammeln Informationen und sichern Gebiete.',
    ],
    dailyDuties: [
      'Lieferungen, Übergaben, Sicherungen.',
      'Beobachten Gebiete, melden Auffälligkeiten.',
      'Trabajo constante – zuverlässig und präsent.',
    ],
  },
  {
    id: 'ranks-1-3',
    title: '🔻 Ränge 1-3: Neue Gesichter',
    description:
      'El Novato, El Protector, El Confidente – der Einstieg in die Familia.',
    responsibilities: [
      'Lernen die Abläufe und Strukturen kennen.',
      'Unterstützen erfahrene Mitglieder bei einfachen Aufgaben.',
      'Beweisen Loyalität und Zuverlässigkeit.',
    ],
    dailyDuties: [
      'Einfache Transporte und Botengänge.',
      'Beobachtungen und kleine Aufträge.',
      'Augen offen, lernen, wachsen.',
    ],
  },
]

const treeNodes: Record<string, TreeNode> = {
  patron: {
    id: 'patron',
    label: 'Patrón / Jefe Supremo',
    summary: 'La cabeza. El alma. Der Boss.',
    responsibilities: [
      'Setzt die Richtung – visión y estrategia.',
      'Entscheidet, wer lebt, wer fällt, wer aufsteigt.',
      'Behält alles im Blick, mischt sich nur ein, wenn es brennt.',
    ],
    dailyDuties: [
      'Besprechungen mit seinen Onces, letzte Worte bei Deals.',
      'Hört sich Berichte an und entscheidet, was passiert.',
      'Gibt Richtung vor – sin rodeos.',
    ],
  },
  capitan: {
    id: 'capitan',
    label: 'El Capitán – Operaciones',
    summary: 'Der, der die Maschine am Laufen hält.',
    responsibilities: [
      'Gibt Aufträge an Logística, Inteligencia und Finanzleute.',
      'Kümmert sich um Lieferketten, Cashflow und Bewegung.',
      'Hat den Überblick über jedes laufende Geschäft.',
    ],
    dailyDuties: [
      'Checkt Routen, segnet Transporte ab.',
      'Schiebt Projekte an – sin errores.',
      'Berichtet direkt an den Patrón.',
    ],
  },
  comandante: {
    id: 'comandante',
    label: 'El Comandante – Seguridad',
    summary: 'Der Schatten. Die Waffe. Der Schutz.',
    responsibilities: [
      'Führt Sicarios, plant Sicherheitsmaßnahmen.',
      'Macht Gegenspionage, sorgt für Ruhe im Territorio.',
      'Schützt Patrón, Familia und Lieferungen.',
    ],
    dailyDuties: [
      'Trainiert Sicarios, analysiert Bewegungen.',
      'Führt verdeckte Treffen – disciplina total.',
      'Schlägt zu, wenn keiner damit rechnet.',
    ],
  },
  'mano-derecha': {
    id: 'mano-derecha',
    label: 'El Mano Derecha – Coordinador',
    summary: 'La voz del Patrón. Sorgt dafür, dass alle Rädchen ineinandergreifen.',
    responsibilities: [
      'Setzt Befehle um, verteilt Infos, hält alle synchron.',
      'Greift ein, wenn Bereiche sich überschneiden oder blockieren.',
      'Ist die rechte Hand, nicht der zweite Boss.',
    ],
    dailyDuties: [
      'Koordiniert Termine, checkt Berichte.',
      'Spricht für den Patrón, wenn es nötig ist.',
      'Sorgt dafür, dass Capitán & Comandante harmonieren.',
    ],
  },
  'funktionsleiter-logistica': {
    id: 'funktionsleiter-logistica',
    label: 'Logística – Transporte & Nachschub',
    summary: 'Die Wege des Geldes und der Ware.',
    responsibilities: [
      'Plant Transporte, Routen und Lagerorte.',
      'Koordiniert Fahrer, Schmuggler, Lieferanten.',
      'Hält alles unsichtbar, schnell und sauber.',
    ],
    dailyDuties: [
      'Routen prüfen, Wagen absegnen.',
      'Backups vorbereiten – sin fallos.',
      'Fahrer einteilen, Übergaben koordinieren.',
    ],
  },
  'funktionsleiter-inteligencia': {
    id: 'funktionsleiter-inteligencia',
    label: 'Inteligencia – Aufklärung & Falcónes',
    summary: 'Die Augen und Ohren der Familia.',
    responsibilities: [
      'Beobachten Cops, Rivalen, Bewegungen.',
      'Führen Falcónes und Technikleute.',
      'Liefern Reports, bevor es brennt.',
    ],
    dailyDuties: [
      'Daten sammeln, Beobachtungen filtern.',
      'Warnungen rausgeben – calladitos pero peligrosos.',
      'Observationen planen, Teams einsatzbereit halten.',
    ],
  },
  'funktionsleiter-consejero': {
    id: 'funktionsleiter-consejero',
    label: 'Consejero – Comunicación & Mediación',
    summary: 'Die Stimme zwischen den Stimmen.',
    responsibilities: [
      'Vermittelt zwischen Crews und Mitgliedern.',
      'Fängt Spannungen auf, bevor sie eskalieren.',
      'Bringt Leute an einen Tisch, wenn es kracht.',
    ],
    dailyDuties: [
      'Gespräche führen, vermitteln.',
      'Lösungen finden – la paz interna primero.',
      'Konflikte entschärfen, bevor Blut fließt.',
    ],
  },
  'funktionsleiter-sicarios': {
    id: 'funktionsleiter-sicarios',
    label: 'Sicarios – Schutz & Durchsetzung',
    summary: 'Die Faust der Familia.',
    responsibilities: [
      'Führen Teams, schützen Transporte & Führung.',
      'Trainieren neue Rekruten.',
      'Halten Respekt und Ordnung durch Präsenz.',
    ],
    dailyDuties: [
      'Trainings, Sicherungen, Einsätze.',
      'Schutz planen, Präsenz zeigen – acción directa.',
      'Neue Leute ausbilden, alte scharf halten.',
    ],
  },
  'funktionsleiter-rutas': {
    id: 'funktionsleiter-rutas',
    label: 'Rutas – Routenverwaltung & Transporte',
    summary: 'Die Wege der Ware.',
    responsibilities: [
      'Hält Kontakt zu Familien und analysiert Routenpreise',
      'Plant sichere Transportwege.',
      'Koordiniert alle Routen und Lieferungen.',
    ],
    dailyDuties: [
      'Routen planen, Lieferungen koordinieren.',
      'Sicherheit der Transporte gewährleisten.',
      'Optimierung der Logistik.',
    ],
  },
  'funktionsleiter-formacion': {
    id: 'funktionsleiter-formacion',
    label: 'Formación – Ausbildung & Training',
    summary: 'Die Schmiede der Familia.',
    responsibilities: [
      'Trainiert neue und bestehende Mitglieder.',
      'Entwickelt Schulungsprogramme.',
      'Bewertet Fortschritte und Fähigkeiten.',
    ],
    dailyDuties: [
      'Trainings durchführen und planen.',
      'Mitglieder coachen und weiterentwickeln.',
      'Standards setzen und einhalten.',
    ],
  },
  'funktionsleiter-contacto': {
    id: 'funktionsleiter-contacto',
    label: 'Contacto – Externe Beziehungen',
    summary: 'Die Brücke nach außen.',
    responsibilities: [
      'Pflegt Kontakte zu anderen Familien.',
      'Verhandelt Deals und Gespräche / Termine.',
      'Repräsentiert die Familia nach außen.',
    ],
    dailyDuties: [
      'Meetings mit externen Partnern.',
      'Verhandlungen führen und dokumentieren.',
      'Netzwerk aufbauen und pflegen.',
    ],
  },
  'ranks-7-9': {
    id: 'ranks-7-9',
    label: 'Ränge 7-9: El Custodio, El Mentor, El Encargado',
    summary: 'Die obersten Soldaten – erfahren, vertrauenswürdig, führend.',
    responsibilities: [
      'Führen kleinere Teams und mentorieren neue Mitglieder.',
      'Überwachen kritische Operationen und Transporte.',
      'Vertreten die Familia mit Autorität und Respekt.',
    ],
    dailyDuties: [
      'Koordinieren Einsätze, führen Trainings.',
      'Verantworten Sicherheit und Ausführung.',
      'Melden direkt an die Funciones.',
    ],
  },
  'ranks-4-6': {
    id: 'ranks-4-6',
    label: 'Ränge 4-6: El Teniente, Soldado, El Prefecto',
    summary: 'Das Rückgrat – bewährt, zuverlässig, immer im Einsatz.',
    responsibilities: [
      'Führen Aufträge selbstständig aus.',
      'Unterstützen höhere Ränge bei komplexen Operationen.',
      'Sammeln Informationen und sichern Gebiete.',
    ],
    dailyDuties: [
      'Lieferungen, Übergaben, Sicherungen.',
      'Beobachten Gebiete, melden Auffälligkeiten.',
      'Trabajo constante – zuverlässig und präsent.',
    ],
  },
  'ranks-1-3': {
    id: 'ranks-1-3',
    label: 'Ränge 1-3: El Novato, El Protector, El Confidente',
    summary: 'Der Einstieg – lernen, beweisen, wachsen.',
    responsibilities: [
      'Lernen die Abläufe und Strukturen kennen.',
      'Unterstützen erfahrene Mitglieder bei einfachen Aufgaben.',
      'Beweisen Loyalität und Zuverlässigkeit.',
    ],
    dailyDuties: [
      'Einfache Transporte und Botengänge.',
      'Beobachtungen und kleine Aufträge.',
      'Augen offen, lernen, wachsen.',
    ],
  },
}

const organigramLevels: OrganigramLevel[] = [
  {
    id: 'level-1',
    title: '⚜️ Patrón',
    description: 'Das Oberhaupt – alle Macht, alle Entscheidungen.',
    nodes: ['patron'],
  },
  {
    id: 'level-2',
    title: '⚔️ Los Onces – Die Ersten unter dem Patrón',
    description: 'Operaciones & Seguridad – direkt dem Patrón unterstellt.',
    nodes: ['capitan', 'comandante'],
  },
  {
    id: 'level-3',
    title: '🕴️ Coordinación',
    description: 'El Mano Derecha hält die Fäden zwischen den Onces und den Funciones.',
    nodes: ['mano-derecha'],
  },
  {
    id: 'level-4',
    title: '🧭 Funciones – Die Säulen',
    description: 'Logística, Inteligencia, Mediación, Sicarios, Rutas – sie halten alles zusammen.',
    nodes: ['funktionsleiter-logistica', 'funktionsleiter-inteligencia', 'funktionsleiter-consejero', 'funktionsleiter-sicarios', 'funktionsleiter-rutas', 'funktionsleiter-formacion', 'funktionsleiter-contacto'],
  },
  {
    id: 'level-5',
    title: '🔹 Ränge 7-9 – Oberste Soldaten',
    description: 'El Custodio, El Mentor, El Encargado – die erfahrensten Kämpfer.',
    nodes: ['ranks-7-9'],
  },
  {
    id: 'level-6',
    title: '🔸 Ränge 4-6 – Bewährte Soldaten',
    description: 'El Teniente, Soldado, El Prefecto – das operative Rückgrat.',
    nodes: ['ranks-4-6'],
  },
  {
    id: 'level-7',
    title: '🔻 Ränge 1-3 – Neue Gesichter',
    description: 'El Novato, El Protector, El Confidente – der Einstieg.',
    nodes: ['ranks-1-3'],
  },
]

const allNodeIds = organigramLevels.flatMap((level) => level.nodes)

const assignmentRoles: AssignmentRole[] = [
  {
    id: 'patron',
    label: 'Patrón / Jefe Supremo',
    description: 'La cabeza. El alma. Der Boss.',
    icon: <Crown className="h-5 w-5 text-amber-400" />,
  },
  {
    id: 'capitan',
    label: 'El Capitán – Operaciones',
    description: 'Der, der die Maschine am Laufen hält.',
    icon: <Briefcase className="h-5 w-5 text-blue-400" />,
  },
  {
    id: 'comandante',
    label: 'El Comandante – Seguridad',
    description: 'Der Schatten. Die Waffe. Der Schutz.',
    icon: <Shield className="h-5 w-5 text-red-400" />,
  },
  {
    id: 'mano-derecha',
    label: 'El Mano Derecha – Coordinador',
    description: 'La voz del Patrón. Koordiniert zwischen den Onces.',
    icon: <BadgeCheck className="h-5 w-5 text-cyan-400" />,
  },
  {
    id: 'funktionsleiter-logistica',
    label: 'Logística – Transporte & Nachschub',
    description: 'Die Wege des Geldes und der Ware.',
    icon: <Package className="h-5 w-5 text-orange-400" />,
  },
  {
    id: 'funktionsleiter-inteligencia',
    label: 'Inteligencia – Aufklärung & Falcónes',
    description: 'Die Augen und Ohren der Familia.',
    icon: <Eye className="h-5 w-5 text-emerald-400" />,
  },
  {
    id: 'funktionsleiter-consejero',
    label: 'Consejero – Comunicación & Mediación',
    description: 'Die Stimme zwischen den Stimmen.',
    icon: <Briefcase className="h-5 w-5 text-yellow-400" />,
  },
  {
    id: 'funktionsleiter-sicarios',
    label: 'Sicarios – Schutz & Durchsetzung',
    description: 'Die Faust der Familia.',
    icon: <Swords className="h-5 w-5 text-rose-400" />,
  },
  {
    id: 'funktionsleiter-rutas',
    label: 'Rutas – Routenverwaltung',
    description: 'Die Logistik und Routen.',
    icon: <Package className="h-5 w-5 text-amber-400" />,
  },
  {
    id: 'funktionsleiter-formacion',
    label: 'Formación – Ausbildung',
    description: 'Training und Entwicklung.',
    icon: <Shield className="h-5 w-5 text-blue-400" />,
  },
  {
    id: 'funktionsleiter-contacto',
    label: 'Contacto – Kontaktperson',
    description: 'Externe Kommunikation.',
    icon: <BadgeCheck className="h-5 w-5 text-purple-400" />,
  },
  {
    id: 'ranks-7-9',
    label: 'Ränge 7-9: Oberste Soldaten',
    description: 'El Custodio, El Mentor, El Encargado',
    icon: <Users className="h-5 w-5 text-purple-400" />,
  },
  {
    id: 'ranks-4-6',
    label: 'Ränge 4-6: Bewährte Soldaten',
    description: 'El Teniente, Soldado, El Prefecto',
    icon: <Users className="h-5 w-5 text-indigo-400" />,
  },
  {
    id: 'ranks-1-3',
    label: 'Ränge 1-3: Neue Gesichter',
    description: 'El Novato, El Protector, El Confidente',
    icon: <Users className="h-5 w-5 text-slate-400" />,
  },
]

export default function OrganigrammPage() {
  const { user } = useAuthStore()
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['patron'])

  // Lade Zuweisungen vom Server (automatisch aus Discord)
  const { data: assignments = {}, isLoading: isLoadingAssignments } = useQuery<RoleAssignments>({
    queryKey: ['organigramm-assignments'],
    queryFn: organigrammApi.getAssignments,
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
  })

  const assignmentValues = useMemo(() => Object.values(assignments) as AssignedMember[][], [assignments])

  const totalAssignedMembers = useMemo(
    () => assignmentValues.reduce<number>((acc, members) => acc + members.length, 0),
    [assignmentValues]
  )

  const rolesWithAssignments = useMemo(
    () => assignmentValues.reduce<number>((acc, members) => acc + (members.length > 0 ? 1 : 0), 0),
    [assignmentValues]
  )

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    )
  }

  const expandAllNodes = () => {
    setExpandedNodes(allNodeIds)
  }

  const collapseAllNodes = () => {
    setExpandedNodes([])
  }

  const assignmentsAreLoading = isLoadingAssignments

  const OrganigramCard: FC<{ nodeId: string }> = ({ nodeId }) => {
    const node = treeNodes[nodeId]
    if (!node) return null

    const assignedMembers = assignments[nodeId] ?? []
    const isExpanded = expandedNodes.includes(nodeId)

    return (
      <div className="relative flex w-full max-w-sm flex-col rounded-2xl border border-amber-500/20 bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-5 shadow-lg backdrop-blur-sm hover:border-amber-500/40 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{node.label}</h3>
            <p className="mt-1 text-sm text-gray-400">{node.summary}</p>
          </div>
          <button
            onClick={() => toggleNode(nodeId)}
            className="text-gray-400 hover:text-amber-400 p-2 rounded-lg hover:bg-amber-500/10 transition-colors"
            aria-label={isExpanded ? 'Details einklappen' : 'Details ausklappen'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-3">
          {assignedMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assignedMembers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-300"
                >
                  {member.displayName}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-gray-500">Noch keine Mitglieder zugeordnet</p>
          )}
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3 text-left border-t border-gray-700/50 pt-4">
            <div>
              <h4 className="text-sm font-semibold text-amber-300/80">Verantwortlichkeiten</h4>
              <ul className="mt-1 space-y-1 text-sm text-gray-300 list-disc list-inside">
                {node.responsibilities.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-300/80">Alltägliche Aufgaben</h4>
              <ul className="mt-1 space-y-1 text-sm text-gray-300 list-disc list-inside">
                {node.dailyDuties.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-amber-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-yellow-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-xl shadow-lg shadow-amber-500/30">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Organigramm & Rollenübersicht</h1>
            <p className="text-gray-400 mt-1">
              Führungsstruktur des Kartells mit Verantwortlichkeiten
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border-amber-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <p className="text-amber-300/70 text-sm">Rollen im Organigramm</p>
            <p className="text-2xl font-bold text-white">{assignmentRoles.length}</p>
            <p className="text-xs text-gray-500 mt-1">Hierarchiestufen von Patrón bis Operatives Team</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <BadgeCheck className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className="text-green-300/70 text-sm">Aktive Zuordnungen</p>
            <p className="text-2xl font-bold text-white">{totalAssignedMembers}</p>
            <p className="text-xs text-gray-500 mt-1">Summe aller zugewiesenen Mitglieder</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-amber-500/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-blue-300/70 text-sm">Rollen mit Besetzung</p>
            <p className="text-2xl font-bold text-white">{rolesWithAssignments}</p>
            <p className="text-xs text-gray-500 mt-1">Von {assignmentRoles.length} Rollen aktuell belegt</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-800">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-amber-400" />
              Organigramm der Führung
            </CardTitle>
            <CardDescription className="text-gray-400">
              Alle Ebenen von Patrón bis hin zu den operativen Kräften
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              className="px-4 py-2 text-sm border border-gray-700 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors"
              onClick={expandAllNodes}
            >
              Alles öffnen
            </button>
            <button 
              className="px-4 py-2 text-sm border border-gray-700 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors"
              onClick={collapseAllNodes}
            >
              Alles schließen
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 p-4">
          {organigramLevels.map((level, levelIndex) => (
            <section key={level.id} className="relative">
              {/* Verbindungslinie von vorheriger Ebene */}
              {levelIndex > 0 && (
                <div className="flex justify-center pb-4">
                  <div className="h-8 w-0.5 bg-gradient-to-b from-amber-500/30 to-amber-500/10"></div>
                </div>
              )}
              
              <div className="space-y-4 pb-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white">{level.title}</h3>
                  {level.description && <p className="text-sm text-gray-400">{level.description}</p>}
                </div>
                
                {/* Nodes mit Flexbox für zentrale Anordnung */}
                <div className="flex flex-wrap justify-center gap-6">
                  {level.nodes.map((nodeId) => (
                    <div key={nodeId} className="w-full max-w-md">
                      <OrganigramCard nodeId={nodeId} />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Verbindungslinie zur nächsten Ebene */}
              {levelIndex < organigramLevels.length - 1 && (
                <div className="flex justify-center">
                  <div className="h-8 w-0.5 bg-gradient-to-b from-amber-500/10 to-amber-500/30"></div>
                </div>
              )}
            </section>
          ))}
        </CardContent>
      </Card>

      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">Ausführliche Rollenbeschreibungen</CardTitle>
          <CardDescription className="text-gray-400">
            Vollständige Übersicht für alle Mitglieder mit Verantwortlichkeiten und alltäglichen Aufgaben.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {overviewSections.map((section) => (
            <div key={section.id} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
                <p className="mt-2 text-gray-300">{section.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">Verantwortlichkeiten</h3>
                  <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                    {section.responsibilities.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Alltägliche Aufgaben</h3>
                  <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                    {section.dailyDuties.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {section.subSections && section.subSections.length > 0 && (
                <div className="space-y-4">
                  {section.subSections.map((sub, index) => (
                    <div key={index} className="rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                      <h4 className="text-xl font-semibold text-white">{sub.title}</h4>
                      <p className="mt-2 text-gray-300">{sub.description}</p>
                      {sub.responsibilities && (
                        <div className="mt-3">
                          <h5 className="text-sm font-semibold text-gray-200">Aufgaben</h5>
                          <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                            {sub.responsibilities.map((item, subIndex) => (
                              <li key={subIndex}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {sub.dailyDuties && (
                        <div className="mt-3">
                          <h5 className="text-sm font-semibold text-gray-200">Alltägliche Aufgaben</h5>
                          <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                            {sub.dailyDuties.map((item, subIndex) => (
                              <li key={subIndex}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
