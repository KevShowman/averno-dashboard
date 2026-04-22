import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ScrollText, Flower2, Shield, Sword, Flame, Heart } from 'lucide-react'

export default function BotschaftPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Flower2 className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-primary">
          🌹 Ceremonia de Iniciación
        </h1>
        <p className="text-xl text-zinc-300">
          LaSanta Calavera
        </p>
      </div>

      {/* Einleitung */}
      <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-primary/20">
        <CardContent className="pt-6">
          <p className="text-zinc-200 text-lg leading-relaxed italic">
            <strong>Hermanos y Hermanas,</strong> ab heute wird es anders. Dies ist nicht irgendeine Vorstellung, 
            kein loses Gespräch, kein bedeutungsloser Moment. Dies ist eine Zeremonie – ein Ritual, das tief in 
            unserer Geschichte verwurzelt ist. Ein Moment, der wie ein Film in Erinnerung bleiben soll, der sich 
            in Herz und Seele einbrennt.
          </p>
        </CardContent>
      </Card>

      {/* Schritt 1: Die Vorstellung */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-primary text-2xl">
            <Flower2 className="h-6 w-6" />
            🥀 Schritt 1: Die Vorstellung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-zinc-300 leading-relaxed">
            Der Vorstellende beginnt. Er erzählt von seiner Reise, seinen Beweggründen, von dem Weg, 
            der ihn hierhergeführt hat.
          </p>
          <div className="p-4 bg-primary/10 border-l-4 border-primary rounded">
            <p className="text-zinc-200 font-medium">
              👉 Leitfrage: „Was hat dich zu den Toren der LaSanta Calavera gebracht? Warum gerade wir?"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Schritt 2: Die Fragen der Familie */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-primary text-2xl">
            <Sword className="h-6 w-6" />
            🗡️ Schritt 2: Die Fragen der Familie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-zinc-300 leading-relaxed mb-4">
            Jede Frage ist ein Schnitt, der tiefer geht als Worte.
          </p>
          <ul className="space-y-3">
            {[
              'Was macht dich so sicher, dass du das Vertrauen unserer Familie verdienst?',
              'Würdest du für uns lügen, schweigen… und sterben?',
              'Was verstehst du unter Loyalität, wenn die Welt um dich herum zerbricht?',
              'Wenn wir dir einen Auftrag geben, der dich für immer verändert – würdest du ihn trotzdem erfüllen?',
              'Was bist du bereit aufzugeben, um ein Teil dieser Familie zu werden?',
              'Was unterscheidet dich von denen, die vor dir standen – und nie wieder herauskamen?',
            ].map((question, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded border border-zinc-700">
                <span className="text-primary font-bold">•</span>
                <span className="text-zinc-200">{question}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Schritt 3: Die Rede der Familie */}
      <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-primary text-2xl">
            <ScrollText className="h-6 w-6" />
            🎙️ Schritt 3: Die Rede der Familie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-invert max-w-none">
            <p className="text-zinc-200 text-lg font-semibold mb-4">
              Das Leben im <span className="text-primary">LaSanta Calavera</span> …
            </p>
            
            <p className="text-zinc-300 leading-relaxed">
              … ist wie das Wachsen einer Rose im Schatten der Welt.
            </p>

            <ul className="space-y-2 my-4">
              <li className="flex items-start gap-2 text-zinc-300">
                <Flower2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Die <strong>Familie</strong> ist die Blüte – schön, stark, unser Stolz.</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Die <strong>Führung</strong> ist der Stiel – aufrecht, standhaft, das Rückgrat.</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Sword className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Der <strong>Patrón</strong> ist der Dorn – scharf, wachsam, der Schutz gegen jede Gefahr.</span>
              </li>
            </ul>

            <p className="text-zinc-300 leading-relaxed italic border-l-4 border-primary/50 pl-4 my-4">
              Doch eine Rose lebt nur, wenn Blut den Boden nährt, in dem sie wächst. Jedes Opfer, jeder Tropfen, 
              jede Wunde – sie sind die Nahrung, die uns unsterblich macht.
            </p>

            <div className="space-y-3 text-zinc-300 leading-relaxed">
              <p>
                Das Leben im Kartell ist kein einfaches Leben. Es ist ein Weg voller Schatten, Gefahren und Versuchungen. 
                Doch inmitten dieser Dunkelheit trägt jeder von uns das Licht der Familie.
              </p>

              <p>
                Wir sind mehr als Männer und Frauen – wir sind ein Erbe. Wir sind nicht nur Soldaten – wir sind ein Name, 
                der geflüstert wird, wenn die Welt Angst verspürt.
              </p>

              <p className="font-semibold text-primary">
                Vergiss niemals:
              </p>

              <ul className="space-y-2 list-disc list-inside pl-4">
                <li>Die Waffe in deiner Hand ist nicht dein Eigentum – sie gehört der Familie.</li>
                <li>Das Geld in deiner Tasche ist nicht dein Gewinn – es ist die Frucht der Rose.</li>
                <li>Dein Leben ist nicht nur deins – es gehört dem Cártel.</li>
              </ul>

              <p>
                Und wenn du fällst, fällt nicht nur ein Mann, nicht nur eine Frau. Dann bebt der Boden, denn ein Teil 
                unserer Rose wird zerschmettert. Doch so wie die Dornen scharf bleiben, so wächst eine neue Blüte, 
                die das Erbe weiterträgt.
              </p>

              <p className="font-bold text-primary text-lg my-4">
                Dies ist LaSanta Calavera: Ein Name, der nicht vergeht. Eine Rose, die im Blut erblüht. 
                Ein Erbe, das stärker ist als der Tod.
              </p>

              <p className="text-lg font-semibold text-zinc-200 mt-6">
                Und nun frage ich dich:
              </p>

              <ul className="space-y-2 list-none pl-0">
                <li className="flex items-start gap-2">
                  <Flame className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Bist du bereit, unser Schild zu sein, wenn Dunkelheit kommt?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sword className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Bist du bereit, zuzuschlagen, wenn wir angegriffen werden – und zwar mit aller Macht?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Bist du bereit, mit Stolz, Respekt und Treue für diese Familie einzutreten?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Bist du bereit, der Führung zu folgen und dem Patrón zu dienen – mit allem, was du bist?</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schritt 4: Das "Sí" */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-primary text-2xl">
            🩸 Schritt 4: Das „Sí" – Das Schwurwort
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-300 leading-relaxed">
            Wenn du bereit bist, dann sprich dein <strong className="text-primary">Sí</strong>.
          </p>
          <p className="text-zinc-300 leading-relaxed mt-3">
            Mit diesem Sí gehst du nicht nur einen Weg – du schließt einen Pakt. Einen Pakt, den man nicht bricht, 
            ohne den Preis mit Blut zu zahlen.
          </p>
        </CardContent>
      </Card>

      {/* Schritt 5: Die Machete */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-primary text-2xl">
            <Sword className="h-6 w-6" />
            ⚔️ Schritt 5: Die Machete – El Juramento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-300 leading-relaxed">
            Du legst deine Hand auf die Machete. Du schwörst deine Treue – nicht mit bloßen Worten, 
            sondern mit dem Gewicht deiner Seele.
          </p>
          <p className="text-zinc-300 leading-relaxed mt-3">
            Dein Schwur wird zu einer Kette, die dich für immer an uns bindet.
          </p>
        </CardContent>
      </Card>

      {/* Schritt 6: Blood-In */}
      <Card className="bg-gradient-to-br from-red-950/30 to-zinc-900 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-primary text-2xl">
            ☠️ Schritt 6: Blood-In – Der letzte Schritt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-200 leading-relaxed text-lg">
            Dies ist dein <strong className="text-primary">Blood-In</strong>.
          </p>
          
          <div className="space-y-2 text-zinc-300 leading-relaxed">
            <p>Von diesem Moment an gehörst du nicht mehr dir.</p>
            <p>Von diesem Moment an gehörst du uns.</p>
            <p>Dein Blut nährt unsere Rose.</p>
            <p>Deine Treue stärkt unseren Stiel.</p>
            <p>Deine Präsenz schärft unseren Dorn.</p>
            <p>Und die Rose des <strong className="text-primary">LaSanta Calavera</strong> wird durch dich weiterblühen.</p>
          </div>
        </CardContent>
      </Card>

      {/* Abschluss */}
      <Card className="bg-gradient-to-br from-zinc-900 to-primary/10 border-primary/50">
        <CardContent className="py-8">
          <div className="text-center space-y-3">
            <Flower2 className="h-12 w-12 text-primary mx-auto" />
            <p className="text-2xl font-bold text-primary">
              🌹 LaSanta Calavera – La Hermandad es para siempre 🌹
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

