import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Car, Wrench, Palette, Lightbulb, Sparkles, ArrowRight, ArrowDown, CreditCard, Info, Check } from 'lucide-react'

export default function VehicleTuningPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-tuning'],
    queryFn: async () => {
      const response = await api.get('/vehicle-tuning')
      return response.data
    },
  })

  const DirectionDisplay = ({ right, down }: { right: number; down: number }) => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-lg border border-orange-500/30">
        <ArrowRight className="h-4 w-4 text-orange-400" />
        <span className="text-lg font-bold text-orange-300">{right}x</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-lg border border-orange-500/30">
        <ArrowDown className="h-4 w-4 text-orange-400" />
        <span className="text-lg font-bold text-orange-300">{down}x</span>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Lade Tuning-Vorgaben...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-orange-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-600 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
            <Car className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Fahrzeugtuning</h1>
            <p className="text-zinc-400 mt-1">
              Offizielle Familien-Lackierung und Tuning-Vorgaben
            </p>
          </div>
        </div>
      </div>

      {/* Werkstatt-Info */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-orange-900/30 to-orange-900/20 border-orange-500/30">
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
        <CardContent className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <Wrench className="h-6 w-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white">{data?.workshop?.name}</h3>
              
              {data?.workshop?.codeword ? (
                <div className="mt-3 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg inline-flex items-center gap-2">
                  <span className="text-zinc-400 text-sm">Codewort:</span>
                  <span className="font-mono text-orange-400 font-bold">{data?.workshop?.codeword}</span>
                </div>
              ) : (
                <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-400" />
                    <span className="text-green-300 font-medium">Kein Codewort benötigt</span>
                  </div>
                  <p className="text-green-200/70 text-sm mt-1">
                    Einfach sagen, dass du zu <span className="font-semibold">El Averno Cartel</span> gehörst.
                  </p>
                </div>
              )}
              
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Familienfahrzeuge</p>
                  <Badge className="mt-1 bg-orange-500/20 text-orange-300 border-orange-500/30">
                    {data?.workshop?.discounts?.familyVehicles} Rabatt
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Privatfahrzeuge</p>
                  <Badge className="mt-1 bg-zinc-500/20 text-zinc-300 border-zinc-500/30">
                    {data?.workshop?.discounts?.privateVehicles} Rabatt
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lackierung */}
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="h-5 w-5 text-rose-400" />
              Lackierung
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Navigation: Von oben links mit Pfeiltasten
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Primärfarbe */}
            <div>
              <p className="text-sm text-zinc-400 mb-2">Primärfarbe</p>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <DirectionDisplay 
                  right={data?.paint?.primary?.right || 3} 
                  down={data?.paint?.primary?.down || 18} 
                />
              </div>
            </div>

            {/* Sekundärfarbe */}
            <div>
              <p className="text-sm text-zinc-400 mb-2">Sekundärfarbe</p>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <DirectionDisplay 
                  right={data?.paint?.secondary?.right || 3} 
                  down={data?.paint?.secondary?.down || 18} 
                />
              </div>
            </div>

            {/* Perleffekt */}
            <div>
              <p className="text-sm text-zinc-400 mb-2">Perleffekt</p>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <DirectionDisplay 
                  right={data?.paint?.pearlEffect?.right || 8} 
                  down={data?.paint?.pearlEffect?.down || 5} 
                />
              </div>
            </div>

            {/* Lacktypen */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-400 mb-2">Primärlacktyp</p>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                  <span className="text-white font-bold text-lg">{data?.paint?.primaryType}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-2">Sekundärlacktyp</p>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                  <span className="text-white font-bold text-lg">{data?.paint?.secondaryType}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lichter & Extras */}
        <div className="space-y-6">
          {/* Lichter */}
          <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-orange-400" />
                Lichter
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Xenon */}
              <div>
                <p className="text-sm text-zinc-400 mb-2">Xenon</p>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                  <span className="text-white font-bold text-lg">{data?.lights?.xenon}</span>
                </div>
              </div>

              {/* Neon */}
              <div>
                <p className="text-sm text-zinc-400 mb-2">Neon</p>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                  <DirectionDisplay 
                    right={data?.lights?.neon?.right || 2} 
                    down={data?.lights?.neon?.down || 9} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fenster & Kennzeichen */}
          <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-400" />
                Extras
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Fenstertönung */}
              <div>
                <p className="text-sm text-zinc-400 mb-2">Fenstertönung</p>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                  <span className="text-white font-bold text-lg">{data?.windows}</span>
                </div>
              </div>

              {/* Kennzeichen */}
              <div>
                <p className="text-sm text-zinc-400 mb-2 flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  Kennzeichen Farbe
                </p>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                  <span className="text-white font-bold text-lg">{data?.licensePlate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hinweis */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Info className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Hinweis</h3>
              <p className="text-zinc-400 text-sm">
                Diese Vorgaben gelten für alle Familien-Fahrzeuge. 
                Die Werkstatt hat eine fertige Vorlage und weiß, was zu tun ist. 
                Bei Fragen zur Umsetzung wende dich an die Leaderschaft oder direkt an {data?.workshop?.name}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
