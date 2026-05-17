import { useState, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/react'
import { UserButton } from '@clerk/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, Terminal, FolderOpen, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Workspace {
  id: string
  name: string
  space_id: string
  created_at: string
}

export function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creating, setCreating] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // Fetch workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true)
        const token = await getToken()
        const response = await fetch(`${apiUrl}/workspaces`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch workspaces')
        }

        const data = await response.json()
        setWorkspaces(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspaces')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchWorkspaces()
    }
  }, [user, apiUrl, getToken])

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName.trim()) return

    try {
      setCreating(true)
      const token = await getToken()
      const response = await fetch(`${apiUrl}/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newWorkspaceName }),
      })

      if (!response.ok) {
        throw new Error('Failed to create workspace')
      }

      const newWorkspace = await response.json()
      setWorkspaces([...workspaces, newWorkspace])
      setNewWorkspaceName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteWorkspace = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workspace?')) return

    try {
      const token = await getToken()
      const response = await fetch(`${apiUrl}/workspaces/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete workspace')
      }

      setWorkspaces(workspaces.filter(w => w.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace')
    }
  }

  const handleOpenWorkspace = (spaceId: string) => {
    navigate(`/agent/${spaceId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="flex items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">DeepAgent</h1>
              <p className="text-xs text-muted-foreground">Workspaces</p>
            </div>
          </div>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Welcome */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {user?.firstName || 'User'}!</h2>
            <p className="text-muted-foreground">Manage your workspaces and start transforming code</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Create Workspace */}
          <Card className="mb-10 p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="flex gap-2">
              <Input
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name (e.g., MyProject)"
                disabled={creating}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={creating || !newWorkspaceName.trim()}
                className="gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Workspaces Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workspaces.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workspaces yet</h3>
              <p className="text-muted-foreground">Create your first workspace to get started</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <Card key={workspace.id} className="p-6 hover:shadow-lg transition-shadow flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                        <FolderOpen className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{workspace.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{workspace.space_id}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Badge variant="secondary" className="mb-4 w-fit">
                    Created {new Date(workspace.created_at).toLocaleDateString()}
                  </Badge>

                  <div className="flex gap-2 mt-auto">
                    <Button 
                      onClick={() => handleOpenWorkspace(workspace.space_id)}
                      className="flex-1 gap-2"
                      variant="default"
                    >
                      <Terminal className="h-4 w-4" />
                      Open
                    </Button>
                    <Button
                      onClick={() => handleDeleteWorkspace(workspace.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
