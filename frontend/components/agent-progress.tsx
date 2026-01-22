"use client"

import { useState } from "react"
import * as Collapsible from "@radix-ui/react-collapsible"
import { Check, ChevronDown, ChevronUp, Loader2, Sparkles, Search, Brain, Filter, Package, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { StreamingProgress } from "@/types/chat"

interface AgentProgressProps {
  progress: StreamingProgress
  status: string | null
  className?: string
}

/**
 * Maps node names to user-friendly display info
 */
const NODE_INFO: Record<string, { icon: typeof Sparkles; label: string }> = {
  check_clarification: { icon: Brain, label: "Checking context" },
  merge_clarification: { icon: Brain, label: "Processing clarification" },
  input_guardrails: { icon: Filter, label: "Validating input" },
  intent_classifier: { icon: Brain, label: "Understanding request" },
  query_analyzer: { icon: Search, label: "Analyzing query" },
  conversation_agent: { icon: Sparkles, label: "Preparing response" },
  clothing_recommender: { icon: Search, label: "Searching items" },
  clothing_analyzer: { icon: Brain, label: "Evaluating results" },
  save_clarification: { icon: Brain, label: "Preparing follow-up" },
  output_guardrails: { icon: Filter, label: "Validating response" },
  response_formatter: { icon: Sparkles, label: "Formatting response" },
  error_response: { icon: Sparkles, label: "Handling error" },
}

/**
 * Get icon for a tool name
 */
function getToolIcon(tool: string) {
  if (tool.includes("search") || tool.includes("query")) return Search
  if (tool.includes("wardrobe") || tool.includes("commerce")) return Package
  return Wrench
}

export function AgentProgress({ progress, status, className }: AgentProgressProps) {
  const [isOpen, setIsOpen] = useState(false)

  const hasProgress = progress.completedNodes.length > 0 || progress.currentNode
  const hasDetails = progress.intent || progress.itemsFound > 0 || progress.toolCalls.length > 0

  // Get current node info
  const currentNodeInfo = progress.currentNode
    ? NODE_INFO[progress.currentNode] || { icon: Sparkles, label: progress.displayName || progress.currentNode }
    : null

  // Get display label for current step
  const currentLabel = progress.displayName || status || "Processing..."

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className={cn("w-full", className)}>
      {/* Compact View - Always visible */}
      <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/50 px-4 py-3">
        {/* Spinner */}
        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />

        {/* Current step */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground truncate block">
            {currentLabel}
          </span>
        </div>

        {/* Quick stats badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {progress.intent && (
            <Badge variant="secondary" className="text-xs">
              {progress.intent === "clothing" ? "Fashion" : "General"}
            </Badge>
          )}
          {progress.itemsFound > 0 && (
            <Badge variant="secondary" className="text-xs">
              {progress.itemsFound} items
            </Badge>
          )}
        </div>

        {/* Expand/collapse button */}
        {(hasProgress || hasDetails) && (
          <Collapsible.Trigger asChild>
            <button
              className="p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0"
              aria-label={isOpen ? "Collapse details" : "Expand details"}
            >
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </Collapsible.Trigger>
        )}
      </div>

      {/* Expanded View */}
      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
        <div className="mt-2 rounded-xl bg-card/50 border border-border/30 p-4 space-y-4">
          {/* Completed Steps */}
          {progress.completedNodes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Completed Steps
              </h4>
              <div className="space-y-1.5">
                {progress.completedNodes.map((node, index) => {
                  const nodeInfo = NODE_INFO[node.node] || { icon: Sparkles, label: node.displayName }
                  const Icon = nodeInfo.icon

                  return (
                    <div key={`${node.node}-${index}`} className="flex items-center gap-2 text-sm">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 flex-shrink-0">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{node.displayName}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Current Step */}
          {currentNodeInfo && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Current Step
              </h4>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 flex-shrink-0">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                </div>
                <currentNodeInfo.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-foreground font-medium">
                  {progress.displayName || currentNodeInfo.label}
                </span>
              </div>
            </div>
          )}

          {/* Tool Calls */}
          {progress.toolCalls.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tool Calls
              </h4>
              <div className="space-y-1.5">
                {progress.toolCalls.slice(-3).map((call, index) => {
                  const Icon = getToolIcon(call.tool)
                  return (
                    <div key={index} className="flex items-start gap-2 text-xs">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-mono text-muted-foreground">{call.tool}</span>
                        {call.input && (
                          <p className="text-muted-foreground/70 truncate max-w-[200px]">
                            {call.input}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
                {progress.toolCalls.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    + {progress.toolCalls.length - 3} more calls
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Additional Info */}
          {(progress.decision || progress.sources.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
              {progress.decision && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    progress.decision === "approve" && "border-green-500/50 text-green-500",
                    progress.decision === "refine" && "border-yellow-500/50 text-yellow-500",
                    progress.decision === "clarify" && "border-blue-500/50 text-blue-500"
                  )}
                >
                  {progress.decision === "approve" && "Approved"}
                  {progress.decision === "refine" && "Refining"}
                  {progress.decision === "clarify" && "Needs clarification"}
                </Badge>
              )}
              {progress.sources.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  Sources: {progress.sources.join(", ")}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
