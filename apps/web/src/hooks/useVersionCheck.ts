import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface VersionInfo {
  version: string
  timestamp: string
  environment: string
}

interface VersionJson {
  version: string
  build: string
  timestamp: string
}

export const useVersionCheck = () => {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [shown, setShown] = useState(false)

  // Service Worker Update Handler
  useEffect(() => {
    const handleUpdateAvailable = () => {
      if (shown) return
      setShown(true)
      
      toast.info('Neue Version verfügbar!', {
        description: 'Eine neue Version der Anwendung ist verfügbar. Klicken Sie hier, um zu aktualisieren.',
        action: {
          label: 'Aktualisieren',
          onClick: async () => {
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
        duration: 15000,
        position: 'top-center',
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #6A1F2B',
        }
      })
    }

    window.addEventListener('app:update-available', handleUpdateAvailable)
    return () => window.removeEventListener('app:update-available', handleUpdateAvailable)
  }, [shown])

  // Fallback: Check version.json if Service Worker fails
  const checkVersionJson = useCallback(async () => {
    try {
      const response = await fetch('/version.json', { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (response.ok) {
        const versionInfo: VersionJson = await response.json()
        const storedVersion = localStorage.getItem('app-version-json')
        
        if (storedVersion && storedVersion !== versionInfo.version) {
          if (!shown) {
            setShown(true)
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
              duration: 15000,
              position: 'top-center',
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #6A1F2B',
              }
            })
          }
        }
        
        // Store the current version
        localStorage.setItem('app-version-json', versionInfo.version)
        setCurrentVersion(versionInfo.version)
      }
    } catch (error) {
      console.warn('Version.json check failed:', error)
    }
  }, [shown])

  // API Version Check (existing logic)
  const checkVersion = useCallback(async () => {
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
          if (!shown) {
            setShown(true)
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
              duration: 15000,
              position: 'top-center',
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #6A1F2B',
              }
            })
          }
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
  }, [shown])

  useEffect(() => {
    // Check version on initial load
    checkVersion()
    checkVersionJson()
    
    // Check version every 2 minutes
    const interval = setInterval(() => {
      checkVersion()
      checkVersionJson()
    }, 2 * 60 * 1000)
    
    // Check version on visibility change (user switches tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkVersion()
        checkVersionJson()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkVersion, checkVersionJson])

  return {
    currentVersion,
    isChecking,
    checkVersion
  }
}
