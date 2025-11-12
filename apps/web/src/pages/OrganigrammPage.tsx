import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import EnhancedPeoplePicker from '../components/EnhancedPeoplePicker'
import { getDisplayName, hasRole } from '../lib/utils'
import { useAuthStore } from '../stores/auth'
import { toast } from 'sonner'
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
  X,
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

const LOCAL_STORAGE_KEY = 'organigram-role-assignments'

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
    id: 'soldados',
    title: '🐍 Soldados / Falcónes / Support',
    description:
      'Die Basis. Die Straße. Die Augen. Sie führen Aufträge aus, melden Bewegungen – trabajo constante.',
    responsibilities: [
      'Führen Aufträge aus, melden Bewegungen.',
      'Beobachten Gebiete, liefern Infos an Inteligencia.',
      'Halten Material und Tarnung sauber.',
    ],
    dailyDuties: [
      'Lieferungen, Überwachungen, Übergaben.',
      'Trabajo constante – immer bereit.',
      'Augen offen, Ohren gespitzt, Mund zu.',
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
  'operative-teams': {
    id: 'operative-teams',
    label: 'Soldados / Falcónes / Support',
    summary: 'Die Basis. Die Straße. Die Augen.',
    responsibilities: [
      'Führen Aufträge aus, melden Bewegungen.',
      'Beobachten Gebiete, liefern Infos an Inteligencia.',
      'Halten Material und Tarnung sauber.',
    ],
    dailyDuties: [
      'Lieferungen, Überwachungen, Übergaben.',
      'Trabajo constante – immer bereit.',
      'Augen offen, Ohren gespitzt, Mund zu.',
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
    description: 'Logística, Inteligencia, Mediación, Sicarios – sie halten alles zusammen.',
    nodes: ['funktionsleiter-logistica', 'funktionsleiter-inteligencia', 'funktionsleiter-consejero', 'funktionsleiter-sicarios'],
  },
  {
    id: 'level-5',
    title: '🐍 La Base – Soldados & Falcónes',
    description: 'Die Front, die alles ausführt.',
    nodes: ['operative-teams'],
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
    id: 'operative-teams',
    label: 'Soldados / Falcónes / Support',
    description: 'Die Basis. Die Straße. Die Augen.',
    icon: <Users className="h-5 w-5 text-slate-300" />,
  },
]

export default function OrganigrammPage() {
  const { user } = useAuthStore()
  const [assignments, setAssignments] = useState<RoleAssignments>({})
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['patron'])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)
  const isElPatron = hasRole(user, 'EL_PATRON')

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as RoleAssignments
        setAssignments(parsed)
      }
    } catch (error) {
      console.error('Konnte gespeicherte Zuordnungen nicht laden:', error)
    } finally {
      setIsLoadingAssignments(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isLoadingAssignments) return

    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(assignments))
    } catch (error) {
      console.error('Konnte Zuordnungen nicht speichern:', error)
    }
  }, [assignments, isLoadingAssignments])

  const assignmentValues = useMemo(() => Object.values(assignments) as AssignedMember[][], [assignments])

  const totalAssignedMembers = useMemo(
    () => assignmentValues.reduce<number>((acc, members) => acc + members.length, 0),
    [assignmentValues]
  )

  const rolesWithAssignments = useMemo(
    () => assignmentValues.reduce<number>((acc, members) => acc + (members.length > 0 ? 1 : 0), 0),
    [assignmentValues]
  )

  const handleAssignMember = (roleId: string, user: User | null) => {
    if (!user) return

    setAssignments((prev) => {
      const existing = prev[roleId] ?? []
      if (existing.some((member) => member.id === user.id)) {
        toast.info(`${getDisplayName(user)} ist dieser Rolle bereits zugeordnet.`)
        return prev
      }

      const updated: RoleAssignments = {
        ...prev,
        [roleId]: [
          ...existing,
          {
            id: user.id,
            displayName: getDisplayName(user),
            username: user.username,
            avatarUrl: user.avatarUrl,
          },
        ],
      }

      toast.success(`${getDisplayName(user)} wurde ${treeNodes[roleId]?.label ?? 'der Rolle'} zugeordnet.`)
      return updated
    })
  }

  const handleRemoveMember = (roleId: string, memberId: string) => {
    setAssignments((prev) => {
      const existing = prev[roleId] ?? []
      const updatedMembers = existing.filter((member) => member.id !== memberId)
      return {
        ...prev,
        [roleId]: updatedMembers,
      }
    })
  }

  const handleClearRoleAssignments = (roleId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [roleId]: [],
    }))
  }

  const handleResetAllAssignments = () => {
    setAssignments({})
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
    toast.success('Alle Zuordnungen wurden zurückgesetzt.')
  }

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
      <div className="relative flex w-full max-w-sm flex-col rounded-2xl border border-gray-700 bg-gray-800/70 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{node.label}</h3>
            <p className="mt-1 text-sm text-gray-400">{node.summary}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleNode(nodeId)}
            className="text-gray-400 hover:text-white"
            aria-label={isExpanded ? 'Details einklappen' : 'Details ausklappen'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mt-3">
          {assignedMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assignedMembers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
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
          <div className="mt-4 space-y-3 text-left">
            <div>
              <h4 className="text-sm font-semibold text-gray-200">Verantwortlichkeiten</h4>
              <ul className="mt-1 space-y-1 text-sm text-gray-300 list-disc list-inside">
                {node.responsibilities.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-200">Alltägliche Aufgaben</h4>
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
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Organigramm & Rollenübersicht</h1>
        <p className="text-gray-400">
          Diese Seite bündelt die Führungsstruktur des Kartells, beschreibt Verantwortlichkeiten und ermöglicht es, Mitglieder
          interaktiven Rollen zuzuweisen.
        </p>
      </header>

      <Card className="lasanta-card">
        <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-400">Rollen im Organigramm</p>
            <p className="text-3xl font-bold text-white">{assignmentRoles.length}</p>
            <p className="text-xs text-gray-500">Hierarchiestufen von Patrón bis Operatives Team</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Aktive Zuordnungen</p>
            <p className="text-3xl font-bold text-white">{totalAssignedMembers}</p>
            <p className="text-xs text-gray-500">Summe aller zugewiesenen Mitglieder</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Rollen mit Besetzung</p>
            <p className="text-3xl font-bold text-white">{rolesWithAssignments}</p>
            <p className="text-xs text-gray-500">Von {assignmentRoles.length} Rollen aktuell belegt</p>
          </div>
        </CardContent>
      </Card>

      <Card className="lasanta-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5" />
              Organigramm der Führung
            </CardTitle>
            <CardDescription className="text-gray-400">
              Alle Ebenen von Patrón bis hin zu den operativen Kräften. Details lassen sich für jede Rolle einzeln öffnen.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={expandAllNodes}>
              Alles öffnen
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAllNodes}>
              Alles schließen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
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

      {isElPatron && (
        <Card className="lasanta-card">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                Rollen zuweisen
              </CardTitle>
              <CardDescription className="text-gray-400">
                Nutze den People Picker, um Mitglieder den jeweiligen Rollen zuzuordnen. Änderungen werden automatisch lokal gespeichert.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResetAllAssignments}>
                Alle Zuordnungen zurücksetzen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {assignmentsAreLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lade gespeicherte Zuordnungen...
              </div>
            ) : (
              assignmentRoles.map((role) => {
                const assignedMembers = assignments[role.id] ?? []
                return (
                  <Card key={role.id} className="border border-gray-700 bg-gray-900/60">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        {role.icon}
                        {role.label}
                      </CardTitle>
                      <CardDescription className="text-gray-400">{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <EnhancedPeoplePicker
                        onUserSelect={(user) => handleAssignMember(role.id, user)}
                        selectedUser={null}
                        placeholder={`${role.label}: Mitglied suchen...`}
                        className="max-w-xl"
                      />

                      {assignedMembers.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-3">
                            {assignedMembers.map((member) => (
                              <div
                                key={member.id}
                                className="group flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm text-primary"
                              >
                                <span>{member.displayName}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveMember(role.id, member.id)}
                                  className="h-6 w-6 text-primary hover:text-white"
                                  aria-label={`${member.displayName} von ${role.label} entfernen`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClearRoleAssignments(role.id)}
                              disabled={assignedMembers.length === 0}
                            >
                              Rolle leeren
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Noch keine Mitglieder zugewiesen.</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

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
