"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export default function ExtensionAuthPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Authenticating...")
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    async function handleAuth() {
      if (!isLoaded) return

      if (!isSignedIn) {
        // Redirect to sign-in if not authenticated
        router.push("/sign-in?redirect=/extension-auth")
        return
      }

      try {
        // Get the Clerk auth token
        const authToken = await getToken()

        if (!authToken) {
          throw new Error("Failed to get authentication token")
        }

        setToken(authToken)
        console.log("Extension Auth: Token obtained")

        // Auto-send token to extension
        const data = {
          type: "AESTHETIQ_AUTH_TOKEN",
          token: authToken,
          userEmail: user?.primaryEmailAddress?.emailAddress || "",
          userName: user?.fullName || user?.firstName || "",
        }
        
        // Send multiple times with delays to ensure content script receives it
        const sendToken = () => {
          console.log("Extension Auth: Sending token via postMessage")
          window.postMessage(data, "*")
        }
        
        // Staggered sends
        setTimeout(sendToken, 100)
        setTimeout(sendToken, 500)
        setTimeout(sendToken, 1000)
        setTimeout(sendToken, 2000)

        setStatus("success")
        setMessage("Click the button below to connect the extension.")

      } catch (error) {
        console.error("Extension auth error:", error)
        setStatus("error")
        setMessage("Failed to authenticate. Please try again.")
      }
    }

    handleAuth()
  }, [isLoaded, isSignedIn, getToken, user, router])

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token)
      alert("Token copied! Paste it in the extension settings page.")
    }
  }

  const connectExtension = async () => {
    if (!token) return

    const data = {
      type: "AESTHETIQ_AUTH_TOKEN",
      token: token,
      userEmail: user?.primaryEmailAddress?.emailAddress || "",
      userName: user?.fullName || user?.firstName || "",
    }
    
    console.log("Extension Auth: Sending token via postMessage...")
    window.postMessage(data, "*")
    
    // Multiple attempts with delays
    setTimeout(() => window.postMessage(data, "*"), 100)
    setTimeout(() => window.postMessage(data, "*"), 500)
    setTimeout(() => window.postMessage(data, "*"), 1000)
    
    setMessage("Token sent! A green toast should appear if successful. If not, use the Copy Token option below.")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        <div className="mb-6">
          {status === "loading" && (
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          )}
          {status === "success" && (
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-semibold mb-4">
          {status === "loading" && "Connecting to Extension..."}
          {status === "success" && "Ready to Connect!"}
          {status === "error" && "Connection Failed"}
        </h1>

        <p className="text-muted-foreground mb-6">{message}</p>

        {status === "success" && (
          <div className="space-y-4">
            <button
              onClick={connectExtension}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              🔗 Connect Extension
            </button>
            
            <p className="text-sm text-muted-foreground">
              After connecting, try right-clicking on a clothing image!
            </p>
            
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                If the button above doesn&apos;t work, copy the token manually:
              </p>
              <button
                onClick={copyToken}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
              >
                Copy Auth Token
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                Then paste it in Extension Settings → Authentication → Auth Token
              </p>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ Note: Tokens expire after ~60 seconds. You may need to reconnect when the token expires.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
