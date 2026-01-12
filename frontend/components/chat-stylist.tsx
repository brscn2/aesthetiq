"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Send, Mic, ImageIcon, Sparkles, X, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { useApi } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"

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
  outfit?: {
    image: string
    brand: string
    items: string[]
  }
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "I have a summer wedding in Italy. What should I wear based on my palette?",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Perfect! For a summer wedding in Italy with your Autumn palette, I'd recommend a flowing midi dress in one of your signature warm tones. The burnt sienna or golden ochre would be stunning against the Italian backdrop. Here's a curated suggestion:",
    outfit: {
      image: "/placeholder.svg?key=fashion",
      brand: "Zimmermann",
      items: [
        "Linen Midi Dress in Terracotta",
        "Woven Leather Sandals",
        "Gold Statement Earrings",
        "Straw Clutch with Leather Detail",
      ],
    },
  },
]

export function ChatStylist() {
  const { userId } = useAuth()
  const api = useApi()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Smooth scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [messages])

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

  const handleSendMessage = async () => {
    if (!input.trim() && attachedImages.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
    }

    const messageText = input.trim()
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setAttachedImages([])
    setIsLoading(true)

    const tempAiMessageId = (Date.now() + 1).toString()
    const tempAiMessage: Message = {
      id: tempAiMessageId,
      role: "assistant",
      content: "",
    }
    setMessages((prev) => [...prev, tempAiMessage])

    let fullResponse = ""
    let sessionId = currentSessionId

    try {
      await api.chatApi.sendMessageStream(
        messageText,
        userId || 'anonymous',
        currentSessionId,
        (chunk: any) => {
          if (chunk.type === "metadata" && chunk.session_id) {
            sessionId = chunk.session_id
            if (!currentSessionId) setCurrentSessionId(sessionId)
          }
          if (chunk.type === "chunk" && chunk.content) {
            fullResponse += chunk.content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAiMessageId ? { ...msg, content: fullResponse } : msg
              )
            )
          }
          if (chunk.type === "done" && chunk.content?.message) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAiMessageId ? { ...msg, content: chunk.content.message } : msg
              )
            )
          }
        }
      )
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast.error(`Failed to get AI response: ${error.message}`)
      setMessages((prev) => prev.filter((msg) => msg.id !== tempAiMessageId))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
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
              className="cursor-pointer border-border/50 hover:bg-accent hover:text-accent-foreground"
            >
              {chip}
            </Badge>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8">
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
                  <p className="text-sm leading-relaxed">{message.content}</p>
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

                {/* Outfit Suggestion Card */}
                {message.outfit && (
                  <Card className="w-full overflow-hidden border-border/50 bg-card">
                    <div className="relative aspect-[16/10] w-full">
                      <Image
                        src="/placeholder.svg?key=fashion-outfit"
                        alt="Outfit suggestion"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-base">{message.outfit.brand}</CardTitle>
                      <CardDescription>Suggested Outfit</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {message.outfit.items.map((item, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {message.role === "user" && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">SC</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="gradient-ai text-white">AI</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 rounded-2xl bg-card border border-border/50 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
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
          <Button
            size="icon"
            className="gradient-ai h-10 w-10 sm:h-12 sm:w-12 text-white"
            onClick={handleSendMessage}
            disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
