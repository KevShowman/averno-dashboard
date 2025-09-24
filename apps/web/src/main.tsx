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
          toastOptions={{
            style: {
              background: '#16161A',
              color: '#fff',
              border: '1px solid #6A1F2B',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

