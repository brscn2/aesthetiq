"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Send, Mic, ImageIcon, Sparkles, X, ExternalLink, ShoppingBag, Plus, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Markdown } from "@/components/ui/markdown"
import { AgentProgress } from "@/components/agent-progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useChatApi, generateMessageId } from "@/lib/chat-api"
import { useApi } from "@/lib/api"
import type { ClothingItem, DoneEvent, OutfitAttachment, OutfitSwapIntent } from "@/types/chat"
import type { Outfit, WardrobeItem, UpdateOutfitDto } from "@/types/api"

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
  attachedOutfits?: OutfitAttachment[]
  swapIntents?: OutfitSwapIntent[]
  isStreaming?: boolean
  metadata?: {
    intent?: string
    sources?: string[]
    needsClarification?: boolean
  }
}

function filterItemsByResponseIds(
  items: ClothingItem[] | undefined,
  responseItemIds: string[] | undefined,
): ClothingItem[] {
  if (!items || items.length === 0) return []
  if (!responseItemIds || responseItemIds.length === 0) return items

  const idSet = new Set(responseItemIds.map((id) => id.toString()))
  return items.filter((item) => idSet.has(item.id))
}

interface ChatStylistProps {
  activeSessionId?: string | null
  initialMessages?: Array<{
    role: "user" | "assistant"
    content: string
    timestamp?: string
    items?: ClothingItem[]
    metadata?: Record<string, any>
  }>
  onSessionUpdated?: (sessionId: string, lastMessage: string) => void
  resetTrigger?: number // Increment this to force a reset
}

export function ChatStylist({
  activeSessionId = null,
  initialMessages = [],
  onSessionUpdated,
  resetTrigger = 0,
}: ChatStylistProps = {}) {
  const router = useRouter()
  const { outfitApi } = useApi()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [attachedOutfits, setAttachedOutfits] = useState<OutfitAttachment[]>([])
  const [swapIntentsByOutfit, setSwapIntentsByOutfit] = useState<Record<string, OutfitSwapIntent["category"] | null>>({})
  const [isOutfitDialogOpen, setIsOutfitDialogOpen] = useState(false)
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(false)
  const [outfitOptions, setOutfitOptions] = useState<Outfit[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null)
  const [selectedItemsForAdd, setSelectedItemsForAdd] = useState<Set<string>>(new Set())
  const [isAddingToOutfit, setIsAddingToOutfit] = useState(false)
  const [addingItemIds, setAddingItemIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previousSessionIdRef = useRef<string | null>(null)
  const previousResetTriggerRef = useRef<number>(0)

  // Use the chat API hook (must be called before useEffect that uses setPendingClarification)
  const {
    sessionState,
    progress,
    streamedText,
    foundItems,
    sendMessage,
    cancelRequest,
    clearError,
    setPendingClarification,
    resetSession,
  } = useChatApi({
    onStreamStart: () => {
      // Don't create empty message - wait for content to arrive via streamedText
      // This prevents empty message bubbles from appearing
    },
    onStreamEnd: (result: DoneEvent | null) => {
      if (result) {
        const filteredItems = filterItemsByResponseIds(
          result.items,
          result.response_item_ids,
        )

        // Use functional update to always work with latest state
        setMessages((prev) => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          
          // Check if we already have a streaming message
          if (lastMessage?.isStreaming) {
            // Update existing streaming message
            lastMessage.content = result.response || lastMessage.content
            lastMessage.items = filteredItems
            lastMessage.isStreaming = false
            lastMessage.metadata = {
              intent: result.intent || undefined,
              sources: filteredItems.map((i) => i.source).filter((v, i, a) => a.indexOf(v) === i),
              needsClarification: result.needs_clarification,
            }
            return newMessages
          } 
          
          // Only create new message if:
          // 1. No streaming message exists AND
          // 2. We have response content AND
          // 3. The last message is not already an assistant message with the same content
          if (result.response && result.response.trim().length > 0) {
            const lastAssistantMessage = newMessages
              .slice()
              .reverse()
              .find(msg => msg.role === "assistant")
            
            // Prevent duplicate: don't create if last assistant message has same content
            if (!lastAssistantMessage || lastAssistantMessage.content !== result.response) {
              const finalMessage: Message = {
                id: generateMessageId(),
                role: "assistant",
                content: result.response,
                items: filteredItems,
                isStreaming: false,
                metadata: {
                  intent: result.intent || undefined,
                  sources: filteredItems.map((i) => i.source).filter((v, i, a) => a.indexOf(v) === i),
                  needsClarification: result.needs_clarification,
                },
              }
              return [...newMessages, finalMessage]
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

  const handleCreateOutfitFromItems = useCallback((items: ClothingItem[]) => {
    const wardrobeItems = items.filter((item) => item.id && item.source === "wardrobe")
    const uniqueIds = Array.from(new Set(wardrobeItems.map((item) => item.id)))

    if (uniqueIds.length === 0) {
      toast.error("No wardrobe items available to create an outfit.")
      return
    }

    if (wardrobeItems.length !== items.length) {
      toast.info("Only wardrobe items were added to the outfit.")
    }

    const params = new URLSearchParams({
      tab: "outfits",
      prefillItems: uniqueIds.join(","),
    })

    router.push(`/virtual-wardrobe?${params.toString()}`)
  }, [router])

  const buildOutfitItemSnapshot = useCallback((item: string | WardrobeItem | undefined) => {
    if (!item || typeof item === "string") return undefined
    return {
      id: item._id,
      name: item.subCategory || item.category || "Item",
      imageUrl: item.processedImageUrl || item.imageUrl || undefined,
      category: item.category,
      source: "wardrobe" as const,
    }
  }, [])

  const buildOutfitAttachment = useCallback((outfit: Outfit): OutfitAttachment => {
    const top = buildOutfitItemSnapshot(outfit.items.top)
    const bottom = buildOutfitItemSnapshot(outfit.items.bottom)
    const footwear = buildOutfitItemSnapshot(outfit.items.footwear)
    const dress = buildOutfitItemSnapshot(outfit.items.dress)
    const outerwear = buildOutfitItemSnapshot(outfit.items.outerwear)
    const accessories = outfit.items.accessories
      .map(buildOutfitItemSnapshot)
      .filter((item): item is NonNullable<typeof item> => !!item)

    return {
      id: outfit._id,
      name: outfit.name,
      items: {
        top,
        bottom,
        footwear,
        dress,
        outerwear,
        accessories,
      },
    }
  }, [buildOutfitItemSnapshot])

  const getOutfitAttachmentImages = useCallback((attachment: OutfitAttachment) => {
    return [
      attachment.items.outerwear?.imageUrl,
      attachment.items.top?.imageUrl,
      attachment.items.bottom?.imageUrl,
      attachment.items.footwear?.imageUrl,
      attachment.items.dress?.imageUrl,
      attachment.items.accessories[0]?.imageUrl,
    ]
  }, [])

  const buildAutoMessage = useCallback(
    (swapIntents: OutfitSwapIntent[], attachments: OutfitAttachment[]) => {
      if (swapIntents.length > 0) {
        const swaps = swapIntents
          .map((intent) => {
            const outfit = attachments.find((entry) => entry.id === intent.outfitId)
            const categoryLabel = intent.category.toLowerCase()
            return outfit ? `swap the ${categoryLabel} for "${outfit.name}"` : `swap the ${categoryLabel}`
          })
          .join("; ")
        return `Please ${swaps}.`
      }

      if (attachments.length > 0) {
        return "Please use the attached outfits for context."
      }

      return ""
    },
    [],
  )

  // Initialize messages from props when session changes or reset is triggered
  useEffect(() => {
    const sessionChanged = activeSessionId !== previousSessionIdRef.current
    const resetTriggered = resetTrigger !== previousResetTriggerRef.current
    
    if (sessionChanged) {
      previousSessionIdRef.current = activeSessionId
      setAttachedOutfits([])
      setSwapIntentsByOutfit({})
    }
    
    if (resetTriggered) {
      previousResetTriggerRef.current = resetTrigger
    }
    
    // If reset is triggered or session changed to null, perform full reset
    if (resetTriggered || (sessionChanged && activeSessionId === null)) {
      setMessages([])
      setPendingClarification(null)
      resetSession()
      setAttachedOutfits([])
      setSwapIntentsByOutfit({})
    } else if (sessionChanged && initialMessages.length > 0) {
      // Load messages for existing session
      setMessages(
        initialMessages.map((msg) => ({
          id: generateMessageId(),
          role: msg.role,
          content: msg.content,
          items: msg.items,
          attachedOutfits: msg.metadata?.attachedOutfits,
          swapIntents: msg.metadata?.swapIntents,
          metadata: msg.metadata,
        }))
      )
    } else if (sessionChanged && initialMessages.length === 0) {
      // Session changed but no messages, clear messages
      setMessages([])
    }
  }, [activeSessionId, initialMessages, resetTrigger, setPendingClarification, resetSession])

  useEffect(() => {
    if (!isOutfitDialogOpen) return

    let isActive = true
    setIsLoadingOutfits(true)

    outfitApi
      .getAll()
      .then((outfits) => {
        if (!isActive) return
        setOutfitOptions(outfits)
      })
      .catch((error) => {
        if (!isActive) return
        console.error("Failed to load outfits", error)
        toast.error("Failed to load outfits")
      })
      .finally(() => {
        if (!isActive) return
        setIsLoadingOutfits(false)
      })

    return () => {
      isActive = false
    }
  }, [isOutfitDialogOpen, outfitApi])

  // Create or update streaming message when content arrives
  useEffect(() => {
    if (streamedText && sessionState.isStreaming && streamedText.trim().length > 0) {
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        
        // If there's already a streaming message, update it
        if (lastMessage?.isStreaming) {
          lastMessage.content = streamedText
          return [...newMessages]
        } else {
          // Create new streaming message
          const streamingMessage: Message = {
            id: generateMessageId(),
            role: "assistant",
            content: streamedText,
            isStreaming: true,
          }
          return [...newMessages, streamingMessage]
        }
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
    const swapIntents: OutfitSwapIntent[] = Object.entries(swapIntentsByOutfit)
      .filter(([, category]) => !!category)
      .map(([outfitId, category]) => ({
        outfitId,
        category: category as OutfitSwapIntent["category"],
      }))

    if (!input.trim() && attachedImages.length === 0 && attachedOutfits.length === 0 && swapIntents.length === 0) return

    const messageContent = input.trim() || buildAutoMessage(swapIntents, attachedOutfits)

    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content: messageContent,
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
      attachedOutfits: attachedOutfits.length > 0 ? [...attachedOutfits] : undefined,
      swapIntents: swapIntents.length > 0 ? swapIntents : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setAttachedImages([])
    setSwapIntentsByOutfit({})

    // Use activeSessionId from props if provided, otherwise use sessionState.sessionId
    const sessionIdToUse = activeSessionId ?? sessionState.sessionId ?? null

    // Send to the conversational agent API
    await sendMessage(messageContent, sessionIdToUse, {
      attachedOutfits: attachedOutfits.length > 0 ? attachedOutfits : undefined,
      swapIntents: swapIntents.length > 0 ? swapIntents : undefined,
    })
  }, [input, attachedImages, attachedOutfits, swapIntentsByOutfit, sendMessage, activeSessionId, sessionState.sessionId, buildAutoMessage])

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

  const handleToggleOutfitAttachment = useCallback((outfit: Outfit) => {
    setAttachedOutfits((prev) => {
      const exists = prev.some((entry) => entry.id === outfit._id)
      if (exists) {
        return prev.filter((entry) => entry.id !== outfit._id)
      }
      if (prev.length >= 3) {
        toast.error("You can attach up to 3 outfits")
        return prev
      }
      return [...prev, buildOutfitAttachment(outfit)]
    })
  }, [buildOutfitAttachment])

  const removeOutfitAttachment = useCallback((outfitId: string) => {
    setAttachedOutfits((prev) => prev.filter((entry) => entry.id !== outfitId))
    setSwapIntentsByOutfit((prev) => {
      if (!prev[outfitId]) return prev
      const updated = { ...prev }
      delete updated[outfitId]
      return updated
    })
  }, [])

  const toggleSwapIntent = useCallback(
    (outfitId: string, category: OutfitSwapIntent["category"]) => {
      setSwapIntentsByOutfit((prev) => ({
        ...prev,
        [outfitId]: prev[outfitId] === category ? null : category,
      }))
    },
    [],
  )

  const handleAddToOutfit = useCallback(async (item: ClothingItem, outfitId?: string) => {
    if (item.source !== "wardrobe" || !item.id) {
      toast.error("Only wardrobe items can be added to outfits")
      return
    }

    // Prevent duplicate adds
    if (addingItemIds.has(item.id)) {
      return
    }

    const targetOutfitId = outfitId || attachedOutfits[0]?.id
    if (!targetOutfitId) {
      toast.error("No outfit selected. Please attach an outfit first.")
      return
    }

    const categoryMap: Record<string, keyof NonNullable<UpdateOutfitDto["items"]>> = {
      "TOP": "top",
      "BOTTOM": "bottom",
      "OUTERWEAR": "outerwear",
      "FOOTWEAR": "footwear",
      "ACCESSORY": "accessories",
      "DRESS": "dress"
    }

    const slotKey = item.category ? categoryMap[item.category] : undefined
    if (!slotKey) {
      toast.error(`Cannot add ${item.category || "item"} to outfit`)
      return
    }

    // Track this item as being added
    setAddingItemIds((prev) => new Set(prev).add(item.id))
    setIsAddingToOutfit(true)

    try {
      const updateData: UpdateOutfitDto = {
        items: slotKey === "accessories" 
          ? { accessories: [item.id] } 
          : { [slotKey]: item.id }
      }

      await outfitApi.update(targetOutfitId, updateData)

      // Refetch the full outfit to get populated item details
      const refreshedOutfit = await outfitApi.getById(targetOutfitId)

      // Update local state with the refreshed outfit data
      setAttachedOutfits((prev) =>
        prev.map((outfit) =>
          outfit.id === targetOutfitId ? buildOutfitAttachment(refreshedOutfit) : outfit
        )
      )

      toast.success(`Added ${item.name} to outfit`)
    } catch (error) {
      console.error("Failed to add item to outfit:", error)
      toast.error("Failed to add item to outfit")
    } finally {
      setIsAddingToOutfit(false)
      // Remove from adding set after a delay to prevent rapid re-clicks
      setTimeout(() => {
        setAddingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
      }, 500)
    }
  }, [attachedOutfits, outfitApi, buildOutfitAttachment, addingItemIds])

  const handleBulkAddToOutfit = useCallback(async (items: ClothingItem[], outfitId?: string) => {
    const wardrobeItems = items.filter((item) => item.source === "wardrobe" && item.id)
    if (wardrobeItems.length === 0) {
      toast.error("No wardrobe items selected")
      return
    }

    const targetOutfitId = outfitId || attachedOutfits[0]?.id
    if (!targetOutfitId) {
      toast.error("No outfit selected. Please attach an outfit first.")
      return
    }

    setIsAddingToOutfit(true)

    try {
      // Group items by category
      const updateData: UpdateOutfitDto = { items: {} }
      const categoryMap: Record<string, keyof NonNullable<UpdateOutfitDto["items"]>> = {
      "TOP": "top",
      "BOTTOM": "bottom",
      "OUTERWEAR": "outerwear",
      "FOOTWEAR": "footwear",
      "ACCESSORY": "accessories",
      "DRESS": "dress"
    }

      wardrobeItems.forEach((item) => {
        if (!item.category) return
        const slotKey = categoryMap[item.category]
        if (slotKey) {
          if (slotKey === "accessories") {
            if (!updateData.items!.accessories) {
              updateData.items!.accessories = []
            }
            updateData.items!.accessories.push(item.id!)
          } else {
            updateData.items![slotKey] = item.id!
          }
        }
      })

      const updatedOutfit = await outfitApi.update(targetOutfitId, updateData)

      // Update local state
      setAttachedOutfits((prev) =>
        prev.map((outfit) =>
          outfit.id === targetOutfitId ? buildOutfitAttachment(updatedOutfit) : outfit
        )
      )

      setSelectedItemsForAdd(new Set())
      toast.success(`Added ${wardrobeItems.length} item(s) to outfit`)
    } catch (error) {
      console.error("Failed to add items to outfit:", error)
      toast.error("Failed to add items to outfit")
    } finally {
      setIsAddingToOutfit(false)
    }
  }, [attachedOutfits, outfitApi, buildOutfitAttachment])

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemsForAdd((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

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
      <ScrollArea className="flex-1 min-h-0 w-full" ref={scrollAreaRef}>
        <div className="space-y-3 sm:space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 w-full">
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
            <div key={message.id} className={`flex gap-2 sm:gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 flex-shrink-0 hidden sm:flex">
                  <AvatarFallback className="gradient-ai text-white">AI</AvatarFallback>
                </Avatar>
              )}

              <div
                className={`flex w-full sm:max-w-[80%] md:max-w-[75%] flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border border-border/50"
                  }`}
                >
                  {message.role === "user" ? (
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  ) : (
                    <>
                      {message.content ? (
                        <>
                          <Markdown content={message.content} className="text-xs sm:text-sm" />
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1" />
                          )}
                        </>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Attached Images */}
                {message.images && message.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.images.map((imageUrl, index) => (
                      <div key={index} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-border/50">
                        <Image src={imageUrl} alt={`Attachment ${index + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {message.attachedOutfits && message.attachedOutfits.length > 0 && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {message.attachedOutfits.map((outfit) => {
                      const images = getOutfitAttachmentImages(outfit)
                      const swapIntent = message.swapIntents?.find((intent) => intent.outfitId === outfit.id)

                      return (
                        <div key={outfit.id} className="rounded-lg border border-border/50 bg-card p-2">
                          <div className="flex items-center gap-2">
                            <div className="grid h-12 w-12 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-md bg-muted p-1">
                              {[0, 1, 2, 3].map((index) => (
                                <div key={index} className="relative h-full w-full rounded-sm bg-background/60">
                                  {images[index] ? (
                                    <Image
                                      src={images[index] as string}
                                      alt="Outfit item"
                                      fill
                                      className="object-contain"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[8px] text-muted-foreground">
                                      --
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">{outfit.name}</p>
                              {swapIntent && (
                                <p className="text-[10px] text-muted-foreground">Swap {swapIntent.category.toLowerCase()}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Clothing Items Display */}
                {message.items && message.items.length > 0 && (() => {
                  // Filter out items without an id - don't display incomplete items
                  const validItems = message.items.filter(item => item.id)
                  if (validItems.length === 0) return null
                  const gridClass = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3"
                  
                  return (
                      <div className="w-full mt-2 sm:mt-3">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                        <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-foreground">
                          {validItems.length} item{validItems.length !== 1 ? "s" : ""}
                        </span>
                        {message.metadata?.sources && message.metadata.sources.length > 0 && (
                          <span className="text-[11px] sm:text-xs text-muted-foreground">
                            from {message.metadata.sources.join(", ")}
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] sm:text-xs"
                          onClick={() => handleCreateOutfitFromItems(validItems)}
                        >
                          Create Outfit
                        </Button>
                      </div>
                      <div className={gridClass}>
                        {validItems.map((item) => (
                          <div
                            key={item.id}
                            className="group flex flex-col gap-1 sm:gap-2 rounded-lg border border-border/50 bg-card/60 p-1.5 sm:p-2 hover:bg-accent/40 transition-colors relative"
                          >
                            {attachedOutfits.length > 0 && (
                              <input
                                type="checkbox"
                                checked={selectedItemsForAdd.has(item.id)}
                                onChange={() => toggleItemSelection(item.id)}
                                className="absolute top-2 left-2 z-10 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="flex flex-col items-center gap-1 sm:gap-2"
                            >
                              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                                {item.imageUrl ? (
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    className="object-contain"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[9px] sm:text-[10px] text-muted-foreground">
                                    No image
                                  </div>
                                )}
                              </div>
                              <span className="w-full truncate text-[9px] sm:text-[11px] text-foreground">
                                {item.name}
                              </span>
                            </button>
                            {attachedOutfits.length > 0 && item.source === "wardrobe" && item.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 w-full"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddToOutfit(item)
                                }}
                                disabled={isAddingToOutfit || addingItemIds.has(item.id)}
                              >
                                {addingItemIds.has(item.id) ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3 mr-1" />
                                )}
                                Add
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      {attachedOutfits.length > 0 && selectedItemsForAdd.size > 0 && (() => {
                        const selectedItems = validItems.filter((item) => selectedItemsForAdd.has(item.id))
                        return (
                          <div className="mt-3 flex justify-center">
                            <Button
                              size="sm"
                              onClick={() => handleBulkAddToOutfit(selectedItems)}
                              disabled={isAddingToOutfit}
                            >
                              {isAddingToOutfit ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4 mr-2" />
                              )}
                              Add {selectedItemsForAdd.size} item(s) to outfit
                            </Button>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()}
              </div>

              {message.role === "user" && (
                <Avatar className="h-8 w-8 flex-shrink-0 hidden sm:flex">
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">You</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Agent Progress Indicator - shows during loading/streaming when no message content yet */}
          {/* Show when: loading/streaming AND no visible streaming message exists yet */}
          {(isLoading || sessionState.isStreaming) && 
           !messages.some(msg => msg.isStreaming && msg.content && msg.content.trim().length > 0) &&
           (progress.currentNode || progress.completedNodes.length > 0 || !streamedText) && (
            <div className="flex gap-2 sm:gap-3 justify-start">
              <Avatar className="h-8 w-8 flex-shrink-0 hidden sm:flex">
                <AvatarFallback className="gradient-ai text-white">AI</AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full sm:max-w-[80%] md:max-w-[75%]">
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
      <div className="flex-shrink-0 border-t border-border bg-background p-2.5 sm:p-4 md:p-6">
        {/* Outfit Attachments */}
        <div className="mb-2 sm:mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setIsOutfitDialogOpen(true)}
                disabled={attachedOutfits.length >= 3}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Attach outfit
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {attachedOutfits.length}/3 attached
              </span>
            </div>
            {attachedOutfits.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  setAttachedOutfits([])
                  setSwapIntentsByOutfit({})
                }}
              >
                Clear outfits
              </Button>
            )}
          </div>

          {attachedOutfits.length > 0 && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {attachedOutfits.map((outfit) => {
                const images = getOutfitAttachmentImages(outfit)
                const swapIntent = swapIntentsByOutfit[outfit.id]

                return (
                  <div key={outfit.id} className="rounded-lg border border-border/50 bg-card p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="grid h-12 w-12 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-md bg-muted p-1">
                          {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="relative h-full w-full rounded-sm bg-background/60">
                              {images[index] ? (
                                <Image
                                  src={images[index] as string}
                                  alt="Outfit item"
                                  fill
                                  className="object-contain"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[8px] text-muted-foreground">
                                  --
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{outfit.name}</p>
                          <p className="text-[10px] text-muted-foreground">Attached outfit</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeOutfitAttachment(outfit.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(["TOP", "BOTTOM", "FOOTWEAR", "OUTERWEAR", "DRESS", "ACCESSORY"] as OutfitSwapIntent["category"][]).map((category) => (
                        <Button
                          key={category}
                          variant={swapIntent === category ? "default" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => toggleSwapIntent(outfit.id, category)}
                        >
                          Swap {category.toLowerCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Attached Images Preview */}
        {attachedImages.length > 0 && (
          <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
            {attachedImages.map((imageUrl, index) => (
              <div key={index} className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-border/50 group">
                <Image src={imageUrl} alt={`Preview ${index + 1}`} fill className="object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 sm:gap-1.5 md:gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask your stylist anything..."
              className="h-9 sm:h-10 md:h-12 bg-card pr-8 sm:pr-10 md:pr-12 text-xs sm:text-sm md:text-base text-foreground placeholder:text-muted-foreground"
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
            className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 border-border/50 bg-transparent flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || attachedImages.length >= 5}
            title="Attach images"
          >
            <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className={`h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 border-border/50 bg-transparent hidden sm:flex flex-shrink-0 ${
              isRecording ? "bg-red-500/20 border-red-500/50" : ""
            }`}
            onClick={toggleRecording}
            disabled={isLoading}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            <Mic className={`h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 ${isRecording ? "text-red-500 animate-pulse" : ""}`} />
          </Button>
          {isLoading ? (
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 border-border/50 flex-shrink-0"
              onClick={cancelRequest}
              title="Cancel request"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="gradient-ai h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white flex-shrink-0"
              onClick={handleSendMessage}
              disabled={!input.trim() && attachedImages.length === 0 && attachedOutfits.length === 0 && Object.values(swapIntentsByOutfit).every((value) => !value)}
            >
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isOutfitDialogOpen} onOpenChange={setIsOutfitDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Attach outfits</DialogTitle>
          </DialogHeader>
          {isLoadingOutfits ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : outfitOptions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No outfits available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {outfitOptions.map((outfit) => {
                const isAttached = attachedOutfits.some((entry) => entry.id === outfit._id)
                const attachment = buildOutfitAttachment(outfit)
                const images = getOutfitAttachmentImages(attachment)

                return (
                  <div key={outfit._id} className="rounded-lg border border-border/50 bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="grid h-14 w-14 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-md bg-muted p-1">
                          {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="relative h-full w-full rounded-sm bg-background/60">
                              {images[index] ? (
                                <Image
                                  src={images[index] as string}
                                  alt="Outfit item"
                                  fill
                                  className="object-contain"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[8px] text-muted-foreground">
                                  --
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{outfit.name}</p>
                          <p className="text-[11px] text-muted-foreground">{outfit.isFavorite ? "Favorite" : "Outfit"}</p>
                        </div>
                      </div>
                      <Button
                        variant={isAttached ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => handleToggleOutfitAttachment(outfit)}
                        disabled={!isAttached && attachedOutfits.length >= 3}
                      >
                        {isAttached ? "Remove" : "Attach"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {selectedItem.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                {selectedItem.imageUrl ? (
                  <Image
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                {selectedItem.brand && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Brand</span>
                    <span className="font-medium text-foreground">{selectedItem.brand}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium text-foreground">
                    {selectedItem.source === "wardrobe" ? "Your Wardrobe" : selectedItem.source === "commerce" ? "Shop" : "Web"}
                  </span>
                </div>
                {selectedItem.price && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium text-foreground">${selectedItem.price.toFixed(2)}</span>
                  </div>
                )}
                {selectedItem.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium text-foreground">{selectedItem.category}</span>
                  </div>
                )}
              </div>
              {selectedItem.productUrl && (
                <Button asChild className="w-full">
                  <a href={selectedItem.productUrl} target="_blank" rel="noopener noreferrer">
                    View item
                  </a>
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

// =============================================================================
// Clothing Item Card Component
// =============================================================================

interface ClothingItemCardProps {
  item: ClothingItem
  size?: "default" | "small" | "compact"
}

function ClothingItemCard({ item, size = "default" }: ClothingItemCardProps) {
  const sourceLabel = {
    wardrobe: "Your Wardrobe",
    commerce: "Shop",
    web: "Web",
  }[item.source] || item.source

  const imageSizeClass =
    size === "compact"
      ? "h-20"
      : size === "small"
        ? "h-24"
        : "h-32"
  const headerClass =
    size === "compact"
      ? "p-2"
      : size === "small"
        ? "p-2.5"
        : "p-3"
  const contentClass =
    size === "compact"
      ? "p-2 pt-0"
      : size === "small"
        ? "p-2.5 pt-0"
        : "p-3 pt-0"
  const titleClass = size === "compact" ? "text-[11px]" : size === "small" ? "text-xs" : "text-sm"
  const descClass = size === "compact" ? "text-[10px]" : size === "small" ? "text-[11px]" : "text-xs"
  const badgeClass = size === "compact" ? "text-[10px] px-1.5 py-0.5" : size === "small" ? "text-[11px] px-2 py-0.5" : "text-xs"
  const cardScaleClass = size === "compact" ? "scale-[0.92]" : size === "small" ? "scale-[0.96]" : ""
  const useOverlay = size !== "default" && !!item.imageUrl

  return (
    <Card className={`overflow-hidden border-border/50 bg-card hover:shadow-md transition-shadow ${cardScaleClass}`}>
      {item.imageUrl && (
        <div className={`relative w-full ${imageSizeClass} bg-muted p-1.5`}>
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-contain"
            onError={(e) => {
              // Hide image on error
              (e.target as HTMLImageElement).style.display = "none"
            }}
          />
          {useOverlay && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/70 to-transparent p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={`${titleClass} font-medium truncate`}>{item.name}</p>
                  {item.brand && (
                    <p className={`${descClass} text-muted-foreground truncate`}>{item.brand}</p>
                  )}
                </div>
                <Badge variant="secondary" className={`${badgeClass} flex-shrink-0`}>
                  {sourceLabel}
                </Badge>
              </div>
            </div>
          )}
        </div>
      )}
      {!useOverlay && (
        <>
          <CardHeader className={headerClass}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className={`${titleClass} font-medium truncate`}>{item.name}</CardTitle>
                {item.brand && (
                  <CardDescription className={`${descClass} truncate`}>{item.brand}</CardDescription>
                )}
              </div>
              <Badge variant="secondary" className={`${badgeClass} flex-shrink-0`}>
                {sourceLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className={contentClass}>
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
        </>
      )}
    </Card>
  )
}
