import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface VersionInfo {
  version: string
  timestamp: string
  environment: string
}

export const useVersionCheck = () => {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkVersion = async () => {
    try {
      setIsChecking(true)
      const response = await fetch('/api/version', {
        method: 'GET',
        credentials: 'include',
      })
      
      if (response.ok) {
        const versionInfo: VersionInfo = await response.json()
        const storedVersion = localStorage.getItem('app-version')
        
        if (storedVersion && storedVersion !== versionInfo.version) {
          // Version has changed, show toast notification
          toast.info('Neue Version verfügbar!', {
            description: 'Eine neue Version der Anwendung ist verfügbar. Klicken Sie hier, um zu aktualisieren.',
            action: {
              label: 'Aktualisieren',
              onClick: () => {
                // Clear caches and reload
                if ('caches' in window) {
                  caches.keys().then(names => {
                    names.forEach(name => {
                      caches.delete(name)
                    })
                  })
                }
                
                // Force hard refresh
                const url = new URL(window.location.href)
                url.searchParams.set('_t', Date.now().toString())
                url.searchParams.set('_cache', 'bust')
                window.location.replace(url.toString())
              }
            },
            duration: 15000, // 15 seconds
            position: 'top-center',
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #6A1F2B',
            }
          })
        }
        
        // Store the current version
        localStorage.setItem('app-version', versionInfo.version)
        setCurrentVersion(versionInfo.version)
      }
    } catch (error) {
      console.warn('Version check failed:', error)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Check version on initial load
    checkVersion()
    
    // Check version every 2 minutes
    const interval = setInterval(checkVersion, 2 * 60 * 1000)
    
    // Check version on visibility change (user switches tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkVersion()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return {
    currentVersion,
    isChecking,
    checkVersion
  }
}
