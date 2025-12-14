import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  Languages, 
  MessageCircle, 
  Users, 
  Shield, 
  Heart, 
  Clock,
  AlertTriangle,
  Banknote,
  Car,
  Home,
  Phone,
  MapPin,
  Skull,
  Star
} from "lucide-react";

interface SlangWord {
  german: string;
  spanish: string;
  category: string;
  note?: string;
}

const slangWords: SlangWord[] = [
  // Grüße & Alltag
  { german: "Hallo", spanish: "Hola", category: "Grüße" },
  { german: "Guten Morgen", spanish: "Buenos días", category: "Grüße" },
  { german: "Guten Tag", spanish: "Buenas tardes", category: "Grüße" },
  { german: "Gute Nacht", spanish: "Buenas noches", category: "Grüße" },
  { german: "Auf Wiedersehen", spanish: "Hasta luego", category: "Grüße" },
  { german: "Tschüss", spanish: "Adiós", category: "Grüße" },
  { german: "Bis bald", spanish: "Hasta pronto", category: "Grüße" },
  { german: "Willkommen", spanish: "Bienvenido", category: "Grüße" },
  
  // Höflichkeit
  { german: "Wie geht's?", spanish: "¿Cómo estás?", category: "Höflichkeit" },
  { german: "Gut", spanish: "Bien", category: "Höflichkeit" },
  { german: "Sehr gut", spanish: "Muy bien", category: "Höflichkeit" },
  { german: "Danke", spanish: "Gracias", category: "Höflichkeit" },
  { german: "Vielen Dank", spanish: "Muchas gracias", category: "Höflichkeit" },
  { german: "Bitte", spanish: "Por favor", category: "Höflichkeit" },
  { german: "Gern geschehen", spanish: "De nada", category: "Höflichkeit" },
  { german: "Entschuldigung", spanish: "Perdón / Disculpa", category: "Höflichkeit" },
  
  // Funk & Kommunikation
  { german: "(Funk) Wie bitte?", spanish: "¿Cómo?", category: "Funk" },
  { german: "(Funk) Hilfe!", spanish: "¡Ayuda!", category: "Funk" },
  { german: "(Funk) Verstanden", spanish: "Entendido", category: "Funk" },
  { german: "(Funk) Alles klar", spanish: "Todo claro", category: "Funk" },
  { german: "(Funk) Warte", spanish: "Espera", category: "Funk" },
  { german: "(Funk) Komm her", spanish: "Ven aquí", category: "Funk" },
  { german: "(Funk) Bestätigt", spanish: "Confirmado", category: "Funk" },
  { german: "(Funk) Negativ", spanish: "Negativo", category: "Funk" },
  { german: "(Funk) Sofort!", spanish: "¡Ahora mismo!", category: "Funk" },
  { german: "(Funk) Achtung!", spanish: "¡Atención!", category: "Funk" },
  { german: "(Funk) Position?", spanish: "¿Posición?", category: "Funk" },
  
  // Familie & Mitglieder
  { german: "Die Familie", spanish: "La Familia", category: "Familie" },
  { german: "Bruder", spanish: "Hermano", category: "Familie" },
  { german: "Schwester", spanish: "Hermana", category: "Familie" },
  { german: "Freund", spanish: "Amigo", category: "Familie" },
  { german: "Freundin", spanish: "Amiga", category: "Familie" },
  { german: "Boss / Chef", spanish: "Jefe", category: "Familie" },
  { german: "Anführer", spanish: "Líder", category: "Familie" },
  { german: "Der Pate", spanish: "El Padrino", category: "Familie" },
  { german: "Der Patron", spanish: "El Patrón", category: "Familie" },
  { german: "Soldat", spanish: "Soldado", category: "Familie" },
  { german: "Neuling", spanish: "Novato", category: "Familie" },
  { german: "Mitglied", spanish: "Miembro", category: "Familie" },
  { german: "Verräter", spanish: "Traidor", category: "Familie" },
  
  // Feinde & Konflikte
  { german: "Feind", spanish: "Enemigo", category: "Konflikte" },
  { german: "Gefahr", spanish: "Peligro", category: "Konflikte" },
  { german: "Problem", spanish: "Problema", category: "Konflikte" },
  { german: "Kampf", spanish: "Pelea / Lucha", category: "Konflikte" },
  { german: "Krieg", spanish: "Guerra", category: "Konflikte" },
  { german: "Tod", spanish: "Muerte", category: "Konflikte" },
  { german: "Rache", spanish: "Venganza", category: "Konflikte" },
  { german: "Respekt", spanish: "Respeto", category: "Konflikte" },
  { german: "Ehre", spanish: "Honor", category: "Konflikte" },
  { german: "Loyalität", spanish: "Lealtad", category: "Konflikte" },
  
  // Orte
  { german: "Haus / Anwesen", spanish: "Casa", category: "Orte" },
  { german: "Stadt", spanish: "Ciudad", category: "Orte" },
  { german: "Straße", spanish: "Calle", category: "Orte" },
  { german: "Treffen", spanish: "Reunión", category: "Orte" },
  { german: "Versteck", spanish: "Escondite", category: "Orte" },
  { german: "Territorium", spanish: "Territorio", category: "Orte" },
  { german: "Grenze", spanish: "Frontera", category: "Orte" },
  
  // Geschäft
  { german: "Geld", spanish: "Dinero / Plata", category: "Geschäft" },
  { german: "Geschäft / Deal", spanish: "Negocio", category: "Geschäft" },
  { german: "Ware", spanish: "Mercancía", category: "Geschäft" },
  { german: "Lieferung", spanish: "Entrega", category: "Geschäft" },
  { german: "Zahlung", spanish: "Pago", category: "Geschäft" },
  { german: "Schulden", spanish: "Deuda", category: "Geschäft" },
  { german: "Anteil", spanish: "Parte", category: "Geschäft" },
  
  // Fahrzeuge & Ausrüstung
  { german: "Auto / Wagen", spanish: "Carro / Coche", category: "Ausrüstung" },
  { german: "Waffe", spanish: "Arma", category: "Ausrüstung" },
  { german: "Telefon", spanish: "Teléfono", category: "Ausrüstung" },
  { german: "Schlüssel", spanish: "Llave", category: "Ausrüstung" },
  
  // Zeit & Aktionen
  { german: "Jetzt", spanish: "Ahora", category: "Zeit" },
  { german: "Heute", spanish: "Hoy", category: "Zeit" },
  { german: "Morgen", spanish: "Mañana", category: "Zeit" },
  { german: "Schnell!", spanish: "¡Rápido!", category: "Zeit" },
  { german: "Langsam", spanish: "Despacio", category: "Zeit" },
  { german: "Warte", spanish: "Espera", category: "Zeit" },
  
  // Wichtige Phrasen
  { german: "Keine Sorge", spanish: "No te preocupes", category: "Phrasen" },
  { german: "Verstehst du?", spanish: "¿Entiendes?", category: "Phrasen" },
  { german: "Ich verstehe", spanish: "Entiendo", category: "Phrasen" },
  { german: "Kein Problem", spanish: "No hay problema", category: "Phrasen" },
  { german: "Natürlich", spanish: "Claro / Por supuesto", category: "Phrasen" },
  { german: "So ist es", spanish: "Así es", category: "Phrasen" },
  { german: "Für die Familie", spanish: "Por la familia", category: "Phrasen" },
  { german: "Mit Respekt", spanish: "Con respeto", category: "Phrasen" },
  { german: "Gute Arbeit", spanish: "Buen trabajo", category: "Phrasen" },
  { german: "Pass auf dich auf", spanish: "Cuídate", category: "Phrasen" },
  { german: "Viel Glück", spanish: "Buena suerte", category: "Phrasen" },
  { german: "Ruhe!", spanish: "¡Silencio!", category: "Phrasen" },
  { german: "Halt die Klappe", spanish: "Cállate", category: "Phrasen" },
  { german: "Lass uns gehen", spanish: "Vámonos", category: "Phrasen" },
];

const categories = [
  { name: "Grüße", icon: MessageCircle, color: "from-emerald-500 to-green-600" },
  { name: "Höflichkeit", icon: Heart, color: "from-pink-500 to-rose-600" },
  { name: "Funk", icon: Phone, color: "from-cyan-500 to-blue-600" },
  { name: "Familie", icon: Users, color: "from-amber-500 to-orange-600" },
  { name: "Konflikte", icon: Shield, color: "from-red-500 to-rose-700" },
  { name: "Orte", icon: MapPin, color: "from-violet-500 to-purple-600" },
  { name: "Geschäft", icon: Banknote, color: "from-green-500 to-emerald-600" },
  { name: "Ausrüstung", icon: Car, color: "from-slate-500 to-gray-600" },
  { name: "Zeit", icon: Clock, color: "from-blue-500 to-indigo-600" },
  { name: "Phrasen", icon: Star, color: "from-yellow-500 to-amber-600" },
];

export default function SlangPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-red-900/40 border border-amber-500/20 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative flex items-start gap-6">
          <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/30 shadow-xl shadow-amber-500/10">
            <Languages className="h-10 w-10 text-amber-400" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">Acento de la Familia</h1>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                {slangWords.length} Wörter
              </Badge>
            </div>
            <p className="text-gray-300 text-lg max-w-3xl">
              Kurzer Überblick über unseren sprachlichen Akzent – für die Fraktionsverwaltung und neue Mitglieder.
              Nutze diese Wörter, um den authentischen Cartel-Lingo in deinem Roleplay zu verwenden.
            </p>
          </div>
        </div>

        {/* Decorative skull */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Skull className="h-32 w-32 text-amber-500" />
        </div>
      </div>

      {/* Quick Reference Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { de: "Hola", es: "Hallo", icon: "👋" },
          { de: "Hermano", es: "Bruder", icon: "🤝" },
          { de: "Gracias", es: "Danke", icon: "🙏" },
          { de: "Vámonos", es: "Lass uns gehen", icon: "🚗" },
          { de: "¡Ayuda!", es: "Hilfe!", icon: "🚨" },
        ].map((item, index) => (
          <Card key={index} className="bg-gray-800/50 border-gray-700/50 p-4 text-center hover:bg-gray-800/70 transition-colors">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-lg font-bold text-amber-400">{item.de}</div>
            <div className="text-sm text-gray-400">{item.es}</div>
          </Card>
        ))}
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryWords = slangWords.filter(w => w.category === category.name);
          if (categoryWords.length === 0) return null;
          
          const Icon = category.icon;
          
          return (
            <Card key={category.name} className="bg-gray-800/40 border-gray-700/50 overflow-hidden">
              {/* Category Header */}
              <div className={`bg-gradient-to-r ${category.color} p-4 flex items-center gap-3`}>
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{category.name}</h2>
                  <p className="text-sm text-white/70">{categoryWords.length} Begriffe</p>
                </div>
              </div>
              
              {/* Words Grid */}
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {categoryWords.map((word, index) => (
                    <div 
                      key={index} 
                      className="group relative bg-gray-900/50 hover:bg-gray-900/80 border border-gray-700/50 hover:border-amber-500/30 rounded-xl p-4 transition-all duration-200"
                    >
                      <div className="flex flex-col gap-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Deutsch</span>
                          <p className="text-white font-medium">{word.german}</p>
                        </div>
                        <div className="h-px bg-gradient-to-r from-amber-500/50 via-amber-500/20 to-transparent" />
                        <div>
                          <span className="text-xs font-medium text-amber-500/70 uppercase tracking-wider">Español</span>
                          <p className="text-amber-400 font-bold text-lg">{word.spanish}</p>
                        </div>
                      </div>
                      
                      {/* Hover effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/5 group-hover:to-orange-500/5 transition-all duration-300 pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer Note */}
      <Card className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-amber-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-amber-300 mb-2">Hinweis zur Verwendung</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Akzente, Interpunktion und Groß-/Kleinschreibung im Spanischen sind beabsichtigt 
              (z. B. <span className="text-amber-400 font-medium">¿Cómo?</span>, <span className="text-amber-400 font-medium">¡Ayuda!</span>). 
              Beachte die umgekehrten Frage- und Ausrufezeichen am Satzanfang – das ist typisch für die spanische Sprache!
            </p>
            <p className="text-gray-400 text-sm mt-3">
              <span className="text-amber-400">Tipp:</span> Beginne mit einfachen Wörtern wie "Hola", "Hermano" und "Gracias" 
              und erweitere deinen Wortschatz nach und nach. Authentizität kommt mit der Übung!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

