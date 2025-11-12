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
    title: 'Patrón / Jefe Supremo',
    description:
      'Der Patrón ist der oberste Anführer des Kartells, bündelt alle Macht und trifft jede strategische Entscheidung. Er hält die Organisation zusammen und definiert die Vision des Kartells.',
    responsibilities: [
      'Legt die langfristige Strategie und die Kernziele des Kartells fest.',
      'Trifft Entscheidungen über Allianzen, territoriale Expansion und groß angelegte Operationen.',
      'Delegiert operative Aufgaben an Consejo Central und Mano Derecha und kontrolliert deren Umsetzung.',
      'Überwacht Finanzen, Außenbeziehungen und das gesamte Krisenmanagement.',
    ],
    dailyDuties: [
      'Strategische Briefings mit den Direktuntergebenen durchführen.',
      'Große Deals, Verträge oder Allianzen persönlich genehmigen.',
      'Disziplinarmaßnahmen und Konfliktlösungen final entscheiden.',
    ],
  },
  {
    id: 'consejo-central',
    title: 'Consejo Central (El Capitan & El Comandante)',
    description:
      'Der Consejo Central bildet den inneren Führungskreis unterhalb des Patrón. Er übersetzt strategische Ziele in konkrete Operationen und hält die Balance zwischen Geschäft und Sicherheit.',
    responsibilities: [
      'Setzt die Vorgaben des Patrón in operative Handlungspläne um.',
      'Koordiniert die Abteilungen und überwacht laufende Operationen.',
      'Meldet Fortschritte, Risiken und Auffälligkeiten direkt an den Patrón.',
    ],
    dailyDuties: [
      'Operative Lagebesprechungen organisieren und leiten.',
      'Problemberichte sammeln und priorisiert an den Patrón weitergeben.',
      'Taktische Ad-hoc-Entscheidungen treffen, wenn Situationen eskalieren.',
    ],
    subSections: [
      {
        title: 'El Capitan (Operationschef)',
        description:
          'Der Capitan verantwortet alle operativen Geschäftsbereiche: Produktion, Transport, Informationsbeschaffung und Finanzen.',
        responsibilities: [
          'Koordiniert Logística, Inteligencia und Finanzströme (Consejero).',
          'Plant Transporte, Produktion und Ressourcenverteilung.',
          'Sichert den Informationsfluss zwischen operativen Teams und dem Consejo Central.',
        ],
        dailyDuties: [
          'Routen, Lieferungen und Produktionsketten planen.',
          'Briefings mit Logística- und Inteligencia-Leitern durchführen.',
          'Investitions- und Finanzentscheidungen mit Consejero abstimmen.',
        ],
      },
      {
        title: 'El Comandante (Sicherheitschef)',
        description:
          'Der Comandante schützt das Kartell. Er führt Sicarios und Falken, steuert Sicherheitsoperationen und überwacht Rivalen.',
        responsibilities: [
          'Organisiert Schutzmaßnahmen, Sicherheitspläne und bewaffnete Operationen.',
          'Überwacht rivalisierende Gruppen, Behörden und potenzielle Bedrohungen.',
          'Sichert die Einsatzbereitschaft der Sicarios und koordiniert die Falken.',
        ],
        dailyDuties: [
          'Sicherheitseskorten und Gegenüberwachungen planen.',
          'Einsatzbesprechungen mit Sicario- und Falken-Teams durchführen.',
          'Gefahrenlagen auswerten und Risikoanalysen erstellen.',
        ],
      },
    ],
  },
  {
    id: 'mano-derecha',
    title: 'El Mano Derecha',
    description:
      'Die rechte Hand des Patrón koordiniert Kommunikation und Umsetzung. Sie sorgt dafür, dass Befehle verstanden und effizient ausgeführt werden und vertritt den Patrón bei Bedarf.',
    responsibilities: [
      'Leitet Informationen und Befehle vom Patrón an den Consejo Central weiter.',
      'Überprüft die Umsetzung und greift regulierend ein, wenn Abweichungen auftreten.',
      'Trifft in Abwesenheit des Patrón dringende Entscheidungen im Sinne der Gesamtstrategie.',
    ],
    dailyDuties: [
      'Strategische Meetings moderieren und Ergebnisse dokumentieren.',
      'Konflikte zwischen Abteilungen frühzeitig schlichten.',
      'Kontrollbesuche in den einzelnen Bereichen durchführen.',
    ],
  },
  {
    id: 'subjefes',
    title: 'Subjefes / Capitanes (Bereichskommandanten)',
    description:
      'Subjefes steuern größere Aufgabenbereiche oder Regionen. Sie übersetzen die Vorgaben von Consejo Central in konkrete Aktionspläne für ihre Teams.',
    responsibilities: [
      'Koordinieren mehrere Funktionsleiter und halten deren Teams arbeitsfähig.',
      'Planen Einsätze, stellen Ressourcen bereit und überwachen die Umsetzung.',
      'Berichten Status, Risiken und Ergebnisse an Capitan oder Comandante.',
    ],
    dailyDuties: [
      'Einsatzbesprechungen mit Funktionsleitern führen.',
      'Lage- und Fortschrittsberichte erstellen.',
      'Teams bei komplexen Operationen vor Ort leiten.',
    ],
  },
  {
    id: 'funktionsleiter',
    title: 'Funktionsleiter / Jefes de Función',
    description:
      'Funktionsleiter verantworten ihr Tagesgeschäft, führen ihre Teams und stehen in direktem Austausch mit dem zuständigen Subjefe oder Consejo-Mitglied.',
    responsibilities: [
      'Planen Aufgaben, Schichten und Ressourcen innerhalb ihres Bereichs.',
      'Übermitteln Berichte und KPIs an die nächsthöhere Ebene.',
      'Schulen und entwickeln die Teammitglieder.',
    ],
    dailyDuties: [
      'Tägliche Briefings mit Teammitgliedern durchführen.',
      'Operative Checklisten und Qualitätssicherung pflegen.',
      'Zwischenfälle dokumentieren und unmittelbar melden.',
    ],
    subSections: [
      {
        title: 'Logística',
        description: 'Transport, Lagerung und Schmuggelrouten.',
        responsibilities: [
          'Steuert Fahrzeug- und Kuriernetzwerk.',
          'Überwacht Lagerbestände und Lieferzeitpläne.',
          'Plant sichere Routen für Vorräte und Ware.',
        ],
      },
      {
        title: 'Inteligencia',
        description: 'Aufklärung, Überwachung und Informationsbeschaffung.',
        responsibilities: [
          'Analysiert Bewegungen von Rivalen und Behörden.',
          'Setzt Falken und Informanten gezielt ein.',
          'Bereitet Lageberichte für Führungskräfte vor.',
        ],
      },
      {
        title: 'Finanzas / Consejero',
        description: 'Finanzen, Buchhaltung und legale Deckgeschäfte.',
        responsibilities: [
          'Überblickt Geldflüsse und Geldwäsche-Strukturen.',
          'Betreut legale Firmen und Investitionen.',
          'Unterstützt bei internen Personal- und Disziplinfragen.',
        ],
      },
      {
        title: 'Sicarios',
        description: 'Durchsetzung, Schutz und bewaffnete Operationen.',
        responsibilities: [
          'Stellt Einsatztrupps für Schutz- und Offensivaktionen.',
          'Bewacht sensible Orte, Lieferungen und Führungspersonen.',
          'Koordiniert Training und Einsatzbereitschaft.',
        ],
      },
    ],
  },
  {
    id: 'operative',
    title: 'Operative Teams / Soldados / Support',
    description:
      'Operative Teams bilden die Basis des Kartells. Sie setzen Aufträge um, melden Ergebnisse an ihren Funktionsleiter und sorgen für Präsenz auf der Straße.',
    responsibilities: [
      'Führen Transporte, Lagerarbeiten, Aufklärung oder Schutzaufgaben aus.',
      'Melden Beobachtungen, Risiken und Erfolge unmittelbar zurück.',
      'Pflegen Ausrüstung und halten sich einsatzbereit.',
    ],
    dailyDuties: [
      'Lieferungen und Übergaben durchführen.',
      'Gebiete observieren und Informationen sammeln.',
      'Trainings- und Vorbereitungsszenarien absolvieren.',
    ],
  },
]

const treeNodes: Record<string, TreeNode> = {
  patron: {
    id: 'patron',
    label: 'Patrón / Jefe Supremo',
    summary: 'Oberstes Oberhaupt – Strategie, Vision und finale Entscheidungen.',
    responsibilities: [
      'Legt die Marschrichtung der gesamten Organisation fest.',
      'Entscheidet über Bündnisse, Territorien und Großoperationen.',
      'Überprüft die Arbeit der direkten Vertrauten und lenkt bei Bedarf gegen.',
    ],
    dailyDuties: [
      'Regelmäßige Lageberichte der Führung anfordern und bewerten.',
      'Verhandlungen mit Partnern oder Rivalen persönlich führen.',
      'Ressourcen freigeben oder Projekte stoppen, wenn es die Lage erfordert.',
    ],
  },
  'mano-derecha': {
    id: 'mano-derecha',
    label: 'El Mano Derecha',
    summary: 'Vertrauensperson des Patrón, hält alle Fäden zusammen.',
    responsibilities: [
      'Übersetzt Anweisungen des Patrón in klare Aufträge.',
      'Koordiniert Termine und Informationsflüsse.',
      'Greift ein, wenn Abteilungen aneinander vorbeiarbeiten.',
    ],
    dailyDuties: [
      'Gespräche zwischen Patrón und Consejo vorbereiten und nachbereiten.',
      'Frühzeitige Warnsignale aus den Bereichen aufnehmen.',
      'Als Stimme des Patrón auftreten, wenn dieser nicht präsent ist.',
    ],
  },
  'consejo-central': {
    id: 'consejo-central',
    label: 'Consejo Central',
    summary: 'Capitan & Comandante bilden das Herz der täglichen Steuerung.',
    responsibilities: [
      'Setzt strategische Vorgaben in konkrete Maßnahmen um.',
      'Priorisiert Ressourcen und Einsatzkräfte.',
      'Hält ständigen Kontakt zu Mano Derecha und Patrón.',
    ],
    dailyDuties: [
      'Lagebesprechungen leiten und Entscheidungen dokumentieren.',
      'Unvorhergesehene Situationen sofort an den Patrón melden.',
      'Koordination zwischen operativen und sicherheitsrelevanten Aufgaben.',
    ],
  },
  capitan: {
    id: 'capitan',
    label: 'El Capitan – Operative Leitung',
    summary: 'Lenkt alle Wirtschafts- und Informationsstränge.',
    responsibilities: [
      'Verteilt Aufträge an Logística, Inteligencia und Finanzkoordination.',
      'Sichert reibungslose Lieferketten und Geldflüsse.',
      'Berichtet unmittelbar an den Consejo Central.',
    ],
    dailyDuties: [
      'Transportrouten absegnen und Anpassungen anordnen.',
      'Berichte der Funktionsleiter prüfen und nachhalten.',
      'Investitionen oder neue Projekte vorbereiten.',
    ],
  },
  comandante: {
    id: 'comandante',
    label: 'El Comandante – Sicherheit',
    summary: 'Verantwortlich für Schutz, Gegenüberwachung und Durchsetzung.',
    responsibilities: [
      'Bewertet Bedrohungen und legt Gegenmaßnahmen fest.',
      'Koordiniert Sicarios und Aufklärungseinheiten.',
      'Garantiert Sicherheit für Operationen und Führung.',
    ],
    dailyDuties: [
      'Sicherheitspläne mit Sicario-Führung abstimmen.',
      'Aufklärungsberichte analysieren und Einsatzbereitschaft abfragen.',
      'Begleitung sensibler Treffen vorbereiten.',
    ],
  },
  subjefes: {
    id: 'subjefes',
    label: 'Subjefes / Capitanes',
    summary: 'Führen konkrete Bereiche oder Regionen im Auftrag der Leitung.',
    responsibilities: [
      'Übersetzen Befehle in Einsatz- und Schichtpläne.',
      'Halten ihre Teams arbeitsfähig und diszipliniert.',
      'Liefern verlässliche Berichte an Capitan oder Comandante.',
    ],
    dailyDuties: [
      'Besprechungen mit Funktionsleitern ansetzen.',
      'Fortschritt, Verluste oder Auffälligkeiten melden.',
      'Bei kritischen Operationen persönlich anwesend sein.',
    ],
  },
  'funktionsleiter-logistica': {
    id: 'funktionsleiter-logistica',
    label: 'Funktionsleiter Logística',
    summary: 'Plant Transporte, Lager und Nachschub.',
    responsibilities: [
      'Koordiniert Fahrzeuge, Routen und Verstecke.',
      'Sorgt für pünktliche Lieferungen ohne Aufsehen.',
      'Behält Material- und Lagerbestände im Blick.',
    ],
    dailyDuties: [
      'Fahrer einteilen und Routenbriefe erstellen.',
      'Kontrollgänge in Lagern durchführen.',
      'Kurzfristige Ersatzrouten bereitstellen.',
    ],
  },
  'funktionsleiter-inteligencia': {
    id: 'funktionsleiter-inteligencia',
    label: 'Funktionsleiter Inteligencia',
    summary: 'Sorgt für Informationen, Beobachtung und Überwachung.',
    responsibilities: [
      'Führt Falken, Informanten und technische Aufklärung.',
      'Sichtet Bewegungen von Rivalen oder Behörden.',
      'Bereitet Lagebilder für Führungskräfte auf.',
    ],
    dailyDuties: [
      'Observationsteams einsatzbereit halten.',
      'Berichte verdichten und priorisieren.',
      'Warnungen rechtzeitig an Comandante oder Capitan geben.',
    ],
  },
  'funktionsleiter-consejero': {
    id: 'funktionsleiter-consejero',
    label: 'Funktionsleiter Finanzas / Consejero',
    summary: 'Verwaltet Buchhaltung, Geldflüsse und legale Deckung.',
    responsibilities: [
      'Hält Übersicht über Einnahmen, Ausgaben und Waschanlagen.',
      'Pflegt Kontakte zu Anwälten, Geschäftsführern und Vermittlern.',
      'Unterstützt bei Personal- oder Disziplinfragen.',
    ],
    dailyDuties: [
      'Abrechnungen prüfen und Freigaben einholen.',
      'Legale Unternehmen mit echten Zahlen versorgen.',
      'Verhandlungen über Investitionen vorbereiten.',
    ],
  },
  'funktionsleiter-sicarios': {
    id: 'funktionsleiter-sicarios',
    label: 'Funktionsleiter Sicarios',
    summary: 'Führt Einsatzkräfte für Schutz und Durchsetzung.',
    responsibilities: [
      'Stellt Einsatzteams zusammen und hält sie einsatzbereit.',
      'Schützt Lager, Lieferungen und Führungspersonen.',
      'Koordiniert Training und Ausrüstung.',
    ],
    dailyDuties: [
      'Schießtrainings und Einsatzübungen planen.',
      'Begleit- und Sicherungsaufträge verteilen.',
      'Nachbesprechungen mit Teams durchführen.',
    ],
  },
  'operative-teams': {
    id: 'operative-teams',
    label: 'Operative Teams / Soldados',
    summary: 'Frontlinie der Organisation – führen Aufträge aus.',
    responsibilities: [
      'Setzen Anweisungen der Funktionsleiter um.',
      'Melden Beobachtungen und Ergebnisse direkt zurück.',
      'Pflegen Material, Ausrüstung und Tarnidentitäten.',
    ],
    dailyDuties: [
      'Lieferfahrten, Übergaben oder Sicherungen durchführen.',
      'Gebiete beobachten und verdächtige Bewegungen melden.',
      'Trainings- und Vorbereitungseinheiten besuchen.',
    ],
  },
}

const organigramLevels: OrganigramLevel[] = [
  {
    id: 'level-1',
    title: 'Oberste Führung',
    nodes: ['patron'],
  },
  {
    id: 'level-2',
    title: 'Direkte Steuerung',
    nodes: ['mano-derecha', 'consejo-central'],
  },
  {
    id: 'level-3',
    title: 'Bereichsleitung',
    nodes: ['capitan', 'comandante', 'subjefes'],
  },
  {
    id: 'level-4',
    title: 'Funktionsbereiche',
    nodes: ['funktionsleiter-logistica', 'funktionsleiter-inteligencia', 'funktionsleiter-consejero', 'funktionsleiter-sicarios'],
  },
  {
    id: 'level-5',
    title: 'Operative Kräfte',
    nodes: ['operative-teams'],
  },
]

const allNodeIds = organigramLevels.flatMap((level) => level.nodes)

const assignmentRoles: AssignmentRole[] = [
  {
    id: 'patron',
    label: 'Patrón / Jefe Supremo',
    description: 'Oberste Leitfigur mit finalem Entscheidungsrecht.',
    icon: <Crown className="h-5 w-5 text-amber-400" />,
  },
  {
    id: 'mano-derecha',
    label: 'El Mano Derecha',
    description: 'Vertrauensperson des Patrón, hält Abläufe zusammen.',
    icon: <Shield className="h-5 w-5 text-cyan-400" />,
  },
  {
    id: 'consejo-central',
    label: 'Consejo Central',
    description: 'Capitan & Comandante koordinieren tägliche Steuerung.',
    icon: <Users className="h-5 w-5 text-purple-400" />,
  },
  {
    id: 'capitan',
    label: 'El Capitan – Operative Leitung',
    description: 'Lenkt Produktion, Transport und Informationsstränge.',
    icon: <Briefcase className="h-5 w-5 text-blue-400" />,
  },
  {
    id: 'comandante',
    label: 'El Comandante – Sicherheit',
    description: 'Regelt Schutz, Gegenüberwachung und Einsatzbereitschaft.',
    icon: <Shield className="h-5 w-5 text-red-400" />,
  },
  {
    id: 'subjefes',
    label: 'Subjefes / Capitanes',
    description: 'Führen Bereiche oder Regionen für die Leitung.',
    icon: <BadgeCheck className="h-5 w-5 text-green-400" />,
  },
  {
    id: 'funktionsleiter-logistica',
    label: 'Funktionsleiter Logística',
    description: 'Plant Transporte, Lager und Nachschub.',
    icon: <Package className="h-5 w-5 text-orange-400" />,
  },
  {
    id: 'funktionsleiter-inteligencia',
    label: 'Funktionsleiter Inteligencia',
    description: 'Sammelt Informationen und steuert Aufklärung.',
    icon: <Eye className="h-5 w-5 text-emerald-400" />,
  },
  {
    id: 'funktionsleiter-consejero',
    label: 'Funktionsleiter Finanzas / Consejero',
    description: 'Überwacht Geldflüsse, Buchhaltung und legale Deckung.',
    icon: <Briefcase className="h-5 w-5 text-yellow-400" />,
  },
  {
    id: 'funktionsleiter-sicarios',
    label: 'Funktionsleiter Sicarios',
    description: 'Führt Einsatzkräfte für Schutz und Durchsetzung.',
    icon: <Swords className="h-5 w-5 text-rose-400" />,
  },
  {
    id: 'operative-teams',
    label: 'Operative Teams / Soldados',
    description: 'Setzen Aufträge im Feld um und berichten zurück.',
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
        <CardContent className="space-y-10">
          {organigramLevels.map((level) => (
            <section key={level.id} className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{level.title}</h3>
                {level.description && <p className="text-sm text-gray-400">{level.description}</p>}
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {level.nodes.map((nodeId) => (
                  <OrganigramCard key={nodeId} nodeId={nodeId} />
                ))}
              </div>
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
