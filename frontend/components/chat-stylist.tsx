"use client"

import { useState } from "react"
import Image from "next/image"
import { Send, Mic, ImageIcon, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const contextChips = ["Business Casual", "Date Night", "Travel", "Eco-Friendly"]

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
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
  const [messages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")

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
      <ScrollArea className="flex-1 min-h-0">
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
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-border bg-background p-3 sm:p-6">
        <div className="flex gap-1.5 sm:gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your stylist anything..."
              className="h-10 sm:h-12 bg-card pr-10 sm:pr-12 text-sm sm:text-base text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button size="icon" variant="outline" className="h-10 w-10 sm:h-12 sm:w-12 border-border/50 bg-transparent">
            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button size="icon" variant="outline" className="h-10 w-10 sm:h-12 sm:w-12 border-border/50 bg-transparent hidden sm:flex">
            <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button size="icon" className="gradient-ai h-10 w-10 sm:h-12 sm:w-12 text-white">
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
