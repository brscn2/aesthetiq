"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { Send, Mic, ImageIcon, Sparkles, X, ExternalLink, ShoppingBag } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Markdown } from "@/components/ui/markdown"
import { AgentProgress } from "@/components/agent-progress"
import { toast } from "sonner"
import { useChatApi, generateMessageId } from "@/lib/chat-api"
import type { ClothingItem, DoneEvent } from "@/types/chat"

// Speech Recognition types
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  length: number
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare global {
  interface Window {
    webkitSpeechRecognition: {
      new (): SpeechRecognition
    }
    SpeechRecognition?: {
      new (): SpeechRecognition
    }
  }
}

const contextChips = ["Business Casual", "Date Night", "Travel", "Eco-Friendly"]

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  images?: string[]
  items?: ClothingItem[]
  isStreaming?: boolean
  metadata?: {
    intent?: string
    sources?: string[]
    needsClarification?: boolean
  }
}

interface ChatStylistProps {
  activeSessionId?: string | null
  initialMessages?: Array<{
    role: "user" | "assistant"
    content: string
    timestamp?: string
  }>
  onSessionUpdated?: (sessionId: string, lastMessage: string) => void
}

export function ChatStylist({
  activeSessionId = null,
  initialMessages = [],
  onSessionUpdated,
}: ChatStylistProps = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previousSessionIdRef = useRef<string | null>(null)

  // Initialize messages from props when session changes
  useEffect(() => {
    if (activeSessionId !== previousSessionIdRef.current) {
      previousSessionIdRef.current = activeSessionId
      if (initialMessages.length > 0) {
        setMessages(
          initialMessages.map((msg) => ({
            id: generateMessageId(),
            role: msg.role,
            content: msg.content,
          }))
        )
      } else {
        setMessages([])
      }
    }
  }, [activeSessionId, initialMessages])

  // Use the chat API hook
  const {
    sessionState,
    progress,
    streamedText,
    foundItems,
    sendMessage,
    cancelRequest,
    clearError,
  } = useChatApi({
    onStreamStart: () => {
      // Add a placeholder message for streaming
      const streamingMessage: Message = {
        id: generateMessageId(),
        role: "assistant",
        content: "",
        isStreaming: true,
      }
      setMessages((prev) => [...prev, streamingMessage])
    },
    onStreamEnd: (result: DoneEvent | null) => {
      if (result) {
        // Update the streaming message with final content
        setMessages((prev) => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage?.isStreaming) {
            lastMessage.content = result.response
            lastMessage.items = result.items
            lastMessage.isStreaming = false
            lastMessage.metadata = {
              intent: result.intent || undefined,
              sources: result.items?.map((i) => i.source).filter((v, i, a) => a.indexOf(v) === i),
              needsClarification: result.needs_clarification,
            }
          }
          return newMessages
        })

        // Notify parent of session update
        if (result.session_id && onSessionUpdated) {
          onSessionUpdated(result.session_id, result.response)
        }
      }
    },
  })

  // Update streaming message content in real-time
  useEffect(() => {
    if (streamedText && sessionState.isStreaming) {
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage?.isStreaming) {
          lastMessage.content = streamedText
        }
        return [...newMessages]
      })
    }
  }, [streamedText, sessionState.isStreaming])

  // Update streaming message items in real-time
  useEffect(() => {
    if (foundItems.length > 0 && sessionState.isStreaming) {
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage?.isStreaming) {
          lastMessage.items = foundItems
        }
        return [...newMessages]
      })
    }
  }, [foundItems, sessionState.isStreaming])

  // Show error toast
  useEffect(() => {
    if (sessionState.error) {
      toast.error(sessionState.error)
      clearError()
    }
  }, [sessionState.error, clearError])

  // Smooth scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [messages, streamedText])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript
        setInput((prev) => prev + (prev ? " " : "") + transcript)
        setIsRecording(false)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        toast.error("Speech recognition failed. Please try again.")
        setIsRecording(false)
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() && attachedImages.length === 0) return

    const messageContent = input.trim()

    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content: messageContent,
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setAttachedImages([])

    // Use activeSessionId from props if provided, otherwise use sessionState.sessionId
    const sessionIdToUse = activeSessionId ?? sessionState.sessionId ?? null

    // Send to the conversational agent API
    await sendMessage(messageContent, sessionIdToUse)
  }, [input, attachedImages, sendMessage, activeSessionId, sessionState.sessionId])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleChipClick = (chip: string) => {
    setInput((prev) => {
      const newValue = prev ? `${prev} ${chip.toLowerCase()}` : `I'm looking for ${chip.toLowerCase()} style recommendations`
      return newValue
    })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))
    if (imageFiles.length === 0) {
      toast.error("Please select image files only")
      return
    }

    if (imageFiles.length + attachedImages.length > 5) {
      toast.error("Maximum 5 images allowed")
      return
    }

    imageFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Image ${file.name} is too large. Maximum size is 5MB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        setAttachedImages((prev) => [...prev, imageUrl])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in your browser")
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
        toast.info("Listening...")
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        toast.error("Failed to start speech recognition")
      }
    }
  }

  const isLoading = sessionState.isLoading

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 bg-background p-4 sm:p-6">
        <div className="mb-3 sm:mb-4">
          <h2 className="flex items-center gap-2 font-serif text-xl sm:text-2xl font-bold text-foreground">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Your AI Stylist
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Ask me anything about fashion, styling, or outfit recommendations
          </p>
        </div>

        {/* Context Chips */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {contextChips.map((chip) => (
            <Badge
              key={chip}
              variant="outline"
              className="cursor-pointer border-border/50 hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </Badge>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Welcome message if no messages */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Welcome to your AI Stylist
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask me about fashion trends, get outfit recommendations, or explore items from your wardrobe and our catalog.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="gradient-ai text-white">AI</AvatarFallback>
                </Avatar>
              )}

              <div
                className={`flex max-w-[80%] flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border border-border/50"
                  }`}
                >
                  {message.role === "user" ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  ) : (
                    <>
                      {message.content ? (
                        <Markdown content={message.content} className="text-sm" />
                      ) : message.isStreaming ? (
                        <span className="text-sm text-muted-foreground">...</span>
                      ) : null}
                      {message.isStreaming && message.content && (
                        <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1" />
                      )}
                    </>
                  )}
                </div>

                {/* Attached Images */}
                {message.images && message.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.images.map((imageUrl, index) => (
                      <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border/50">
                        <Image src={imageUrl} alt={`Attachment ${index + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Clothing Items Display */}
                {message.items && message.items.length > 0 && (
                  <div className="w-full mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {message.items.length} item{message.items.length !== 1 ? "s" : ""} found
                      </span>
                      {message.metadata?.sources && message.metadata.sources.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          from {message.metadata.sources.join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {message.items.slice(0, 4).map((item) => (
                        <ClothingItemCard key={item.id} item={item} />
                      ))}
                    </div>
                    {message.items.length > 4 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        + {message.items.length - 4} more items
                      </p>
                    )}
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">You</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Agent Progress Indicator - shows during loading/streaming when no text yet */}
          {isLoading && (progress.currentNode || progress.completedNodes.length > 0 || !streamedText) && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="gradient-ai text-white">AI</AvatarFallback>
              </Avatar>
              <div className="flex-1 max-w-[80%]">
                <AgentProgress 
                  progress={progress} 
                  status={sessionState.currentStatus}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-border bg-background p-3 sm:p-6">
        {/* Attached Images Preview */}
        {attachedImages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedImages.map((imageUrl, index) => (
              <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/50 group">
                <Image src={imageUrl} alt={`Preview ${index + 1}`} fill className="object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask your stylist anything..."
              className="h-10 sm:h-12 bg-card pr-10 sm:pr-12 text-sm sm:text-base text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 sm:h-12 sm:w-12 border-border/50 bg-transparent"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || attachedImages.length >= 5}
            title="Attach images"
          >
            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className={`h-10 w-10 sm:h-12 sm:w-12 border-border/50 bg-transparent hidden sm:flex ${
              isRecording ? "bg-red-500/20 border-red-500/50" : ""
            }`}
            onClick={toggleRecording}
            disabled={isLoading}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            <Mic className={`h-4 w-4 sm:h-5 sm:w-5 ${isRecording ? "text-red-500 animate-pulse" : ""}`} />
          </Button>
          {isLoading ? (
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 sm:h-12 sm:w-12 border-border/50"
              onClick={cancelRequest}
              title="Cancel request"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="gradient-ai h-10 w-10 sm:h-12 sm:w-12 text-white"
              onClick={handleSendMessage}
              disabled={!input.trim() && attachedImages.length === 0}
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Clothing Item Card Component
// =============================================================================

interface ClothingItemCardProps {
  item: ClothingItem
}

function ClothingItemCard({ item }: ClothingItemCardProps) {
  const sourceLabel = {
    wardrobe: "Your Wardrobe",
    commerce: "Shop",
    web: "Web",
  }[item.source] || item.source

  return (
    <Card className="overflow-hidden border-border/50 bg-card hover:shadow-md transition-shadow">
      {item.imageUrl && (
        <div className="relative aspect-square w-full bg-muted">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            onError={(e) => {
              // Hide image on error
              (e.target as HTMLImageElement).style.display = "none"
            }}
          />
        </div>
      )}
      <CardHeader className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">{item.name}</CardTitle>
            {item.brand && (
              <CardDescription className="text-xs truncate">{item.brand}</CardDescription>
            )}
          </div>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {sourceLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex items-center justify-between">
          {item.price && (
            <span className="text-sm font-semibold text-foreground">
              ${item.price.toFixed(2)}
            </span>
          )}
          {item.productUrl && (
            <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
              <a href={item.productUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </a>
            </Button>
          )}
        </div>
        {item.colorHex && (
          <div className="flex items-center gap-1.5 mt-2">
            <div
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: item.colorHex }}
            />
            <span className="text-xs text-muted-foreground">
              {item.category || "Item"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
