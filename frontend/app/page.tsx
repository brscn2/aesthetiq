"use client"

import { useUser, SignUpButton, SignInButton } from "@clerk/nextjs"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Sparkles, 
  Palette, 
  Shirt, 
  TrendingUp, 
  CheckCircle, 
  ArrowRight,
  Star,
  Users,
  User
} from "lucide-react"
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICE } from "@/lib/membership-features"

export default function HomePage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard")
    }
  }, [isSignedIn, isLoaded, router])

  if (!isLoaded) return <div className="min-h-screen bg-background" />
  if (isSignedIn) return <div className="min-h-screen bg-background" />

  return (
    // Luxury fashion editorial design matching dashboard aesthetic
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      
      {/* Subtle luxury texture overlay */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none z-[1] mix-blend-overlay" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>

      {/* Luxury Navigation - Dashboard Style */}
      <nav className="fixed top-0 left-0 right-0 border-b border-border bg-background/95 backdrop-blur-xl z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Aesthet<span className="text-gradient-ai">IQ</span>
            </h1>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <SignInButton mode="modal">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all duration-300">Get Started</Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Luxury Hero Section - Dashboard Style */}
      <section className="relative py-24 lg:py-32 z-10 pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-7xl mx-auto">
            {/* Dashboard-Style Split Layout */}
            <div className="grid lg:grid-cols-12 gap-8 h-[600px]">
              
              {/* Left Panel - Identity Context (Dashboard Style) */}
              <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-8 shadow-xl">
                <div className="space-y-6 h-full flex flex-col">
                  <div>
                    <Badge variant="secondary" className="bg-muted/50 text-muted-foreground border-border/50 mb-4">
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI-Powered Fashion Intelligence
                    </Badge>
                    
                    <h1 className="font-serif text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-4">
                      Your Style{" "}
                      <span className="text-gradient-ai">DNA</span>
                    </h1>
                    
                    <p className="text-muted-foreground leading-relaxed">
                      Discover your perfect style with AI-powered analysis and personalized recommendations.
                    </p>
                  </div>
                  
                  {/* Style DNA Preview */}
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Your Analysis</h3>
                        <p className="text-sm text-muted-foreground">Autumn Palette • Oval Face Shape</p>
                      </div>
                    </div>
                    
                    {/* Color Palette Display */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Best Colors</p>
                      <div className="flex gap-2">
                        {['#8B4513', '#CD853F', '#A0522D', '#D2691E', '#B22222', '#800000'].map((color, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-border shadow-sm" style={{backgroundColor: color}} />
                        ))}
                      </div>
                    </div>
                    
                    {/* Style Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <p className="text-xs text-muted-foreground">Contrast Level</p>
                        <p className="font-semibold text-foreground">High</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <p className="text-xs text-muted-foreground">Undertone</p>
                        <p className="font-semibold text-foreground">Warm</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Conversational Stylist (Dashboard Style) */}
              <div className="lg:col-span-7 bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                <div className="h-full flex flex-col">
                  {/* Chat Header */}
                  <div className="border-b border-border p-6">
                    <h2 className="font-serif text-2xl font-bold text-foreground">
                      Your AI Fashion{" "}
                      <span className="text-gradient-ai">Stylist</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get personalized style advice powered by advanced AI
                    </p>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 max-w-xs">
                        <p className="text-sm">I have a summer wedding in Italy. What should I wear based on my palette?</p>
                      </div>
                    </div>
                    
                    {/* AI Response */}
                    <div className="flex justify-start">
                      <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-3 max-w-md">
                        <p className="text-sm text-foreground mb-3">
                          Perfect! For an Italian summer wedding with your warm autumn palette, I recommend:
                        </p>
                        <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">SUGGESTED OUTFIT</p>
                          <p className="text-sm font-semibold text-foreground">Terracotta Silk Dress</p>
                          <p className="text-xs text-muted-foreground">Matches your warm undertones perfectly</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Context Chips */}
                  <div className="px-6 py-3 border-t border-border">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['Business Casual', 'Date Night', 'Travel', 'Eco-Friendly'].map((context) => (
                        <Badge key={context} variant="secondary" className="text-xs cursor-pointer hover:bg-muted">
                          {context}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Input Area */}
                    <div className="flex gap-2">
                      <div className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2">
                        <p className="text-sm text-muted-foreground">Ask your AI stylist anything...</p>
                      </div>
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* CTA Section */}
            <div className="mt-12 text-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <SignUpButton mode="modal">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 shadow-lg transition-all duration-300">
                    Start Your Style Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignUpButton>
                <div className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Free to start • No credit card required
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard-Style Features Section */}
      <section className="relative py-24 z-10 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Comprehensive Fashion{" "}
                <span className="text-gradient-ai">Intelligence</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need for a complete style transformation, powered by advanced AI
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Dashboard-Style Feature Cards */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Palette className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-foreground">My Color Analysis</h3>
                      <p className="text-xs text-muted-foreground">AI-powered palette discovery</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Advanced AI analyzes your unique features to discover your perfect color palette, 
                    ensuring every outfit enhances your natural beauty.
                  </p>
                  <div className="flex gap-1">
                    {['#8B4513', '#CD853F', '#A0522D'].map((color, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-border" style={{backgroundColor: color}} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2 self-center">+12 more</span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Shirt className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-foreground">Virtual Wardrobe</h3>
                      <p className="text-xs text-muted-foreground">Smart closet organization</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Digitize your entire wardrobe with AI background removal, automatic categorization, 
                    and intelligent outfit suggestions for any occasion.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-4 h-4 bg-muted rounded border border-border"></div>
                    <span>Auto-categorized</span>
                    <div className="w-4 h-4 bg-muted rounded border border-border"></div>
                    <span>AI-enhanced</span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-foreground">Style Profile</h3>
                      <p className="text-xs text-muted-foreground">Personalized recommendations</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Build your comprehensive style profile with AI-powered trend analysis, 
                    personalized recommendations, and fashion forecasting.
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Trending</Badge>
                    <Badge variant="secondary" className="text-xs">Personalized</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard-Style Social Proof Section */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
              <div className="text-center mb-8">
                <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  Trusted by Fashion{" "}
                  <span className="text-gradient-ai">Professionals</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join thousands who've transformed their style with professional-grade AI fashion intelligence
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-2xl font-bold text-foreground">4.9/5</p>
                  <p className="text-sm text-muted-foreground">User Rating</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">10,000+</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">1M+</p>
                  <p className="text-sm text-muted-foreground">AI Analyses</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm border-t border-border pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">Free to Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">No Credit Card Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">Professional Grade AI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard-Style Pricing Section */}
      <section className="py-24 relative z-10 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Professional Fashion{" "}
                <span className="text-gradient-ai">Membership</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Choose the plan that fits your style journey
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Free Plan - Dashboard Style */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:border-border/60 transition-all duration-300">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-serif text-xl font-bold text-foreground">Free</h3>
                      <Badge variant="secondary">Starter</Badge>
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-1">$0</div>
                    <p className="text-sm text-muted-foreground">Perfect to explore your style</p>
                  </div>
                  
                  <div className="space-y-3">
                    {FREE_FEATURES.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{feature.title}</p>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <SignUpButton mode="modal">
                    <Button className="w-full" variant="outline">
                      Get Started Free
                    </Button>
                  </SignUpButton>
                </div>
              </div>

              {/* Pro Plan - Dashboard Style */}
              <div className="bg-card border border-primary/30 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] hover:border-primary/50 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Most Popular
                </div>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-serif text-xl font-bold text-foreground">Pro</h3>
                    </div>
                    <div className="text-3xl font-bold text-gradient-ai mb-1">{PRO_PRICE}</div>
                    <p className="text-sm text-muted-foreground">per month • Complete style transformation</p>
                  </div>
                  
                  <div className="space-y-3">
                    {PRO_FEATURES.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{feature.title}</p>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <SignUpButton mode="modal">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Start Pro Trial
                    </Button>
                  </SignUpButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard-Style CTA Section */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-12 shadow-2xl text-center">
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
                    Start Your Style{" "}
                    <span className="text-gradient-ai">Transformation</span>
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Join thousands of fashion professionals and enthusiasts who trust AesthetIQ 
                    for their complete style intelligence platform
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <SignUpButton mode="modal">
                    <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 shadow-lg transition-all duration-300">
                      Access Your Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </SignUpButton>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Free account • Professional tools • No commitment
                  </div>
                </div>
                
                <div className="pt-6 border-t border-border">
                  <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground">
                    <span>✓ Instant setup</span>
                    <span>✓ Professional grade</span>
                    <span>✓ Secure & private</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard-Style Footer */}
      <footer className="border-t border-border bg-muted/20 py-12 relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground mb-4">
              Aesthet<span className="text-gradient-ai">IQ</span>
            </h1>
            <p className="text-muted-foreground text-sm mb-4">
              Professional AI Fashion Intelligence Platform
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span>© 2024 AesthetIQ</span>
              <span>•</span>
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}