"use client"

import { useEffect, useRef, useState } from "react"
import { 
  Sparkles, 
  Camera, 
  Palette, 
  MessageSquare, 
  Users, 
  TrendingUp,
  Brain,
  Shirt,
  Target,
  Zap,
  Shield,
  BarChart3,
  Globe,
  ArrowRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Layers,
  Database,
  Lock,
  Activity,
  Radio,
  Calendar,
  Rocket,
  Eye,
  Leaf,
  ShoppingBag,
  Mail,
  Linkedin,
  Twitter,
  ArrowDown,
  Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

// Animation hook for scroll-triggered reveals
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

// Animated element wrapper with stagger support
function AnimatedElement({ 
  children, 
  delay = 0, 
  animation = "fade-in-up",
  className = ""
}: { 
  children: React.ReactNode
  delay?: number
  animation?: "fade-in-up" | "fade-in-left" | "fade-in-right" | "scale-in"
  className?: string
}) {
  const { ref, isInView } = useInView(0.1)
  
  return (
    <div 
      ref={ref}
      className={`${className} ${isInView ? `animate-${animation}` : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const { ref, isInView } = useInView()

  useEffect(() => {
    if (!isInView) return

    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [isInView, end, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

// Section wrapper with animation
function Section({ 
  children, 
  className = "", 
  id,
  dark = false 
}: { 
  children: React.ReactNode
  className?: string
  id?: string
  dark?: boolean
}) {
  const { ref, isInView } = useInView(0.05)

  return (
    <section
      id={id}
      ref={ref}
      className={`min-h-screen flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-all duration-700 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${dark ? "bg-card" : "bg-background"} ${className}`}
    >
      {children}
    </section>
  )
}

// ==================== HERO SECTION ====================
function HeroSection() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        {/* Additional floating orbs */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Aesthet<span className="text-gradient-ai">IQ</span>
            </h1>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
                <a href="#contact">Contact</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto text-center relative z-10 pt-16">
        <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Pitch Deck 2025
          </Badge>
        </div>

        <h1 className={`font-serif text-5xl sm:text-6xl lg:text-8xl font-bold mb-6 tracking-tight transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Aesthet<span className="text-gradient-ai">IQ</span>
        </h1>

        <p className={`text-2xl sm:text-3xl lg:text-4xl font-serif text-foreground mb-4 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          All-in-one AI Fashion Ecosystem
        </p>

        <p className={`text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Analyze your colors and features from a photo, get personalized outfits via chat, 
          and join a fashion-only social space to share fit-checks, ask advice, and evolve your style with the community.
        </p>

        <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Button size="lg" className="gradient-ai text-white px-8 py-6 text-lg hover-lift animate-pulse-glow" asChild>
            <a href="#problem">
              Explore the Vision
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>

        {/* Scroll indicator */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce transition-all duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <ChevronDown className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>
    </section>
  )
}

// ==================== PROBLEM SECTION ====================
function ProblemSection() {
  const problems = [
    {
      icon: Target,
      title: "Personalization is Hard",
      description: "Generic trend content ignores undertone, contrast, face shape, lifestyle, comfort zone, and goals.",
      color: "text-red-500"
    },
    {
      icon: Globe,
      title: "No Fashion-First Home Base",
      description: "Fit-checks, questions, and recommendations get buried on broad, noisy social platforms.",
      color: "text-orange-500"
    },
    {
      icon: Users,
      title: "Shift to Hobby Networks",
      description: "Users want smaller, interest-based spaces that feel authentic, supportive, and high-signal.",
      color: "text-yellow-500"
    }
  ]

  return (
    <Section id="problem" dark>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">The Problem</Badge>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Fashion Advice is <span className="text-gradient-ai">Fragmented</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Fashion advice and community are scattered across platforms that don't understand individual style.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <Card 
              key={index} 
              className="border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 group"
            >
              <CardContent className="p-8">
                <div className={`w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <problem.icon className={`w-8 h-8 ${problem.color}`} />
                </div>
                <h3 className="font-serif text-xl font-bold mb-3">{problem.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{problem.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Visual representation */}
        <div className="mt-16 flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-muted-foreground">
            <XCircle className="w-4 h-4 text-red-500" />
            <span>Instagram</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-muted-foreground">
            <XCircle className="w-4 h-4 text-red-500" />
            <span>TikTok</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-muted-foreground">
            <XCircle className="w-4 h-4 text-red-500" />
            <span>Pinterest</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-muted-foreground">
            <XCircle className="w-4 h-4 text-red-500" />
            <span>Reddit</span>
          </div>
          <ArrowRight className="w-6 h-6 text-muted-foreground mx-4" />
          <div className="flex items-center gap-2 px-6 py-3 gradient-ai rounded-full text-white font-semibold">
            <CheckCircle className="w-5 h-5" />
            <span>AesthetIQ</span>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ==================== SOLUTION SECTION ====================
function SolutionSection() {
  const solutions = [
    {
      icon: Brain,
      title: "AI Styling Consultant",
      subtitle: "Multimodal Understanding",
      description: "Photo + text understanding delivers tailored advice based on your unique features.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Users,
      title: "Fashion-Only Social Space",
      subtitle: "\"Strava for Style\"",
      description: "A dedicated community for fit-checks, feedback, and authentic fashion inspiration.",
      gradient: "from-pink-500 to-orange-500"
    },
    {
      icon: TrendingUp,
      title: "Feedback-Powered Loop",
      subtitle: "Continuous Improvement",
      description: "Personalization improves over time with user signals and evolving trends.",
      gradient: "from-orange-500 to-yellow-500"
    }
  ]

  return (
    <Section id="solution">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">The Solution</Badge>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            One <span className="text-gradient-ai">Connected</span> Ecosystem
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            AesthetIQ combines a personalized AI stylist and a dedicated fashion social platform into one connected ecosystem.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {solutions.map((solution, index) => (
            <Card 
              key={index}
              className="relative overflow-hidden border-border/50 bg-card hover:shadow-2xl transition-all duration-500 group"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${solution.gradient}`} />
              <CardContent className="p-8">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${solution.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <solution.icon className="w-8 h-8 text-white" />
                </div>
                <Badge variant="secondary" className="mb-3 text-xs">{solution.subtitle}</Badge>
                <h3 className="font-serif text-2xl font-bold mb-3">{solution.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{solution.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ecosystem flow diagram */}
        <div className="bg-card border border-border rounded-3xl p-8 sm:p-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full gradient-ai flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-white" />
              </div>
              <p className="font-semibold">Community Inspiration</p>
            </div>
            <ArrowRight className="w-8 h-8 text-primary hidden lg:block" />
            <ArrowDown className="w-8 h-8 text-primary lg:hidden" />
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full gradient-ai flex items-center justify-center mb-4">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <p className="font-semibold">Personalized Recommendations</p>
            </div>
            <ArrowRight className="w-8 h-8 text-primary hidden lg:block" />
            <ArrowDown className="w-8 h-8 text-primary lg:hidden" />
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full gradient-ai flex items-center justify-center mb-4">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <p className="font-semibold">Continuous Improvement</p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ==================== HOW IT WORKS SECTION ====================
function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: Camera,
      title: "Upload a Photo",
      description: "Analyze tone, contrast, and facial features with our AI",
      color: "from-violet-500 to-purple-500"
    },
    {
      number: "02",
      icon: Palette,
      title: "Get Your Palette",
      description: "Receive personalized colors and styling rules",
      color: "from-purple-500 to-pink-500"
    },
    {
      number: "03",
      icon: Target,
      title: "Profile Your Taste",
      description: "Share inspiration images or describe your style goals",
      color: "from-pink-500 to-rose-500"
    },
    {
      number: "04",
      icon: MessageSquare,
      title: "Chat for Outfits",
      description: "Get context-aware looks for work, casual, formal, travel",
      color: "from-rose-500 to-orange-500"
    },
    {
      number: "05",
      icon: Users,
      title: "Share & Learn Socially",
      description: "Post fit-checks, get feedback, and AI suggestions",
      color: "from-orange-500 to-amber-500"
    }
  ]

  return (
    <Section id="how-it-works" dark>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Five Steps to <span className="text-gradient-ai">Style Mastery</span>
          </h2>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-pink-500 to-amber-500 hidden lg:block" />

          <div className="space-y-8 lg:space-y-0">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-16 ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? "lg:text-right" : "lg:text-left"}`}>
                  <Card className="inline-block border-border/50 bg-background/80 backdrop-blur-sm hover:shadow-xl transition-all">
                    <CardContent className="p-6 sm:p-8">
                      <div className={`inline-flex items-center gap-4 mb-4 ${index % 2 === 0 ? "lg:flex-row-reverse" : ""}`}>
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                          <step.icon className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-4xl font-bold text-muted-foreground/30">{step.number}</span>
                      </div>
                      <h3 className="font-serif text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Center dot */}
                <div className="relative z-10 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent border-4 border-background shadow-lg hidden lg:block" />

                <div className="flex-1 hidden lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}

// ==================== PRODUCT DEMO SECTION ====================
function ProductDemoSection() {
  const features = [
    {
      title: "Color Analysis",
      description: "AI-powered facial feature extraction determines your seasonal palette",
      image: "/placeholder.svg?text=Color+Analysis",
      badge: "Core Feature"
    },
    {
      title: "AI Stylist Chat",
      description: "Conversational interface for personalized fashion advice",
      image: "/placeholder.svg?text=AI+Chat",
      badge: "Live"
    },
    {
      title: "Style DNA",
      description: "Comprehensive profile with undertone, contrast, and preferences",
      image: "/placeholder.svg?text=Style+DNA",
      badge: "Dashboard"
    }
  ]

  return (
    <Section id="product">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Product</Badge>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            See It In <span className="text-gradient-ai">Action</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the core features that power the AesthetIQ ecosystem.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="overflow-hidden border-border/50 bg-card group hover:shadow-2xl transition-all duration-500"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl gradient-ai flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                </div>
                <Badge className="absolute top-4 left-4 gradient-ai text-white">{feature.badge}</Badge>
              </div>
              <CardContent className="p-6">
                <h3 className="font-serif text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mock UI showcase */}
        <div className="mt-16 bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
          <div className="border-b border-border p-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-4 text-sm text-muted-foreground">AesthetIQ Dashboard</span>
          </div>
          <div className="p-8 bg-gradient-to-br from-background to-muted/20">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Style DNA Panel */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Palette className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Your Style DNA</h4>
                    <p className="text-sm text-muted-foreground">Warm Autumn • Oval Face</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Best Colors</p>
                    <div className="flex gap-2">
                      {["#8B4513", "#CD853F", "#A0522D", "#D2691E", "#B22222", "#800000"].map((color, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Contrast</p>
                      <p className="font-semibold">High</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Undertone</p>
                      <p className="font-semibold">Warm</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Preview */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full gradient-ai flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">AI Stylist</h4>
                    <p className="text-sm text-muted-foreground">Online</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2 max-w-xs">
                      <p className="text-sm">What should I wear to a summer wedding in Italy?</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2 max-w-xs">
                      <p className="text-sm">Based on your warm autumn palette, I recommend a terracotta silk dress...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ==================== KEY FEATURES SECTION ====================
function KeyFeaturesSection() {
  const features = [
    {
      icon: Palette,
      title: "Personal Color & Tone Analysis",
      description: "Skin, hair, eye, and contrast analysis creates your foundation palette"
    },
    {
      icon: Target,
      title: "Style & Preference Profiling",
      description: "Learn from outfit examples and text descriptions"
    },
    {
      icon: MessageSquare,
      title: "Conversational Fashion Assistant",
      description: "Chat-first experience for natural style guidance"
    },
    {
      icon: Calendar,
      title: "Occasion & Context-Aware Mode",
      description: "Daily, mood-based, and event-based recommendations"
    },
    {
      icon: Brain,
      title: "Adaptive Learning System",
      description: "Learns comfort zones, seasons, and evolving taste"
    },
    {
      icon: Shirt,
      title: "Virtual Wardrobe",
      description: "Smart closet integration with missing basics detection"
    }
  ]

  return (
    <Section id="features" dark>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Key Features</Badge>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Comprehensive <span className="text-gradient-ai">Fashion Intelligence</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="border-border/50 bg-background/80 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg transition-all group"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ==================== MARKET OPPORTUNITY SECTION ====================
function MarketSection() {
  const stats = [
    { value: 1.7, suffix: "T", label: "Global Apparel Market", subtext: "2024 Market Size", prefix: "$" },
    { value: 4.4, suffix: "B", label: "AI in Fashion", subtext: "Expected by 2028", prefix: "$" },
    { value: 28, suffix: "%", label: "CAGR Growth", subtext: "AI Styling Market", prefix: "" },
    { value: 71, suffix: "%", label: "Consumers", subtext: "Want Personalization", prefix: "" }
  ]

  const segments = [
    { name: "Fashion-conscious Millennials (25-40)", percentage: 35 },
    { name: "Gen Z Style Explorers (18-24)", percentage: 30 },
    { name: "Professional Women (25-45)", percentage: 20 },
    { name: "Style Enthusiasts & Influencers", percentage: 15 }
  ]

  const competitors = [
    { name: "Stitch Fix", type: "Subscription Styling", weakness: "No social, limited AI chat" },
    { name: "Pinterest", type: "Visual Discovery", weakness: "No personalization, not fashion-only" },
    { name: "Instagram", type: "Social Feed", weakness: "Generic, no style analysis" },
    { name: "Color Me Beautiful", type: "Color Analysis", weakness: "Manual process, no AI" }
  ]

  return (
    <Section id="market">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Market Opportunity</Badge>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            A <span className="text-gradient-ai">Massive</span> Opportunity
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The intersection of AI, fashion personalization, and social commerce is experiencing unprecedented growth.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card key={index} className="border-border/50 bg-card text-center hover-lift">
              <CardContent className="p-6">
                <p className="text-4xl sm:text-5xl font-bold text-gradient-ai mb-2">
                  {stat.prefix}<AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="font-semibold mb-1">{stat.label}</p>
                <p className="text-sm text-muted-foreground">{stat.subtext}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Three Column Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Target Segments */}
          <Card className="border-border/50 bg-card">
            <CardContent className="p-8">
              <h3 className="font-serif text-xl font-bold mb-6">Target Segments</h3>
              <div className="space-y-4">
                {segments.map((segment, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{segment.name}</span>
                      <span className="text-sm text-muted-foreground">{segment.percentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full gradient-ai rounded-full transition-all duration-1000"
                        style={{ width: `${segment.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Why Now */}
          <Card className="border-border/50 bg-card">
            <CardContent className="p-8">
              <h3 className="font-serif text-xl font-bold mb-6">Why Now?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">AI at consumer quality</p>
                    <p className="text-xs text-muted-foreground">Vision + LLMs understand fashion</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Platform fatigue</p>
                    <p className="text-xs text-muted-foreground">Users want niche communities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Social commerce boom</p>
                    <p className="text-xs text-muted-foreground">$1.2T by 2025</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Personalization demand</p>
                    <p className="text-xs text-muted-foreground">71% expect tailored experiences</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competitive Landscape */}
          <Card className="border-border/50 bg-card">
            <CardContent className="p-8">
              <h3 className="font-serif text-xl font-bold mb-6">Competitive Gap</h3>
              <div className="space-y-3">
                {competitors.map((comp, index) => (
                  <div key={index} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{comp.name}</span>
                      <Badge variant="outline" className="text-xs">{comp.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{comp.weakness}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 gradient-ai rounded-lg">
                <p className="text-white text-sm font-medium text-center">AesthetIQ: AI + Social + Personalization</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Section>
  )
}

// ==================== BUSINESS MODEL SECTION ====================
function BusinessModelSection() {
  const freeFeatures = [
    "Basic Color Analysis",
    "Virtual Wardrobe (50 items)",
    "5 AI Recommendations/month",
    "Community Access"
  ]

  const proFeatures = [
    "Advanced AI Analysis",
    "Unlimited Wardrobe",
    "Unlimited AI Stylist",
    "Trend Forecasting",
    "Priority Support",
    "Exclusive Content"
  ]

  const revenue = [
    { source: "Pro Subscriptions", percentage: 60, icon: Users },
    { source: "Shopping Affiliate", percentage: 25, icon: ShoppingBag },
    { source: "Premium Features", percentage: 15, icon: Sparkles }
  ]

  return (
    <Section id="business-model" dark>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Business Model</Badge>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Freemium + <span className="text-gradient-ai">Commerce</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {/* Free Tier */}
          <Card className="border-border/50 bg-background/80">
            <CardContent className="p-8">
              <Badge variant="secondary" className="mb-4">Free</Badge>
              <p className="text-4xl font-bold mb-2">$0</p>
              <p className="text-muted-foreground mb-6">Forever free</p>
              <div className="space-y-3">
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className="border-primary/50 bg-background/80 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 gradient-ai" />
            <CardContent className="p-8">
              <Badge className="mb-4 gradient-ai text-white">Pro</Badge>
              <p className="text-4xl font-bold mb-2">$9.99</p>
              <p className="text-muted-foreground mb-6">per month</p>
              <div className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Mix */}
          <Card className="border-border/50 bg-background/80">
            <CardContent className="p-8">
              <h3 className="font-serif text-xl font-bold mb-6">Revenue Mix</h3>
              <div className="space-y-6">
                {revenue.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{item.source}</span>
                      </div>
                      <span className="text-sm font-bold">{item.percentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full gradient-ai rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Section>
  )
}

// ==================== TECHNOLOGY SECTION ====================
function TechnologySection() {
  const techStack = [
    { name: "LangGraph", description: "Orchestration", icon: Layers },
    { name: "MCP Servers", description: "Tool Protocol", icon: Database },
    { name: "Guardrails", description: "Safety Layer", icon: Shield },
    { name: "Langfuse", description: "Observability", icon: Activity },
    { name: "SSE Streaming", description: "Real-time", icon: Radio }
  ]

  const mcpServers = [
    "Wardrobe Server",
    "Commerce Server", 
    "Web Search Server",
    "User Data Server",
    "Style DNA Server"
  ]

  return (
    <Section id="technology">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Technology</Badge>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Multi-Agent <span className="text-gradient-ai">Architecture</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for scalable fashion reasoning with state-of-the-art AI infrastructure.
          </p>
        </div>

        {/* Tech Stack Grid */}
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-16">
          {techStack.map((tech, index) => (
            <Card key={index} className="border-border/50 bg-card text-center hover:border-primary/50 transition-all">
              <CardContent className="p-6">
                <tech.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="font-semibold text-sm">{tech.name}</p>
                <p className="text-xs text-muted-foreground">{tech.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Architecture Diagram */}
        <Card className="border-border/50 bg-card overflow-hidden">
          <CardContent className="p-8 sm:p-12">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Gateway Layer */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  Gateway Layer
                </h3>
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium">FastAPI Gateway</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Authentication & Rate Limiting</li>
                    <li>• Request Routing</li>
                    <li>• SSE Stream Proxy</li>
                  </ul>
                </div>
              </div>

              {/* Agent Layer */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  Agent Layer
                </h3>
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium">LangGraph Workflow</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Intent Classifier</li>
                    <li>• Conversation Agent</li>
                    <li>• Clothing Recommender</li>
                    <li>• Clothing Analyzer</li>
                  </ul>
                </div>
              </div>

              {/* MCP Layer */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  MCP Server Layer
                </h3>
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium">Tool Servers</p>
                  <div className="flex flex-wrap gap-1">
                    {mcpServers.map((server, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {server}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Flow arrows */}
            <div className="mt-8 pt-8 border-t border-border">
              <div className="flex items-center justify-center gap-4 flex-wrap text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Input Guardrails
                </span>
                <ArrowRight className="w-4 h-4" />
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  LLM Processing
                </span>
                <ArrowRight className="w-4 h-4" />
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Output Guardrails
                </span>
                <ArrowRight className="w-4 h-4" />
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Langfuse Tracing
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}

// ==================== ROADMAP SECTION ====================
function RoadmapSection() {
  const phases = [
    {
      phase: "Now",
      title: "Foundation",
      status: "active",
      items: [
        "Color Analysis",
        "AI Stylist Chat",
        "Virtual Wardrobe",
        "Style DNA Profile"
      ]
    },
    {
      phase: "Q2 2025",
      title: "Enhancement",
      status: "upcoming",
      items: [
        "Face Shape Mapping",
        "Trend Intelligence",
        "Social Feed MVP",
        "Brand Partnerships"
      ]
    },
    {
      phase: "Q4 2025",
      title: "Expansion",
      status: "future",
      items: [
        "AR Virtual Try-On",
        "Shopping Integration",
        "Sustainable Fashion",
        "Mobile App"
      ]
    }
  ]

  return (
    <Section id="roadmap" dark>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Roadmap</Badge>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Building the <span className="text-gradient-ai">Future</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {phases.map((phase, index) => (
            <Card 
              key={index}
              className={`border-border/50 bg-background/80 relative overflow-hidden ${
                phase.status === "active" ? "border-primary/50" : ""
              }`}
            >
              {phase.status === "active" && (
                <div className="absolute top-0 left-0 right-0 h-1 gradient-ai" />
              )}
              <CardContent className="p-8">
                <Badge 
                  variant={phase.status === "active" ? "default" : "secondary"}
                  className={phase.status === "active" ? "gradient-ai text-white mb-4" : "mb-4"}
                >
                  {phase.phase}
                </Badge>
                <h3 className="font-serif text-2xl font-bold mb-4">{phase.title}</h3>
                <div className="space-y-3">
                  {phase.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {phase.status === "active" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : phase.status === "upcoming" ? (
                        <Rocket className="w-4 h-4 text-primary" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Future Features */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-6">Future explorations</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["AR Try-On", "Voice Interface", "Sustainable Scoring", "Material Preferences", "Shopping Partners"].map((feature) => (
              <Badge key={feature} variant="outline" className="px-4 py-2">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}

// ==================== VISION SECTION ====================
function VisionSection() {
  const pillars = [
    {
      icon: Sparkles,
      title: "Your Personal Stylist",
      description: "AI that truly understands your unique features and preferences"
    },
    {
      icon: Users,
      title: "Your Fashion Circle",
      description: "A dedicated community of style enthusiasts who get it"
    },
    {
      icon: TrendingUp,
      title: "Your Style Engine",
      description: "An evolving identity system that grows with you"
    }
  ]

  return (
    <Section id="vision">
      <div className="container mx-auto max-w-6xl text-center">
        <Badge variant="outline" className="mb-4">Vision</Badge>
        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mb-8">
          The <span className="text-gradient-ai">Daily Destination</span><br />
          for Fashion
        </h2>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {pillars.map((pillar, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 rounded-3xl gradient-ai flex items-center justify-center mx-auto mb-6 shadow-lg">
                <pillar.icon className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">{pillar.title}</h3>
              <p className="text-muted-foreground">{pillar.description}</p>
            </div>
          ))}
        </div>

        {/* Quote */}
        <Card className="border-border/50 bg-card max-w-3xl mx-auto">
          <CardContent className="p-8 sm:p-12">
            <p className="text-xl sm:text-2xl font-serif italic text-muted-foreground mb-6">
              "Not just an outfit generator. Not just a social feed.<br />
              A <span className="text-foreground font-semibold">connected AI ecosystem</span> where community, personalization, and trends converge."
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-px h-8 bg-border" />
              <p className="font-semibold">The AesthetIQ Promise</p>
              <div className="w-px h-8 bg-border" />
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}

// ==================== CONTACT SECTION ====================
function ContactSection() {
  return (
    <Section id="contact" dark>
      <div className="container mx-auto max-w-4xl text-center">
        <Badge variant="outline" className="mb-4">Get In Touch</Badge>
        <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
          Let's Build the Future of<br />
          <span className="text-gradient-ai">Fashion Together</span>
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Interested in partnering, investing, or learning more about AesthetIQ?
          We'd love to hear from you.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button size="lg" className="gradient-ai text-white px-8">
            <Mail className="mr-2 h-5 w-5" />
            Contact Us
          </Button>
          <Button size="lg" variant="outline" className="px-8">
            <Calendar className="mr-2 h-5 w-5" />
            Schedule a Demo
          </Button>
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-4 mb-12">
          <Button variant="outline" size="icon" className="rounded-full">
            <Twitter className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <Linkedin className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <Mail className="h-5 w-5" />
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-border">
          <p className="font-serif text-2xl font-bold mb-2">
            Aesthet<span className="text-gradient-ai">IQ</span>
          </p>
          <p className="text-sm text-muted-foreground">
            AI Fashion Ecosystem: personalization × community × adaptive learning
          </p>
        </div>
      </div>
    </Section>
  )
}

// ==================== MAIN PAGE ====================
export default function PitchDeckPage() {
  // Add smooth scroll behavior
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
    }
  }, [])

  return (
    <main className="bg-background scroll-smooth">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <ProductDemoSection />
      <KeyFeaturesSection />
      <MarketSection />
      <BusinessModelSection />
      <TechnologySection />
      <RoadmapSection />
      <VisionSection />
      <ContactSection />
    </main>
  )
}
