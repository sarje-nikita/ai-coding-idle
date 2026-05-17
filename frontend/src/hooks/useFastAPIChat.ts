import { useState, useCallback, useRef, useEffect } from 'react';

interface Message {
  id: string;
  type: 'human' | 'ai' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  namespace?: string; // Added for subagent transparency
  subagentInfo?: {
    type: string;
    description: string;
  };
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  type: string;
}

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

interface ChatOptions {
  apiUrl?: string;
}

export function useFastAPIChat({ apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000' }: ChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [ui, setUi] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [interrupt, setInterrupt] = useState<any>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  const parseSSEData = useCallback((data: string) => {
    try {
      return JSON.parse(data);
    } catch (err) {
      console.warn('Failed to parse SSE data:', err);
      return null;
    }
  }, []);

  const parseMessage = useCallback((msgData: any): Message | null => {
    if (!msgData || typeof msgData !== 'object') return null;

    try {
      // Handle already-parsed JSON objects
      const message: Message = {
        id: msgData.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: msgData.type as 'human' | 'ai' | 'tool',
        content: msgData.content || '',
        tool_calls: msgData.tool_calls || [],
        tool_call_id: msgData.tool_call_id,
        name: msgData.name
      };

      // Update token usage if available
      if (msgData.usage_metadata) {
        const usage = msgData.usage_metadata;
        setTokenUsage(prev => ({
          inputTokens: prev.inputTokens + (usage.input_tokens || 0),
          outputTokens: prev.outputTokens + (usage.output_tokens || 0),
          cacheReadTokens: prev.cacheReadTokens + (usage.input_token_details?.cache_read || 0)
        }));
      }

      return message;
    } catch (e) {
      console.warn('Failed to parse message:', e, msgData);
      return null;
    }
  }, []);

  const handleStateUpdate = useCallback((update: any) => {
    if (!update) return;

    console.log('Received update:', { 
      step: update.step, 
      namespace: update.namespace,
      hasContent: !!update.content 
    });

    // Process model and tools steps
    if ((update.step === 'model' || update.step === 'tools') && update.content) {
      try {
        // Content is now an array of JSON objects, not Python repr strings
        const messages = Array.isArray(update.content) ? update.content : [update.content];
        
        for (const msgData of messages) {
          const parsed = parseMessage(msgData);
          
          if (!parsed) continue;
          
          // Store namespace from update
          if (update.namespace) {
            (parsed as any).namespace = update.namespace;
          }
          
          // Detect task tool calls and extract subagent info
          if (parsed.type === 'ai' && parsed.tool_calls) {
            for (const toolCall of parsed.tool_calls) {
              if (toolCall.name === 'task' && toolCall.args.subagent_type && toolCall.args.description) {
                (parsed as any).subagentInfo = {
                  type: toolCall.args.subagent_type,
                  description: toolCall.args.description,
                  toolCallId: toolCall.id
                };
                console.log('📋 Detected task tool call:', {
                  toolCallId: toolCall.id,
                  subagentType: toolCall.args.subagent_type,
                  descriptionPreview: toolCall.args.description.substring(0, 100)
                });
              }
            }
          }
          
          // Add detailed logging to debug
          console.log('Parsed message:', {
            step: update.step,
            namespace: update.namespace,
            type: parsed.type,
            id: parsed.id,
            hasContent: !!parsed.content,
            contentLength: parsed.content?.length,
            hasToolCalls: parsed.tool_calls?.length,
            toolCallNames: parsed.tool_calls?.map(tc => tc.name),
            hasSubagentInfo: !!(parsed as any).subagentInfo,
            alreadyProcessed: processedMessageIds.current.has(parsed.id)
          });
          
          if (parsed.id && !processedMessageIds.current.has(parsed.id)) {
            processedMessageIds.current.add(parsed.id);
            
            setMessages(prev => {
              // Double check in state
              if (prev.some(msg => msg.id === parsed.id)) {
                console.log('Message already in state, skipping:', parsed.id);
                return prev;
              }
              
              console.log('✅ Adding message to state:', { 
                id: parsed.id, 
                type: parsed.type, 
                namespace: update.namespace,
                hasToolCalls: !!parsed.tool_calls?.length,
                hasSubagentInfo: !!(parsed as any).subagentInfo
              });
              return [...prev, parsed];
            });
          } else {
            console.log('Message skipped - already processed or no ID:', parsed.id);
          }
        }
      } catch (e) {
        console.warn('Failed to process update:', e);
      }
      return;
    }

    // Filter out middleware steps (but only after checking for model/tools)
    if (update.step && (
      update.step.includes('before_') || 
      update.step.includes('after_') || 
      update.step.includes('Middleware')
    )) {
      return;
    }

    if (update.messages && Array.isArray(update.messages)) {
      setMessages(update.messages);
    }

    if (update.todos && Array.isArray(update.todos)) {
      setTodos(update.todos);
    }

    if (update.files && typeof update.files === 'object') {
      setFiles(update.files);
    }

    if (update.ui) {
      setUi(prev => [...prev, update.ui]);
    }

    if (update.interrupt) {
      setInterrupt(update.interrupt);
      setIsLoading(false);
    }
  }, [parseMessage]);

  const sendMessage = useCallback(async (content: string, options: Record<string, any> = {}, file?: File) => {
    if (isLoading) {
      console.warn('Already loading, ignoring send request');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    processedMessageIds.current.clear();

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('prompt', content);
      formData.append('userid', options.userid || 'user123');
      if (file) {
        formData.append('zip_file', file);
      }

      const response = await fetch(`${apiUrl}/agent/run-agent-stream`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsLoading(false);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsLoading(false);
              break;
            }

            const parsed = parseSSEData(data);
            if (parsed) {
              handleStateUpdate(parsed);
            }
          }
        }
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error sending message:', err);
        setError(err.message);
      }
      setIsLoading(false);
    }
  }, [apiUrl, isLoading, parseSSEData, handleStateUpdate]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const resumeInterrupt = useCallback(async (value: any) => {
    if (!interrupt) {
      console.warn('No interrupt to resume from');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${apiUrl}/agent/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interrupt_value: value,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setInterrupt(undefined);
      
    } catch (err: any) {
      console.error('Error resuming interrupt:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [apiUrl, interrupt]);

  const updateFiles = useCallback(async (newFiles: Record<string, string>) => {
    try {
      const response = await fetch(`${apiUrl}/agent/files`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: newFiles }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setFiles(newFiles);
    } catch (err: any) {
      console.error('Error updating files:', err);
      setError(err.message);
    }
  }, [apiUrl]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    todos,
    files,
    ui,
    isLoading,
    interrupt,
    error,
    tokenUsage,
    sendMessage,
    stopStream,
    resumeInterrupt,
    updateFiles,
    values: {
      messages,
      todos,
      files,
      ui,
    },
  };
}

export type { Message, ToolCall, TodoItem, TokenUsage };
