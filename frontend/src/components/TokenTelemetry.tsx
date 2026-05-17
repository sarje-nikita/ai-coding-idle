import { useState } from 'react'
import { FiInfo } from 'react-icons/fi'

interface TokenTelemetryProps {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
}

export function TokenTelemetry({ inputTokens, outputTokens, cacheReadTokens = 0 }: TokenTelemetryProps) {
  const [show, setShow] = useState(false)
  
  const totalTokens = inputTokens + outputTokens
  const formatNumber = (num: number) => num.toLocaleString()
  
  // Calculate costs (example rates - adjust as needed)
  const INPUT_COST_PER_1K = 0.0015
  const OUTPUT_COST_PER_1K = 0.002
  const CACHE_COST_PER_1K = 0.00075
  
  const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K
  const cacheCost = (cacheReadTokens / 1000) * CACHE_COST_PER_1K
  const totalCost = inputCost + outputCost + cacheCost

  return (
    <div className="relative flex items-center">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Token usage information"
      >
        <FiInfo className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
      </button>
      
      {show && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 min-w-[280px] animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Header */}
          <div className="font-semibold text-sm mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            Token Usage
          </div>
          
          {/* Token Breakdown */}
          <div className="space-y-2 mb-3">
            {/* Input Tokens */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Input
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{formatNumber(inputTokens)}</span>
                <span className="text-xs text-muted-foreground">${inputCost.toFixed(3)}</span>
              </div>
            </div>
            
            {/* Cache Read (if applicable) */}
            {cacheReadTokens > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-purple-300"></span>
                  Cache Read
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-sm">{formatNumber(cacheReadTokens)}</span>
                  <span className="text-xs text-muted-foreground">${cacheCost.toFixed(3)}</span>
                </div>
              </div>
            )}
            
            {/* Output Tokens */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Output
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{formatNumber(outputTokens)}</span>
                <span className="text-xs text-muted-foreground">${outputCost.toFixed(3)}</span>
              </div>
            </div>
          </div>
          
          {/* Total */}
          <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-200 dark:border-slate-700 font-semibold">
            <span>Total</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{formatNumber(totalTokens)}</span>
              <span className="text-green-600 dark:text-green-400">${totalCost.toFixed(3)}</span>
            </div>
          </div>
          
          {/* Visual indicator */}
          <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
            <div 
              className="bg-purple-500 transition-all duration-300"
              style={{ width: `${(inputTokens / totalTokens) * 100}%` }}
              title={`Input: ${((inputTokens / totalTokens) * 100).toFixed(1)}%`}
            />
            <div 
              className="bg-blue-500 transition-all duration-300"
              style={{ width: `${(outputTokens / totalTokens) * 100}%` }}
              title={`Output: ${((outputTokens / totalTokens) * 100).toFixed(1)}%`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
