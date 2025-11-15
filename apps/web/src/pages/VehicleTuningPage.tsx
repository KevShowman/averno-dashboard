import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Car, Wrench, Palette, Lightbulb, Square, ArrowRight, ArrowDown, CreditCard } from 'lucide-react'
import { Alert, AlertDescription } from '../components/ui/alert'

export default function VehicleTuningPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-tuning'],
    queryFn: async () => {
      const response = await api.get('/vehicle-tuning')
      return response.data
    },
  })

  const DirectionDisplay = ({ right, down }: { right: number; down: number }) => (
    <div className="flex items-center gap-3 text-primary font-mono">
      <div className="flex items-center gap-1">
        <ArrowRight className="h-5 w-5" />
        <span className="text-lg font-bold">{right}x</span>
      </div>
      <div className="flex items-center gap-1">
        <ArrowDown className="h-5 w-5" />
        <span className="text-lg font-bold">{down}x</span>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-gray-400">Lade Tuning-Vorgaben...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Car className="h-8 w-8 text-primary" />
          Fahrzeugtuning
        </h1>
        <p className="text-gray-400">
          Offizielle Familien-Lackierung und Tuning-Vorgaben
        </p>
      </header>

      {/* Werkstatt-Info */}
      <Alert className="border-primary/30 bg-primary/10">
        <Wrench className="h-5 w-5 text-primary" />
        <AlertDescription className="text-white ml-2">
          <div className="space-y-2">
            <p className="font-semibold text-lg">{data?.workshop?.name}</p>
            <p className="text-sm text-gray-300">
              Codewort: <span className="font-mono text-primary">{data?.workshop?.codeword}</span>
            </p>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-300">
                Familienfahrzeuge: <span className="text-primary font-semibold">{data?.workshop?.discounts?.familyVehicles}</span> Rabatt
              </span>
              <span className="text-gray-300">
                Privatfahrzeuge: <span className="text-primary font-semibold">{data?.workshop?.discounts?.privateVehicles}</span> Rabatt
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Die Werkstatt hat eine fertige Vorlage und weiß, was zu tun ist. Alternativ kannst du die untenstehenden Vorgaben verwenden.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lackierung */}
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Lackierung
            </CardTitle>
            <CardDescription className="text-gray-400">
              Navigation: Von oben links mit Pfeiltasten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primärfarbe */}
            <div className="space-y-2">
              <h3 className="text-white font-semibold">Primärfarbe</h3>
              <div className="bg-black/40 border border-primary/30 rounded-lg p-4">
                <DirectionDisplay 
                  right={data?.paint?.primary?.right || 3} 
                  down={data?.paint?.primary?.down || 18} 
                />
              </div>
            </div>

            {/* Sekundärfarbe */}
            <div className="space-y-2">
              <h3 className="text-white font-semibold">Sekundärfarbe</h3>
              <div className="bg-black/40 border border-primary/30 rounded-lg p-4">
                <DirectionDisplay 
                  right={data?.paint?.secondary?.right || 3} 
                  down={data?.paint?.secondary?.down || 18} 
                />
              </div>
            </div>

            {/* Perleffekt */}
            <div className="space-y-2">
              <h3 className="text-white font-semibold">Perleffekt</h3>
              <div className="bg-black/40 border border-primary/30 rounded-lg p-4">
                <DirectionDisplay 
                  right={data?.paint?.pearlEffect?.right || 8} 
                  down={data?.paint?.pearlEffect?.down || 5} 
                />
              </div>
            </div>

            {/* Lacktypen */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-white font-semibold text-sm">Primärlacktyp</h3>
                <div className="bg-black/40 border border-primary/30 rounded-lg p-3 text-center">
                  <span className="text-primary font-mono font-bold">{data?.paint?.primaryType}</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-semibold text-sm">Sekundärlacktyp</h3>
                <div className="bg-black/40 border border-primary/30 rounded-lg p-3 text-center">
                  <span className="text-primary font-mono font-bold">{data?.paint?.secondaryType}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lichter & Extras */}
        <div className="space-y-6">
          {/* Lichter */}
          <Card className="lasanta-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                Lichter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Xenon */}
              <div className="space-y-2">
                <h3 className="text-white font-semibold">Xenon</h3>
                <div className="bg-black/40 border border-primary/30 rounded-lg p-4 text-center">
                  <span className="text-primary font-mono text-lg font-bold">{data?.lights?.xenon}</span>
                </div>
              </div>

              {/* Neon */}
              <div className="space-y-2">
                <h3 className="text-white font-semibold">Neon</h3>
                <div className="bg-black/40 border border-primary/30 rounded-lg p-4">
                  <DirectionDisplay 
                    right={data?.lights?.neon?.right || 2} 
                    down={data?.lights?.neon?.down || 9} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fenster & Kennzeichen */}
          <Card className="lasanta-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Square className="h-6 w-6 text-primary" />
                Extras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fenstertönung */}
              <div className="space-y-2">
                <h3 className="text-white font-semibold">Fenstertönung</h3>
                <div className="bg-black/40 border border-primary/30 rounded-lg p-4 text-center">
                  <span className="text-primary font-mono text-lg font-bold">{data?.windows}</span>
                </div>
              </div>

              {/* Kennzeichen */}
              <div className="space-y-2">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Kennzeichen Farbe
                </h3>
                <div className="bg-black/40 border border-primary/30 rounded-lg p-4 text-center">
                  <span className="text-primary font-mono text-lg font-bold">{data?.licensePlate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hinweis */}
      <Alert className="border-gray-700 bg-gray-900/50">
        <AlertDescription className="text-gray-400 text-sm">
          <strong className="text-white">Hinweis:</strong> Diese Vorgaben gelten für alle Familien-Fahrzeuge. 
          Bei Fragen zur Umsetzung wende dich an die Leaderschaft oder direkt an {data?.workshop?.name}.
        </AlertDescription>
      </Alert>
    </div>
  )
}

