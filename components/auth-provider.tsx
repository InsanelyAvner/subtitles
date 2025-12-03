"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  saveApiKey: (apiKey: string) => Promise<void>
  getApiKey: () => Promise<string | null>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  saveApiKey: async () => {},
  getApiKey: async () => null,
})

// Create a single supabase client for interacting with your database (lazy initialization)
let supabaseClient: any = null

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Validate environment variables
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'placeholder' || supabaseAnonKey === 'placeholder') {
      throw new Error('Supabase environment variables are not properly configured')
    }
    
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error)
      throw new Error('Failed to initialize Supabase client')
    }
  }
  return supabaseClient
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await getSupabaseClient().auth.getSession()
        setUser(session?.user || null)
      } catch (err) {
        console.error('Failed to get session:', err)
        setError('Failed to initialize authentication. Please check your configuration.')
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    let subscription: any
    try {
      const {
        data: { subscription: authSubscription },
      } = getSupabaseClient().auth.onAuthStateChange((_event: any, session: any) => {
        setUser(session?.user || null)
      })
      subscription = authSubscription
    } catch (err) {
      console.error('Failed to set up auth listener:', err)
      setError('Failed to initialize authentication. Please check your configuration.')
    }

    return () => subscription?.unsubscribe()
  }, [])

  // If there's a configuration error, show it
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-700">{error}</p>
          <p className="text-sm text-gray-500 mt-4">
            Please ensure your environment variables are properly configured.
          </p>
        </div>
      </div>
    )
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  // Sign up function
  const signUp = async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signUp({
      email,
      password,
    })
    if (error) throw error
  }

  // Sign out function
  const signOut = async () => {
    const { error } = await getSupabaseClient().auth.signOut()
    if (error) throw error
  }

  // Save Groq API key to user metadata
  const saveApiKey = async (apiKey: string) => {
    if (!user) throw new Error("User not authenticated")

    const { error } = await getSupabaseClient().from("user_settings").upsert({
      user_id: user.id,
      groq_api_key: apiKey,
    })

    if (error) throw error
  }

  // Get the user's Groq API key
  const getApiKey = async () => {
    if (!user) return null

    const { data, error } = await getSupabaseClient().from("user_settings").select("groq_api_key").eq("user_id", user.id).single()

    if (error) return null
    return data?.groq_api_key || null
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, saveApiKey, getApiKey }}>
      {children}
    </AuthContext.Provider>
  )
}
