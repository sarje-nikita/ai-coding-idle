import { useUser } from '@clerk/react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AgentChat } from '@/components/AgentChat'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { Landing } from '@/pages/Landing'
import { Dashboard } from '@/pages/Dashboard'
import './App.css'

function App() {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="deepagent-theme">
        <div className="flex items-center justify-center h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="deepagent-theme">
      <Router>
        <Routes>
          {!isSignedIn ? (
            <>
              <Route path="/" element={<Landing />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agent/:spaceId" element={<AgentChat />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
