import { useState, useRef, useEffect, useMemo } from 'react'
import { useFastAPIChat } from '@/hooks/useFastAPIChat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Send, Square, Loader2, Terminal, CheckCircle2, Code2, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'highlight.js/styles/github-dark.css'
import { FileExplorer } from './FileExplorer'
import { TokenTelemetry } from './TokenTelemetry'
import { ThemeToggle } from './ui/theme-toggle'

// Define types for grouped messages
interface MessageGroup {
  namespace: string;
  messages: any[];
  isCollapsed: boolean;
  description?: string;
}

// Get color for subagent namespace
const getNamespaceColor = (namespace: string) => {
  if (namespace === 'main') return '';
  
  const colors: Record<string, string> = {
    'specs': 'bg-purple-50 dark:bg-purple-950/30 border-l-4 border-purple-300 dark:border-purple-700',
    'architect': 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-300 dark:border-blue-700',
    'developer': 'bg-green-50 dark:bg-green-950/30 border-l-4 border-green-300 dark:border-green-700',
    'reviewer': 'bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-300 dark:border-orange-700',
  };
  
  return colors[namespace] || 'bg-slate-50 dark:bg-slate-900/30 border-l-4 border-slate-300 dark:border-slate-700';
};

// Get badge color for subagent
const getNamespaceBadgeColor = (namespace: string) => {
  const colors: Record<string, string> = {
    'specs': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700',
    'architect': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700',
    'developer': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700',
    'reviewer': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700',
  };
  
  return colors[namespace] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700';
};

export function AgentChat() {
  const [instructions, setInstructions] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showFileExplorer, setShowFileExplorer] = useState(false)
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0)
  const [collapsedNamespaces, setCollapsedNamespaces] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const userid = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('space_id') || 'user'
  }, [])

  const {
    messages,
    todos,
    isLoading,
    error,
    tokenUsage,
    sendMessage,
    stopStream,
  } = useFastAPIChat({
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000'
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(scrollToBottom, [messages])

  useEffect(() => {
    console.log('Messages in state:', messages.map(m => ({
      id: m.id,
      type: m.type,
      hasContent: !!m.content,
      contentPreview: m.content?.substring(0, 50),
      hasToolCalls: m.tool_calls?.length || 0
    })));
    
    // Refresh file list on every message update
    setFileRefreshTrigger(prev => prev + 1)
  }, [messages]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    // Upload the zip immediately
    const formData = new FormData()
    formData.append('userid', userid)
    formData.append('zip_file', file)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/agent/upload-zip`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      // Refresh file list
      setFileRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instructions.trim() || isLoading) return

    setSubmitted(true)
    await sendMessage(instructions, {
      workspace_path: '/tmp/workspace',
      userid: userid
    })
    
    setInstructions('')
    setSelectedFile(null)
  }

  const formatToolResult = (content: string): string => {
    try {
      if (content.startsWith('[') || content.startsWith('{')) {
        const jsonStr = content.replace(/'/g, '"');
        const parsed = JSON.parse(jsonStr);
        return JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      // Keep original if parsing fails
    }
    return content;
  }

  // Group messages by namespace for better organization
  const groupMessagesByNamespace = () => {
    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;
    
    // Build a map of namespace -> subagent info from task tool calls
    const namespaceMap = new Map<string, { type: string; description: string }>();
    
    // First pass: find all task tool calls and map next non-main namespace
    let pendingSubagentInfo: { type: string; description: string; toolCallId: string } | null = null;
    
    messages.forEach((message) => {
      // Check for task tool calls
      if (message.type === 'ai' && (message as any).subagentInfo) {
        pendingSubagentInfo = (message as any).subagentInfo;
        console.log('🔍 Found pending subagent info:', pendingSubagentInfo);
      }
      
      // When we encounter a non-main namespace after a task call, map it
      if (message.namespace && message.namespace !== 'main' && pendingSubagentInfo) {
        if (!namespaceMap.has(message.namespace)) {
          namespaceMap.set(message.namespace, {
            type: pendingSubagentInfo.type,
            description: pendingSubagentInfo.description
          });
          console.log('🗺️ Mapped namespace:', {
            namespace: message.namespace,
            type: pendingSubagentInfo.type
          });
          pendingSubagentInfo = null; // Clear after mapping
        }
      }
    });
    
    // Second pass: group messages by namespace
    messages.forEach((message) => {
      let namespace = message.namespace || 'main';
      
      // Map namespace to subagent type if available
      const subagentInfo = namespaceMap.get(namespace);
      if (subagentInfo) {
        namespace = subagentInfo.type;
      }
      
      // Start a new group if namespace changes
      if (!currentGroup || currentGroup.namespace !== namespace) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          namespace,
          messages: [message],
          isCollapsed: collapsedNamespaces.has(namespace),
          description: subagentInfo?.description
        };
      } else {
        currentGroup.messages.push(message);
      }
    });
    
    // Add the last group
    if (currentGroup) {
      groups.push(currentGroup);
    }
    
    return groups;
  };
  
  const toggleNamespaceCollapse = (namespace: string) => {
    setCollapsedNamespaces(prev => {
      const next = new Set(prev);
      if (next.has(namespace)) {
        next.delete(namespace);
      } else {
        next.add(namespace);
      }
      return next;
    });
  };

  const hasContent = submitted || messages.length > 0;

  const renderMainContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 relative z-50" style={{overflow: 'visible'}}>
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">DeepAgent</h1>
              <p className="text-xs text-muted-foreground">Powered by FastAPI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TokenTelemetry 
              inputTokens={tokenUsage.inputTokens}
              outputTokens={tokenUsage.outputTokens}
              cacheReadTokens={tokenUsage.cacheReadTokens}
            />
            <ThemeToggle />
            <Button
              variant={showFileExplorer ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFileExplorer(!showFileExplorer)}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Files
            </Button>
            {error && (
              <Badge variant="destructive" className="animate-pulse">
                {error}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {!hasContent ? (
        /* Centered Input Form */
        <div className="flex-1 flex items-center justify-center p-8">
          {/* <Card className="w-full max-w-2xl p-8 shadow-lg"> */}
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mx-auto mb-4">
                  <Terminal className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">DeepAgent</h2>
                <p className="text-muted-foreground">Upload your code and provide instructions</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium mb-3">
                    Instructions
                  </label>
                  <Input
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g., Convert this .NET project to Java..."
                    disabled={isLoading}
                    className="w-full h-12 text-base"
                  />
                </div>
                
                <div>
                  <label htmlFor="zip-file" className="block text-sm font-medium mb-3">
                    Code Zip File (Optional)
                  </label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                    <Input
                      id="zip-file"
                      type="file"
                      accept=".zip"
                      onChange={async (e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          await handleFileSelect(file);
                        } else {
                          setSelectedFile(null);
                        }
                      }}
                      disabled={isLoading}
                      className="hidden"
                    />
                    <label htmlFor="zip-file" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <FolderOpen className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {selectedFile ? selectedFile.name : 'Click to select zip file'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'ZIP files only'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={!instructions.trim() || isLoading}
                  className="w-full h-12 text-base gap-2"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Start Agent
                    </>
                  )}
                </Button>
              </form>
            </div>
          {/* </Card> */}
        </div>
      ) : (
        <>
          {/* Messages Area */}
          <ScrollArea className="flex-1 overflow-y-auto px-4">
            <div className="mx-auto space-y-4 py-6">
              {groupMessagesByNamespace().map((group, groupIndex) => {
                const isMainNamespace = group.namespace === 'main';
                const namespaceColor = getNamespaceColor(group.namespace);
                const badgeColor = getNamespaceBadgeColor(group.namespace);
                
                return (
                  <div key={`group-${groupIndex}`} className={`${!isMainNamespace ? `pl-4 ${namespaceColor} rounded-lg p-3` : ''}`}>
                    {/* Namespace Header for subagents */}
                    {!isMainNamespace && (
                      <div className="mb-3">
                        <div 
                          className="flex items-center gap-2 cursor-pointer select-none"
                          onClick={() => toggleNamespaceCollapse(group.namespace)}
                        >
                          {group.isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Badge variant="outline" className={`text-xs font-semibold ${badgeColor}`}>
                            {group.namespace.toUpperCase()} Agent
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({group.messages.length} {group.messages.length === 1 ? 'message' : 'messages'})
                          </span>
                        </div>
                        {/* Show description if available */}
                        {group.description && !group.isCollapsed && (
                          <div className="mt-2 text-xs text-muted-foreground pl-6 pr-2 leading-relaxed">
                            <div className="bg-white/50 dark:bg-slate-800/50 rounded p-2 border border-slate-200 dark:border-slate-700 prose prose-xs max-w-none dark:prose-invert">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {group.description}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Messages in this namespace */}
                    {!group.isCollapsed && group.messages.map((message, index) => {
                      // Skip tool messages - they'll be shown in accordions
                      if (message.type === 'tool') {
                        return null;
                      }

                      // Find tool results for this AI message
                      const toolResults = message.tool_calls?.map(tc => {
                        const result = messages.find(m => 
                          m.type === 'tool' && m.tool_call_id === tc.id
                        );
                        return { toolCall: tc, result };
                      }).filter(({ result }) => result !== undefined) || [];

                      // Only skip AI messages that have tool calls but no content AND no results yet
                      if (message.type === 'ai' && !message.content && message.tool_calls && message.tool_calls.length > 0 && toolResults.length === 0) {
                        return null;
                      }

                      const isUser = message.type === 'human';

                      return (
                        <div
                          key={message.id || index}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
                        >
                          <div className={`flex max-w-[85%] flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
                            {/* Tool Calls in Accordion */}
                            {message.tool_calls && message.tool_calls.length > 0 && (
                              <div className="w-full space-y-1">
                                <Accordion type="multiple" className="w-full">
                                  {toolResults.map(({ toolCall, result }, idx) => (
                                    <AccordionItem key={toolCall.id || idx} value={`tool-${idx}`} className="border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                      <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                        <div className="flex items-center gap-2 text-left w-full">
                                          <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-900">
                                            <Code2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                          </div>
                                          <span className="font-medium text-sm">{toolCall.name}</span>
                                          {result && (
                                            <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />
                                          )}
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="px-3 pb-3 pt-2">
                                        {/* Tool Arguments */}
                                        <div className="mb-3 space-y-2">
                                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Arguments
                                          </div>
                                          <div className="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
                                            {Object.entries(toolCall.args).map(([key, value]) => (
                                              <div key={key} className="flex gap-2 text-sm">
                                                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                                  {key}:
                                                </span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                  {JSON.stringify(value)}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Tool Result */}
                                        {result && (
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                                              Result
                                            </div>
                                            <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100 dark:bg-slate-950 text-left whitespace-pre-wrap break-words">
                                              {formatToolResult(result.content)}
                                            </pre>
                                          </div>
                                        )}
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                              </div>
                            )}

                            {/* Message Content */}
                            {message.content && (
                              <Card className={`px-4 py-3 ${
                                isUser 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-white dark:bg-slate-800'
                              }`}>
                                <div className={`prose prose-sm max-w-none text-left ${
                                  isUser 
                                    ? 'prose-invert' 
                                    : 'dark:prose-invert'
                                }`}>
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
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              </Card>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex max-w-[85%] flex-col gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Assistant
                    </Badge>
                    <Card className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Todos Panel */}
          {todos.length > 0 && (
            <div className="flex-shrink-0 border-t bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <div className="container mx-auto max-w-6xl px-6 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Active Tasks
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {todos.map((todo, index) => (
                    <Badge
                      key={todo.id || index}
                      variant={
                        todo.status === 'completed' ? 'default' :
                        todo.status === 'in_progress' ? 'secondary' : 'outline'
                      }
                    >
                      {todo.content}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Input Area */}
          <div className="flex-shrink-0 border-t bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
            <div className="px-4 py-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Send a follow-up message..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!instructions.trim() || isLoading}
                  className="gap-2"
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {!isLoading && 'Send'}
                </Button>
              </form>
            </div>
          </div>

          {/* Stop Button when running */}
          {isLoading && (
            <div className="flex-shrink-0 border-t bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <div className="px-4 py-4">
                <div className="flex justify-center">
                  <Button onClick={stopStream} variant="destructive" className="gap-2">
                    <Square className="h-4 w-4" />
                    Stop Agent
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {showFileExplorer ? (
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={40} minSize={30}>
            {renderMainContent()}
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={60} minSize={40}>
            <FileExplorer
              userid={userid}
              apiUrl={import.meta.env.VITE_API_URL || 'http://localhost:8000'}
              onClose={() => setShowFileExplorer(false)}
              refreshTrigger={fileRefreshTrigger}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        renderMainContent()
      )}
    </div>
  )
}
