import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertCircle, RefreshCw, LogOut, Shield, Users } from 'lucide-react';

export default function DiscordErrorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(10);

  const errorMessage = searchParams.get('message') || 'Benutzer ist nicht im Discord-Server oder hat keine Rollen';
  const errorType = searchParams.get('type') || 'discord_access';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    // Clear auth
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleRetry = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-gold-500" />
            <h1 className="text-4xl font-bold text-white">LaSanta Calavera</h1>
          </div>
        </div>

        {/* Error Card */}
        <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-500/30 shadow-2xl">
          <CardHeader className="text-center border-b border-red-500/20 pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertCircle className="h-16 w-16 text-red-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">
              Zugriff verweigert
            </CardTitle>
            <CardDescription className="text-red-300 text-lg">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Reason Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gold-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">Nicht im Discord</h3>
                    <p className="text-sm text-gray-400">
                      Du bist nicht Mitglied des LaSanta Calavera Discord-Servers
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-gold-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">Keine Rollen</h3>
                    <p className="text-sm text-gray-400">
                      Dir wurden noch keine Rollen im Discord zugewiesen
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-5 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <h3 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Was kannst du tun?
              </h3>
              <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
                <li>Trete dem <strong className="text-white">LaSanta Calavera Discord-Server</strong> bei</li>
                <li>Wende dich an die <strong className="text-gold-400">Leaderschaft</strong> (El Patron, Don oder Asesor)</li>
                <li>Warte bis dir eine <strong className="text-white">Rolle zugewiesen</strong> wurde</li>
                <li>Versuche dich dann <strong className="text-white">erneut anzumelden</strong></li>
              </ol>
            </div>

            {/* Auto Logout Warning */}
            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm text-center">
                ⚠️ Du wirst automatisch in <strong className="text-yellow-100">{countdown} Sekunden</strong> abgemeldet
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="flex-1 border-gold-500/30 hover:border-gold-500 text-white hover:bg-gold-900/20"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
              <Button
                onClick={handleLogout}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Bei Fragen wende dich an die Family-Leaderschaft</p>
          <p className="mt-1">LaSanta Calavera © 2025</p>
        </div>
      </div>
    </div>
  );
}

