"use client"

import { useUser, SignUpButton, SignInButton } from "@clerk/nextjs"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  Palette, 
  Shirt, 
  TrendingUp, 
  CheckCircle, 
  ArrowRight,
  Star,
  Users,
  Zap
} from "lucide-react"

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
    // CHANGE: Hier nutzen wir deine CSS-Klasse 'landing-gradient-bg' für die ganze Seite
    // Dadurch läuft der Hintergrund nahtlos durch alle Sections durch.
    <div className="relative min-h-screen landing-gradient-bg overflow-x-hidden">
      
      {/* Globaler Grain/Noise Effekt für mehr Textur (optional, sieht aber hochwertiger aus) */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-[1] mix-blend-overlay" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 border-b border-white/20 bg-white/20 dark:bg-black/20 backdrop-blur-xl z-50 shadow-lg shadow-black/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-purple-500 to-rose-500 rounded-xl p-2 shadow-lg shadow-purple-500/25">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="font-playfair text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-600 bg-clip-text text-transparent">
                AesthetIQ
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <SignInButton mode="modal">
                <Button variant="ghost" className="hover:bg-purple-500/10 transition-all duration-300">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600 shadow-lg shadow-purple-500/25 transition-all duration-500">Get Started</Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 z-10 pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 bg-white/50 dark:bg-black/30 backdrop-blur-md border-purple-200/50 text-purple-700 shadow-sm">
              <Zap className="w-4 h-4 mr-2" />
              AI-Powered Fashion Intelligence
            </Badge>
            
            <h1 className="font-playfair text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight drop-shadow-sm">
              Your Personal{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                  AI Fashion
                </span>
                {/* Soft Glow hinter dem Text */}
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-rose-500/20 blur-xl -z-10 rounded-full"></div>
              </span>{" "}
              Advisory
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover your perfect style with AI-powered color analysis, personalized recommendations, 
              and a smart virtual wardrobe that learns your preferences.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <SignUpButton mode="modal">
                <Button size="lg" className="group bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600 text-white px-8 shadow-xl shadow-purple-500/20 hover:scale-105 transition-all duration-300">
                  Start Your Style Journey
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </SignUpButton>
              <div className="flex items-center text-sm text-muted-foreground bg-white/40 dark:bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Free to start • No credit card required
              </div>
            </div>

            {/* Preview Cards - JETZT MIT DEN COOLEN ANIMATIONEN! */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              {/* Color Analysis Card */}
              <div className="group bg-gradient-to-br from-purple-100/60 via-background/40 to-purple-50/30 backdrop-blur-xl border border-purple-200/50 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-purple-200/80 hover:via-purple-100/60 hover:to-purple-50/40 dark:hover:bg-purple-950/20 transition-all duration-500 hover:scale-105 hover:-translate-y-2 shadow-xl hover:shadow-purple-500/30">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-purple-700 transition-colors duration-500">Color Analysis</h3>
                <p className="text-sm text-muted-foreground">AI-powered color matching</p>
              </div>

              {/* Virtual Wardrobe Card */}
              <div className="group bg-gradient-to-br from-rose-100/60 via-background/40 to-rose-50/30 backdrop-blur-xl border border-rose-200/50 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-rose-200/80 hover:via-rose-100/60 hover:to-rose-50/40 dark:hover:bg-rose-950/20 transition-all duration-500 hover:scale-105 hover:-translate-y-2 shadow-xl hover:shadow-rose-500/30">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                  <Shirt className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-rose-700 transition-colors duration-500">Virtual Wardrobe</h3>
                <p className="text-sm text-muted-foreground">Smart outfit suggestions</p>
              </div>

              {/* Trend Insights Card */}
              <div className="group bg-gradient-to-br from-amber-100/60 via-background/40 to-amber-50/30 backdrop-blur-xl border border-amber-200/50 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-amber-200/80 hover:via-amber-100/60 hover:to-amber-50/40 dark:hover:bg-amber-950/20 transition-all duration-500 hover:scale-105 hover:-translate-y-2 shadow-xl hover:shadow-amber-500/30">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-amber-700 transition-colors duration-500">Trend Insights</h3>
                <p className="text-sm text-muted-foreground">Stay ahead of fashion</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      {/* CHANGE: Keine background-color hier! Nur relative positionierung. */}
      <section className="relative py-24 z-10">
        {/* Soft Radial Background Spot - ersetzt den harten Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full bg-radial-gradient from-purple-500/5 to-transparent blur-3xl -z-10 pointer-events-none"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-playfair text-3xl lg:text-5xl font-bold text-foreground mb-4">
              Powered by{" "}
              <span className="bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                Advanced AI
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the future of fashion with our cutting-edge AI technology
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature Cards mit besserer Abgrenzung */}
            <div className="group border border-white/30 bg-white/40 dark:bg-black/30 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 hover:-translate-y-2 hover:bg-white/60 dark:hover:bg-black/40">
              <div className="p-8 text-center">
                <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-all duration-500">
                  <Palette className="w-10 h-10 text-purple-600 group-hover:text-purple-700 transition-colors duration-500" />
                </div>
                <h3 className="font-playfair text-xl font-semibold mb-4 group-hover:text-purple-600 transition-colors duration-500">AI Color Analysis</h3>
                <p className="text-muted-foreground leading-relaxed group-hover:text-muted-foreground/80">
                  Discover your perfect color palette with advanced AI that analyzes your skin tone.
                </p>
              </div>
            </div>

            <div className="group border border-white/30 bg-white/40 dark:bg-black/30 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-rose-500/20 transition-all duration-500 hover:-translate-y-2 hover:bg-white/60 dark:hover:bg-black/40">
              <div className="p-8 text-center">
                <div className="bg-rose-100 dark:bg-rose-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-rose-200 dark:group-hover:bg-rose-800/50 transition-all duration-500">
                  <Shirt className="w-10 h-10 text-rose-600 group-hover:text-rose-700 transition-colors duration-500" />
                </div>
                <h3 className="font-playfair text-xl font-semibold mb-4 group-hover:text-rose-600 transition-colors duration-500">Smart Wardrobe</h3>
                <p className="text-muted-foreground leading-relaxed group-hover:text-muted-foreground/80">
                  Organize your clothes digitally with AI-powered background removal.
                </p>
              </div>
            </div>

            <div className="group border border-white/30 bg-white/40 dark:bg-black/30 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 hover:-translate-y-2 hover:bg-white/60 dark:hover:bg-black/40">
              <div className="p-8 text-center">
                <div className="bg-amber-100 dark:bg-amber-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50 transition-all duration-500">
                  <TrendingUp className="w-10 h-10 text-amber-600 group-hover:text-amber-700 transition-colors duration-500" />
                </div>
                <h3 className="font-playfair text-xl font-semibold mb-4 group-hover:text-amber-600 transition-colors duration-500">Trend Forecasting</h3>
                <p className="text-muted-foreground leading-relaxed group-hover:text-muted-foreground/80">
                  Stay ahead of fashion trends with AI-powered insights customized for you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-cyan-500/5 blur-3xl -z-10"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center bg-white/20 dark:bg-black/20 backdrop-blur-lg rounded-[2rem] py-16 border border-white/10 shadow-xl">
            {/* Titel jetzt INNERHALB der Box */}
            <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Loved by{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                Fashion Enthusiasts
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Join thousands of users who have transformed their style with AesthetIQ's AI-powered fashion intelligence
            </p>

            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400 drop-shadow-sm" />
                ))}
              </div>
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-600 border border-yellow-400/20">
                5-Star Rated
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-white/5 rounded-full backdrop-blur-sm">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="font-semibold">10,000+ Users</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-white/5 rounded-full backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-rose-600" />
                <span className="font-semibold">AI-Powered</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-white/5 rounded-full backdrop-blur-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-semibold">Free to Start</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 relative z-10">
         {/* Soft Radial Background für Pricing */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-radial-gradient from-indigo-500/5 via-purple-500/5 to-transparent blur-3xl -z-10 pointer-events-none"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-playfair text-3xl lg:text-5xl font-bold text-foreground mb-4">
              Simple, Transparent{" "}
              <span className="bg-gradient-to-r from-purple-600 to-rose-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you're ready
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="group relative rounded-2xl overflow-hidden bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/40 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="p-8">
                <div className="text-center mb-8">
                  <h3 className="font-playfair text-2xl font-bold mb-2">Free</h3>
                  <div className="text-5xl font-bold mb-2 text-foreground">$0</div>
                  <p className="text-muted-foreground">Perfect to get started</p>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Basic color analysis</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Virtual wardrobe (50 items)</span>
                  </li>
                </ul>
                <SignUpButton mode="modal">
                  <Button className="w-full" variant="outline">
                    Get Started Free
                  </Button>
                </SignUpButton>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="group relative rounded-2xl overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-purple-200/50 shadow-2xl shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-rose-500"></div>
              <div className="absolute top-4 right-4">
                <span className="bg-gradient-to-r from-purple-500 to-rose-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md">
                  Most Popular
                </span>
              </div>
              <div className="p-8">
                <div className="text-center mb-8">
                  <h3 className="font-playfair text-2xl font-bold mb-2">Pro</h3>
                  <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-rose-600 bg-clip-text text-transparent">$9.99</div>
                  <p className="text-muted-foreground">per month</p>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium">Advanced AI analysis</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium">Unlimited wardrobe</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium">Trend forecasting</span>
                  </li>
                </ul>
                <SignUpButton mode="modal">
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600 text-white shadow-lg">
                    Start Pro Trial
                  </Button>
                </SignUpButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto bg-gradient-to-br from-white/50 to-purple-50/30 dark:from-white/10 dark:to-purple-900/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-12 shadow-2xl">
            <h2 className="font-playfair text-3xl lg:text-5xl font-bold text-foreground mb-6">
              Ready to Transform Your{" "}
              <span className="bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                Style?
              </span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of fashion enthusiasts who've discovered their perfect style.
            </p>
            <SignUpButton mode="modal">
              <Button size="lg" className="group bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600 text-white px-10 py-6 text-lg rounded-full shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all hover:scale-105">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </SignUpButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-white/5 backdrop-blur-md py-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-rose-500 rounded-xl p-2 shadow-lg shadow-purple-500/25">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="font-playfair text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-600 bg-clip-text text-transparent">
              AesthetIQ
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2024 AesthetIQ. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}