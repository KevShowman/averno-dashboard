import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRefresh = () => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear session storage
    sessionStorage.clear();
    
    // Force reload
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-400" />
            </div>
            
            <h1 className="text-xl font-bold text-white mb-2">
              Oops! Etwas ist schiefgelaufen
            </h1>
            
            <p className="text-gray-400 mb-6">
              Es scheint, als ob die Anwendung veraltete Dateien verwendet. 
              Bitte versuchen Sie es erneut, um die neueste Version zu laden.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={this.handleRefresh}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Seite neu laden
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/login'}
                variant="outline"
                className="w-full"
              >
                Zur Anmeldung
              </Button>
            </div>
            
            {import.meta.env.MODE === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Fehlerdetails (nur in Entwicklung)
                </summary>
                <pre className="text-xs text-red-400 mt-2 p-2 bg-gray-900 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
