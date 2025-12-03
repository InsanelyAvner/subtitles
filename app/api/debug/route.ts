import { NextResponse } from "next/server"

export async function GET() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
      (process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http') ? 'SET (valid URL)' : 'SET (invalid URL)') : 
      'NOT SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
    GROQ_API_KEY: process.env.GROQ_API_KEY ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  }

  return NextResponse.json({ 
    message: 'Environment variables status',
    environment: envVars,
    timestamp: new Date().toISOString()
  })
}
