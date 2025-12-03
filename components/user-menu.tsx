"use client"

import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { User, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export default function UserMenu() {
  const { user, signOut, saveApiKey, getApiKey } = useAuth()
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const { toast } = useToast()
  const { signIn, signUp } = useAuth()

  // Load API key when profile dialog opens
  useEffect(() => {
    if (showProfileDialog) {
      const loadApiKey = async () => {
        const key = await getApiKey()
        if (key) setApiKey(key)
      }
      loadApiKey()
    }
  }, [showProfileDialog, getApiKey])

  const handleAuth = async () => {
    try {
      if (isSignUp) {
        await signUp(email, password)
        toast({
          title: "Account created",
          description: "Please check your email to verify your account",
        })
      } else {
        await signIn(email, password)
        toast({
          title: "Logged in successfully",
        })
      }
      setShowLoginDialog(false)
    } catch (error) {
      toast({
        title: "Authentication error",
        description: error instanceof Error ? error.message : "Failed to authenticate",
        variant: "destructive",
      })
    }
  }

  const handleSaveApiKey = async () => {
    try {
      await saveApiKey(apiKey)
      toast({
        title: "API key saved successfully",
      })
      setShowProfileDialog(false)
    } catch (error) {
      toast({
        title: "Error saving API key",
        description: error instanceof Error ? error.message : "Failed to save API key",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="rounded-full w-10 h-10 p-0 bg-white hover:bg-gray-100 text-black transition-colors">
              <User size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 bg-black border-zinc-800 text-white shadow-xl"
            sideOffset={8}
          >
            <DropdownMenuLabel className="font-normal text-sm text-zinc-300 px-3 py-2">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              className="cursor-pointer text-white hover:bg-zinc-900 hover:text-white focus:bg-zinc-900 focus:text-white transition-colors px-3 py-2.5"
              onClick={() => setShowProfileDialog(true)}
            >
              <Settings className="mr-3 h-4 w-4" />
              <span>Profile & API Key</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              className="cursor-pointer text-red-400 hover:bg-red-950 hover:text-red-300 focus:bg-red-950 focus:text-red-300 transition-colors px-3 py-2.5"
              onClick={signOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          className="bg-white hover:bg-gray-200 text-black rounded-full px-4 py-2 h-auto transition-colors"
          onClick={() => setShowLoginDialog(true)}
        >
          Log in
        </Button>
      )}

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="bg-black border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white font-mono tracking-normal">
              {isSignUp ? "Create an account" : "Log in to your account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black border-zinc-800 text-white focus:border-zinc-600"
                placeholder="your.email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black border-zinc-800 text-white focus:border-zinc-600"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSignUp(!isSignUp)}
              className="border-zinc-800 text-white hover:bg-zinc-900 hover:text-white"
            >
              {isSignUp ? "Already have an account?" : "Create an account"}
            </Button>
            <Button onClick={handleAuth} className="bg-white hover:bg-gray-200 text-black">
              {isSignUp ? "Sign up" : "Log in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="bg-black border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white font-mono tracking-normal">Profile Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <p className="text-zinc-400 text-sm bg-zinc-950 px-3 py-2 rounded-md border border-zinc-800">
                {user?.email}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="groq-api-key" className="text-white">
                Groq API Key
              </Label>
              <Input
                id="groq-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-black border-zinc-800 text-white focus:border-zinc-600"
                placeholder="gsk_xxxxx"
              />
              <p className="text-zinc-400 text-xs">
                Your Groq API key is required for subtitle generation. Get your key at{" "}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 hover:text-white hover:underline transition-colors"
                >
                  console.groq.com
                </a>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveApiKey} className="bg-white hover:bg-gray-200 text-black">
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
