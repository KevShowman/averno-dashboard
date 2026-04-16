import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App.tsx'
import './index.css'

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW: Registered successfully')
      
      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return
        
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // Es gibt bereits eine alte SW, also ist jetzt ein Update da
            console.log('SW: Update available')
            window.dispatchEvent(new CustomEvent('app:update-available'))
          }
        })
      })
      
      // Check for updates every 5 minutes
      setInterval(() => {
        reg.update()
      }, 5 * 60 * 1000)
    }).catch(error => {
      console.error('SW: Registration failed:', error)
    })
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster 
          theme="dark" 
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: 'linear-gradient(135deg, #1a1a1e 0%, #16161a 100%)',
              color: '#fff',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
              padding: '16px',
              fontSize: '14px',
              fontWeight: '500',
            },
            classNames: {
              toast: 'backdrop-blur-xl',
              title: 'font-semibold',
              description: 'text-gray-400 text-sm',
              success: 'border-green-500/40 bg-gradient-to-r from-green-950/80 to-gray-900/80',
              error: 'border-red-500/40 bg-gradient-to-r from-red-950/80 to-gray-900/80',
              info: 'border-amber-500/40 bg-gradient-to-r from-amber-950/80 to-gray-900/80',
              warning: 'border-yellow-500/40 bg-gradient-to-r from-yellow-950/80 to-gray-900/80',
              actionButton: 'bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-lg px-3 py-1.5',
              cancelButton: 'bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-3 py-1.5',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

