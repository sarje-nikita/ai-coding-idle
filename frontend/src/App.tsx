import { AgentChat } from '@/components/AgentChat'
import { ThemeProvider } from '@/components/ui/theme-provider'
import './App.css'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="deepagent-theme">
      <AgentChat />
    </ThemeProvider>
  )
}

export default App
