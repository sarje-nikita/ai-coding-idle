import { useState, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  X,
  Loader2,
  FileText,
  Code,
  Image,
  FileVideo,
  FileAudio,
  Archive,
  Settings,
  Database
} from 'lucide-react'
import {
  SiPython,
  SiJavascript,
  SiTypescript,
  SiCss3,
  SiHtml5,
  SiJson,
  SiMarkdown,
  SiYaml,
  SiCplusplus,
  SiC,
  SiSharp,
  SiPhp,
  SiRuby,
  SiGo,
  SiRust,
  SiSwift,
  SiKotlin,
  SiScala,
  SiR,
  SiPerl,
  SiLua,
  SiGnubash,
  SiDocker,
  SiSqlite
} from 'react-icons/si'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'highlight.js/styles/github-dark.css'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  children?: FileNode[]
}

interface FileExplorerProps {
  userid: string
  apiUrl: string
  onClose: () => void
  refreshTrigger?: number  // Add refresh trigger prop
}

interface FileContentProps {
  content: string
  path: string
  encoding: string
}

function FileContent({ content, path, encoding }: FileContentProps) {
  const getLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'json': 'json',
      'md': 'markdown',
      'css': 'css',
      'html': 'html',
      'yml': 'yaml',
      'yaml': 'yaml',
    }
    return langMap[ext || ''] || 'text'
  }

  const isMarkdownFile = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    return ext === 'md' || ext === 'markdown'
  }

  if (encoding === 'base64') {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        <p>Binary file (cannot display)</p>
      </div>
    )
  }

  if (isMarkdownFile(path)) {
    return (
      <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          components={{
            code: ({ node, inline, className, children, ...props }: any) => {
              return inline ? (
                <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-sm font-mono" {...props}>
                  {children}
                </code>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            },
            pre: ({ children }) => (
              <pre className="mb-2 last:mb-0 overflow-x-auto whitespace-pre-wrap break-words">
                {children}
              </pre>
            ),
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4">{children}</ol>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <pre className="p-4 text-sm text-left font-mono block w-full min-w-0">
      <code className={`language-${getLanguage(path)} block`}>
        {content}
      </code>
    </pre>
  )
}

function FileTreeItem({ 
  node, 
  level = 0, 
  onFileClick 
}: { 
  node: FileNode
  level?: number
  onFileClick: (path: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isDirectory = node.type === 'directory'

  const handleClick = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded)
    } else {
      onFileClick(node.path)
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    
    // Programming languages
    switch (ext) {
      case 'py':
        return <SiPython className="h-4 w-4 text-blue-500" />
      case 'js':
      case 'jsx':
        return <SiJavascript className="h-4 w-4 text-yellow-500" />
      case 'ts':
      case 'tsx':
        return <SiTypescript className="h-4 w-4 text-blue-600" />
      case 'java':
        return <Code className="h-4 w-4 text-red-500" />
      case 'cpp':
      case 'cc':
      case 'cxx':
        return <SiCplusplus className="h-4 w-4 text-blue-700" />
      case 'c':
        return <SiC className="h-4 w-4 text-blue-800" />
      case 'cs':
        return <SiSharp className="h-4 w-4 text-purple-500" />
      case 'php':
        return <SiPhp className="h-4 w-4 text-indigo-500" />
      case 'rb':
        return <SiRuby className="h-4 w-4 text-red-600" />
      case 'go':
        return <SiGo className="h-4 w-4 text-cyan-500" />
      case 'rs':
        return <SiRust className="h-4 w-4 text-orange-600" />
      case 'swift':
        return <SiSwift className="h-4 w-4 text-orange-500" />
      case 'kt':
        return <SiKotlin className="h-4 w-4 text-purple-600" />
      case 'scala':
        return <SiScala className="h-4 w-4 text-red-700" />
      case 'r':
        return <SiR className="h-4 w-4 text-blue-400" />
      case 'pl':
        return <SiPerl className="h-4 w-4 text-gray-600" />
      case 'lua':
        return <SiLua className="h-4 w-4 text-blue-300" />
      case 'sh':
      case 'bash':
        return <SiGnubash className="h-4 w-4 text-green-600" />
    }
    
    // Web files
    if (['html', 'htm'].includes(ext || '')) {
      return <SiHtml5 className="h-4 w-4 text-orange-500" />
    }
    if (['css', 'scss', 'sass', 'less'].includes(ext || '')) {
      return <SiCss3 className="h-4 w-4 text-blue-400" />
    }
    
    // Data/Config files
    if (['json'].includes(ext || '')) {
      return <SiJson className="h-4 w-4 text-yellow-600" />
    }
    if (['yaml', 'yml'].includes(ext || '')) {
      return <SiYaml className="h-4 w-4 text-red-400" />
    }
    if (['xml', 'toml', 'ini', 'cfg', 'conf'].includes(ext || '')) {
      return <Settings className="h-4 w-4 text-gray-500" />
    }
    
    // Database files
    if (['db', 'sqlite', 'sqlite3'].includes(ext || '')) {
      return <SiSqlite className="h-4 w-4 text-blue-500" />
    }
    if (['sql'].includes(ext || '')) {
      return <Database className="h-4 w-4 text-green-500" />
    }
    
    // Container/Docker files
    if (['dockerfile', 'dockerignore'].includes(fileName.toLowerCase())) {
      return <SiDocker className="h-4 w-4 text-blue-600" />
    }
    
    // Text/Markdown files
    if (['md', 'markdown'].includes(ext || '')) {
      return <SiMarkdown className="h-4 w-4 text-gray-700" />
    }
    if (['txt', 'log', 'rst'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-gray-600" />
    }
    
    // Media files
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext || '')) {
      return <Image className="h-4 w-4 text-purple-500" />
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext || '')) {
      return <FileVideo className="h-4 w-4 text-red-500" />
    }
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext || '')) {
      return <FileAudio className="h-4 w-4 text-pink-500" />
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext || '')) {
      return <Archive className="h-4 w-4 text-yellow-600" />
    }
    
    // Default file icon
    return <File className="h-4 w-4 text-muted-foreground" />
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md cursor-pointer group",
          "transition-colors"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory && (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        )}
        {!isDirectory && <span className="w-4" />}
        
        <span className="flex-shrink-0">
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )
          ) : (
            getFileIcon(node.name)
          )}
        </span>
        
        <span className="flex-1 truncate text-sm">{node.name}</span>
        
        {!isDirectory && node.size && (
          <span className="text-xs text-muted-foreground">
            {formatSize(node.size)}
          </span>
        )}
      </div>
      
      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileExplorer({ userid, apiUrl, onClose, refreshTrigger }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<{
    path: string
    content: string
    encoding: string
  } | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)

  useEffect(() => {
    fetchFiles()
  }, [userid, refreshTrigger])  // Add refreshTrigger to dependency array

  const fetchFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${apiUrl}/agent/files/${userid}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch files')
      }
      
      const data = await response.json()
      setFiles(data.files || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleFileClick = async (path: string) => {
    try {
      setLoadingFile(true)
      const response = await fetch(`${apiUrl}/agent/files/${userid}/${path}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch file content')
      }
      
      const data = await response.json()
      setSelectedFile({
        path: data.path,
        content: data.content,
        encoding: data.encoding
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
    } finally {
      setLoadingFile(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-blue-500" />
          <h2 className="font-semibold text-sm">Files</h2>
          <Badge variant="secondary" className="text-xs">
            {userid}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={35} minSize={20} maxSize={60}>
          <div className="w-full h-full flex flex-col border-r">
            <ScrollArea className="h-full">
              <div className="p-2">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {error && (
                  <div className="p-4 text-sm text-destructive">
                    <p>{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchFiles}
                      className="mt-2"
                    >
                      Retry
                    </Button>
                  </div>
                )}
                {!loading && !error && files.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>No files found</p>
                  </div>
                )}
                {!loading && !error && files.map((node) => (
                  <FileTreeItem
                    key={node.path}
                    node={node}
                    onFileClick={handleFileClick}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} minSize={30}>
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden h-full">
            {loadingFile && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingFile && selectedFile && (
              <>
                <div className="border-b px-4 py-2 bg-muted/50 flex-shrink-0">
                  <p className="text-sm font-mono text-muted-foreground truncate">
                    {selectedFile.path}
                  </p>
                </div>
                <div className="flex-1 overflow-auto">
                  <FileContent
                    content={selectedFile.content}
                    path={selectedFile.path}
                    encoding={selectedFile.encoding}
                  />
                </div>
              </>
            )}
            {!loadingFile && !selectedFile && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a file to view its content</p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
