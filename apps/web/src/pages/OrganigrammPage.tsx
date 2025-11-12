import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import EnhancedPeoplePicker from '../components/EnhancedPeoplePicker'
import { getDisplayName } from '../lib/utils'
import { toast } from 'sonner'
import {
  BadgeCheck,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Copy,
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
  rpActivities?: string[]
}

interface OverviewSection {
  id: string
  title: string
  description: string
  responsibilities: string[]
  rpActivities: string[]
  subSections?: OverviewSubSection[]
}

interface TreeNode {
  id: string
  label: string
  summary: string
  responsibilities: string[]
  rpActivities: string[]
  children?: string[]
}

interface AssignmentRole {
  id: string
  label: string
  description: string
  icon: ReactNode
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
    rpActivities: [
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
    rpActivities: [
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
        rpActivities: [
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
        rpActivities: [
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
    rpActivities: [
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
    rpActivities: [
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
    rpActivities: [
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
    rpActivities: [
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
    summary: 'Oberster Boss, definiert Strategie und finale Entscheidungen.',
    responsibilities: [
      'Strategische Zielsetzung und Gesamtführung.',
      'Genehmigung von Allianzen und Großoperationen.',
      'Kontrolle der Direktuntergebenen und ihrer Ergebnisse.',
    ],
    rpActivities: [
      'Strategische Meetings moderieren.',
      'Schlüsselentscheidungen persönlich absegnen.',
      'Krisen- und Diplomatiegespräche führen.',
    ],
    children: ['mano-derecha', 'consejo-central'],
  },
  'mano-derecha': {
    id: 'mano-derecha',
    label: 'El Mano Derecha',
    summary: 'Vertrauensperson und Bindeglied zwischen Patrón und Führung.',
    responsibilities: [
      'Kommunikation unterstützen und Befehle überwachen.',
      'Delegation und Priorisierung von Aufgaben.',
      'Vertretung des Patrón bei Abwesenheit.',
    ],
    rpActivities: [
      'Statusrunden moderieren.',
      'Konflikte frühzeitig schlichten.',
      'Kontrollbesuche koordinieren.',
    ],
  },
  'consejo-central': {
    id: 'consejo-central',
    label: 'Consejo Central',
    summary: 'Innerer Kreis – Capitan & Comandante setzen Strategie um.',
    responsibilities: [
      'Operative Umsetzung der Patron-Vorgaben.',
      'Lagebeurteilung und Priorisierung.',
      'Direkte Rückmeldungen an die Spitze.',
    ],
    rpActivities: [
      'Lagebesprechungen halten.',
      'Missionen planen und freigeben.',
      'Risiken analysieren und kommunizieren.',
    ],
    children: ['capitan', 'comandante', 'subjefes'],
  },
  capitan: {
    id: 'capitan',
    label: 'El Capitan (Operationschef)',
    summary: 'Steuert Logística, Inteligencia und Finanzkoordination.',
    responsibilities: [
      'Produktions- und Transportketten planen.',
      'Informationsfluss zwischen Funktionsleitern sichern.',
      'Finanz- und Ressourcenplanung kontrollieren.',
    ],
    rpActivities: [
      'Transportrouten abstimmen.',
      'Operative Briefings leiten.',
      'Investitionen freigeben.',
    ],
    children: ['funktionsleiter-logistica', 'funktionsleiter-inteligencia', 'funktionsleiter-consejero'],
  },
  comandante: {
    id: 'comandante',
    label: 'El Comandante (Sicherheitschef)',
    summary: 'Verantwortlich für Sicherheit, Sicarios und Falken.',
    responsibilities: [
      'Schutzmaßnahmen planen und durchführen.',
      'Bedrohungen analysieren und Gegenmaßnahmen setzen.',
      'Sicarios anleiten und einsatzfähig halten.',
    ],
    rpActivities: [
      'Sicherheitsoperationen koordinieren.',
      'Aufklärungsdaten auswerten.',
      'Einsatzbesprechungen führen.',
    ],
    children: ['funktionsleiter-sicarios'],
  },
  subjefes: {
    id: 'subjefes',
    label: 'Subjefes / Capitanes',
    summary: 'Bereichskommandanten übersetzen Strategie in Einsatzpläne.',
    responsibilities: [
      'Mehrere Funktionsleiter koordinieren.',
      'Ressourcen & Personal verteilen.',
      'Berichte an Consejo Central liefern.',
    ],
    rpActivities: [
      'Schlüsselmissionen anleiten.',
      'Lageberichte konsolidieren.',
      'Schicht- und Einsatzplanung erstellen.',
    ],
    children: ['funktionsleiter-logistica', 'funktionsleiter-inteligencia', 'funktionsleiter-consejero', 'funktionsleiter-sicarios'],
  },
  'funktionsleiter-logistica': {
    id: 'funktionsleiter-logistica',
    label: 'Logística',
    summary: 'Transport, Lager und Schmuggelrouten.',
    responsibilities: [
      'Routen und Fahrer koordinieren.',
      'Lagerbestände überwachen.',
      'Sichere Übergaben planen.',
    ],
    rpActivities: [
      'Lieferungen organisieren.',
      'Risikoanalysen für Transporte erstellen.',
      'Fahrzeug- und Materialchecks durchführen.',
    ],
    children: ['operative-teams'],
  },
  'funktionsleiter-inteligencia': {
    id: 'funktionsleiter-inteligencia',
    label: 'Inteligencia',
    summary: 'Aufklärung, Überwachung, Informationsbeschaffung.',
    responsibilities: [
      'Falken und Informanten führen.',
      'Rivalen und Behörden beobachten.',
      'Lageberichte aufbereiten.',
    ],
    rpActivities: [
      'Observationen planen.',
      'Daten mit Capitan teilen.',
      'Hinweise an Einsatzteams weitergeben.',
    ],
    children: ['operative-teams'],
  },
  'funktionsleiter-consejero': {
    id: 'funktionsleiter-consejero',
    label: 'Finanzas / Consejero',
    summary: 'Finanzen, Buchhaltung und Deckgeschäfte.',
    responsibilities: [
      'Geldströme und Geldwäsche überwachen.',
      'Legale Firmen koordinieren.',
      'Disziplin- und Personalthemen begleiten.',
    ],
    rpActivities: [
      'Kassenprüfungen durchführen.',
      'Investitionen planen.',
      'Berichte für Capitan erstellen.',
    ],
    children: ['operative-teams'],
  },
  'funktionsleiter-sicarios': {
    id: 'funktionsleiter-sicarios',
    label: 'Sicarios',
    summary: 'Bewaffnete Operationen und Schutzaufträge.',
    responsibilities: [
      'Einsatzteams vorbereiten und entsenden.',
      'Schutz von Personen und Assets organisieren.',
      'Trainings und Ausrüstung koordinieren.',
    ],
    rpActivities: [
      'Sicherheitsmissionen führen.',
      'Einsatznachbesprechungen durchführen.',
      'Neue Rekruten ausbilden.',
    ],
    children: ['operative-teams'],
  },
  'operative-teams': {
    id: 'operative-teams',
    label: 'Operative Teams / Support',
    summary: 'Ausführende Kräfte für Transport, Schutz und Aufklärung.',
    responsibilities: [
      'Aufträge des Funktionsleiters präzise ausführen.',
      'Ergebnisse zeitnah zurückmelden.',
      'Einsatzbereitschaft von Ausrüstung sicherstellen.',
    ],
    rpActivities: [
      'Operative Einsätze durchführen.',
      'Gebiete beobachten und melden.',
      'Teamtrainings absolvieren.',
    ],
  },
}

const assignmentRoles: AssignmentRole[] = [
  {
    id: 'patron',
    label: 'Patrón / Jefe Supremo',
    description: 'Oberste Entscheidungsgewalt und strategische Verantwortung.',
    icon: <Crown className="h-5 w-5 text-amber-400" />,
  },
  {
    id: 'mano-derecha',
    label: 'El Mano Derecha',
    description: 'Vertrauter des Patrón, Kommunikation & Kontrolle.',
    icon: <Shield className="h-5 w-5 text-cyan-400" />,
  },
  {
    id: 'consejo-central',
    label: 'Consejo Central',
    description: 'Leitungsebene: Capitan & Comandante.',
    icon: <Users className="h-5 w-5 text-purple-400" />,
  },
  {
    id: 'capitan',
    label: 'El Capitan (Operationschef)',
    description: 'Operatives Management von Produktion und Logistik.',
    icon: <Briefcase className="h-5 w-5 text-blue-400" />,
  },
  {
    id: 'comandante',
    label: 'El Comandante (Sicherheitschef)',
    description: 'Sicherheit, Sicarios, Gegenüberwachung.',
    icon: <Shield className="h-5 w-5 text-red-400" />,
  },
  {
    id: 'subjefes',
    label: 'Subjefes / Bereichskommandanten',
    description: 'Koordination größerer Bereiche und Teams.',
    icon: <BadgeCheck className="h-5 w-5 text-green-400" />,
  },
  {
    id: 'funktionsleiter-logistica',
    label: 'Funktionsleiter Logística',
    description: 'Transport, Lagerung und sichere Routen.',
    icon: <Package className="h-5 w-5 text-orange-400" />,
  },
  {
    id: 'funktionsleiter-inteligencia',
    label: 'Funktionsleiter Inteligencia',
    description: 'Aufklärung, Überwachung, Informationsnetzwerk.',
    icon: <Eye className="h-5 w-5 text-emerald-400" />,
  },
  {
    id: 'funktionsleiter-consejero',
    label: 'Funktionsleiter Finanzas / Consejero',
    description: 'Finanzen, Buchhaltung, legale Deckgeschäfte.',
    icon: <Briefcase className="h-5 w-5 text-yellow-400" />,
  },
  {
    id: 'funktionsleiter-sicarios',
    label: 'Funktionsleiter Sicarios',
    description: 'Einsatzplanung, Schutz, Durchsetzung.',
    icon: <Swords className="h-5 w-5 text-rose-400" />,
  },
  {
    id: 'operative-teams',
    label: 'Operative Teams / Support',
    description: 'Ausführende Kräfte – Soldados, Falken, Support.',
    icon: <Users className="h-5 w-5 text-slate-300" />,
  },
]

const organigramPrompt = {
  task: 'Create RP-Kartell Organigramm Page',
  description:
    'Erstelle eine neue Seite für unsere GTA RP Kartell-Webseite. Die Seite soll das Organigramm der Kartellleitung darstellen und alle Rollen sowie deren Verantwortlichkeiten beschreiben. Die Seite soll auch eine interaktive People-Picker Funktion enthalten, um Mitglieder den entsprechenden Rollen zuzuordnen.',
  requirements: {
    structure: [
      {
        role: 'Patrón / Jefe Supremo',
        description:
          'Oberster Boss, trifft strategische Entscheidungen, gibt Ziele vor, kommuniziert nur mit Direktuntergebenen.',
        people_picker: true,
      },
      {
        role: 'Consejo Central',
        description:
          'Besteht aus El Capitan (Operations) und El Comandante (Sicherheit). Setzen strategische Befehle um und berichten an Patrón.',
        people_picker: true,
      },
      {
        role: 'El Mano Derecha',
        description:
          'Vertrauter des Patrón. Koordiniert Kommunikation und überprüft Befehlsumsetzung.',
        people_picker: true,
      },
      {
        role: 'Funktionsleiter',
        description:
          'Leiten Teams in Logística, Inteligencia, Sicarios, Finanzas. Berichten an den zuständigen Subjefe.',
        people_picker: true,
      },
      {
        role: 'Operative Teams / Support',
        description:
          'Führen Aufgaben aus, melden sich bei ihren Funktionsleitern.',
        people_picker: true,
      },
    ],
    visuals: {
      organigram_type: 'tree',
      hierarchy: 'Patrón → Consejo Central → Subjefes → Funktionsleiter → Operative',
      style: 'klar, übersichtlich, RP-tauglich',
      expand_collapse_nodes: true,
    },
    interaction: {
      people_picker: {
        assign_roles: true,
        add_remove_members: true,
        save_assignments: true,
      },
    },
    output_format: 'HTML + CSS + JS',
  },
  notes:
    'Die Seite soll intuitiv sein, sodass neue Mitglieder ihre Rolle erkennen und direkt zugeordnet werden können. Organigramm sollte optisch hierarchisch sein, erweiterbar und collapse-fähig.',
} as const

export default function OrganigrammPage() {
  const [assignments, setAssignments] = useState<RoleAssignments>({})
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['patron', 'consejo-central', 'capitan', 'comandante'])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)

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
    setExpandedNodes(Object.keys(treeNodes))
  }

  const collapseAllNodes = () => {
    setExpandedNodes([])
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(organigramPrompt, null, 2))
      toast.success('Prompt wurde in die Zwischenablage kopiert.')
    } catch (error) {
      console.error(error)
      toast.error('Kopieren nicht möglich. Bitte manuell markieren.')
    }
  }

  const assignmentsAreLoading = isLoadingAssignments

  const OrganigramNode = ({ nodeId }: { nodeId: string }) => {
    const node = treeNodes[nodeId]
    if (!node) return null

    const assignedMembers = assignments[nodeId] ?? []
    const isExpanded = expandedNodes.includes(nodeId)

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-xs">
          <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-4 shadow-lg backdrop-blur-sm">
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
                  <h4 className="text-sm font-semibold text-gray-200">Typische RP-Aktivitäten</h4>
                  <ul className="mt-1 space-y-1 text-sm text-gray-300 list-disc list-inside">
                    {node.rpActivities.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="mt-6 flex w-full flex-col items-center">
            <div className="h-6 w-0.5 bg-gray-700" />
            <div className="mt-6 flex flex-wrap justify-center gap-6">
              {node.children.map((childId) => (
                <div key={childId} className="flex flex-col items-center">
                  <div className="mb-4 h-6 w-0.5 bg-gray-700" />
                  <OrganigramNode nodeId={childId} />
                </div>
              ))}
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
              Interaktives Organigramm
            </CardTitle>
            <CardDescription className="text-gray-400">
              Hierarchie von Patrón bis Operative mit ein- und ausklappbaren Details.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={expandAllNodes}>
              Alles ausklappen
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAllNodes}>
              Alles einklappen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <OrganigramNode nodeId="patron" />
          </div>
        </CardContent>
      </Card>

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

      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">Prompt für Coding-Agent</CardTitle>
          <CardDescription className="text-gray-400">
            Nutze diesen Prompt, um automatisiert eine Seite wie diese generieren zu lassen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyPrompt} className="flex items-center gap-2">
              <Copy className="h-4 w-4" /> Prompt kopieren
            </Button>
          </div>
          <pre className="max-h-[400px] overflow-auto rounded-xl bg-gray-900 p-4 text-xs text-gray-200">
            {JSON.stringify(organigramPrompt, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">Ausführliche Rollenbeschreibungen</CardTitle>
          <CardDescription className="text-gray-400">
            Vollständige Übersicht für alle Mitglieder mit Verantwortlichkeiten und RP-Aktivitäten.
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
                  <h3 className="text-lg font-semibold text-white">Typische RP-Aktivitäten</h3>
                  <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                    {section.rpActivities.map((item, index) => (
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
                      {sub.rpActivities && (
                        <div className="mt-3">
                          <h5 className="text-sm font-semibold text-gray-200">RP-Aktivitäten</h5>
                          <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                            {sub.rpActivities.map((item, subIndex) => (
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
